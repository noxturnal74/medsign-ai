# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import sys
import time
from collections import deque
from pathlib import Path

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from app.ml.labels import get_model_contract, load_labels
from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT, normalize_landmarks

try:
    import cv2
    import mediapipe as mp
    import tensorflow as tf

    RUNTIME_AVAILABLE = True
except ImportError:
    RUNTIME_AVAILABLE = False


DEFAULT_MODEL_PATH = BACKEND_DIR / "models" / "medsign_mvp_v1.tflite"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Demo realtime MedSign dari webcam.")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH)
    parser.add_argument("--camera-index", type=int, default=0)
    parser.add_argument("--threshold", type=float, default=None)
    parser.add_argument("--no-flip", action="store_true")
    parser.add_argument("--camera-check", action="store_true", help="Cek kamera satu frame lalu keluar tanpa butuh model.")
    return parser.parse_args()


def predict(interpreter, input_details, output_details, sequence: np.ndarray, labels: list[str]) -> tuple[str, float, list[dict]]:
    input_data = sequence.reshape(1, FRAME_COUNT, FEATURE_COUNT).astype(np.float32)
    interpreter.set_tensor(input_details[0]["index"], input_data)
    interpreter.invoke()
    probs = interpreter.get_tensor(output_details[0]["index"])[0]
    top_indices = np.argsort(probs)[::-1][:3]
    top3 = [{"word": labels[i], "confidence": float(probs[i])} for i in top_indices]
    return labels[top_indices[0]], float(probs[top_indices[0]]), top3


def main() -> int:
    if not RUNTIME_AVAILABLE:
        print("Butuh opencv-python, mediapipe, dan tensorflow untuk realtime demo.")
        return 1

    args = parse_args()
    if args.camera_check:
        cap = cv2.VideoCapture(args.camera_index, cv2.CAP_DSHOW)
        if not cap.isOpened():
            print(f"Kamera index {args.camera_index} tidak bisa dibuka.")
            return 1
        ok, frame = cap.read()
        cap.release()
        if not ok or frame is None:
            print("Kamera terbuka, tetapi frame tidak terbaca.")
            return 1
        print(f"Kamera OK: index={args.camera_index}, frame_shape={frame.shape}")
        return 0

    if not args.model.exists():
        print(f"Model TFLite belum ditemukan: {args.model}")
        print("Latih model dulu dengan: python training/train_clinical_model.py")
        return 1

    contract = get_model_contract()
    labels = load_labels()
    threshold = args.threshold if args.threshold is not None else float(contract["threshold"])

    interpreter = tf.lite.Interpreter(model_path=str(args.model))
    interpreter.allocate_tensors()
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()

    mp_hands = mp.solutions.hands
    mp_draw = mp.solutions.drawing_utils
    hands = mp_hands.Hands(max_num_hands=1, min_detection_confidence=0.6, min_tracking_confidence=0.6)
    cap = cv2.VideoCapture(args.camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"Kamera index {args.camera_index} tidak bisa dibuka.")
        return 1

    buffer = deque(maxlen=FRAME_COUNT)
    last_top3 = []
    label = None
    confidence = 0.0
    status = "not_detected"

    print("Realtime demo berjalan. Tekan q untuk keluar.")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            if not args.no_flip:
                frame = cv2.flip(frame, 1)

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            if results.multi_hand_landmarks:
                points = [[lm.x, lm.y, lm.z] for lm in results.multi_hand_landmarks[0].landmark]
                buffer.append(normalize_landmarks(points))
                mp_draw.draw_landmarks(frame, results.multi_hand_landmarks[0], mp_hands.HAND_CONNECTIONS)
            else:
                buffer.append(np.zeros(FEATURE_COUNT, dtype=np.float32))

            if len(buffer) == FRAME_COUNT:
                pred, confidence, last_top3 = predict(interpreter, input_details, output_details, np.asarray(buffer), labels)
                if confidence >= threshold:
                    label = pred
                    status = "detected"
                else:
                    label = None
                    status = "not_detected"

            display = label if label else "-"
            cv2.putText(frame, f"MedSign: {display} ({confidence:.2f})", (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 220, 0), 2)
            cv2.putText(frame, f"status={status} buffer={len(buffer)}/{FRAME_COUNT}", (12, 64), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 220, 220), 2)
            if last_top3:
                cv2.putText(frame, " | ".join(f"{item['word']} {item['confidence']:.2f}" for item in last_top3), (12, 96), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 0), 2)

            cv2.imshow("MedSign Realtime MVP", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
            time.sleep(0.001)
    finally:
        cap.release()
        hands.close()
        cv2.destroyAllWindows()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
