# -*- coding: utf-8 -*-
from __future__ import annotations

import time

from app.ml.labels import get_model_contract
from app.ml.model import ModelLoader
from app.ml.preprocess import FRAME_COUNT, normalize_landmarks, pad_sequence


model_loader = ModelLoader()
if not model_loader.load("models/medsign_mvp_v1.tflite"):
    model_loader.load("models/medsign_v1.tflite")
model_loader.load_alphabet("models/bisindo_alphabet_v1.tflite")


class SLTAdapterService:
    def __init__(self):
        self.check_and_reload()
        self.contract = get_model_contract()
        self.available = model_loader.loaded
        self.threshold = float(self.contract["threshold"])
        print(f"[SLT_ADAPTER] Mode clinical: {'PRODUCTION' if self.available else 'MODEL_UNAVAILABLE'}")

    def check_and_reload(self):
        from pathlib import Path
        model_path = Path("models/medsign_mvp_v1.tflite")
        resolved_path = model_loader._resolve_model_path(model_path)
        if not resolved_path.exists():
            model_path = Path("models/medsign_v1.tflite")
            resolved_path = model_loader._resolve_model_path(model_path)

        if resolved_path.exists():
            try:
                mtime = resolved_path.stat().st_mtime
                if model_loader.model_mtime != mtime:
                    print(f"[SLT_ADAPTER] Mendeteksi perubahan model disk. Memuat ulang model: {resolved_path}")
                    model_loader.load(model_path)
            except Exception as e:
                print(f"[SLT_ADAPTER] Gagal mengecek/memuat ulang model: {e}")

    def status(self) -> dict:
        status = model_loader.status()
        self.available = status["model_loaded"]
        self.threshold = status["threshold"]
        return status

    def predict_bisindo(self, raw_frames: list) -> dict:
        start_time = time.perf_counter()
        processed_frames = [normalize_landmarks(frame) for frame in raw_frames]
        input_seq = pad_sequence(processed_frames, target_len=FRAME_COUNT)
        result = model_loader.predict(input_seq)
        result["processing_time_ms"] = max(1, int((time.perf_counter() - start_time) * 1000))
        return result

    def predict_spelling(self, raw_frame: list) -> dict:
        start_time = time.perf_counter()
        norm_frame = normalize_landmarks(raw_frame)
        result = model_loader.predict_alphabet(norm_frame.reshape(1, 63))
        result["processing_time_ms"] = max(1, int((time.perf_counter() - start_time) * 1000))
        return result
