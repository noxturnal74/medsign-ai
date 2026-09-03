# -*- coding: utf-8 -*-
"""
Script Pelatihan Model Abjad/Angka BISINDO (Dinamis)
Menggunakan struktur direktori landmark_abjad_angka seperti clinical training
Struktur: landmark_abjad_angka/<label>/<signer_id>/<label>_<signer>_<session>_<take>.npy
"""
# -*- coding: utf-8 -*-
from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path

import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.model_selection import GroupShuffleSplit, train_test_split

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

from app.ml.labels import get_model_contract, load_label_config, load_labels
from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT, normalize_sequence
from validate_dataset import audit_dataset, render_markdown

try:
    import tensorflow as tf
    from tensorflow.keras import Sequential
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint, ReduceLROnPlateau
    from tensorflow.keras.layers import GRU, LSTM, SimpleRNN, Bidirectional, Conv1D, GlobalAveragePooling1D, Flatten, Dense, Dropout, Input, Masking
    from tensorflow.keras.utils import to_categorical

    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


DATA_DIR = BACKEND_DIR / "data"
LANDMARKS_DIR = DATA_DIR / "landmark_abjad_angka"
MODELS_DIR = BACKEND_DIR / "models"
REPORTS_DIR = BACKEND_DIR / "reports"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train model alphabet/angka MedSign (Dynamic).")
    parser.add_argument("--landmarks-dir", type=Path, default=LANDMARKS_DIR)
    parser.add_argument("--models-dir", type=Path, default=MODELS_DIR)
    parser.add_argument("--reports-dir", type=Path, default=REPORTS_DIR)
    parser.add_argument("--architecture", choices=["gru", "lstm"], default="gru")
    parser.add_argument("--epochs", type=int, default=120)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--model-name", default="bisindo_alphabet_v1")
    parser.add_argument("--min-samples-per-label", type=int, default=30)
    parser.add_argument("--labels", type=str, default="", help="Comma-separated list of labels to train (A-Z,1-9)")
    parser.add_argument("--test-size", type=float, default=0.2, help="Rasio data uji (test set), default 0.2")
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


def load_dataset(landmarks_dir: Path, labels: list[str]) -> tuple[np.ndarray, np.ndarray, np.ndarray, list[str]]:
    label_index = {label: index for index, label in enumerate(labels)}
    sequences = []
    y = []
    signers = []
    files = []
    skipped = []

    paths = sorted([*landmarks_dir.rglob("*.npy"), *landmarks_dir.rglob("*.npz")]) if landmarks_dir.exists() else []
    for path in paths:
        try:
            label, signer = infer_label_and_signer(path, landmarks_dir)
            if label not in label_index:
                continue
            arr = load_sequence(path)
            if arr.shape != (FRAME_COUNT, FEATURE_COUNT):
                skipped.append((str(path), f"shape {arr.shape}"))
                continue
            arr = normalize_sequence(arr, target_len=FRAME_COUNT)
            sequences.append(arr)
            y.append(label_index[label])
            signers.append(signer)
            files.append(str(path))
        except Exception as e:
            skipped.append((str(path), str(e)))

    X = np.asarray(sequences, dtype=np.float32) if sequences else np.empty((0, FRAME_COUNT, FEATURE_COUNT), dtype=np.float32)
    y_arr = np.asarray(y, dtype=np.int32) if y else np.empty((0,), dtype=np.int32)
    signers_arr = np.asarray(signers, dtype=object) if signers else np.empty((0,), dtype=object)

    if skipped:
        print(f"⚠️  {len(skipped)} file dilewati:")
        for p, reason in skipped[:10]:
            print(f"   - {p}: {reason}")
        if len(skipped) > 10:
            print(f"   ... dan {len(skipped) - 10} lainnya")

    return X, y_arr, signers_arr, labels


def build_model(num_classes: int, architecture: str = "gru") -> tf.keras.Model:
    model = Sequential()
    model.add(Masking(mask_value=0.0, input_shape=(FRAME_COUNT, FEATURE_COUNT)))

    if architecture == "gru":
        model.add(Bidirectional(GRU(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.1)))
        model.add(Bidirectional(GRU(64, return_sequences=False, dropout=0.2, recurrent_dropout=0.1)))
    else:
        model.add(Bidirectional(LSTM(128, return_sequences=True, dropout=0.2, recurrent_dropout=0.1)))
        model.add(Bidirectional(LSTM(64, return_sequences=False, dropout=0.2, recurrent_dropout=0.1)))

    model.add(Dense(64, activation='relu'))
    model.add(Dropout(0.3))
    model.add(Dense(len(tf.keras.utils.to_categorical([0], num_classes=1)[0]), activation='softmax'))

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss='categorical_crossentropy',
        metrics=['accuracy']
    )
    return model


