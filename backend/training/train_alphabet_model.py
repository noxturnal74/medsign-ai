# -*- coding: utf-8 -*-
"""
Script Pelatihan Model Abjad BISINDO A–Z
Membaca koordinat landmarks tangan statis dari alphabet_coordinates.npz,
melatih model Keras MLP (Multi-Layer Perceptron) statis, 
dan mengonversinya ke TensorFlow Lite (TFLite) dengan Kuantisasi Float16
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from sklearn.model_selection import train_test_split
import argparse

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Input, Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
    from tensorflow.keras.utils import to_categorical
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("WARNING: TensorFlow/Keras harus terpasang untuk melatih model abjad.")

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train static alphabet model.")
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--model-name", default="bisindo_alphabet_v1")
    return parser.parse_args()

def train_alphabet_model(epochs=80, model_name="bisindo_alphabet_v1"):
    if not TF_AVAILABLE:
        print("ERROR: Harap instal tensorflow terlebih dahulu!")
        return

    # Konfigurasi Akselerasi GPU CUDA jika tersedia
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            print(f"\n[GPU_ACCEL] Menemukan {len(gpus)} GPU perangkat keras:")
            for gpu in gpus:
                print(f"  - {gpu.name}")
                tf.config.experimental.set_memory_growth(gpu, True)
            print("[GPU_ACCEL] Akselerasi CUDA diaktifkan secara otomatis untuk training.\n")
        except RuntimeError as e:
            print(f"[GPU_ACCEL] Gagal mengonfigurasi GPU: {e}\n")
    else:
        print("\n[GPU_ACCEL] Running training on CPU.\n")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.abspath(os.path.join(script_dir, '..', 'data', 'alphabet_coordinates.npz'))

    if not os.path.exists(DATA_PATH):
        print(f"ERROR: Dataset koordinat '{DATA_PATH}' tidak ditemukan. Harap jalankan process_alphabet_data.py terlebih dahulu!")
        return

    # 1. Muat dataset koordinat statis
    print("Memuat dataset koordinat abjad...")
    data = np.load(DATA_PATH)
    X = data['X'] # Shape: (samples, 63)
    y = data['y'] # Shape: (samples,)

    # Daftar Kelas Abjad A-Z & Angka 1-9
    classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + [str(i) for i in range(1, 10)]
    n_classes = len(classes)
    
    print(f"Jumlah sampel koordinat berhasil dimuat: {X.shape[0]}")
    print(f"Jumlah kelas abjad (A-Z): {n_classes}")

    # One-hot encode label
    y_cat = to_categorical(y, num_classes=n_classes).astype(int)

    # 2. Train/Test Split (80:20)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y_cat, 
        test_size=0.2, 
        random_state=42, 
        stratify=y
    )
    print(f"Dataset split: Train = {X_train.shape[0]} sampel | Test = {X_test.shape[0]} sampel")

    # 3. Bangun Arsitektur MLP Model Statis
    model = Sequential([
        Input(shape=(63,), name="input_coords"),
        Dense(128, activation='relu', name="dense_1"),
        BatchNormalization(),
        Dropout(0.25),
        Dense(64, activation='relu', name="dense_2"),
        BatchNormalization(),
        Dropout(0.2),
        Dense(n_classes, activation='softmax', name="output")
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.0015),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    model.summary()

    # 4. Siapkan Callbacks (Early Stopping & Model Checkpoint)
    models_dir = os.path.abspath(os.path.join(script_dir, '..', 'models'))
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)

    best_h5_path = os.path.join(models_dir, f"{model_name}.h5")
    
    callbacks = [
        EarlyStopping(monitor='val_accuracy', patience=12, restore_best_weights=True),
        ModelCheckpoint(best_h5_path, monitor='val_accuracy', save_best_only=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=5, min_lr=1e-5)
    ]

    # 5. Jalankan Proses Training
    print("\nMemulai pelatihan model abjad BISINDO statis...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=epochs,
        batch_size=16,
        callbacks=callbacks
    )

    print(f"\nTraining selesai. Model Keras terbaik disimpan di {best_h5_path}")

    # 6. Konversi ke TFLite (.tflite) dengan Kuantisasi Float16
    print("\nMengonversi model terbaik ke format TFLite (Float16 Quantization)...")
    best_model = tf.keras.models.load_model(best_h5_path)
    
    # Buat model statis dengan batch_size=1 untuk kestabilan inferensi di backend
    static_model = Sequential([
        Input(shape=(63,), batch_size=1, name="input_coords"),
        Dense(128, activation='relu', name="dense_1"),
        BatchNormalization(),
        Dropout(0.25),
        Dense(64, activation='relu', name="dense_2"),
        BatchNormalization(),
        Dropout(0.2),
        Dense(n_classes, activation='softmax', name="output")
    ])
    
    # Salin bobot/weights
    static_model.set_weights(best_model.get_weights())
    
    converter = tf.lite.TFLiteConverter.from_keras_model(static_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    
    tflite_model = converter.convert()
    
    tflite_path = os.path.join(models_dir, f"{model_name}.tflite")
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
        
    print(f"Model TFLite Abjad berhasil diekspor ke {tflite_path}")
    print(f"Ukuran Model TFLite Abjad: {len(tflite_model) / 1024:.1f} KB (Sangat Ringan & Efisien)")

if __name__ == '__main__':
    args = parse_args()
    train_alphabet_model(epochs=args.epochs, model_name=args.model_name)
