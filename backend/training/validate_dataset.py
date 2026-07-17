# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import json
import shutil
import sys
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import numpy as np

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from app.ml.labels import get_model_contract, load_labels
from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT, empty_frame_ratio


DATA_DIR = BACKEND_DIR / "data"
LANDMARKS_DIR = DATA_DIR / "landmarks"
INVALID_DIR = DATA_DIR / "invalid_samples"
REPORTS_DIR = BACKEND_DIR / "reports"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validasi dataset landmark MedSign.")
    parser.add_argument("--landmarks-dir", type=Path, default=LANDMARKS_DIR)
    parser.add_argument("--invalid-dir", type=Path, default=INVALID_DIR)
    parser.add_argument("--reports-dir", type=Path, default=REPORTS_DIR)
    parser.add_argument("--label", help="Validasi cepat untuk satu label.")
    parser.add_argument("--signer-id", help="Validasi cepat untuk satu signer.")
    parser.add_argument("--max-empty-frame-ratio", type=float, default=0.10)
    parser.add_argument("--quarantine-invalid", action="store_true", help="Pindahkan sample invalid ke backend/data/invalid_samples.")
    return parser.parse_args()


def load_sequence(path: Path) -> np.ndarray:
    if path.suffix == ".npz":
        data = np.load(path, allow_pickle=True)
        if "sequence" in data.files:
            return np.asarray(data["sequence"], dtype=np.float32)
        if "X" in data.files:
            arr = np.asarray(data["X"], dtype=np.float32)
            return arr[0] if arr.ndim == 3 else arr
        raise ValueError(f"NPZ tidak memiliki key sequence atau X: {path}")
    return np.asarray(np.load(path, allow_pickle=True), dtype=np.float32)


def infer_label_and_signer(path: Path, landmarks_dir: Path) -> tuple[str, str]:
    rel = path.relative_to(landmarks_dir)
    label = rel.parts[0] if rel.parts else "unknown"
    signer = rel.parts[1] if len(rel.parts) > 2 else "unknown"
    return label, signer


def audit_dataset(
    landmarks_dir: Path,
    label_filter: str | None = None,
    signer_filter: str | None = None,
    max_empty_frame_ratio: float = 0.10,
) -> dict:
    labels = load_labels()
    contract = get_model_contract()
    samples = []
    invalid = []
    counts = Counter()
    signer_counts = defaultdict(Counter)
    missing_ratios = defaultdict(list)

    if landmarks_dir.exists():
        paths = sorted([*landmarks_dir.rglob("*.npy"), *landmarks_dir.rglob("*.npz")])
    else:
        paths = []

    for path in paths:
        try:
            label, signer = infer_label_and_signer(path, landmarks_dir)
            if label_filter and label != label_filter:
                continue
            if signer_filter and signer != signer_filter:
                continue
            arr = load_sequence(path)
            shape_ok = arr.shape == (FRAME_COUNT, FEATURE_COUNT)
            ratio = empty_frame_ratio(arr) if arr.ndim == 2 else 1.0
            if label not in labels:
                invalid.append({"file": str(path), "reason": f"label '{label}' tidak ada di labels.json"})
                continue
            if not shape_ok:
                invalid.append({"file": str(path), "reason": f"shape {arr.shape}, target {(FRAME_COUNT, FEATURE_COUNT)}"})
                continue
            if not np.isfinite(arr).all():
                invalid.append({"file": str(path), "reason": "berisi NaN atau Inf"})
                continue
            if ratio > max_empty_frame_ratio:
                invalid.append({
                    "file": str(path),
                    "reason": f"empty_frame_ratio {ratio:.2%} melebihi batas {max_empty_frame_ratio:.2%}",
                })
                continue

            counts[label] += 1
            signer_counts[label][signer] += 1
            missing_ratios[label].append(ratio)
            samples.append({"file": str(path), "label": label, "signer": signer, "empty_frame_ratio": ratio})
        except Exception as exc:
            invalid.append({"file": str(path), "reason": str(exc)})

    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "contract": contract,
        "filters": {
            "label": label_filter,
            "signer_id": signer_filter,
            "max_empty_frame_ratio": max_empty_frame_ratio,
        },
        "total_valid_samples": len(samples),
        "total_invalid_samples": len(invalid),
        "counts": {label: counts[label] for label in labels},
        "signer_counts": {label: dict(signer_counts[label]) for label in labels},
        "missing_ratio_avg": {
            label: round(float(np.mean(missing_ratios[label])), 4) if missing_ratios[label] else None
            for label in labels
        },
        "invalid": invalid,
    }


