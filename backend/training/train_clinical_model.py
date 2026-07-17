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
    from tensorflow.keras.layers import GRU, LSTM, Dense, Dropout, Input, Masking
    from tensorflow.keras.utils import to_categorical

    TF_AVAILABLE = True
except ImportError:
    TF_AVAILABLE = False


DATA_DIR = BACKEND_DIR / "data"
LANDMARKS_DIR = DATA_DIR / "landmarks"
MODELS_DIR = BACKEND_DIR / "models"
REPORTS_DIR = BACKEND_DIR / "reports"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Train model clinical MedSign MVP.")
    parser.add_argument("--landmarks-dir", type=Path, default=LANDMARKS_DIR)
    parser.add_argument("--models-dir", type=Path, default=MODELS_DIR)
    parser.add_argument("--reports-dir", type=Path, default=REPORTS_DIR)
    parser.add_argument("--architecture", choices=["gru", "lstm"], default="gru")
    parser.add_argument("--epochs", type=int, default=120)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=0.001)
    parser.add_argument("--model-name", default="medsign_mvp_v1")
    parser.add_argument("--min-samples-per-label", type=int, default=30)
    parser.add_argument("--labels", type=str, default="", help="Comma-separated list of labels to train")
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
        except Exception as exc:
            skipped.append((str(path), str(exc)))

    if skipped:
        print("[WARN] Beberapa file dilewati:")
        for path, reason in skipped[:20]:
            print(f"  - {path}: {reason}")

    if not sequences:
        raise RuntimeError(f"Tidak ada dataset valid di {landmarks_dir}")

    return np.asarray(sequences, dtype=np.float32), np.asarray(y, dtype=np.int64), np.asarray(signers), files


def stratified_holdout_size(total: int, class_count: int, ratio: float) -> int:
    return min(max(class_count, math.ceil(total * ratio)), total - class_count)


def split_dataset(X: np.ndarray, y: np.ndarray, signers: np.ndarray, test_size_ratio: float = 0.2):
    class_count = len(set(y.tolist()))
    counts = Counter(y.tolist())
    if min(counts.values()) < 3:
        raise RuntimeError("Setiap label butuh minimal 3 sample valid untuk train/val/test split.")

    unique_signers = sorted(set(signers.tolist()) - {"unknown"})
    if len(unique_signers) >= 3:
        try:
            group_split = GroupShuffleSplit(n_splits=1, test_size=test_size_ratio, random_state=42)
            train_val_idx, test_idx = next(group_split.split(X, y, groups=signers))
            group_split_val = GroupShuffleSplit(n_splits=1, test_size=test_size_ratio, random_state=43)
            train_idx_rel, val_idx_rel = next(group_split_val.split(X[train_val_idx], y[train_val_idx], groups=signers[train_val_idx]))
            train_idx = train_val_idx[train_idx_rel]
            val_idx = train_val_idx[val_idx_rel]
            if (
                len(set(y[train_idx])) == class_count
                and len(set(y[val_idx])) == class_count
                and len(set(y[test_idx])) == class_count
            ):
                return train_idx, val_idx, test_idx, "group_by_signer"
        except Exception as exc:
            print(f"[WARN] Split berbasis signer gagal, fallback ke stratified split: {exc}")

    test_size = stratified_holdout_size(len(X), class_count, test_size_ratio)
    train_val_idx, test_idx = train_test_split(
        np.arange(len(X)),
        test_size=test_size,
        random_state=42,
        stratify=y,
    )
    val_size = stratified_holdout_size(len(train_val_idx), class_count, test_size_ratio)
    train_idx_rel, val_idx_rel = train_test_split(
        np.arange(len(train_val_idx)),
        test_size=val_size,
        random_state=43,
        stratify=y[train_val_idx],
    )
    return train_val_idx[train_idx_rel], train_val_idx[val_idx_rel], test_idx, "stratified_by_label"


