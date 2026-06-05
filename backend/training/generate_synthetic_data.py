# -*- coding: utf-8 -*-
"""
Script Pembangkit Dataset Koordinat Landmark 3D BISINDO Prosedural (Sintetis)
Mensintesis data latih landmark 30 frame (shape 30, 63) untuk melatih model LSTM MedSign
"""

import os
import numpy as np

def get_base_pose(pose_type="open"):
    """
    Mengembalikan koordinat tangan baseline (21, 3) yang realistis berdasarkan tipe gestur.
    Titik 0 adalah wrist (pergelangan tangan).
    """
    pts = np.zeros((21, 3))
    
    # 0. Wrist
    pts[0] = [0.0, 0.0, 0.0]
    
    if pose_type == "open":
        # Jari-jemari terbuka lebar
        # Ibu jari (Thumb)
        pts[1] = [0.15, -0.05, -0.05]
        pts[2] = [0.28, -0.12, -0.08]
        pts[3] = [0.38, -0.18, -0.11]
        pts[4] = [0.46, -0.24, -0.13]
        # Telunjuk (Index)
        pts[5] = [0.10, -0.25, -0.02]
        pts[6] = [0.14, -0.45, -0.04]
        pts[7] = [0.17, -0.60, -0.05]
        pts[8] = [0.19, -0.72, -0.06]
        # Tengah (Middle)
        pts[9] = [0.00, -0.28, -0.02]
        pts[10] = [0.00, -0.50, -0.04]
        pts[11] = [0.00, -0.68, -0.05]
        pts[12] = [0.00, -0.82, -0.06]
        # Manis (Ring)
        pts[13] = [-0.10, -0.26, -0.02]
        pts[14] = [-0.14, -0.46, -0.04]
        pts[15] = [-0.17, -0.62, -0.05]
        pts[16] = [-0.19, -0.74, -0.06]
        # Kelingking (Pinky)
        pts[17] = [-0.18, -0.22, -0.02]
        pts[18] = [-0.25, -0.38, -0.04]
        pts[19] = [-0.30, -0.50, -0.05]
        pts[20] = [-0.34, -0.60, -0.06]
        
    elif pose_type == "fist":
        # Tangan mengepal erat (curled fingertips close to MCPs)
        # Ibu jari menekuk menutupi kepalan
        pts[1] = [0.08, -0.05, -0.05]
        pts[2] = [0.12, -0.10, -0.08]
        pts[3] = [0.10, -0.15, -0.10]
        pts[4] = [0.06, -0.18, -0.11]
        # Telunjuk
        pts[5] = [0.08, -0.20, -0.02]
        pts[6] = [0.09, -0.28, -0.10]
        pts[7] = [0.06, -0.24, -0.15]
        pts[8] = [0.04, -0.18, -0.12]
        # Tengah
        pts[9] = [0.00, -0.22, -0.02]
        pts[10] = [0.00, -0.30, -0.10]
        pts[11] = [0.00, -0.26, -0.15]
        pts[12] = [0.00, -0.20, -0.12]
        # Manis
        pts[13] = [-0.08, -0.20, -0.02]
        pts[14] = [-0.09, -0.28, -0.10]
        pts[15] = [-0.06, -0.24, -0.15]
        pts[16] = [-0.04, -0.18, -0.12]
        # Kelingking
        pts[17] = [-0.14, -0.18, -0.02]
        pts[18] = [-0.16, -0.25, -0.08]
        pts[19] = [-0.14, -0.22, -0.12]
        pts[20] = [-0.12, -0.16, -0.10]
        
    elif pose_type == "pinch":
        # Ujung ibu jari (4) menyentuh ujung jari telunjuk (8)
        # Telunjuk menekuk bertemu ibu jari
        pts[1] = [0.08, -0.06, -0.04]
        pts[2] = [0.14, -0.12, -0.06]
        pts[3] = [0.18, -0.16, -0.08]
        pts[4] = [0.20, -0.20, -0.10]
        # Telunjuk menyentuh
        pts[5] = [0.10, -0.22, -0.02]
        pts[6] = [0.15, -0.30, -0.06]
        pts[7] = [0.19, -0.26, -0.09]
        pts[8] = [0.20, -0.20, -0.10] # Sama dengan 4
        # Tengah, Manis, Kelingking lurus/terbuka
        # Tengah
        pts[9] = [0.00, -0.26, -0.02]
        pts[10] = [0.00, -0.48, -0.04]
        pts[11] = [0.00, -0.66, -0.05]
        pts[12] = [0.00, -0.80, -0.06]
        # Manis
        pts[13] = [-0.09, -0.24, -0.02]
        pts[14] = [-0.13, -0.44, -0.04]
        pts[15] = [-0.16, -0.60, -0.05]
        pts[16] = [-0.18, -0.72, -0.06]
        # Kelingking
        pts[17] = [-0.16, -0.20, -0.02]
        pts[18] = [-0.22, -0.36, -0.04]
        pts[19] = [-0.26, -0.48, -0.05]
        pts[20] = [-0.30, -0.58, -0.06]
        
    elif pose_type == "v_shape":
        # Telunjuk (8) dan Tengah (12) lurus, jari lain mengepal
        # Ibu jari
        pts[1] = [0.08, -0.05, -0.05]
        pts[2] = [0.12, -0.10, -0.08]
        pts[3] = [0.10, -0.14, -0.10]
        pts[4] = [0.06, -0.17, -0.11]
        # Telunjuk (LURUS)
        pts[5] = [0.08, -0.25, -0.02]
        pts[6] = [0.11, -0.45, -0.04]
        pts[7] = [0.13, -0.60, -0.05]
        pts[8] = [0.15, -0.72, -0.06]
        # Tengah (LURUS)
        pts[9] = [0.00, -0.27, -0.02]
        pts[10] = [0.00, -0.49, -0.04]
        pts[11] = [0.00, -0.67, -0.05]
        pts[12] = [0.00, -0.81, -0.06]
        # Manis (TEKUK)
        pts[13] = [-0.08, -0.20, -0.02]
        pts[14] = [-0.09, -0.28, -0.10]
        pts[15] = [-0.06, -0.24, -0.15]
        pts[16] = [-0.04, -0.18, -0.12]
        # Kelingking (TEKUK)
        pts[17] = [-0.14, -0.18, -0.02]
        pts[18] = [-0.16, -0.25, -0.08]
        pts[19] = [-0.14, -0.22, -0.12]
        pts[20] = [-0.12, -0.16, -0.10]
        
    elif pose_type == "point":
        # Hanya Telunjuk (8) lurus, jari lainnya mengepal
        # Ibu jari
        pts[1] = [0.08, -0.05, -0.05]
        pts[2] = [0.12, -0.10, -0.08]
        pts[3] = [0.10, -0.14, -0.10]
        pts[4] = [0.06, -0.17, -0.11]
        # Telunjuk (LURUS)
        pts[5] = [0.08, -0.25, -0.02]
        pts[6] = [0.11, -0.45, -0.04]
        pts[7] = [0.13, -0.60, -0.05]
        pts[8] = [0.15, -0.72, -0.06]
        # Tengah (TEKUK)
        pts[9] = [0.00, -0.22, -0.02]
        pts[10] = [0.00, -0.30, -0.10]
        pts[11] = [0.00, -0.26, -0.15]
        pts[12] = [0.00, -0.20, -0.12]
        # Manis (TEKUK)
        pts[13] = [-0.08, -0.20, -0.02]
        pts[14] = [-0.09, -0.28, -0.10]
        pts[15] = [-0.06, -0.24, -0.15]
        pts[16] = [-0.04, -0.18, -0.12]
        # Kelingking (TEKUK)
        pts[17] = [-0.14, -0.18, -0.02]
        pts[18] = [-0.16, -0.25, -0.08]
        pts[19] = [-0.14, -0.22, -0.12]
        pts[20] = [-0.12, -0.16, -0.10]
        
    return pts

