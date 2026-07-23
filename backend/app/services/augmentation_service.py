# -*- coding: utf-8 -*-
from __future__ import annotations
import numpy as np
from pathlib import Path
import json

class AugmentationService:
    def __init__(self):
        pass

    def translate(self, seq: np.ndarray, val_range=(-0.02, 0.02)) -> np.ndarray:
        # seq shape is (30, 63)
        dx = np.random.uniform(val_range[0], val_range[1])
        dy = np.random.uniform(val_range[0], val_range[1])
        dz = np.random.uniform(val_range[0], val_range[1])
        
        augmented = seq.copy()
        # Shift X, Y, Z coordinates
        for i in range(30):
            for j in range(21):
                augmented[i, j*3] += dx
                augmented[i, j*3 + 1] += dy
                augmented[i, j*3 + 2] += dz
        return augmented

    def random_offset(self, seq: np.ndarray, noise_range=(-0.01, 0.01)) -> np.ndarray:
        noise = np.random.uniform(noise_range[0], noise_range[1], seq.shape)
        return seq + noise

    def scale(self, seq: np.ndarray, scale_factors=[0.95, 1.05, 1.10]) -> np.ndarray:
        factor = np.random.choice(scale_factors)
        # Scale coordinates relative to wrist (joint 0)
        augmented = seq.copy()
        for i in range(30):
            wrist_x = seq[i, 0]
            wrist_y = seq[i, 1]
            wrist_z = seq[i, 2]
            for j in range(21):
                augmented[i, j*3] = wrist_x + (seq[i, j*3] - wrist_x) * factor
                augmented[i, j*3 + 1] = wrist_y + (seq[i, j*3 + 1] - wrist_y) * factor
                augmented[i, j*3 + 2] = wrist_z + (seq[i, j*3 + 2] - wrist_z) * factor
        return augmented

    def rotate(self, seq: np.ndarray, angle_range=(-10, 10)) -> np.ndarray:
        angle_deg = np.random.uniform(angle_range[0], angle_range[1])
        angle_rad = np.radians(angle_deg)
        
        # 2D Rotation matrix around Z-axis (yaw) for simplicity and stability in 2D MediaPipe projection
        cos_a = np.cos(angle_rad)
        sin_a = np.sin(angle_rad)
        
        augmented = seq.copy()
        for i in range(30):
            wrist_x = seq[i, 0]
            wrist_y = seq[i, 1]
            for j in range(21):
                x = seq[i, j*3] - wrist_x
                y = seq[i, j*3 + 1] - wrist_y
                augmented[i, j*3] = wrist_x + (x * cos_a - y * sin_a)
                augmented[i, j*3 + 1] = wrist_y + (x * sin_a + y * cos_a)
        return augmented

    def mirror(self, seq: np.ndarray) -> np.ndarray:
        # Mirror horizontally (X-axis flip relative to wrist/center)
        augmented = seq.copy()
        for i in range(30):
            wrist_x = seq[i, 0]
            for j in range(21):
                augmented[i, j*3] = wrist_x - (seq[i, j*3] - wrist_x)
        return augmented

    def jitter(self, seq: np.ndarray, scale=0.005) -> np.ndarray:
        # Add random Gaussian noise to selected landmarks
        noise = np.random.normal(0, scale, seq.shape)
        return seq + noise

    def temporal_shift(self, seq: np.ndarray, shift=2) -> np.ndarray:
        # Shift frames in sequence (30 frames)
        augmented = np.zeros_like(seq)
        if shift > 0:
            augmented[shift:] = seq[:-shift]
            # Pad beginning with first frame
            for i in range(shift):
                augmented[i] = seq[0]
        elif shift < 0:
            shift = abs(shift)
            augmented[:-shift] = seq[shift:]
            # Pad end with last frame
            for i in range(1, shift + 1):
                augmented[-i] = seq[-1]
        else:
            return seq
        return augmented

    def random_speed(self, seq: np.ndarray) -> np.ndarray:
        # Speed up or slow down via interpolation
        factor = np.random.choice([0.8, 1.2]) # 0.8 = faster, 1.2 = slower
        original_frames = np.arange(30)
        new_frames = np.linspace(0, 29, int(30 * factor))
        
        # Interpolate each coordinate
        interpolated = np.zeros((len(new_frames), 63))
        for col in range(63):
            interpolated[:, col] = np.interp(new_frames, original_frames, seq[:, col])
            
        # Downsample or pad back to 30 frames
        augmented = np.zeros_like(seq)
        if len(interpolated) >= 30:
            augmented = interpolated[:30]
        else:
            augmented[:len(interpolated)] = interpolated
            # Pad remaining with last frame
            for i in range(len(interpolated), 30):
                augmented[i] = interpolated[-1]
        return augmented

    def transformer_augment(self, seq: np.ndarray, noise_level=0.03) -> np.ndarray:
        # NumPy Transformer Encoder Self-Attention Generator
        seq_len, d_model = seq.shape
        pos = np.arange(seq_len)[:, np.newaxis]
        div_term = np.exp(np.arange(0, d_model, 2) * -(np.log(10000.0) / d_model))
        pe = np.zeros((seq_len, d_model))
        pe[:, 0::2] = np.sin(pos * div_term)
        pe[:, 1::2] = np.cos(pos * div_term)[:, :d_model//2]
        
        x = seq + pe
        
        # Attention Q @ K.T
        scores = np.matmul(x, x.T) / np.sqrt(d_model)
        exp_scores = np.exp(scores - np.max(scores, axis=-1, keepdims=True))
        attn_weights = exp_scores / np.sum(exp_scores, axis=-1, keepdims=True)
        
        # Inject attention noise for synthetic diversity
        attn_noise = np.random.normal(0, noise_level, attn_weights.shape)
        attn_weights_noisy = np.clip(attn_weights + attn_noise, 0, 1)
        attn_weights_noisy = attn_weights_noisy / np.sum(attn_weights_noisy, axis=-1, keepdims=True)
        
        out = np.matmul(attn_weights_noisy, x)
        res = out + seq
        
        # Dense feed-forward FFN
        W1 = np.random.normal(0, 0.01, (d_model, d_model))
        ffn = np.maximum(0, np.matmul(res, W1))
        
        return ffn + res

    def augment(self, seq: np.ndarray, techniques: list[str]) -> np.ndarray:
        augmented = seq.copy()
        if not techniques:
            techniques = ["transformer"]
            
        for tech in techniques:
            if tech == "translation":
                augmented = self.translate(augmented)
            elif tech == "offset":
                augmented = self.random_offset(augmented)
            elif tech == "scale":
                augmented = self.scale(augmented)
            elif tech == "rotation":
                augmented = self.rotate(augmented)
            elif tech == "mirror":
                augmented = self.mirror(augmented)
            elif tech == "jitter":
                augmented = self.jitter(augmented)
            elif tech == "shift":
                augmented = self.temporal_shift(augmented)
            elif tech == "speed":
                augmented = self.random_speed(augmented)
            elif tech == "transformer":
                augmented = self.transformer_augment(augmented)
        return augmented
