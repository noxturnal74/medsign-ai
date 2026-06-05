# -*- coding: utf-8 -*-
"""
Adapter Service untuk Integrasi MedSign dengan Sign Language Translator Library
Menghubungkan API dengan modul pemrosesan model di app/ml/
"""

import numpy as np
import time
from app.ml.preprocess import normalize_landmarks, pad_sequence
from app.ml.model import ModelLoader

# Inisialisasi ModelLoader Singleton
model_loader = ModelLoader()
# Coba muat model TFLite jika filenya sudah siap
model_loader.load("models/medsign_v1.tflite")
model_loader.load_alphabet("models/bisindo_alphabet_v1.tflite")

class SLTAdapterService:
    def __init__(self):
        self.available = model_loader.loaded
        print(f"[SLT_ADAPTER] Berjalan dalam Mode: {'PRODUCTION (TFLite)' if self.available else 'GEOMETRIS (Real-Time)'}")

    def predict_bisindo(self, raw_frames: list) -> dict:
        """
        Melakukan prediksi isyarat BISINDO klinis menggunakan pemrosesan sequence landmark.
        Membaca data sequence mentah, menormalisasi, melakukan padding, dan mengklasifikasikan.
        """
        start_time = time.perf_counter()
        
        # 1. Pra-pemrosesan: normalisasi per frame
        processed_frames = []
        for frame in raw_frames:
            norm_frame = normalize_landmarks(frame)
            processed_frames.append(norm_frame)
            
        # 2. Penyelarasan Temporal: Padding sequence ke 30 frame
        input_seq = pad_sequence(processed_frames, target_len=30)
        
        # 3. Inferensi Klasifikasi melalui ModelLoader
        result = model_loader.predict(input_seq)
        
        # Hitung waktu proses keseluruhan
        total_time = int((time.perf_counter() - start_time) * 1000)
        result["processing_time_ms"] = total_time
        
        return result

    def predict_spelling(self, raw_frame: list) -> dict:
        """
        Melakukan prediksi abjad BISINDO statis A-Z menggunakan pemrosesan 1 frame landmark mentah.
        """
        start_time = time.perf_counter()
        
        # 1. Pra-pemrosesan: normalisasi frame tunggal
        norm_frame = normalize_landmarks(raw_frame)
        
        # 2. Reshape ke format input model (1, 63)
        input_data = norm_frame.reshape(1, 63)
        
        # 3. Inferensi Klasifikasi melalui ModelLoader
        result = model_loader.predict_alphabet(input_data)
        
        # Hitung waktu proses keseluruhan
        total_time = int((time.perf_counter() - start_time) * 1000)
        result["processing_time_ms"] = max(1, total_time)
        
        return result