def quarantine_invalid_samples(report: dict, landmarks_dir: Path, invalid_dir: Path) -> dict:
    moved = []
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    for item in report["invalid"]:
        source = Path(item["file"])
        if not source.exists():
            item["quarantine_status"] = "source_missing"
            continue
        try:
            relative = source.relative_to(landmarks_dir)
        except ValueError:
            relative = Path(source.name)
        destination = invalid_dir / timestamp / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(destination))
        item["quarantined_to"] = str(destination)
        item["quarantine_status"] = "moved"
        moved.append({"from": str(source), "to": str(destination), "reason": item["reason"]})
    report["quarantine"] = {
        "enabled": True,
        "moved_count": len(moved),
        "moved": moved,
    }
    return report


def render_markdown(report: dict) -> str:
    labels = report["contract"]["labels"]
    lines = [
        "# DATASET_HEALTH_REPORT",
        "",
        f"Generated at: {report['generated_at']}",
        "",
        "## Contract",
        "",
        f"- Version: `{report['contract']['version']}`",
        f"- Frame count: `{report['contract']['frame_count']}`",
        f"- Feature count: `{report['contract']['feature_count']}`",
        f"- Labels: `{len(labels)}`",
        "",
        "## Summary",
        "",
        f"- Filter label: `{report['filters']['label'] or 'all'}`",
        f"- Filter signer: `{report['filters']['signer_id'] or 'all'}`",
        f"- Max empty frame ratio: `{report['filters']['max_empty_frame_ratio']:.2%}`",
        f"- Valid samples: **{report['total_valid_samples']}**",
        f"- Invalid samples: **{report['total_invalid_samples']}**",
        "",
        "## Samples Per Label",
        "",
        "| Label | Samples | Signers | Avg empty frame ratio | Status |",
        "|---|---:|---:|---:|---|",
    ]

    for label in labels:
        count = report["counts"][label]
        signer_count = len(report["signer_counts"][label])
        ratio = report["missing_ratio_avg"][label]
        ratio_text = "-" if ratio is None else f"{ratio:.2%}"
        if count == 0:
            status = "missing"
        elif count < 30:
            status = "low_sample"
        elif ratio is not None and ratio > 0.10:
            status = "needs_review"
        else:
            status = "ok"
        lines.append(f"| `{label}` | {count} | {signer_count} | {ratio_text} | {status} |")

    lines.extend(["", "## Signer Distribution", ""])
    for label in labels:
        lines.append(f"### {label}")
        if report["signer_counts"][label]:
            for signer, count in sorted(report["signer_counts"][label].items()):
                lines.append(f"- `{signer}`: {count}")
        else:
            lines.append("- Belum ada data.")
        lines.append("")

    if report["invalid"]:
        lines.extend(["## Invalid Samples", "", "| File | Reason | Quarantine |", "|---|---|---|"])
        for item in report["invalid"][:200]:
            quarantine = item.get("quarantined_to", item.get("quarantine_status", "-"))
            lines.append(f"| `{item['file']}` | {item['reason']} | `{quarantine}` |")
    else:
        lines.extend(["## Invalid Samples", "", "Tidak ada invalid sample."])

    if report.get("quarantine"):
        lines.extend([
            "",
            "## Quarantine",
            "",
            f"- Enabled: `{report['quarantine']['enabled']}`",
            f"- Moved count: `{report['quarantine']['moved_count']}`",
        ])

    return "\n".join(lines) + "\n"


def report_file_stem(label: str | None, signer_id: str | None) -> str:
    parts = ["DATASET_HEALTH_REPORT"]
    if label:
        parts.append(label)
    if signer_id:
        parts.append(signer_id)
    return "_".join(parts)


def main() -> int:
    args = parse_args()
    args.reports_dir.mkdir(parents=True, exist_ok=True)
    report = audit_dataset(
        args.landmarks_dir,
        label_filter=args.label,
        signer_filter=args.signer_id,
        max_empty_frame_ratio=args.max_empty_frame_ratio,
    )
    if args.quarantine_invalid and report["invalid"]:
        report = quarantine_invalid_samples(report, args.landmarks_dir, args.invalid_dir)

    stem = report_file_stem(args.label, args.signer_id)
    md_path = args.reports_dir / f"{stem}.md"
    json_path = args.reports_dir / f"{stem.lower()}.json"
    md_path.write_text(render_markdown(report), encoding="utf-8")
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")

    if not args.label and not args.signer_id:
        (args.reports_dir / "DATASET_HEALTH_REPORT.md").write_text(render_markdown(report), encoding="utf-8")
        (args.reports_dir / "dataset_health_report.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )

    print(f"Laporan dataset ditulis ke {md_path}")
    print(f"Ringkasan JSON ditulis ke {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
