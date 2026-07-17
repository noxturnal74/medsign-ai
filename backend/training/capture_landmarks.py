# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import csv
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from app.ml.labels import get_model_contract, load_label_items
from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT, empty_frame_ratio, normalize_landmarks

try:
    import cv2
    import mediapipe as mp

    CAMERA_AVAILABLE = True
except ImportError:
    CAMERA_AVAILABLE = False


DATA_DIR = BACKEND_DIR / "data"
LANDMARKS_DIR = DATA_DIR / "landmarks"
RAW_VIDEO_DIR = DATA_DIR / "raw_videos"
METADATA_DIR = DATA_DIR / "metadata"
RECORDINGS_CSV = METADATA_DIR / "recordings.csv"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Rekam dataset landmark MedSign dari webcam.")
    parser.add_argument("--label", help="Slug label dari labels.json, contoh: sakit")
    parser.add_argument("--signer-id", help="ID peraga/responden, contoh: signer_001")
    parser.add_argument("--take-id", help="ID take, contoh: take_001. Jika kosong, akan dibuat otomatis.")
    parser.add_argument("--num-takes", type=int, default=1, help="Jumlah sequence yang direkam.")
    parser.add_argument("--camera-index", type=int, default=0, help="Index kamera OpenCV.")
    parser.add_argument("--output-format", choices=["npy", "npz"], default="npy", help="Format file landmark.")
    parser.add_argument("--save-video", action="store_true", help="Simpan video mentah ke data/raw_videos.")
    parser.add_argument("--no-flip", action="store_true", help="Matikan mirror horizontal webcam.")
    parser.add_argument("--warmup-seconds", type=float, default=1.5, help="Jeda sebelum tiap take.")
    parser.add_argument("--dry-run", action="store_true", help="Cek kamera, label, signer, dan output path tanpa menyimpan data.")
    return parser.parse_args()


def choose_label(label_slug: str | None) -> str:
    labels = load_label_items()
    valid = {item["slug"] for item in labels}
    if label_slug:
        if label_slug not in valid:
            raise ValueError(f"Label '{label_slug}' tidak ada di labels.json. Pilihan: {', '.join(sorted(valid))}")
        return label_slug

    print("\nDaftar label MedSign MVP:")
    for item in labels:
        print(f"{item['id'] + 1:02d}. {item['slug']} ({item['display']})")

    selected = int(input("\nPilih nomor label: ").strip()) - 1
    for item in labels:
        if item["id"] == selected:
            return item["slug"]
    raise ValueError("Nomor label tidak valid.")


def prompt_if_empty(value: str | None, prompt: str, default: str | None = None) -> str:
    if value:
        return value
    suffix = f" [{default}]" if default else ""
    entered = input(f"{prompt}{suffix}: ").strip()
    return entered or (default or "")


def ensure_dirs() -> None:
    for path in [LANDMARKS_DIR, RAW_VIDEO_DIR, METADATA_DIR]:
        path.mkdir(parents=True, exist_ok=True)


def check_camera(camera_index: int) -> tuple[bool, tuple[int, ...] | None]:
    cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
    try:
        if not cap.isOpened():
            return False, None
        ok, frame = cap.read()
        return bool(ok and frame is not None), tuple(frame.shape) if ok and frame is not None else None
    finally:
        cap.release()


