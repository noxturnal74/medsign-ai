# -*- coding: utf-8 -*-
from __future__ import annotations

import numpy as np


FRAME_COUNT = 30
LANDMARK_COUNT = 21
COORDS_PER_LANDMARK = 3
FEATURE_COUNT = LANDMARK_COUNT * COORDS_PER_LANDMARK
EPSILON = 1e-6


def _coerce_landmarks(landmarks_raw) -> np.ndarray:
    if landmarks_raw is None:
        return np.zeros((LANDMARK_COUNT, COORDS_PER_LANDMARK), dtype=np.float32)

    if isinstance(landmarks_raw, np.ndarray):
        arr = landmarks_raw.astype(np.float32, copy=False)
    elif isinstance(landmarks_raw, list) and landmarks_raw and isinstance(landmarks_raw[0], dict):
        arr = np.array(
            [[point.get("x", 0.0), point.get("y", 0.0), point.get("z", 0.0)] for point in landmarks_raw],
            dtype=np.float32,
        )
    else:
        arr = np.array(landmarks_raw, dtype=np.float32)

    if arr.size == 0:
        return np.zeros((LANDMARK_COUNT, COORDS_PER_LANDMARK), dtype=np.float32)
    if arr.shape == (LANDMARK_COUNT, COORDS_PER_LANDMARK):
        return arr
    if arr.size == FEATURE_COUNT:
        return arr.reshape(LANDMARK_COUNT, COORDS_PER_LANDMARK)

    raise ValueError(f"Landmark frame harus berisi {FEATURE_COUNT} nilai atau shape (21, 3), diterima: {arr.shape}")


def normalize_landmarks(landmarks_raw) -> np.ndarray:
    """
    Kontrak preprocessing MedSign:
    1. reshape ke 21 landmark x/y/z,
    2. geser origin ke wrist atau landmark ke-0,
    3. scale dengan jarak terbesar dari wrist,
    4. return flat float32 shape (63,).
    """
    pts = _coerce_landmarks(landmarks_raw).astype(np.float32, copy=True)
    if not np.isfinite(pts).all() or np.allclose(pts, 0.0):
        return np.zeros(FEATURE_COUNT, dtype=np.float32)

    pts -= pts[0].copy()
    max_dist = float(np.linalg.norm(pts[1:], axis=1).max()) if len(pts) > 1 else 0.0
    if max_dist <= EPSILON:
        return np.zeros(FEATURE_COUNT, dtype=np.float32)

    pts /= max_dist
    pts = np.nan_to_num(pts, nan=0.0, posinf=0.0, neginf=0.0)
    return pts.reshape(FEATURE_COUNT).astype(np.float32)


def is_empty_frame(frame) -> bool:
    arr = np.array(frame, dtype=np.float32)
    return arr.size == 0 or not np.isfinite(arr).all() or np.allclose(arr, 0.0)


def normalize_sequence(frames, target_len: int = FRAME_COUNT) -> np.ndarray:
    normalized = [normalize_landmarks(frame) for frame in frames]
    return pad_sequence(normalized, target_len=target_len)[0]


def pad_sequence(frames, target_len: int = FRAME_COUNT) -> np.ndarray:
    """
    Padding kiri agar output selalu shape (1, 30, 63).
    Jika frame lebih dari 30, ambil 30 frame terakhir.
    """
    arr = np.array(frames, dtype=np.float32)
    if arr.size == 0:
        arr = np.zeros((0, FEATURE_COUNT), dtype=np.float32)
    if arr.ndim == 1:
        arr = arr.reshape(1, FEATURE_COUNT)
    if arr.shape[-1] != FEATURE_COUNT:
        raise ValueError(f"Sequence harus memiliki {FEATURE_COUNT} fitur per frame, diterima: {arr.shape}")

    if len(arr) >= target_len:
        seq = arr[-target_len:]
    else:
        padding = np.zeros((target_len - len(arr), FEATURE_COUNT), dtype=np.float32)
        seq = np.vstack([padding, arr])

    return seq.reshape(1, target_len, FEATURE_COUNT).astype(np.float32)


def empty_frame_ratio(sequence) -> float:
    arr = np.array(sequence, dtype=np.float32)
    if arr.ndim != 2 or len(arr) == 0:
        return 1.0
    empty_count = sum(1 for frame in arr if is_empty_frame(frame))
    return empty_count / len(arr)