def build_model(architecture: str, num_classes: int, learning_rate: float):
    recurrent = GRU if architecture == "gru" else LSTM
    model = Sequential(
        [
            Input(shape=(FRAME_COUNT, FEATURE_COUNT)),
            Masking(mask_value=0.0),
            # unroll=True: penting untuk kompatibilitas TFLite standar.
            # Tanpa ini, GRU/LSTM menghasilkan ops TensorListReserve yang
            # membutuhkan Flex delegate saat runtime — dan TFLite interpreter
            # bawaan tidak menyertakan Flex delegate secara default.
            # unroll=True mengembangkan loop recurrent menjadi operasi statis
            # yang 100% didukung oleh TFLite builtin ops tanpa Flex.
            # Trade-off: sedikit lebih besar dan hanya cocok untuk sequence
            # panjang tetap (FRAME_COUNT=30 tidak masalah).
            recurrent(64, return_sequences=False, unroll=True, name=f"{architecture}_64"),
            Dropout(0.30),
            Dense(64, activation="relu"),
            Dropout(0.20),
            Dense(num_classes, activation="softmax", name="clinical_output"),
        ]
    )
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
        loss="categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model


def write_history_csv(history, path: Path) -> None:
    keys = list(history.history.keys())
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["epoch", *keys])
        writer.writeheader()
        for idx in range(len(history.history[keys[0]])):
            row = {"epoch": idx + 1}
            row.update({key: history.history[key][idx] for key in keys})
            writer.writerow(row)


def save_confusion_matrix_plot(cm: np.ndarray, labels: list[str], path: Path) -> None:
    try:
        import matplotlib.pyplot as plt

        fig, ax = plt.subplots(figsize=(10, 8))
        im = ax.imshow(cm, interpolation="nearest", cmap="Blues")
        fig.colorbar(im, ax=ax)
        ax.set_xticks(np.arange(len(labels)))
        ax.set_yticks(np.arange(len(labels)))
        ax.set_xticklabels(labels, rotation=45, ha="right")
        ax.set_yticklabels(labels)
        ax.set_xlabel("Predicted")
        ax.set_ylabel("True")
        ax.set_title("MedSign MVP Confusion Matrix")
        for i in range(len(labels)):
            for j in range(len(labels)):
                ax.text(j, i, int(cm[i, j]), ha="center", va="center", color="black")
        fig.tight_layout()
        fig.savefig(path, dpi=160)
        plt.close(fig)
    except Exception as exc:
        print(f"[WARN] Gagal menyimpan confusion matrix PNG: {exc}")