def append_recording_metadata(row: dict[str, str | int | float]) -> None:
    RECORDINGS_CSV.parent.mkdir(parents=True, exist_ok=True)
    fieldnames = [
        "recording_id",
        "label",
        "signer_id",
        "take_id",
        "frames",
        "feature_count",
        "empty_frame_ratio",
        "landmark_file",
        "raw_video_file",
        "created_at",
    ]
    exists = RECORDINGS_CSV.exists()
    with RECORDINGS_CSV.open("a", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        if not exists:
            writer.writeheader()
        writer.writerow(row)


def extract_primary_hand(results) -> np.ndarray:
    if not results.multi_hand_landmarks:
        return np.zeros(FEATURE_COUNT, dtype=np.float32)
    hand = results.multi_hand_landmarks[0]
    points = [[lm.x, lm.y, lm.z] for lm in hand.landmark]
    return normalize_landmarks(points)


def build_take_id(base_take_id: str | None, take_index: int, num_takes: int) -> str:
    if base_take_id and num_takes == 1:
        return base_take_id
    if base_take_id:
        return f"{base_take_id}_{take_index + 1:03d}"
    return datetime.now().strftime("%Y%m%d_%H%M%S") + f"_{take_index + 1:03d}"


def save_sequence(sequence: np.ndarray, label: str, signer_id: str, take_id: str, output_format: str) -> Path:
    output_dir = LANDMARKS_DIR / label / signer_id
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{label}_{signer_id}_{take_id}.{output_format}"
    if output_format == "npz":
        np.savez_compressed(
            output_path,
            sequence=sequence.astype(np.float32),
            label=label,
            signer_id=signer_id,
            take_id=take_id,
        )
    else:
        np.save(output_path, sequence.astype(np.float32))
    return output_path


def record_take(args: argparse.Namespace, label: str, signer_id: str, take_id: str) -> tuple[Path, Path | None, float]:
    mp_hands = mp.solutions.hands
    mp_draw = mp.solutions.drawing_utils
    hands = mp_hands.Hands(
        static_image_mode=False,
        max_num_hands=1,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.6,
    )

    cap = cv2.VideoCapture(args.camera_index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        raise RuntimeError(f"Kamera index {args.camera_index} tidak bisa dibuka.")

    video_writer = None
    video_path = None
    sequence: list[np.ndarray] = []

    try:
        print(f"\nSiap merekam label='{label}', signer='{signer_id}', take='{take_id}'")
        print("Tekan q untuk membatalkan. Pastikan tangan terlihat penuh di kamera.")
        time.sleep(max(0.0, args.warmup_seconds))

        while len(sequence) < FRAME_COUNT:
            ok, frame = cap.read()
            if not ok:
                break
            if not args.no_flip:
                frame = cv2.flip(frame, 1)

            if args.save_video and video_writer is None:
                RAW_VIDEO_DIR.joinpath(label, signer_id).mkdir(parents=True, exist_ok=True)
                video_path = RAW_VIDEO_DIR / label / signer_id / f"{label}_{signer_id}_{take_id}.mp4"
                height, width = frame.shape[:2]
                fourcc = cv2.VideoWriter_fourcc(*"mp4v")
                video_writer = cv2.VideoWriter(str(video_path), fourcc, 30.0, (width, height))

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = hands.process(rgb)
            landmarks = extract_primary_hand(results)
            sequence.append(landmarks)

            if video_writer is not None:
                video_writer.write(frame)

            if results.multi_hand_landmarks:
                mp_draw.draw_landmarks(frame, results.multi_hand_landmarks[0], mp_hands.HAND_CONNECTIONS)

            status = "TERDETEKSI" if not np.allclose(landmarks, 0.0) else "KOSONG"
            cv2.putText(frame, f"{label.upper()} | {signer_id} | {take_id}", (12, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 220, 0), 2)
            cv2.putText(frame, f"Frame {len(sequence)}/{FRAME_COUNT} | {status}", (12, 64), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 220, 220), 2)
            cv2.imshow("MedSign Capture Landmark", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                raise KeyboardInterrupt("Perekaman dibatalkan.")

        if len(sequence) != FRAME_COUNT:
            raise RuntimeError(f"Sequence tidak lengkap: {len(sequence)}/{FRAME_COUNT} frame.")

        arr = np.asarray(sequence, dtype=np.float32).reshape(FRAME_COUNT, FEATURE_COUNT)
        landmark_path = save_sequence(arr, label, signer_id, take_id, args.output_format)
        return landmark_path, video_path, empty_frame_ratio(arr)
    finally:
        cap.release()
        hands.close()
        if video_writer is not None:
            video_writer.release()
        cv2.destroyAllWindows()


def main() -> int:
    if not CAMERA_AVAILABLE:
        print("OpenCV dan MediaPipe belum tersedia. Instal dengan: pip install opencv-python mediapipe")
        return 1

    ensure_dirs()
    contract = get_model_contract()
    if contract["frame_count"] != FRAME_COUNT or contract["feature_count"] != FEATURE_COUNT:
        raise ValueError("Kontrak labels.json tidak sesuai dengan capture script.")

    args = parse_args()
    label = choose_label(args.label)
    signer_id = prompt_if_empty(args.signer_id, "Masukkan signer_id", "signer_001")
    if not signer_id:
        raise ValueError("signer_id wajib diisi.")

    if args.dry_run:
        camera_ok, frame_shape = check_camera(args.camera_index)
        planned_take_ids = [build_take_id(args.take_id, index, args.num_takes) for index in range(args.num_takes)]
        output_dir = LANDMARKS_DIR / label / signer_id
        print("\n=== DRY RUN CAPTURE MEDSIGN ===")
        print(f"label           : {label}")
        print(f"signer_id       : {signer_id}")
        print(f"num_takes       : {args.num_takes}")
        print(f"take_id sample  : {', '.join(planned_take_ids[:3])}{' ...' if len(planned_take_ids) > 3 else ''}")
        print(f"output_dir      : {output_dir}")
        print(f"output_format   : {args.output_format}")
        print(f"contract        : ({FRAME_COUNT}, {FEATURE_COUNT})")
        print(f"camera_index    : {args.camera_index}")
        print(f"camera_ok       : {camera_ok}")
        print(f"frame_shape     : {frame_shape}")
        print("Tidak ada file yang disimpan.")
        return 0

    for take_index in range(args.num_takes):
        take_id = build_take_id(args.take_id, take_index, args.num_takes)
        landmark_path, video_path, missing_ratio = record_take(args, label, signer_id, take_id)
        append_recording_metadata(
            {
                "recording_id": landmark_path.stem,
                "label": label,
                "signer_id": signer_id,
                "take_id": take_id,
                "frames": FRAME_COUNT,
                "feature_count": FEATURE_COUNT,
                "empty_frame_ratio": f"{missing_ratio:.4f}",
                "landmark_file": str(landmark_path.relative_to(DATA_DIR)),
                "raw_video_file": str(video_path.relative_to(DATA_DIR)) if video_path else "",
                "created_at": datetime.now().isoformat(timespec="seconds"),
            }
        )
        print(f"Tersimpan: {landmark_path} | empty_frame_ratio={missing_ratio:.2%}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
