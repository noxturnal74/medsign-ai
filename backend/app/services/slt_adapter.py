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
        self.locked_model = None
        self.locked_alphabet_model = None
        self.check_and_reload()
        self.contract = get_model_contract()
        self.available = model_loader.loaded
        self.threshold = float(self.contract["threshold"])
        print(f"[SLT_ADAPTER] Mode clinical: {'PRODUCTION' if self.available else 'MODEL_UNAVAILABLE'}")

    def check_and_reload(self):
        from pathlib import Path
        if self.locked_model is None:
            model_path = Path("models/medsign_mvp_v1.tflite")
            resolved_path = model_loader._resolve_model_path(model_path)
            if not resolved_path.exists():
                model_path = Path("models/medsign_v1.tflite")
                resolved_path = model_loader._resolve_model_path(model_path)

            if resolved_path.exists():
                try:
                    mtime = resolved_path.stat().st_mtime
                    if not model_loader.loaded or model_loader.interpreter is None or model_loader.model_mtime != mtime:
                        print(f"[SLT_ADAPTER] Mendeteksi perubahan model disk. Memuat ulang model: {resolved_path}")
                        model_loader.load(model_path)
                except Exception as e:
                    print(f"[SLT_ADAPTER] Gagal mengecek/memuat ulang model: {e}")

        # Pastikan model abjad juga dimuat dan sinkron
        if self.locked_alphabet_model is not None:
            return
        alphabet_path = Path("models/bisindo_alphabet_v1.tflite")
        resolved_alpha = model_loader._resolve_model_path(alphabet_path)
        if resolved_alpha.exists():
            try:
                alpha_mtime = resolved_alpha.stat().st_mtime
                if not model_loader.alphabet_loaded or model_loader.alphabet_interpreter is None or model_loader.alphabet_mtime != alpha_mtime:
                    print(f"[SLT_ADAPTER] Memuat model abjad: {resolved_alpha}")
                    model_loader.load_alphabet(alphabet_path)
            except Exception as e:
                print(f"[SLT_ADAPTER] Gagal mengecek/memuat ulang model abjad: {e}")

    def select_model(self, model_name: str, model_type: str = "clinical"):
        from pathlib import Path
        model_path = Path("models") / model_name
        if model_type == "alphabet":
            self.locked_alphabet_model = model_name
            model_loader.load_alphabet(model_path)
            print(f"[SLT_ADAPTER] Active alphabet model set to: {model_name}")
        else:
            self.locked_model = model_name
            model_loader.load(model_path)
            print(f"[SLT_ADAPTER] Active clinical model set to: {model_name}")

    def reset_model(self):
        self.locked_model = None
        self.locked_alphabet_model = None
        self.check_and_reload()

    def status(self) -> dict:
        status = model_loader.status()
        self.available = status["model_loaded"]
        self.threshold = status["threshold"]
        return status

    def predict_bisindo(self, raw_frames: list) -> dict:
        self.check_and_reload()
        start_time = time.perf_counter()
        processed_frames = [normalize_landmarks(frame) for frame in raw_frames]
        input_seq = pad_sequence(processed_frames, target_len=FRAME_COUNT)
        result = model_loader.predict(input_seq)
        result["processing_time_ms"] = max(1, int((time.perf_counter() - start_time) * 1000))
        return result

    def predict_spelling(self, raw_frame: list, frames: list | None = None) -> dict:
        self.check_and_reload()
        start_time = time.perf_counter()

        if frames and len(frames) >= 1:
            processed_frames = [normalize_landmarks(f) for f in frames]
            input_seq = pad_sequence(processed_frames, target_len=FRAME_COUNT)
            result = model_loader.predict_alphabet(input_seq)
        else:
            norm_frame = normalize_landmarks(raw_frame)
            result = model_loader.predict_alphabet(norm_frame)

        result["processing_time_ms"] = max(1, int((time.perf_counter() - start_time) * 1000))
        return result
