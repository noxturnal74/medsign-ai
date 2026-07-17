# -*- coding: utf-8 -*-
from __future__ import annotations

import json
from pathlib import Path
from typing import Any


BACKEND_DIR = Path(__file__).resolve().parents[2]
DEFAULT_LABELS_PATH = BACKEND_DIR / "data" / "metadata" / "labels.json"


def load_label_config(labels_path: str | Path | None = None) -> dict[str, Any]:
    path = Path(labels_path) if labels_path else DEFAULT_LABELS_PATH
    if not path.exists():
        raise FileNotFoundError(f"labels.json tidak ditemukan: {path}")

    with path.open("r", encoding="utf-8") as handle:
        config = json.load(handle)

    labels = config.get("labels", [])
    if not labels:
        raise ValueError(f"labels.json tidak memiliki daftar labels: {path}")

    ids = [item.get("id") for item in labels]
    slugs = [item.get("slug") for item in labels]
    if ids != list(range(len(labels))):
        raise ValueError("Label id harus berurutan mulai dari 0.")
    if len(set(slugs)) != len(slugs):
        raise ValueError("Label slug harus unik.")

    return config


def load_labels(labels_path: str | Path | None = None) -> list[str]:
    config = load_label_config(labels_path)
    return [item["slug"] for item in config["labels"]]


def load_label_items(labels_path: str | Path | None = None) -> list[dict[str, Any]]:
    config = load_label_config(labels_path)
    return list(config["labels"])


def label_to_index(labels_path: str | Path | None = None) -> dict[str, int]:
    return {label: index for index, label in enumerate(load_labels(labels_path))}


def get_model_contract(labels_path: str | Path | None = None) -> dict[str, Any]:
    config = load_label_config(labels_path)
    return {
        "version": config.get("version", "unknown"),
        "frame_count": int(config.get("frame_count", 30)),
        "feature_count": int(config.get("feature_count", 63)),
        "threshold": float(config.get("threshold", 0.5)),
        "labels": load_labels(labels_path),
    }