def apply_augmentation(sequence, scale_range=(0.85, 1.15), rot_range=(-0.15, 0.15), trans_range=(-0.1, 0.1)):
    """
    Menerapkan augmentasi spasial (skala, rotasi acak pada sumbu Z, pergeseran) 
    pada satu sequence (30, 21, 3) agar model terlatih secara bervariasi (invarian spasial).
    """
    scale = np.random.uniform(*scale_range)
    rot_angle = np.random.uniform(*rot_range)
    translation = np.random.uniform(*trans_range, size=3)
    
    # Matriks rotasi 2D sederhana pada sumbu Z
    cos_a = np.cos(rot_angle)
    sin_a = np.sin(rot_angle)
    rot_matrix = np.array([
        [cos_a, -sin_a, 0],
        [sin_a, cos_a, 0],
        [0, 0, 1]
    ])
    
    augmented_seq = []
    for frame in sequence: # frame shape: (21, 3)
        # 1. Rotasi
        rotated = np.dot(frame, rot_matrix.T)
        # 2. Skala
        scaled = rotated * scale
        # 3. Translasi
        translated = scaled + translation
        augmented_seq.append(translated)
        
    return np.array(augmented_seq)

def generate_word_data(word, num_sequences=35, sequence_length=30):
    """
    Menghasilkan data latih 3D landmark prosedural (berdasarkan kata dan dinamika geraknya)
    Masing-masing menghasilkan `num_sequences` sequence isyarat.
    """
    sequences = []
    
    # Kelompokkan pola kosakata medis berdasarkan bentuk dasar dan gerakan temporal
    
    # 1. Kelompok V-Shape Vibrating (Sakit, Nyeri, Sakit sekali)
    if word in ["sakit", "nyeri", "sakit sekali"]:
        base_type = "v_shape"
        movement_fn = lambda f_idx: np.sin(f_idx * 1.2) * 0.03 # Getaran kecil sinusoidal
        axis = 0 # sumbu X
        
    # 2. Kelompok Fist / Dada / Sesak (Sesak, Tidak bisa bernapas, Nyeri dada, Lemas)
    elif word in ["sesak", "tidak bisa bernapas", "nyeri dada", "lemas"]:
        base_type = "fist"
        # Gerakan menekan perlahan ke dada (poros Z makin mendekat/menjauh)
        movement_fn = lambda f_idx: (f_idx / sequence_length) * 0.12
        axis = 2 # sumbu Z
        
    # 3. Kelompok Pinch / Vertikal (Ya, Lebih baik, Ya)
    elif word in ["ya", "lebih baik"]:
        base_type = "pinch"
        # Gerakan vertikal mengangguk (naik turun halus di sumbu Y)
        movement_fn = lambda f_idx: np.sin(f_idx * 0.4) * 0.08
        axis = 1 # sumbu Y
        
    # 4. Kelompok Open / Horizontal Waving (Tidak, Lebih buruk)
    elif word in ["tidak", "lebih buruk"]:
        base_type = "open"
        # Gerakan horizontal melambai (kanan kiri halus di sumbu X)
        movement_fn = lambda f_idx: np.sin(f_idx * 0.5) * 0.12
        axis = 0 # sumbu X
        
    # 5. Kelompok Pointing ke Tubuh/Organ (kepala, dada, perut, tenggorokan, telinga, leher, lemas, mata)
    elif word in ["kepala", "tenggorokan", "telinga", "leher", "mata"]:
        base_type = "point"
        # Gerakan menunjuk ke lokasi spesifik secara konstan
        movement_fn = lambda f_idx: 0.02 * (1.0 if f_idx < 15 else -1.0)
        axis = 1
        
    # 6. Kelompok Anggota Badan Bergerak (tangan, kaki, punggung, perut)
    elif word in ["tangan", "kaki", "punggung", "perut"]:
        base_type = "point"
        # Gerakan melingkar lambat
        movement_fn = lambda f_idx: np.cos(f_idx * 0.2) * 0.06
        axis = 0
        
    # 7. Kelompok Keluhan Umum Lainnya (demam, pusing, mual, muntah, diare, batuk, pingsan)
    elif word in ["demam", "pusing", "mual", "muntah", "diare", "batuk"]:
        base_type = "fist"
        # Gerakan berputar cepat sinusoidal di sumbu X dan Y
        movement_fn = lambda f_idx: np.sin(f_idx * 0.8) * 0.08
        axis = 0
        
    # 8. Kelompok Darurat/Tolong (tolong, bantuan segera, pingsan)
    else: # tolong, bantuan segera, pingsan
        base_type = "open"
        # Gerakan dorongan mendorong ke depan (sumbu Z menjauh)
        movement_fn = lambda f_idx: -(f_idx / sequence_length) * 0.15
        axis = 2 # sumbu Z

    for seq_idx in range(num_sequences):
        raw_sequence = []
        base_pose = get_base_pose(base_type)
        
        # Tentukan noise mikro untuk variasi temporal setiap sampel
        noise_level = np.random.uniform(0.005, 0.012)
        
        for f_idx in range(sequence_length):
            # Salin pose dasar
            frame_pose = base_pose.copy()
            
            # 1. Terapkan gerakan temporal utama
            movement = movement_fn(f_idx)
            frame_pose[:, axis] += movement
            
            # Jika demam/muntah dsb, beri dinamika sekunder
            if word in ["demam", "pusing", "mual", "muntah", "diare", "batuk"]:
                frame_pose[:, 1] += np.cos(f_idx * 0.8) * 0.05 # Sumbu Y melingkar
                
            # 2. Tambahkan derau Gaussian alami untuk persendian (tangan manusia bergetar alami)
            noise = np.random.normal(0, noise_level, size=frame_pose.shape)
            frame_pose += noise
            
            # Pastikan pergelangan tangan (0) tetap stabil di asalnya (relative anchor)
            frame_pose -= frame_pose[0]
            
            raw_sequence.append(frame_pose)
            
        # Ubah menjadi array numpy (30, 21, 3)
        raw_sequence = np.array(raw_sequence)
        
        # 3. Terapkan augmentasi spasial (skala, rotasi acak, dan translasi) untuk generalisasi LSTM
        augmented_sequence = apply_augmentation(raw_sequence)
        
        # 4. Flatten menjadi format MediaPipe mentah (30, 63)
        flattened_seq = augmented_sequence.reshape(sequence_length, 63)
        
        sequences.append(flattened_seq)
        
    return sequences

