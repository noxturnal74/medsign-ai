# -*- coding: utf-8 -*-
"""
Script Perekaman Data Isyarat BISINDO Medis
Menggunakan OpenCV dan MediaPipe untuk merekam 30-frame sequence landmark (.npy)
"""

import os
import time
import numpy as np

# Menggunakan try-except agar tidak crash saat dijalankan di server tanpa kamera
try:
    import cv2
    import mediapipe as mp
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    print("WARNING: OpenCV dan MediaPipe harus terpasang untuk merekam data isyarat.")

def run_data_collection():
    if not OPENCV_AVAILABLE:
        print("ERROR: Harap instal opencv-python dan mediapipe terlebih dahulu!")
        print("Perintah: pip install opencv-python mediapipe")
        return

    # 1. Definisikan folder penyimpanan data relatif terhadap file script ini.
    #    Ini menjaga output tetap masuk ke backend/data meskipun command dijalankan dari backend/.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    DATA_PATH = os.path.abspath(os.path.join(script_dir, '..', 'data'))
    if not os.path.exists(DATA_PATH):
        os.makedirs(DATA_PATH)

    # 30 Kosakata prioritas klinis MVP
    VOCABULARY = [
        "sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "diare", "lemas",
        "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", "telinga", "leher",
        "ya", "tidak", "sakit sekali", "lebih baik", "lebih buruk",
        "tolong", "tidak bisa bernapas", "nyeri dada", "pingsan", "bantuan segera"
    ]

    print("=== MEDSIGN AI - MODUL PEREKAM DATA BISINDO ===")
    print("Daftar kosakata medis yang dapat direkam:")
    for idx, word in enumerate(VOCABULARY):
        print(f"{idx+1}. {word.upper()}")

    # Pilih kata untuk direkam
    try:
        selection = int(input("\nPilih nomor kata yang ingin direkam: ")) - 1
        if selection < 0 or selection >= len(VOCABULARY):
            print("Pilihan tidak valid.")
            return
        action = VOCABULARY[selection]
    except Exception:
        print("Input harus berupa angka.")
        return

    # Tentukan jumlah sampel perekaman
    no_sequences = 30 # Jumlah video/sequence per kata
    sequence_length = 30 # Panjang frame per sequence (1 detik)

    print(f"\nMenyiapkan perekaman untuk kata: '{action.upper()}'")
    print(f"Jumlah sequence: {no_sequences} | Panjang frame per sequence: {sequence_length}")
    
    # Buat direktori penyimpanan kata tersebut
    action_path = os.path.join(DATA_PATH, action)
    if not os.path.exists(action_path):
        os.makedirs(action_path)

    # 2. Inisialisasi MediaPipe Hands
    mp_hands = mp.solutions.hands
    mp_drawing = mp.solutions.drawing_utils
    hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.5, min_tracking_confidence=0.5)

    # 3. Buka Kamera Webcam
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("ERROR: Kamera webcam tidak terdeteksi.")
        return

    print("\nInstruksi:")
    print("- Kamera akan terbuka dalam jendela baru.")
    print("- Lakukan jeda sebentar sebelum setiap sequence perekaman dimulai.")
    print("- Tekan tombol 'q' kapan saja untuk membatalkan perekaman.")
    input("\nTekan ENTER untuk memulai kamera...")

    for sequence in range(no_sequences):
        frames_landmarks = []
        
        for frame_num in range(sequence_length):
            ret, frame = cap.read()
            if not ret:
                break

            # Mirror frame untuk visualisasi yang nyaman
            frame = cv2.flip(frame, 1)
            h, w, c = frame.shape

            # Konversi warna ke RGB untuk MediaPipe
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(image_rgb)

            # Ekstrak 21 landmark tangan
            flat_landmarks = np.zeros(63) # Default jika tidak ada tangan (array zeros)
            
            if results.multi_hand_landmarks:
                hand_landmarks = results.multi_hand_landmarks[0]
                # Gambar overlay skeleton tangan ke layar video
                mp_drawing.draw_landmarks(frame, hand_landmarks, mp_hands.HAND_CONNECTIONS)
                
                # Ubah ke array datar (21 titik * 3 koordinat)
                pts = []
                for lm in hand_landmarks.landmark:
                    pts.extend([lm.x, lm.y, lm.z])
                flat_landmarks = np.array(pts)

            frames_landmarks.append(flat_landmarks)

            # Visualisasi Teks Overlay Perekaman
            if frame_num == 0:
                cv2.putText(frame, 'SIAP-SIAP MULAI...', (15, 120), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 255), 2, cv2.LINE_AA)
                cv2.imshow('MedSign AI - Perekam Data', frame)
                cv2.waitKey(1500) # Jeda bersiap 1.5 detik
                
            cv2.putText(frame, f'MEREKAM DATA KATA: {action.upper()}', (15, 40), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1, cv2.LINE_AA)
            cv2.putText(frame, f'Sequence ke-{sequence+1} | Frame ke-{frame_num+1}', (15, 70), 
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 0), 1, cv2.LINE_AA)
            
            cv2.imshow('MedSign AI - Perekam Data', frame)
            
            if cv2.waitKey(30) & 0xFF == ord('q'):
                break

        # Simpan sequence 30 frame ke berkas .npy
        npy_path = os.path.join(action_path, f'{sequence}.npy')
        np.save(npy_path, np.array(frames_landmarks))
        print(f"Sequence {sequence+1}/{no_sequences} berhasil disimpan ke {npy_path}")

    # Bersihkan webcam & jendela
    cap.release()
    cv2.destroyAllWindows()
    print("\nPerekaman data selesai!")

if __name__ == "__main__":
    run_data_collection()
