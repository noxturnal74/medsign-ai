# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
TRAINING_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from app.ml.labels import get_model_contract, load_labels


DATA_DIR = BACKEND_DIR / "data"
LANDMARKS_DIR = DATA_DIR / "landmarks"
REPORTS_DIR = BACKEND_DIR / "reports"


OPERATOR_GUIDE = """
Panduan operator:
1. Pastikan peraga duduk/berdiri stabil, tangan di posisi siap.
2. Operator memberi aba-aba MULAI.
3. Peraga melakukan gesture dengan jelas, tidak terlalu cepat.
4. Peraga kembali ke posisi siap setelah gesture.
5. Ulangi take berikutnya hanya setelah operator memberi aba-aba lagi.
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Workflow capture semua label MVP untuk satu signer.")
    parser.add_argument("--signer-id", required=True, help="ID peraga/responden, contoh: signer_001")
    parser.add_argument("--takes-per-label", type=int, default=10, help="Minimal 10 take per label per signer.")
    parser.add_argument("--camera-index", type=int, default=0)
    parser.add_argument("--session-id", default=datetime.now().strftime("%Y%m%d_%H%M%S"))
    parser.add_argument("--labels", nargs="*", help="Subset label. Default: semua label dari labels.json.")
    parser.add_argument("--save-video", action="store_true")
    parser.add_argument("--no-flip", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--no-prompt", action="store_true", help="Jangan tunggu Enter antar label.")
    parser.add_argument("--train-when-ready", action="store_true", help="Jalankan training GRU jika dataset penuh sudah siap.")
    return parser.parse_args()


def run_command(command: list[str], cwd: Path = BACKEND_DIR) -> int:
    print("\n$ " + " ".join(command))
    sys.stdout.flush()
    return subprocess.call(command, cwd=str(cwd))


def check_camera(python_exe: str, camera_index: int) -> int:
    return run_command([
        python_exe,
        str(TRAINING_DIR / "realtime_inference.py"),
        "--camera-check",
        "--camera-index",
        str(camera_index),
    ])


def validate_labels(requested: list[str] | None) -> list[str]:
    labels = load_labels()
    if not requested:
        return labels
    unknown = sorted(set(requested) - set(labels))
    if unknown:
        raise ValueError("Label tidak ada di labels.json: " + ", ".join(unknown))
    return requested


def planned_paths(labels: list[str], signer_id: str, session_id: str, takes_per_label: int) -> list[Path]:
    paths = []
    for label in labels:
        for index in range(1, takes_per_label + 1):
            take_id = f"{session_id}_{label}_{index:03d}"
            paths.append(LANDMARKS_DIR / label / signer_id / f"{label}_{signer_id}_{take_id}.npy")
    return paths


def write_collection_summary(labels: list[str], signer_id: str) -> Path:
    summary = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "signer_id": signer_id,
        "labels": {},
    }
    for label in labels:
        label_dir = LANDMARKS_DIR / label / signer_id
        files = sorted(label_dir.glob("*.npy")) + sorted(label_dir.glob("*.npz")) if label_dir.exists() else []
        summary["labels"][label] = {
            "signer_id": signer_id,
            "sample_count": len(files),
            "directory": str(label_dir),
        }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    json_path = REPORTS_DIR / f"data_collection_summary_{signer_id}.json"
    md_path = REPORTS_DIR / f"DATA_COLLECTION_SUMMARY_{signer_id}.md"
    json_path.write_text(json.dumps(summary, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = [
        f"# DATA_COLLECTION_SUMMARY_{signer_id}",
        "",
        f"Generated at: {summary['generated_at']}",
        "",
        "| Label | Signer | Samples | Directory |",
        "|---|---|---:|---|",
    ]
    for label, item in summary["labels"].items():
        lines.append(f"| `{label}` | `{signer_id}` | {item['sample_count']} | `{item['directory']}` |")
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return md_path


def main() -> int:
    args = parse_args()
    if args.takes_per_label < 10:
        raise ValueError("--takes-per-label minimal 10 untuk workflow MVP.")

    python_exe = sys.executable
    labels = validate_labels(args.labels)
    contract = get_model_contract()

    print("=== MedSign Data Collection Workflow ===")
    print(f"signer_id       : {args.signer_id}")
    print(f"session_id      : {args.session_id}")
    print(f"labels          : {', '.join(labels)}")
    print(f"takes_per_label : {args.takes_per_label}")
    print(f"contract        : ({contract['frame_count']}, {contract['feature_count']})")
    print(OPERATOR_GUIDE)

    camera_status = check_camera(python_exe, args.camera_index)
    if camera_status != 0:
        return camera_status

    if args.dry_run:
        print("\n=== DRY RUN: planned output paths ===")
        for path in planned_paths(labels, args.signer_id, args.session_id, args.takes_per_label)[:24]:
            print(path)
        total = len(labels) * args.takes_per_label
        print(f"Total planned samples: {total}")
        print("Tidak ada file yang disimpan.")
        return 0

    for label in labels:
        print("\n" + "=" * 72)
        print(f"Label berikutnya: {label.upper()} | signer: {args.signer_id}")
        print(OPERATOR_GUIDE)
        if not args.no_prompt:
            input("Tekan ENTER jika peraga dan operator sudah siap...")

        capture_cmd = [
            python_exe,
            str(TRAINING_DIR / "capture_landmarks.py"),
            "--label",
            label,
            "--signer-id",
            args.signer_id,
            "--take-id",
            f"{args.session_id}_{label}",
            "--num-takes",
            str(args.takes_per_label),
            "--camera-index",
            str(args.camera_index),
        ]
        if args.save_video:
            capture_cmd.append("--save-video")
        if args.no_flip:
            capture_cmd.append("--no-flip")

        status = run_command(capture_cmd)
        if status != 0:
            print(f"Capture label {label} berhenti dengan status {status}. Workflow dihentikan.")
            return status

        validate_cmd = [
            python_exe,
            str(TRAINING_DIR / "validate_dataset.py"),
            "--label",
            label,
            "--signer-id",
            args.signer_id,
            "--quarantine-invalid",
        ]
        status = run_command(validate_cmd)
        if status != 0:
            print(f"Validasi label {label} gagal dengan status {status}. Workflow dihentikan.")
            return status

        summary_path = write_collection_summary(labels, args.signer_id)
        print(f"Ringkasan sementara: {summary_path}")

    run_command([python_exe, str(TRAINING_DIR / "validate_dataset.py"), "--quarantine-invalid"])
    summary_path = write_collection_summary(labels, args.signer_id)
    print(f"\nRingkasan final signer: {summary_path}")

    if args.train_when_ready:
        health_path = REPORTS_DIR / "dataset_health_report.json"
        report = json.loads(health_path.read_text(encoding="utf-8")) if health_path.exists() else {}
        counts = report.get("counts", {})
        invalid = report.get("total_invalid_samples", 0)
        ready = invalid == 0 and all(int(counts.get(label, 0)) >= 30 for label in load_labels())
        if ready:
            return run_command([
                python_exe,
                str(TRAINING_DIR / "train_clinical_model.py"),
                "--architecture",
                "gru",
            ])
        print("Dataset belum memenuhi minimal 30 sample valid per label. Training belum dijalankan.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