def main() -> int:
    if not TF_AVAILABLE:
        print("TensorFlow belum tersedia. Instal dengan: pip install tensorflow")
        return 1

    args = parse_args()
    args.models_dir.mkdir(parents=True, exist_ok=True)
    args.reports_dir.mkdir(parents=True, exist_ok=True)

    label_config = load_label_config()
    contract = get_model_contract()
    if args.labels:
        labels = [l.strip() for l in args.labels.split(",") if l.strip()]
    else:
        labels = load_labels()
    if contract["frame_count"] != FRAME_COUNT or contract["feature_count"] != FEATURE_COUNT:
        raise RuntimeError("Kontrak labels.json tidak sesuai dengan training script.")

    dataset_report = audit_dataset(args.landmarks_dir)
    (args.reports_dir / "DATASET_HEALTH_REPORT.md").write_text(render_markdown(dataset_report), encoding="utf-8")
    (args.reports_dir / "dataset_health_report.json").write_text(
        json.dumps(dataset_report, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    if dataset_report["total_invalid_samples"] > 0:
        print(f"[WARN] Dataset memiliki {dataset_report['total_invalid_samples']} sample invalid. File-file ini akan dilewati.")
    # Filter labels to only those that have at least min_samples_per_label samples
    active_labels = [
        label for label in labels
        if int(dataset_report["counts"].get(label, 0)) >= args.min_samples_per_label]
    ]
    if not active_labels:
        raise RuntimeError(
            f"Training dihentikan. Tidak ada label yang memenuhi minimal {args.min_samples_per_label} sample valid."
        )
    print(f"Melatih model pada {len(active_labels)} label dari {len(labels)} total: {', '.join(active_labels)}")
    labels = active_labels

    X, y, signers, files = load_dataset(args.landmarks_dir, labels)

    train_idx, val_idx, test_idx, split_strategy = split_dataset(X, y, signers, args.test_size)
    y_cat = to_categorical(y, num_classes=len(labels))

    model = build_model(args.architecture, len(labels), args.learning_rate)
    h5_path = args.models_dir / f"{args.model_name}.h5"
    tflite_path = args.models_dir / f"{args.model_name}.tflite"

    callbacks = [
        EarlyStopping(monitor="val_accuracy", patience=20, restore_best_weights=True),
        ModelCheckpoint(h5_path, monitor="val_accuracy", save_best_only=True),
        ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=8, min_lr=1e-6),
    ]

    print(f"Training {args.architecture.upper()} MedSign MVP: {len(labels)} kelas, {len(X)} sample, split={split_strategy}")
    history = model.fit(
        X[train_idx],
        y_cat[train_idx],
        validation_data=(X[val_idx], y_cat[val_idx]),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=callbacks,
        verbose=1,
    )

    best_model = tf.keras.models.load_model(h5_path)
    test_loss, test_accuracy = best_model.evaluate(X[test_idx], y_cat[test_idx], verbose=0)
    probs = best_model.predict(X[test_idx], verbose=0)
    y_pred = np.argmax(probs, axis=1)
    y_true = y[test_idx]

    report_text = classification_report(
        y_true,
        y_pred,
        labels=np.arange(len(labels)),
        target_names=labels,
        zero_division=0,
    )
    cm = confusion_matrix(y_true, y_pred, labels=np.arange(len(labels)))

    converter = tf.lite.TFLiteConverter.from_keras_model(best_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    # Model dibangun dengan unroll=True pada GRU/LSTM sehingga semua ops
    # adalah TFLite builtin standar — tidak butuh SELECT_TF_OPS / Flex delegate.
    converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    tflite_model = converter.convert()
    tflite_path.write_bytes(tflite_model)

    # Save sidecar labels file
    labels_json_path = args.models_dir / f"{args.model_name}_labels.json"
    labels_json_path.write_text(json.dumps(labels, indent=2, ensure_ascci=False), encoding="utf-8")
    print(f"Saved sidecar labels: {labels_json_path}")

    # Save sidecar labels file
    labels_json_path = args.models_dir / f"{args.model_name}_labels.json"
    labels_json_path.write_text(json.dumps(labels, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved sidecar labels: {labels_json_path}")

    write_history_csv(history, args.reports_dir / "training_history.csv")
    (args.reports_dir / "classification_report.txt").write_text(report_text, encoding="utf-8")
    np.savetxt(args.reports_dir / "confusion_matrix.csv", cm, fmt="%d", delimiter=",")
    save_confusion_matrix_plot(cm, labels, args.reports_dir / "confusion_matrix.png")

    metrics = {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "model_name": args.model_name,
        "architecture": args.architecture,
        "labels_version": label_config["version"],
        "frame_count": FRAME_COUNT,
        "feature_count": FEATURE_COUNT,
        "num_classes": len(labels),
        "num_samples": int(len(X)),
        "split_strategy": split_strategy,
        "train_samples": int(len(train_idx)),
        "val_samples": int(len(val_idx)),
        "test_samples": int(len(test_idx)),
        "test_loss": float(test_loss),
        "test_accuracy": float(test_accuracy),
        "h5_model": str(h5_path),
        "tflite_model": str(tflite_path),
        "tflite_size_kb": round(len(tflite_model) / 1024, 2),
    }
    (args.reports_dir / "training_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

    print(report_text)
    print(f"Model H5: {h5_path}")
    print(f"Model TFLite: {tflite_path}")
    print(f"Test accuracy: {test_accuracy:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
