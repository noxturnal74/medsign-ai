# -*- coding: utf-8 -*-
import numpy as np

def normalize_landmarks(landmarks_raw: list) -> np.ndarray:
    """
    SRS-F-03: Preprocessing Koordinat
    Input: Array 21 landmark mentah dari MediaPipe (list of dict/list)
    Proses:
      1. Origin Shift: Kurangi semua koordinat dengan koordinat titik 0 (wrist)
      2. Scale: Bagi semua koordinat dengan max distance dari wrist
      3. Flatten: Reshape (21, 3) -> (63,) flat array
    Output: Array 63 float, rentang [-1, 1]
    """
    # Pastikan format input berupa numpy array (21, 3)
    if isinstance(landmarks_raw[0], dict):
        pts = np.array([[p['x'], p['y'], p['z']] for p in landmarks_raw], dtype=np.float32)
    else:
        pts = np.array(landmarks_raw, dtype=np.float32).reshape(21, 3)
        
    # 1. Shift ke origin wrist (titik 0)
    origin = pts[0].copy()
    pts -= origin
    
    # 2. Scale normalization
    distances = np.linalg.norm(pts[1:], axis=1)
    max_dist = distances.max() if len(distances) > 0 else 0
    if max_dist > 0:
        pts /= max_dist
        
    # 3. Flatten & reshape
    return pts.flatten() # (63,)

def pad_sequence(frames: list, target_len: int = 30) -> np.ndarray:
    """
    Melakukan padding sequence frame landmark jika jumlah frame kurang dari target_len (30).
    Padding diisi zeros di sisi kiri (SRS-F-03).
    Input: list berisi array (63,)
    Output: array shape (1, 30, 63) float32
    """
    if len(frames) >= target_len:
        # Ambil 30 frame terakhir
        seq = np.array(frames[-target_len:], dtype=np.float32)
    else:
        # Padding kiri dengan zeros
        padding = np.zeros((target_len - len(frames), 63), dtype=np.float32)
        seq = np.vstack([padding, np.array(frames, dtype=np.float32)])
        
    return seq.reshape(1, target_len, 63)
