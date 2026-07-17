# -*- coding: utf-8 -*-
from __future__ import annotations

import time
from pathlib import Path

import numpy as np

from app.ml.labels import BACKEND_DIR, get_model_contract, load_labels
from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT

try:
    import tensorflow as tf

    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


class ModelLoader:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ModelLoader, cls).__new__(cls)
            cls._instance.interpreter = None
            cls._instance.loaded = False
            cls._instance.model_path = None
            cls._instance.contract = get_model_contract()
            cls._instance.classes = load_labels()
            cls._instance.model_classes = list(cls._instance.classes)
            cls._instance.threshold = float(cls._instance.contract["threshold"])

            cls._instance.alphabet_interpreter = None
            cls._instance.alphabet_loaded = False
            cls._instance.alphabet_classes = [chr(i) for i in range(ord("A"), ord("Z") + 1)]
        return cls._instance

    def refresh_labels(self) -> None:
        self.contract = get_model_contract()
        self.classes = load_labels()
        self.threshold = float(self.contract["threshold"])

    def _resolve_model_path(self, model_path: str | Path) -> Path:
        path = Path(model_path)
        return path if path.is_absolute() else BACKEND_DIR / path

    def status(self) -> dict:
        return {
            "mode": "production" if self.loaded else "model_unavailable",
            "model_loaded": self.loaded,
            "label_count": len(self.classes),
            "threshold": self.threshold,
            "frame_count": FRAME_COUNT,
            "feature_count": FEATURE_COUNT,
            "input_shape": [FRAME_COUNT, FEATURE_COUNT],
            "output_class": len(self.model_classes) if self.loaded else len(self.classes),
            "model_path": str(self.model_path) if self.model_path else None,
        }

    def load(self, model_path: str | Path) -> bool:
        self.refresh_labels()
        path = self._resolve_model_path(model_path)
        self.model_path = path

        if not path.exists():
            print(f"[ML_MODEL] Model clinical belum ditemukan: {path}")
            self.loaded = False
            return False
        if not TF_AVAILABLE:
            print("[ML_MODEL] TensorFlow tidak tersedia. Model clinical tidak dimuat.")
            self.loaded = False
            return False

        try:
            self.interpreter = tf.lite.Interpreter(model_path=str(path))
            self.interpreter.allocate_tensors()
            self.input_details = self.interpreter.get_input_details()
            self.output_details = self.interpreter.get_output_details()

            output_shape = self.output_details[0].get("shape", [])
            if len(output_shape) >= 2:
                model_output_size = int(output_shape[-1])
                
                # Check for a sidecar labels file first
                import json
                sidecar_labels_path = path.parent / f"{path.stem}_labels.json"
                
                if sidecar_labels_path.exists():
                    try:
                        with sidecar_labels_path.open("r", encoding="utf-8") as f:
                            self.model_classes = json.load(f)
                        print(f"[ML_MODEL] Berhasil memuat {len(self.model_classes)} kelas model dari sidecar: {sidecar_labels_path}")
                    except Exception as e:
                        print(f"[ML_MODEL] Gagal membaca sidecar labels: {e}")
                        self.model_classes = self.classes
                elif model_output_size == 12:
                    self.model_classes = ["sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "ya", "tidak", "tolong", "selesai"]
                elif model_output_size == 30:
                    self.model_classes = [
                        "sakit", "nyeri", "sesak", "batuk", "demam", "pusing", "mual", "muntah", "diare", "lemas",
                        "kepala", "dada", "perut", "tenggorokan", "tangan", "kaki", "punggung", "mata", "telinga", "leher",
                        "ya", "tidak", "sakit sekali", "lebih baik", "lebih buruk", "tolong", "tidak bisa bernapas", "nyeri dada", "pingsan", "bantuan segera"
                    ]
                else:
                    if model_output_size != len(self.classes):
                        print(f"[ML\_MODEL] Warning: Jumlah output model ({model_output_size}) tidak sesuai jumlah labels.json ({len(self.classes)}). Menggunakan {model_output_size} label pertama.")
                        self.model_classes = self.classes[:model_output_size]
                    else:
                        self.model_classes = self.classes
            else:
                self.model_classes = self.classes
                self.loaded = True
            print(f"[ML_MODEL] Model clinical TFLite berhasil dimuat: {path}")
            return True
        except Exception as exc:
            print(f"[ML_MODEL] Gagal memuat model clinical TFLite: {exc}")
            self.loaded = False
            self.interpreter = None
            return False

    def predict(self, frames_seq: np.ndarray) -> dict:
        start_time = time.perf_counter()
        if not self.loaded or self.interpreter is None:
            return {
                "prediction": None,
                "label": None,
                "confidence": 0.0,
                "top3": [],
                "status": "not_detected",
                "detected": False,
                "mode": "model_unavailable",
                "processing_time_ms": int((time.perf_counter() - start_time) * 1000),
            }

        arr = np.asarray(frames_seq, dtype=np.float32)
        if arr.shape != (1, FRAME_COUNT, FEATURE_COUNT):
            raise ValueError(f"Input model harus shape (1, {FRAME_COUNT}, {FEATURE_COUNT}), diterima {arr.shape}")

        self.interpreter.set_tensor(self.input_details[0]["index"], arr)
        self.interpreter.invoke()
        output_data = self.interpreter.get_tensor(self.output_details[0]["index"])[0]

        top_indices = np.argsort(output_data)[::-1][:3]
        raw_label = self.model_classes[int(top_indices[0])]
        confidence = float(output_data[int(top_indices[0])])
        detected = confidence >= self.threshold
        top3 = [
            {"word": self.model_classes[int(index)], "confidence": float(output_data[int(index)])}
            for index in top_indices
        ]

        return {
            "prediction": raw_label if detected else None,
            "label": raw_label if detected else None,
            "raw_prediction": raw_label,
            "confidence": confidence,
            "top3": top3,
            "status": "detected" if detected else "not_detected",
            "detected": detected,
            "mode": "production",
            "processing_time_ms": int((time.perf_counter() - start_time) * 1000),
        }

    def load_alphabet(self, model_path: str | Path) -> bool:
        path = self._resolve_model_path(model_path)
        if not path.exists():
            print(f"[ML_MODEL] Model abjad tidak ditemukan: {path}")
            self.alphabet_loaded = False
            return False
        if not TF_AVAILABLE:
            print("[ML_MODEL] TensorFlow tidak tersedia. Model abjad tidak dimuat.")
            self.alphabet_loaded = False
            return False

        try:
            self.alphabet_interpreter = tf.lite.Interpreter(model_path=str(path))
            self.alphabet_interpreter.allocate_tensors()
            self.alphabet_input_details = self.alphabet_interpreter.get_input_details()
            self.alphabet_output_details = self.alphabet_interpreter.get_output_details()
            self.alphabet_loaded = True
            print(f"[ML_MODEL] Model abjad TFLite berhasil dimuat: {path}")
            return True
        except Exception as exc:
            print(f"[ML_MODEL] Gagal memuat model abjad TFLite: {exc}")
            self.alphabet_loaded = False
            return False

    def predict_alphabet(self, flat_landmarks: np.ndarray) -> dict:
        start_time = time.perf_counter()
        if not self.alphabet_loaded or self.alphabet_interpreter is None:
            return {
                "prediction": None,
                "label": None,
                "confidence": 0.0,
                "top3": [],
                "status": "not_detected",
                "detected": False,
                "mode": "spelling_unavailable",
                "processing_time_ms": int((time.perf_counter() - start_time) * 1000),
            }

        self.alphabet_interpreter.set_tensor(self.alphabet_input_details[0]["index"], flat_landmarks.astype(np.float32))
        self.alphabet_interpreter.invoke()
        output_data = self.alphabet_interpreter.get_tensor(self.alphabet_output_details[0]["index"])[0]
        top_indices = np.argsort(output_data)[::-1][:3]
        confidence = float(output_data[int(top_indices[0])])
        raw_label = self.alphabet_classes[int(top_indices[0])]
        detected = confidence >= 0.70
        top3 = [
            {"word": self.alphabet_classes[int(index)], "confidence": float(output_data[int(index)])}
            for index in top_indices
        ]

        return {
            "prediction": raw_label if detected else None,
            "label": raw_label if detected else None,
            "raw_prediction": raw_label,
            "confidence": confidence,
            "top3": top3,
            "status": "detected" if detected else "not_detected",
            "detected": detected,
            "mode": "spelling",
            "processing_time_ms": max(1, int((time.perf_counter() - start_time) * 1000)),
        }