def run_synthetic_generation():
    # Folder data backend relative ke direktori script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.abspath(os.path.join(script_dir, "..", "data"))
    
    # 30 Kosakata medis klinis MVP
    VOCABULARY = [
        "sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "diare", "lemas",
        "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", "telinga", "leher",
        "ya", "tidak", "sakit sekali", "lebih baik", "lebih buruk",
        "tolong", "tidak bisa bernapas", "nyeri dada", "pingsan", "bantuan segera"
    ]
    
    print("=== MEDSIGN AI - GENERATOR DATASET PROSEDURAL BISINDO ===")
    print(f"Direktori Target: {DATA_PATH}")
    print(f"Jumlah kosakata yang disintesis: {len(VOCABULARY)}")
    
    if not os.path.exists(DATA_PATH):
        os.makedirs(DATA_PATH)
        print("Membuat direktori data baru.")
        
    total_samples = 0
    
    for idx, word in enumerate(VOCABULARY):
        print(f"[{idx+1}/{len(VOCABULARY)}] Mensintesis data untuk kata: '{word.upper()}'...", end="")
        word_dir = os.path.join(DATA_PATH, word)
        if not os.path.exists(word_dir):
            os.makedirs(word_dir)
            
        # Pembangkitan prosedural 45 sequence per kata (kombinasi variasi yang kaya!)
        sequences = generate_word_data(word, num_sequences=45, sequence_length=30)
        
        for s_idx, seq in enumerate(sequences):
            npy_path = os.path.join(word_dir, f"{s_idx}.npy")
            np.save(npy_path, seq)
            
        print(f" Sukses! Disimpan {len(sequences)} sequence (.npy).")
        total_samples += len(sequences)
        
    print(f"\nSintesis Selesai! Berhasil menghasilkan total {total_samples} sequence.")
    print("Dataset prosedural siap dilatih menggunakan train_lstm.py!")

if __name__ == "__main__":
    run_synthetic_generation()
