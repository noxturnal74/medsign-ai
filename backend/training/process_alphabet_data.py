# -*- coding: utf-8 -*-
"""
Script Pemroses & Konverter Dataset Abjad BISINDO A–Z
Membaca gambar JPG, memparsing file XML anotasi Pascal VOC,
mengekstrak 21 landmarks tangan (63 koordinat flat) menggunakan MediaPipe,
dan menyimpannya ke format alphabet_coordinates.npz terpadu.
"""
import os
import sys
import xml.etree.ElementTree as ET
import cv2
import numpy as np
import mediapipe as mp

# Daftarkan folder parent ke sys.path untuk mengimpor preprocess
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app.ml.preprocess import normalize_landmarks

def process_alphabet_dataset():
    mp_hands = mp.solutions.hands
    # Gunakan static_image_mode=True agar deteksi optimal untuk foto tunggal
    hands = mp_hands.Hands(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.2
    )

    script_dir = os.path.dirname(os.path.abspath(__file__))
    ALPHABET_DIR = os.path.abspath(os.path.join(script_dir, '..', 'data', 'bisindo_alphabet'))
    OUTPUT_PATH = os.path.abspath(os.path.join(script_dir, '..', 'data', 'alphabet_coordinates.npz'))

    if not os.path.exists(ALPHABET_DIR):
        print(f"ERROR: Folder dataset '{ALPHABET_DIR}' tidak ditemukan!")
        return

    # Definisikan kelas abjad A-Z & Angka 1-9
    classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + [str(i) for i in range(1, 10)]
    label_map = {c: i for i, c in enumerate(classes)}

    X_data = []
    y_data = []

    processed_count = 0
    success_count = 0
    failed_count = 0

    print("=== MEDSIGN AI - EXTRACTOR LANDMARK ABJAD BISINDO ===")
    print(f"Dataset Sumber: {ALPHABET_DIR}")

    for split in ['train', 'test']:
        split_dir = os.path.join(ALPHABET_DIR, split)
        if not os.path.exists(split_dir):
            print(f"Warning: Direktori split '{split}' tidak ditemukan.")
            continue

        print(f"\nMemproses bagian data: {split.upper()}...")
        
        xml_files = [f for f in os.listdir(split_dir) if f.endswith('.xml')]
        total_files = len(xml_files)
        
        for idx, filename in enumerate(xml_files):
            xml_path = os.path.join(split_dir, filename)
            try:
                tree = ET.parse(xml_path)
                root = tree.getroot()

                # Dapatkan nama file gambar & label abjad
                img_name = root.find('filename').text
                obj = root.find('object')
                if obj is None:
                    continue
                label = obj.find('name').text.upper().strip()

                if label not in label_map:
                    print(f" [SKIP] Label tidak dikenal '{label}' pada file {filename}")
                    continue

                img_path = os.path.join(split_dir, img_name)
                # Jika nama di XML tidak cocok, cari file jpg yang sepadan dengan nama xml
                if not os.path.exists(img_path):
                    img_path = xml_path.replace('.xml', '.jpg')
                    if not os.path.exists(img_path):
                        continue

                # Baca Gambar
                img = cv2.imread(img_path)
                if img is None:
                    continue

                processed_count += 1
                img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
                # Ekstrak Landmarks melalui MediaPipe Hands
                results = hands.process(img_rgb)
                
                # A. JALUR UTAMA: Deteksi langsung di seluruh gambar
                if results.multi_hand_landmarks:
                    hand_lms = results.multi_hand_landmarks[0]
                    raw_points = [[lm.x, lm.y, lm.z] for lm in hand_lms.landmark]
                    
                    # Normalisasi Euclidean
                    flat_lms = normalize_landmarks(raw_points)
                    X_data.append(flat_lms)
                    y_data.append(label_map[label])
                    success_count += 1
                else:
                    # B. JALUR CADANGAN: Crop wilayah tangan berdasarkan XML Bounding Box
                    bndbox = obj.find('bndbox')
                    if bndbox is not None:
                        xmin = int(bndbox.find('xmin').text)
                        ymin = int(bndbox.find('ymin').text)
                        xmax = int(bndbox.find('xmax').text)
                        ymax = int(bndbox.find('ymax').text)
                        
                        # Beri padding agar MediaPipe dapat melacak persendian pergelangan tangan (wrist)
                        h, w, _ = img.shape
                        xmin = max(0, xmin - 30)
                        ymin = max(0, ymin - 30)
                        xmax = min(w, xmax + 30)
                        ymax = min(h, ymax + 30)
                        
                        cropped_hand = img[ymin:ymax, xmin:xmax]
                        if cropped_hand.size > 0:
                            cropped_rgb = cv2.cvtColor(cropped_hand, cv2.COLOR_BGR2RGB)
                            crop_res = hands.process(cropped_rgb)
                            
                            if crop_res.multi_hand_landmarks:
                                hand_lms = crop_res.multi_hand_landmarks[0]
                                raw_points = [[lm.x, lm.y, lm.z] for lm in hand_lms.landmark]
                                
                                # Normalisasi Euclidean
                                flat_lms = normalize_landmarks(raw_points)
                                X_data.append(flat_lms)
                                y_data.append(label_map[label])
                                success_count += 1
                                continue
                                
                    failed_count += 1
                    # Sembunyikan cetakan file error yang terlalu banyak agar konsol rapi
                    
            except Exception as e:
                print(f"Error memproses {filename}: {e}")

            # Print status berkala
            if (idx + 1) % 50 == 0 or (idx + 1) == total_files:
                print(f"  Progres: {idx+1}/{total_files} file selesai diproses...")

    hands.close()

    # 3. Simpan Dataset Hasil Ekstraksi
    X_array = np.array(X_data, dtype=np.float32)
    y_array = np.array(y_data, dtype=np.int32)

    print("\n=== HASIL EKSTRAKSI ===")
    print(f"Total gambar yang diverifikasi: {processed_count}")
    print(f"Berhasil diekstrak landmarks (MediaPipe): {success_count} ({success_count/processed_count*100:.1f}%)")
    print(f"Gagal deteksi koordinat (MediaPipe): {failed_count} ({failed_count/processed_count*100:.1f}%)")

    # Pastikan data yang diekstrak cukup
    if success_count > 0:
        np.savez_compressed(OUTPUT_PATH, X=X_array, y=y_array)
        print(f"\n[SUKSES] Dataset berhasil disimpan di {OUTPUT_PATH}!")
        print(f"Bentuk Array X: {X_array.shape} (Jumlah Sampel, 63 Koordinat)")
        print(f"Bentuk Array y: {y_array.shape} (Label Indeks 0-25)")
    else:
        print("\n[ERROR] Tidak ada tangan yang terdeteksi. Silakan cek ulang konfigurasi gambar.")

if __name__ == "__main__":
    process_alphabet_dataset()
