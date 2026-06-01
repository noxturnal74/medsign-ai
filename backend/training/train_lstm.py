# -*- coding: utf-8 -*-
"""
Script Pelatihan Model LSTM MedSign AI
Membaca npy sequence, melakukan normalisasi euklidian, 
melatih model Keras LSTM, dan mengonversinya ke TensorFlow Lite (TFLite)
"""

import os
import numpy as np
from sklearn.model_selection import train_test_split

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
    from tensorflow.keras.utils import to_categorical
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("WARNING: TensorFlow/Keras harus terpasang untuk melatih model LSTM.")

# Gunakan normalisasi yang sama persis dengan modul inferensi backend
from app.ml.preprocess import normalize_landmarks

def train_model():
    if not TF_AVAILABLE:
        print("ERROR: Harap instal tensorflow terlebih dahulu!")
        print("Perintah: pip install tensorflow")
        return

    DATA_PATH = os.path.join('..', 'data')
    if not os.path.exists(DATA_PATH) or len(os.listdir(DATA_PATH)) == 0:
        print(f"ERROR: Direktori data '{DATA_PATH}' kosong. Harap rekam data terlebih dahulu lewat collect_data.py!")
        return

    # 1. Definisikan kosakata/label berdasarkan nama sub-folder data/
    classes = [d for d in os.listdir(DATA_PATH) if os.path.isdir(os.path.join(DATA_PATH, d))]
    print(f"Menemukan {len(classes)} kelas untuk dilatih: {classes}")

    # Map label ke indeks numerik
    label_map = {label: num for num, label in enumerate(classes)}

    sequences, labels = [], []

    # 2. Muat dataset sequence npy
    print("\nMemuat dan menormalisasi koordinat dataset...")
    for action in classes:
        action_dir = os.path.join(DATA_PATH, action)
        for npy_file in os.listdir(action_dir):
            if not npy_file.endswith('.npy'):
                continue
                
            res = np.load(os.path.join(action_dir, npy_file)) # Shape: (30, 63)
            
            # Normalisasikan koordinat setiap frame agar invarian posisi & skala
            normalized_seq = []
            for frame in res:
                norm_frame = normalize_landmarks(frame)
                normalized_seq.append(norm_frame)
                
            sequences.append(normalized_seq)
            labels.append(label_map[action])

    X = np.array(sequences, dtype=np.float32) # Shape: (samples, 30, 63)
    y = to_categorical(labels).astype(int)

    # 3. Train/Test Split (80:20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    print(f"Dataset dimuat: Train size = {X_train.shape[0]} | Test size = {X_test.shape[0]}")

    # 4. Bangun Arsitektur LSTM Model (sesuai spesifikasi SDD)
    n_classes = len(classes)
    model = Sequential([
        LSTM(128, return_sequences=True, input_shape=(30, 63), name="lstm_1"),
        Dropout(0.3),
        LSTM(64, return_sequences=False, name="lstm_2"),
        Dropout(0.3),
        Dense(128, activation='relu', name="dense_1"),
        BatchNormalization(),
        Dropout(0.3),
        Dense(n_classes, activation='softmax', name="output")
    ])

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )

    model.summary()

    # 5. Siapkan Callbacks (Early Stopping & Model Checkpoint)
    models_dir = os.path.join('..', 'models')
    if not os.path.exists(models_dir):
        os.makedirs(models_dir)

    best_h5_path = os.path.join(models_dir, 'medsign_lstm.h5')
    
    callbacks = [
        EarlyStopping(monitor='val_accuracy', patience=15, restore_best_weights=True),
        ModelCheckpoint(best_h5_path, monitor='val_accuracy', save_best_only=True),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=7, min_lr=1e-6)
    ]

    # 6. Jalankan Proses Training
    print("\nMemulai pelatihan model LSTM...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=120,
        batch_size=16,
        callbacks=callbacks
    )

    print(f"\nTraining selesai. Model Keras terbaik disimpan di {best_h5_path}")

    # 7. Konversi Model Keras (.h5) ke TFLite (.tflite) dengan Kuantisasi Float16
    print("\nMengonversi model terbaik ke format TFLite (Float16 Quantization)...")
    best_model = tf.keras.models.load_model(best_h5_path)
    converter = tf.lite.TFLiteConverter.from_keras_model(best_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16] # Kuantisasi Float16
    
    tflite_model = converter.convert()
    
    tflite_path = os.path.join(models_dir, 'medsign_v1.tflite')
    with open(tflite_path, 'wb') as f:
        f.write(tflite_model)
        
    print(f"Model TFLite berhasil diekspor ke {tflite_path}")
    print(f"Ukuran Model TFLite: {len(tflite_model) / 1024:.1f} KB (Sangat Ringan & Latensi Rendah)")

if __name__ == "__main__":
    train_model()
