# -*- coding: utf-8 -*-
"""
Script Pelatihan Model LSTM MedSign AI
Membaca npy sequence, melakukan normalisasi euklidian, 
melatih model Keras LSTM, dan mengonversinya ke TensorFlow Lite (TFLite)
"""
import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import numpy as np
from sklearn.model_selection import train_test_split

try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import Input, LSTM, Dense, Dropout, BatchNormalization
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
    from tensorflow.keras.utils import to_categorical
    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False
    print("WARNING: TensorFlow/Keras harus terpasang untuk melatih model LSTM.")

# Gunakan normalisasi yang sama persis dengan modul inferensi backend
from app.ml.preprocess import normalize_landmarks

CLINICAL_CLASSES = [
    "sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "diare", "lemas",
    "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", "telinga", "leher",
    "ya", "tidak", "sakit sekali", "lebih baik", "lebih buruk",
    "tolong", "tidak bisa bernapas", "nyeri dada", "pingsan", "bantuan segera"
]

def train_model():
    if not TF_AVAILABLE:
        print("ERROR: Harap instal tensorflow terlebih dahulu!")
        print("Perintah: pip install tensorflow")
        return

    # Konfigurasi Akselerasi GPU CUDA jika tersedia
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            print(f"\n[GPU_ACCEL] Menemukan {len(gpus)} GPU perangkat keras:")
            for gpu in gpus:
                print(f"  - {gpu.name}")
                tf.config.experimental.set_memory_growth(gpu, True)
            print("[GPU_ACCEL] Akselerasi CUDA diaktifkan secara otomatis untuk training & testing.\n")
        except RuntimeError as e:
            print(f"[GPU_ACCEL] Gagal mengonfigurasi GPU: {e}\n")
    else:
        print("\n[GPU_ACCEL] WARNING: Tidak ada GPU NVIDIA (CUDA) terdeteksi. Training berjalan menggunakan CPU.\n")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.abspath(os.path.join(script_dir, '..', 'data'))
    if not os.path.exists(DATA_PATH) or len(os.listdir(DATA_PATH)) == 0:
        print(f"ERROR: Direktori data '{DATA_PATH}' kosong. Harap rekam data terlebih dahulu lewat collect_data.py!")
        return

    # 1. Gunakan urutan label klinis tetap agar selaras dengan app/ml/model.py.
    #    Folder lain seperti data abjad tidak boleh ikut menjadi kelas LSTM medis.
    classes = CLINICAL_CLASSES
    missing_classes = [
        action for action in classes
        if not os.path.isdir(os.path.join(DATA_PATH, action))
        or not any(f.endswith('.npy') for f in os.listdir(os.path.join(DATA_PATH, action)))
    ]
    if missing_classes:
        print("ERROR: Beberapa kelas klinis belum memiliki file .npy:")
        for action in missing_classes:
            print(f"  - {action}")
        print("Harap lengkapi perekaman data untuk semua 30 kosakata sebelum training produksi.")
        return

    print(f"Menemukan {len(classes)} kelas klinis untuk dilatih: {classes}")

    # Map label ke indeks numerik
    label_map = {label: num for num, label in enumerate(classes)}

    sequences, labels = [], []
    class_counts = {action: 0 for action in classes}

    # 2. Muat dataset sequence npy
    print("\nMemuat dan menormalisasi koordinat dataset...")
    for action in classes:
        action_dir = os.path.join(DATA_PATH, action)
        for npy_file in sorted(os.listdir(action_dir)):
            if not npy_file.endswith('.npy'):
                continue
                
            res = np.load(os.path.join(action_dir, npy_file)) # Shape: (30, 63)
            if res.shape != (30, 63):
                print(f"[WARN] {action}/{npy_file} memiliki shape {res.shape}, dilewati. Target shape: (30, 63)")
                continue
            
            # Normalisasikan koordinat setiap frame agar invarian posisi & skala
            normalized_seq = []
            for frame in res:
                norm_frame = normalize_landmarks(frame)
                normalized_seq.append(norm_frame)
                
            sequences.append(normalized_seq)
            labels.append(label_map[action])
            class_counts[action] += 1

    low_sample_classes = [action for action, count in class_counts.items() if count < 2]
    if low_sample_classes:
        print("ERROR: Beberapa kelas punya sampel valid kurang dari 2, stratified split tidak bisa dilakukan:")
        for action in low_sample_classes:
            print(f"  - {action}: {class_counts[action]} sampel")
        return

    target_gap_classes = [action for action, count in class_counts.items() if count < 30]
    if target_gap_classes:
        print("[WARN] Beberapa kelas masih di bawah target minimal 30 sequence:")
        for action in target_gap_classes:
            print(f"  - {action}: {class_counts[action]} sequence")

    X = np.array(sequences, dtype=np.float32) # Shape: (samples, 30, 63)
    y = to_categorical(labels, num_classes=len(classes)).astype(int)

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
    models_dir = os.path.abspath(os.path.join(script_dir, '..', 'models'))
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
    
    # Buat model baru dengan static batch_size=1 menggunakan Input layer untuk proses kompilasi TFLite yang stabil
    static_model = Sequential([
        Input(shape=(30, 63), batch_size=1),
        LSTM(128, return_sequences=True, name="lstm_1"),
        Dropout(0.3),
        LSTM(64, return_sequences=False, name="lstm_2"),
        Dropout(0.3),
        Dense(128, activation='relu', name="dense_1"),
        BatchNormalization(),
        Dropout(0.3),
        Dense(n_classes, activation='softmax', name="output")
    ])
    
    # Salin bobot/weights dari model latih ke model statis
    static_model.set_weights(best_model.get_weights())
    
    converter = tf.lite.TFLiteConverter.from_keras_model(static_model)
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
