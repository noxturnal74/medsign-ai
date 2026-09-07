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
from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score
import time


from sklearn.model_selection import GroupShuffleSplit, train_test_split

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

try:
    from app.db import (
        db_create_training_run,
        db_update_training_run,
        db_add_training_history_batch,
        db_set_confusion_matrix,
        db_set_classification_reports,
        db_get_next_model_version,
    )
    DB_HELPER_AVAILABLE = True
except Exception as _e_imp:
    print(f"[WARN] DB helpers import error: {_e_imp}")
    DB_HELPER_AVAILABLE = False
from app.ml.labels import get_model_contract, load_label_config, load_labels
from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT, normalize_sequence
from validate_dataset import audit_dataset, render_markdown

import os
os.environ["HDF5_USE_FILE_LOCKING"] = "FALSE"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"

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
    parser.add_argument("--run-id", type=str, default="", help="ID sesi training run")
    parser.add_argument("--model-version", type=str, default="", help="Versi model (misal LSTM-v1, GRU-v2)")
    parser.add_argument("--dataset-id", type=str, default="Dataset-v1", help="ID atau versi dataset")
    parser.add_argument("--sequence-length", type=int, default=FRAME_COUNT, help="Panjang window sequence")
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

    paths = []
    if landmarks_dir.exists():
        for l in labels:
            ldir = landmarks_dir / l
            if ldir.is_dir():
                paths.extend(ldir.rglob("*.npy"))
                paths.extend(ldir.rglob("*.npz"))
        if not paths:
            paths = sorted([*landmarks_dir.rglob("*.npy"), *landmarks_dir.rglob("*.npz")])
        else:
            paths = sorted(paths)
    else:
        paths = []
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
    # Standard recurrent layers
    if architecture == "gru":
        layer = GRU(64, return_sequences=False, unroll=True, name="gru_64")
    elif architecture == "lstm":
        layer = LSTM(64, return_sequences=False, unroll=True, name="lstm_64")
    elif architecture == "simplernn":
        layer = SimpleRNN(64, return_sequences=False, unroll=True, name="simplernn_64")
    elif architecture == "bigru":
        layer = Bidirectional(GRU(32, return_sequences=False, unroll=True), name="bigru_64")
    elif architecture == "bilstm":
        layer = Bidirectional(LSTM(32, return_sequences=False, unroll=True), name="bilstm_64")
    elif architecture == "cnn1d":
        model = Sequential([
            Input(shape=(FRAME_COUNT, FEATURE_COUNT)),
            Conv1D(64, 3, activation='relu', padding='same'),
            Dropout(0.20),
            Conv1D(64, 3, activation='relu', padding='same'),
            GlobalAveragePooling1D(),
            Dropout(0.20),
            Dense(64, activation='relu'),
            Dropout(0.20),
            Dense(num_classes, activation='softmax', name="clinical_output")
        ])
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )
        return model
    elif architecture == "dnn":
        model = Sequential([
            Input(shape=(FRAME_COUNT, FEATURE_COUNT)),
            Flatten(),
            Dense(128, activation='relu'),
            Dropout(0.25),
            Dense(64, activation='relu'),
            Dropout(0.20),
            Dense(num_classes, activation='softmax', name="clinical_output")
        ])
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=learning_rate),
            loss="categorical_crossentropy",
            metrics=["accuracy"],
        )
        return model
    else:
        layer = GRU(64, return_sequences=False, unroll=True, name="gru_64")

    model = Sequential(
        [
            Input(shape=(FRAME_COUNT, FEATURE_COUNT)),
            Masking(mask_value=0.0),
            layer,
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



class EpochMetricsCallback(tf.keras.callbacks.Callback):
    """Callback untuk mencatat metrik setiap epoch dan memancarkan format standar untuk streaming log."""
    def __init__(self, run_id: str):
        super().__init__()
        self.run_id = run_id
        self.epoch_records = []

    def on_epoch_end(self, epoch, logs=None):
        logs = logs or {}
        rec = {
            "epoch": epoch + 1,
            "train_loss": float(logs.get("loss", 0.0)),
            "val_loss": float(logs.get("val_loss", 0.0)),
            "train_accuracy": float(logs.get("accuracy", 0.0)),
            "val_accuracy": float(logs.get("val_accuracy", 0.0)),
        }
        self.epoch_records.append(rec)
        print(
            f"[EPOCH_METRIC] epoch={rec['epoch']} "
            f"train_loss={rec['train_loss']:.4f} val_loss={rec['val_loss']:.4f} "
            f"train_acc={rec['train_accuracy']:.4f} val_acc={rec['val_accuracy']:.4f}",
            flush=True
        )

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

    health_cache = args.reports_dir / "dataset_health_report.json"
    if health_cache.exists():
        try:
            dataset_report = json.loads(health_cache.read_text(encoding="utf-8"))
        except Exception:
            dataset_report = audit_dataset(args.landmarks_dir)
    else:
        dataset_report = audit_dataset(args.landmarks_dir)
        (args.reports_dir / "DATASET_HEALTH_REPORT.md").write_text(render_markdown(dataset_report), encoding="utf-8")
        health_cache.write_text(json.dumps(dataset_report, indent=2, ensure_ascii=False), encoding="utf-8")

    if dataset_report["total_invalid_samples"] > 0:
        print(f"[WARN] Dataset memiliki {dataset_report['total_invalid_samples']} sample invalid. File-file ini akan dilewati.")
    # Filter labels to only those that have at least min_samples_per_label samples
    active_labels = [
        label for label in labels
        if int(dataset_report["counts"].get(label, 0)) >= args.min_samples_per_label
    ]
    if not active_labels:
        raise RuntimeError(
            f"Training dihentikan. Tidak ada label yang memenuhi minimal {args.min_samples_per_label} sample valid."
        )
    print(f"Melatih model pada {len(active_labels)} label dari {len(labels)} total: {', '.join(active_labels)}")
    labels = active_labels

    start_time_sec = time.time()
    m_type = args.architecture.upper()
    if "LSTM" in m_type:
        m_type = "LSTM"
    else:
        m_type = "GRU"

    # Tentukan model_version dan run_id
    if args.model_version:
        model_version = args.model_version
    else:
        model_version = db_get_next_model_version(m_type) if DB_HELPER_AVAILABLE else f"{m_type}-v1"

    if args.run_id:
        run_id = args.run_id
    else:
        run_id = f"run_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{m_type.lower()}_{model_version.lower().replace('-', '_')}"
        if DB_HELPER_AVAILABLE:
            try:
                db_create_training_run({
                    "id": run_id,
                    "model_type": m_type,
                    "model_version": model_version,
                    "dataset_id": args.dataset_id,
                    "status": "running",
                    "epochs": args.epochs,
                    "batch_size": args.batch_size,
                    "learning_rate": args.learning_rate,
                    "sequence_length": args.sequence_length,
                    "hyperparameters": {
                        "architecture": args.architecture,
                        "epochs": args.epochs,
                        "batch_size": args.batch_size,
                        "learning_rate": args.learning_rate,
                        "sequence_length": args.sequence_length,
                        "labels_count": len(labels),
                    }
                })
            except Exception as _e_init:
                print(f"[WARN] Inisialisasi DB run gagal: {_e_init}")

    print(f"[RUN_INFO] run_id={run_id} model_version={model_version} model_type={m_type} dataset_id={args.dataset_id}", flush=True)

    try:
        X, y, signers, files = load_dataset(args.landmarks_dir, labels)

        train_idx, val_idx, test_idx, split_strategy = split_dataset(X, y, signers, args.test_size)
        y_cat = to_categorical(y, num_classes=len(labels))

        model = build_model(args.architecture, len(labels), args.learning_rate)

        # Simpan checkpoint spesifik versi agar TIDAK pernah menimpa hasil sebelumnya
        version_keras_path = args.models_dir / f"{model_version}.keras"
        version_h5_path = args.models_dir / f"{model_version}.h5"
        version_tflite_path = args.models_dir / f"{model_version}.tflite"

        # Simpan juga path legacy medsign_mvp_v1 jika model_name dispesifikasi
        keras_path = args.models_dir / f"{args.model_name}.keras"
        h5_path = args.models_dir / f"{args.model_name}.h5"
        tflite_path = args.models_dir / f"{args.model_name}.tflite"

        epoch_callback = EpochMetricsCallback(run_id)
        callbacks = [
            EarlyStopping(monitor="val_accuracy", patience=25, restore_best_weights=True),
            ModelCheckpoint(version_keras_path, monitor="val_accuracy", save_best_only=True),
            ReduceLROnPlateau(monitor="val_loss", factor=0.5, patience=8, min_lr=1e-6),
            epoch_callback
        ]

        print(f"Training {m_type} MedSign ({model_version}): {len(labels)} kelas, {len(X)} sample, split={split_strategy}")
        history = model.fit(
            X[train_idx],
            y_cat[train_idx],
            validation_data=(X[val_idx], y_cat[val_idx]),
            epochs=args.epochs,
            batch_size=args.batch_size,
            callbacks=callbacks,
            verbose=1,
        )

        best_model = tf.keras.models.load_model(version_keras_path)
        try:
            best_model.save(version_h5_path)
            if keras_path != version_keras_path:
                best_model.save(keras_path)
            if h5_path != version_h5_path:
                best_model.save(h5_path)
        except Exception as exc:
            print(f"[WARN] Save H5 dilewati: {exc}")

        test_loss, test_accuracy = best_model.evaluate(X[test_idx], y_cat[test_idx], verbose=0)
        probs = best_model.predict(X[test_idx], verbose=0)
        y_pred = np.argmax(probs, axis=1)
        y_true = y[test_idx]

        # Kalkulasi Precision, Recall, F1 Score (Macro & Weighted)
        prec_macro = float(precision_score(y_true, y_pred, average="macro", zero_division=0))
        rec_macro = float(recall_score(y_true, y_pred, average="macro", zero_division=0))
        f1_macro = float(f1_score(y_true, y_pred, average="macro", zero_division=0))

        prec_weighted = float(precision_score(y_true, y_pred, average="weighted", zero_division=0))
        rec_weighted = float(recall_score(y_true, y_pred, average="weighted", zero_division=0))
        f1_weighted = float(f1_score(y_true, y_pred, average="weighted", zero_division=0))

        # Detailed Classification Report
        report_dict = classification_report(
            y_true,
            y_pred,
            labels=np.arange(len(labels)),
            target_names=labels,
            output_dict=True,
            zero_division=0,
        )
        report_text = classification_report(
            y_true,
            y_pred,
            labels=np.arange(len(labels)),
            target_names=labels,
            zero_division=0,
        )

        per_class_metrics = []
        for lbl in labels:
            if lbl in report_dict:
                c_data = report_dict[lbl]
                per_class_metrics.append({
                    "class_name": lbl,
                    "precision": round(float(c_data["precision"]), 4),
                    "recall": round(float(c_data["recall"]), 4),
                    "f1_score": round(float(c_data["f1-score"]), 4),
                    "support": int(c_data["support"]),
                })

        # Confusion Matrix
        cm = confusion_matrix(y_true, y_pred, labels=np.arange(len(labels)))
        cm_list = cm.tolist()

        # TFLite Conversion
        converter = tf.lite.TFLiteConverter.from_keras_model(best_model)
        converter.optimizations = [tf.lite.Optimize.DEFAULT]
        converter.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
        tflite_model = converter.convert()
        version_tflite_path.write_bytes(tflite_model)
        if tflite_path != version_tflite_path:
            try:
                tflite_path.write_bytes(tflite_model)
            except Exception:
                pass

        # Final metrics dari epochs
        final_train_loss = float(epoch_callback.epoch_records[-1]["train_loss"]) if epoch_callback.epoch_records else 0.0
        final_val_loss = float(epoch_callback.epoch_records[-1]["val_loss"]) if epoch_callback.epoch_records else 0.0
        final_train_acc = float(epoch_callback.epoch_records[-1]["train_accuracy"]) if epoch_callback.epoch_records else 0.0
        final_val_acc = float(epoch_callback.epoch_records[-1]["val_accuracy"]) if epoch_callback.epoch_records else 0.0
        duration_sec = round(time.time() - start_time_sec, 1)

        # Simpan sidecar files bertanda version
        (args.models_dir / f"{model_version}_labels.json").write_text(json.dumps(labels, indent=2, ensure_ascii=False), encoding="utf-8")
        (args.models_dir / f"{model_version}_cm.json").write_text(json.dumps({"class_labels": labels, "matrix_data": cm_list}, indent=2), encoding="utf-8")
        (args.models_dir / f"{model_version}_history.json").write_text(json.dumps(epoch_callback.epoch_records, indent=2), encoding="utf-8")
        (args.models_dir / f"{model_version}_report.json").write_text(json.dumps(per_class_metrics, indent=2), encoding="utf-8")

        # Sidecar metrics JSON
        metrics = {
            "run_id": run_id,
            "model_name": args.model_name,
            "model_version": model_version,
            "architecture": m_type,
            "dataset_id": args.dataset_id,
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "labels_version": label_config.get("version", "medsign-clinical-full-v1"),
            "frame_count": FRAME_COUNT,
            "feature_count": FEATURE_COUNT,
            "num_classes": len(labels),
            "num_samples": int(len(X)),
            "split_strategy": split_strategy,
            "train_samples": int(len(train_idx)),
            "val_samples": int(len(val_idx)),
            "test_samples": int(len(test_idx)),
            "epochs": args.epochs,
            "batch_size": args.batch_size,
            "learning_rate": args.learning_rate,
            "sequence_length": args.sequence_length,
            "duration": duration_sec,
            "final_train_loss": round(final_train_loss, 4),
            "final_val_loss": round(final_val_loss, 4),
            "final_train_accuracy": round(final_train_acc, 4),
            "final_val_accuracy": round(final_val_acc, 4),
            "test_loss": round(float(test_loss), 4),
            "test_accuracy": round(float(test_accuracy), 4),
            "precision": round(prec_macro, 4),
            "recall": round(rec_macro, 4),
            "f1_score": round(f1_macro, 4),
            "macro_f1": round(f1_macro, 4),
            "weighted_f1": round(f1_weighted, 4),
            "tflite_model": str(version_tflite_path.relative_to(BACKEND_DIR)).replace("\\", "/"),
            "tflite_size_kb": round(len(tflite_model) / 1024, 2),
        }
        (args.models_dir / f"{model_version}_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")

        # Backward compatibility sidecars
        (args.models_dir / f"{args.model_name}_labels.json").write_text(json.dumps(labels, indent=2, ensure_ascii=False), encoding="utf-8")
        (args.reports_dir / "training_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False), encoding="utf-8")
        write_history_csv(history, args.reports_dir / "training_history.csv")
        (args.reports_dir / "classification_report.txt").write_text(report_text, encoding="utf-8")
        np.savetxt(args.reports_dir / "confusion_matrix.csv", cm, fmt="%d", delimiter=",")
        save_confusion_matrix_plot(cm, labels, args.reports_dir / "confusion_matrix.png")

        # Persistensi ke database SQLite
        if DB_HELPER_AVAILABLE:
            try:
                db_add_training_history_batch(run_id, epoch_callback.epoch_records)
                db_set_confusion_matrix(run_id, labels, cm_list)
                db_set_classification_reports(run_id, per_class_metrics)
                db_update_training_run(run_id, {
                    "status": "completed",
                    "completed_at": datetime.utcnow().isoformat(),
                    "duration": duration_sec,
                    "final_train_loss": round(final_train_loss, 4),
                    "final_val_loss": round(final_val_loss, 4),
                    "train_accuracy": round(final_train_acc, 4),
                    "val_accuracy": round(final_val_acc, 4),
                    "test_loss": round(float(test_loss), 4),
                    "test_accuracy": round(float(test_accuracy), 4),
                    "precision": round(prec_macro, 4),
                    "recall": round(rec_macro, 4),
                    "f1_score": round(f1_macro, 4),
                    "macro_f1": round(f1_macro, 4),
                    "weighted_f1": round(f1_weighted, 4),
                    "num_train_samples": int(len(train_idx)),
                    "num_val_samples": int(len(val_idx)),
                    "num_test_samples": int(len(test_idx)),
                    "model_path": f"models/{model_version}.tflite"
                })
                print(f"[DB_SAVED] Run {run_id} berhasil disimpan ke basis data!")
            except Exception as _e_save:
                print(f"[WARN] Gagal menyimpan metrik ke database: {_e_save}")

        print(report_text)
        print(f"Model TFLite tersimpan: {version_tflite_path}")
        print(f"Test accuracy: {test_accuracy:.4f} | F1 Macro: {f1_macro:.4f} | Loss: {test_loss:.4f}")
        print(f"[TRAINING_COMPLETED] run_id={run_id} version={model_version} test_acc={test_accuracy:.4f} f1={f1_macro:.4f}", flush=True)
        return 0

    except Exception as exc:
        print(f"[ERROR] Proses training gagal: {exc}", flush=True)
        if DB_HELPER_AVAILABLE:
            try:
                db_update_training_run(run_id, {
                    "status": "failed",
                    "error_message": str(exc),
                    "completed_at": datetime.utcnow().isoformat()
                })
            except Exception:
                pass
        raise exc


if __name__ == "__main__":
    raise SystemExit(main())