def main():
    if not TF_AVAILABLE:
        print("ERROR: Harap instal tensorflow terlebih dahulu!")
        return

    args = parse_args()

    # Setup GPU
    gpus = tf.config.list_physical_devices('GPU')
    if gpus:
        try:
            for gpu in gpus:
                tf.config.experimental.set_memory_growth(gpu, True)
            print(f"[GPU] {len(gpus)} GPU ditemukan, memory growth enabled")
        except RuntimeError as e:
            print(f"[GPU] Gagal konfigurasi: {e}")
    else:
        print("[GPU] Running on CPU")

    # Default labels for alphabet/number
    default_labels = [chr(i) for i in range(ord('a'), ord('z') + 1)] + [str(i) for i in range(1, 10)]
    labels = [l.strip().lower() for l in args.labels.split(",")] if args.labels else default_labels

    print(f"📂 Landmarks dir: {args.landmarks_dir}")
    print(f"🏷️  Labels: {labels}")
    print(f"🏗️  Architecture: {args.architecture}")
    print(f"🔁 Epochs: {args.epochs}")

    X, y, signers, labels_used = load_dataset(args.landmarks_dir, labels)
    
    if len(X) == 0:
        print("❌ Tidak ada data valid untuk training!")
        return

    print(f"✅ Loaded {len(X)} sequences, {len(labels_used)} labels")
    print(f"   Class distribution: {Counter(y)}")

    # Check minimum samples
    label_counts = Counter(y)
    min_samples = args.min_samples_per_label
    for idx, count in label_counts.items():
        if count < min_samples:
            label_name = labels_used[idx]
            print(f"⚠️  Label '{label_name}' hanya {count} samples (min {min_samples})")

    # Encode labels
    y_cat = to_categorical(y, num_classes=len(labels_used))

    # Group shuffle split by signer
    gss = GroupShuffleSplit(n_splits=1, test_size=args.test_size, random_state=42)
    train_idx, test_idx = next(gss.split(X, y, groups=signers))

    X_train, X_test = X[train_idx], X[test_idx]
    y_train, y_test = y_cat[train_idx], y_cat[test_idx]

    print(f"📊 Train: {len(X_train)} | Test: {len(X_test)} (grouped by signer)")

    # Build model
    model = build_model(len(labels_used), args.architecture)
    model.summary()

    # Callbacks
    callbacks = [
        EarlyStopping(monitor='val_accuracy', patience=15, restore_best_weights=True, mode='max'),
        ReduceLROnPlateau(monitor='val_loss', factor=0.5, patience=7, min_lr=1e-6),
        ModelCheckpoint(
            filepath=str(args.models_dir / f"{args.model_name}_temp.tflite"),
            monitor='val_accuracy',
            save_best_only=True,
            mode='max',
            verbose=1
        )
    ]

    # Train
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=args.epochs,
        batch_size=16,
        callbacks=callbacks,
        verbose=1
    )

    # Evaluate
    test_loss, test_acc = model.evaluate(X_test, y_cat[test_idx], verbose=0)
    print(f"\n📊 Test Accuracy: {test_acc:.4f} | Test Loss: {test_loss:.4f}")

    # Predictions
    y_pred = model.predict(X_test, verbose=0)
    y_pred_classes = np.argmax(y_pred, axis=1)
    y_true_classes = np.argmax(y_test, axis=1)

    # Classification report
    target_names = [labels_used[i] for i in range(len(labels_used))]
    report = classification_report(y_true_classes, y_pred_classes, target_names=target_names, digits=4)
    print(f"\n📋 Classification Report:\n{report}")

    # Confusion matrix
    cm = confusion_matrix(y_true_classes, y_pred_classes)
    print(f"\n📊 Confusion Matrix:\n{cm}")

    # Save model
    args.models_dir.mkdir(parents=True, exist_ok=True)
    model_path = args.models_dir / f"{args.model_name}.tflite"
    
    # Convert to TFLite
    converter = tf.lite.TFLiteConverter.from_keras_model(model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    tflite_model = converter.convert()
    
    model_path.write_bytes(tflite_model)
    print(f"\n✅ Model TFLite disimpan: {model_path}")

    # Save labels JSON
    labels_json = {
        "version": "medsign-alphabet-dynamic-v1",
        "frame_count": FRAME_COUNT,
        "feature_count": FEATURE_COUNT,
        "labels": [
            {"id": i, "slug": label, "display": label.upper(), "category": "Abjad" if label.isalpha() else "Angka", "emergency": False}
            for i, label in enumerate(labels_used)
        ]
    }
    labels_path = args.models_dir / f"{args.model_name}_labels.json"
    labels_path.write_text(json.dumps(labels_json, indent=2, ensure_ascii=False))
    print(f"✅ Labels JSON disimpan: {labels_path}")

    # Save training report
    args.reports_dir.mkdir(parents=True, exist_ok=True)
    report_data = {
        "model_name": args.model_name,
        "architecture": args.architecture,
        "epochs": args.epochs,
        "test_accuracy": float(test_acc),
        "test_loss": float(test_loss),
        "train_samples": int(len(X_train)),
        "test_samples": int(len(X_test)),
        "labels": labels_used,
        "class_distribution": {labels_used[k]: int(v) for k, v in label_counts.items()},
        "timestamp": datetime.now().isoformat()
    }
    report_path = args.reports_dir / f"{args.model_name}_report.json"
    report_path.write_text(json.dumps(report_data, indent=2, ensure_ascii=False))
    print(f"✅ Report disimpan: {report_path}")


if __name__ == "__main__":
    main()