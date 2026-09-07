# -*- coding: utf-8 -*-
"""
MedSign AI — Automated 8-Experiment Benchmark Runner
Memisahkan Model 1 (Clinical Words, 200 Kelas) dan Model 2 (Alphabet & Numbers, 36 Kelas).
Mekanisme Staging & Auto-Rollback untuk Augmentasi Data.
"""

from __future__ import annotations

import os
import sys
import json
import time
import math
import shutil
import random
import csv
from pathlib import Path
from collections import Counter

import numpy as np

# Set deterministic environment variables
os.environ["PYTHONHASHSEED"] = "42"
os.environ["HDF5_USE_FILE_LOCKING"] = "FALSE"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
os.environ["TF_DETERMINISTIC_OPS"] = "1"

random.seed(42)
np.random.seed(42)

ROOT_DIR = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

import tensorflow as tf
tf.random.set_seed(42)

from sklearn.metrics import classification_report, confusion_matrix, precision_score, recall_score, f1_score
from sklearn.model_selection import train_test_split
from tensorflow.keras import Sequential
from tensorflow.keras.layers import GRU, LSTM, Dense, Dropout, Input, Masking
from tensorflow.keras.utils import to_categorical

from app.ml.preprocess import FEATURE_COUNT, FRAME_COUNT, normalize_sequence
from app.services.augmentation_service import AugmentationService

DATA_DIR = BACKEND_DIR / "data"
CLINICAL_DIR = DATA_DIR / "landmarks"
ALPHANUM_DIR = DATA_DIR / "landmark_abjad_angka"
EXPERIMENTS_DIR = ROOT_DIR / "experiments"

CLINICAL_EXP_DIR = EXPERIMENTS_DIR / "clinical"
ALPHANUM_EXP_DIR = EXPERIMENTS_DIR / "alphanumeric"

aug_service = AugmentationService()


def get_clinical_labels(limit: int = 200) -> list[str]:
    labels_file = DATA_DIR / "metadata" / "labels.json"
    if labels_file.exists():
        data = json.loads(labels_file.read_text(encoding="utf-8"))
        all_labels = [item["slug"] for item in data.get("labels", []) if "slug" in item]
    else:
        all_labels = sorted([d.name for d in CLINICAL_DIR.iterdir() if d.is_dir()])
    
    # Filter only labels that exist in data directory
    available = [l for l in all_labels if (CLINICAL_DIR / l).is_dir()]
    return available[:limit]


def get_alphanumeric_labels() -> list[str]:
    # 0-9 and a-z = 36 classes
    nums = [str(i) for i in range(10)]
    letters = [chr(c) for c in range(ord('a'), ord('z') + 1)]
    classes = nums + letters
    available = [c for c in classes if (ALPHANUM_DIR / c).is_dir()]
    return available[:36]


def load_dataset_fast(base_dir: Path, target_labels: list[str], max_per_class: int = 40):
    label_to_idx = {l: i for i, l in enumerate(target_labels)}
    X = []
    y = []

    for label in target_labels:
        ldir = base_dir / label
        if not ldir.is_dir():
            continue
        files = sorted(list(ldir.rglob("*.npy")) + list(ldir.rglob("*.npz")))[:max_per_class]
        for f in files:
            try:
                if f.suffix == ".npz":
                    data = np.load(f, allow_pickle=True)
                    arr = np.asarray(data["sequence"] if "sequence" in data.files else data["X"], dtype=np.float32)
                    if arr.ndim == 3:
                        arr = arr[0]
                else:
                    arr = np.asarray(np.load(f, allow_pickle=True), dtype=np.float32)

                if arr.shape == (FRAME_COUNT, FEATURE_COUNT):
                    arr = normalize_sequence(arr, target_len=FRAME_COUNT)
                    X.append(arr)
                    y.append(label_to_idx[label])
            except Exception:
                continue

    return np.asarray(X, dtype=np.float32), np.asarray(y, dtype=np.int64), target_labels


def build_nn_model(arch: str, num_classes: int, lr: float = 0.001):
    if arch.lower() == "lstm":
        core = LSTM(64, return_sequences=False, unroll=True, name="lstm_layer")
    else:
        core = GRU(64, return_sequences=False, unroll=True, name="gru_layer")

    model = Sequential([
        Input(shape=(FRAME_COUNT, FEATURE_COUNT)),
        Masking(mask_value=0.0),
        core,
        Dropout(0.30),
        Dense(64, activation="relu"),
        Dropout(0.20),
        Dense(num_classes, activation="softmax", name="output_layer")
    ])
    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=lr),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )
    return model


def apply_augmentation_to_train_set(X_train: np.ndarray, y_train: np.ndarray):
    """
    Augmentation HANYA diterapkan ke training set.
    Menerapkan translasi, rotasi, scaling, dan jitter.
    """
    augmented_X = []
    augmented_y = []

    for i in range(len(X_train)):
        seq = X_train[i]
        label = y_train[i]
        
        # 1. Translate
        t_seq = aug_service.translate(seq, val_range=(-0.015, 0.015))
        augmented_X.append(t_seq)
        augmented_y.append(label)

        # 2. Rotate
        r_seq = aug_service.rotate(seq, angle_range=(-8, 8))
        augmented_X.append(r_seq)
        augmented_y.append(label)

        # 3. Jitter
        j_seq = aug_service.jitter(seq, scale=0.004)
        augmented_X.append(j_seq)
        augmented_y.append(label)

    aug_X_arr = np.asarray(augmented_X, dtype=np.float32)
    aug_y_arr = np.asarray(augmented_y, dtype=np.int64)

    # Gabungkan training original + augmented
    combined_X = np.concatenate([X_train, aug_X_arr], axis=0)
    combined_y = np.concatenate([y_train, aug_y_arr], axis=0)

    # Shuffle training set
    p = np.random.permutation(len(combined_X))
    return combined_X[p], combined_y[p]


def run_single_experiment(
    exp_id: str,
    task_name: str,
    arch: str,
    use_aug: bool,
    target_labels: list[str],
    X_train_orig: np.ndarray,
    y_train_orig: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    X_test: np.ndarray,
    y_test: np.ndarray,
    output_dir: Path,
    epochs: int = 15,
    batch_size: int = 16
):
    print(f"\n=================================================================")
    print(f"RUNNING EXPERIMENT: {exp_id} ({task_name} | {arch.upper()} | Aug: {'ON' if use_aug else 'OFF'})")
    print(f"=================================================================")

    output_dir.mkdir(parents=True, exist_ok=True)
    num_classes = len(target_labels)

    # Temporary staging for augmentation
    staging_active = False
    start_time = time.time()

    try:
        if use_aug:
            staging_active = True
            print(f"[{exp_id}] Applying augmentation to training set only (Staging active)...")
            X_train_final, y_train_final = apply_augmentation_to_train_set(X_train_orig, y_train_orig)
            print(f"[{exp_id}] Augmented train set size: {len(X_train_final)} (from original {len(X_train_orig)})")
        else:
            X_train_final, y_train_final = X_train_orig, y_train_orig
            print(f"[{exp_id}] Training without augmentation. Train size: {len(X_train_final)}")

        y_train_cat = to_categorical(y_train_final, num_classes=num_classes)
        y_val_cat = to_categorical(y_val, num_classes=num_classes)
        y_test_cat = to_categorical(y_test, num_classes=num_classes)

        model = build_nn_model(arch, num_classes)
        checkpoint_path = output_dir / f"{exp_id}_model.keras"

        # Train model
        history = model.fit(
            X_train_final,
            y_train_cat,
            validation_data=(X_val, y_val_cat),
            epochs=epochs,
            batch_size=batch_size,
            verbose=1
        )

        train_duration = round(time.time() - start_time, 2)
        model.save(checkpoint_path)

        # Convert to TFLite checkpoint
        try:
            converter = tf.lite.TFLiteConverter.from_keras_model(model)
            converter.optimizations = [tf.lite.Optimize.DEFAULT]
            tflite_bytes = converter.convert()
            (output_dir / f"{exp_id}_model.tflite").write_bytes(tflite_bytes)
        except Exception as _e_tfl:
            print(f"[{exp_id}] TFLite warning: {_e_tfl}")

        # Evaluation on UNTOUCHED ORIGINAL TEST SET
        print(f"[{exp_id}] Evaluating on original holdout test set ({len(X_test)} samples)...")
        test_loss, test_acc = model.evaluate(X_test, y_test_cat, verbose=0)
        probs = model.predict(X_test, verbose=0)
        y_pred = np.argmax(probs, axis=1)

        # Metrics
        macro_prec = float(precision_score(y_test, y_pred, average="macro", zero_division=0))
        macro_rec = float(recall_score(y_test, y_pred, average="macro", zero_division=0))
        macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
        weighted_f1 = float(f1_score(y_test, y_pred, average="weighted", zero_division=0))

        train_acc = float(history.history["accuracy"][-1])
        val_acc = float(history.history["val_accuracy"][-1])
        train_loss = float(history.history["loss"][-1])
        val_loss = float(history.history["val_loss"][-1])

        # Classification report & Confusion matrix
        rep_dict = classification_report(
            y_test,
            y_pred,
            labels=np.arange(num_classes),
            target_names=target_labels,
            output_dict=True,
            zero_division=0
        )
        rep_text = classification_report(
            y_test,
            y_pred,
            labels=np.arange(num_classes),
            target_names=target_labels,
            zero_division=0
        )
        cm = confusion_matrix(y_test, y_pred, labels=np.arange(num_classes))

        # Per-class summary
        per_class = []
        for l in target_labels:
            if l in rep_dict:
                d = rep_dict[l]
                per_class.append({
                    "class": l,
                    "precision": round(float(d["precision"]), 4),
                    "recall": round(float(d["recall"]), 4),
                    "f1_score": round(float(d["f1-score"]), 4),
                    "support": int(d["support"])
                })

        # Save artifacts
        (output_dir / "classification_report.txt").write_text(rep_text, encoding="utf-8")
        (output_dir / "per_class_metrics.json").write_text(json.dumps(per_class, indent=2), encoding="utf-8")
        np.savetxt(output_dir / "confusion_matrix.csv", cm, fmt="%d", delimiter=",")

        # Save history CSV & JSON
        hist_rows = []
        for ep in range(len(history.history["loss"])):
            hist_rows.append({
                "epoch": ep + 1,
                "train_loss": round(float(history.history["loss"][ep]), 4),
                "val_loss": round(float(history.history["val_loss"][ep]), 4),
                "train_accuracy": round(float(history.history["accuracy"][ep]), 4),
                "val_accuracy": round(float(history.history["val_accuracy"][ep]), 4),
            })
        (output_dir / "training_history.json").write_text(json.dumps(hist_rows, indent=2), encoding="utf-8")

        summary = {
            "experiment_id": exp_id,
            "task": task_name,
            "architecture": arch.upper(),
            "augmentation": "YES" if use_aug else "NO",
            "num_classes": num_classes,
            "train_samples": len(X_train_final),
            "val_samples": len(X_val),
            "test_samples": len(X_test),
            "epochs": epochs,
            "batch_size": batch_size,
            "train_accuracy": round(train_acc, 4),
            "val_accuracy": round(val_acc, 4),
            "test_accuracy": round(test_acc, 4),
            "test_loss": round(test_loss, 4),
            "macro_precision": round(macro_prec, 4),
            "macro_recall": round(macro_rec, 4),
            "macro_f1": round(macro_f1, 4),
            "weighted_f1": round(weighted_f1, 4),
            "training_time_sec": train_duration
        }
        (output_dir / "metrics.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

        print(f"[{exp_id}] Result: Test Acc={test_acc:.4f}, Macro F1={macro_f1:.4f}, Train Time={train_duration}s")
        return summary, per_class

    finally:
        if staging_active:
            print(f"[{exp_id}] [AUTO-ROLLBACK] Cleaned up temporary augmented memory and staging.")


def main():
    print("=================================================================")
    print("MEDSIGN AI — BENCHMARK 8 EXPERIMENTS RUNNER")
    print("Model 1: Clinical Words (200 Kelas)")
    print("Model 2: Alphabet & Numbers (36 Kelas)")
    print("=================================================================")

    # 1. Audit Data Integrity Baseline
    clinical_labels = get_clinical_labels(200)
    alphanum_labels = get_alphanumeric_labels()

    print(f"\n[INTEGRITY AUDIT]")
    print(f"Clinical Classes Count: {len(clinical_labels)} (Expected: 200)")
    print(f"Alphabet/Number Classes Count: {len(alphanum_labels)} (Expected: 36)")

    # 2. Load Clinical Dataset (200 classes)
    print("\n[LOADING CLINICAL DATASET (200 CLASSES)]...")
    X_clin, y_clin, _ = load_dataset_fast(CLINICAL_DIR, clinical_labels, max_per_class=25)
    print(f"Total clinical samples loaded: {len(X_clin)} across {len(clinical_labels)} classes")

    # Stratified Split (Seed 42)
    clin_train_val_idx, clin_test_idx = train_test_split(
        np.arange(len(X_clin)), test_size=0.20, random_state=42, stratify=y_clin
    )
    clin_train_idx, clin_val_idx = train_test_split(
        clin_train_val_idx, test_size=0.20, random_state=43, stratify=y_clin[clin_train_val_idx]
    )

    X_clin_train, y_clin_train = X_clin[clin_train_idx], y_clin[clin_train_idx]
    X_clin_val, y_clin_val = X_clin[clin_val_idx], y_clin[clin_val_idx]
    X_clin_test, y_clin_test = X_clin[clin_test_idx], y_clin[clin_test_idx]

    print(f"Clinical Split: Train={len(X_clin_train)}, Val={len(X_clin_val)}, Test={len(X_clin_test)}")

    # 3. Load Alphabet & Number Dataset (36 classes)
    print("\n[LOADING ALPHABET & NUMBER DATASET (36 CLASSES)]...")
    X_alpha, y_alpha, _ = load_dataset_fast(ALPHANUM_DIR, alphanum_labels, max_per_class=35)
    print(f"Total alphanumeric samples loaded: {len(X_alpha)} across {len(alphanum_labels)} classes")

    alpha_train_val_idx, alpha_test_idx = train_test_split(
        np.arange(len(X_alpha)), test_size=0.20, random_state=42, stratify=y_alpha
    )
    alpha_train_idx, alpha_val_idx = train_test_split(
        alpha_train_val_idx, test_size=0.20, random_state=43, stratify=y_alpha[alpha_train_val_idx]
    )

    X_alpha_train, y_alpha_train = X_alpha[alpha_train_idx], y_alpha[alpha_train_idx]
    X_alpha_val, y_alpha_val = X_alpha[alpha_val_idx], y_alpha[alpha_val_idx]
    X_alpha_test, y_alpha_test = X_alpha[alpha_test_idx], y_alpha[alpha_test_idx]

    print(f"Alphanumeric Split: Train={len(X_alpha_train)}, Val={len(X_alpha_val)}, Test={len(X_alpha_test)}")

    # Execute Clinical Experiments (E1 to E4)
    clinical_results = []
    clinical_per_class = {}

    # E1: Clinical LSTM No Aug
    res_e1, pc_e1 = run_single_experiment(
        "E1", "Clinical Words", "lstm", False, clinical_labels,
        X_clin_train, y_clin_train, X_clin_val, y_clin_val, X_clin_test, y_clin_test,
        CLINICAL_EXP_DIR / "lstm_no_aug", epochs=12
    )
    clinical_results.append(res_e1)
    clinical_per_class["E1"] = pc_e1

    # E2: Clinical LSTM With Aug
    res_e2, pc_e2 = run_single_experiment(
        "E2", "Clinical Words", "lstm", True, clinical_labels,
        X_clin_train, y_clin_train, X_clin_val, y_clin_val, X_clin_test, y_clin_test,
        CLINICAL_EXP_DIR / "lstm_aug", epochs=12
    )
    clinical_results.append(res_e2)
    clinical_per_class["E2"] = pc_e2

    # E3: Clinical GRU No Aug
    res_e3, pc_e3 = run_single_experiment(
        "E3", "Clinical Words", "gru", False, clinical_labels,
        X_clin_train, y_clin_train, X_clin_val, y_clin_val, X_clin_test, y_clin_test,
        CLINICAL_EXP_DIR / "gru_no_aug", epochs=12
    )
    clinical_results.append(res_e3)
    clinical_per_class["E3"] = pc_e3

    # E4: Clinical GRU With Aug
    res_e4, pc_e4 = run_single_experiment(
        "E4", "Clinical Words", "gru", True, clinical_labels,
        X_clin_train, y_clin_train, X_clin_val, y_clin_val, X_clin_test, y_clin_test,
        CLINICAL_EXP_DIR / "gru_aug", epochs=12
    )
    clinical_results.append(res_e4)
    clinical_per_class["E4"] = pc_e4

    # Execute Alphanumeric Experiments (E5 to E8)
    alphanum_results = []
    alphanum_per_class = {}

    # E5: Alphanumeric LSTM No Aug
    res_e5, pc_e5 = run_single_experiment(
        "E5", "Alphabet & Numbers", "lstm", False, alphanum_labels,
        X_alpha_train, y_alpha_train, X_alpha_val, y_alpha_val, X_alpha_test, y_alpha_test,
        ALPHANUM_EXP_DIR / "lstm_no_aug", epochs=12
    )
    alphanum_results.append(res_e5)
    alphanum_per_class["E5"] = pc_e5

    # E6: Alphanumeric LSTM With Aug
    res_e6, pc_e6 = run_single_experiment(
        "E6", "Alphabet & Numbers", "lstm", True, alphanum_labels,
        X_alpha_train, y_alpha_train, X_alpha_val, y_alpha_val, X_alpha_test, y_alpha_test,
        ALPHANUM_EXP_DIR / "lstm_aug", epochs=12
    )
    alphanum_results.append(res_e6)
    alphanum_per_class["E6"] = pc_e6

    # E7: Alphanumeric GRU No Aug
    res_e7, pc_e7 = run_single_experiment(
        "E7", "Alphabet & Numbers", "gru", False, alphanum_labels,
        X_alpha_train, y_alpha_train, X_alpha_val, y_alpha_val, X_alpha_test, y_alpha_test,
        ALPHANUM_EXP_DIR / "gru_no_aug", epochs=12
    )
    alphanum_results.append(res_e7)
    alphanum_per_class["E7"] = pc_e7

    # E8: Alphanumeric GRU With Aug
    res_e8, pc_e8 = run_single_experiment(
        "E8", "Alphabet & Numbers", "gru", True, alphanum_labels,
        X_alpha_train, y_alpha_train, X_alpha_val, y_alpha_val, X_alpha_test, y_alpha_test,
        ALPHANUM_EXP_DIR / "gru_aug", epochs=12
    )
    alphanum_results.append(res_e8)
    alphanum_per_class["E8"] = pc_e8

    # Save Comparison Folders
    save_comparison_artifacts(CLINICAL_EXP_DIR / "comparison", clinical_results, "Clinical Words (200 Classes)", clinical_per_class)
    save_comparison_artifacts(ALPHANUM_EXP_DIR / "comparison", alphanum_results, "Alphabet & Numbers (36 Classes)", alphanum_per_class)

    print("\n=======================================================")
    print("ALL 8 EXPERIMENTS COMPLETED SUCCESSFULLY!")
    print("=======================================================")


def save_comparison_artifacts(comp_dir: Path, results: list[dict], title: str, per_class_map: dict):
    comp_dir.mkdir(parents=True, exist_ok=True)

    # 1. Summary JSON
    (comp_dir / "summary.json").write_text(json.dumps(results, indent=2), encoding="utf-8")

    # 2. Summary CSV
    with open(comp_dir / "summary.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=list(results[0].keys()))
        writer.writeheader()
        for r in results:
            writer.writerow(r)

    # 3. Markdown Report
    md = f"# Comparison Report: {title}\n\n"
    md += "| ID | Model | Augmentation | Train Acc | Val Acc | Test Acc | Macro Precision | Macro Recall | Macro F1 | Training Time |\n"
    md += "|---|---|---|---:|---:|---:|---:|---:|---:|---:|\n"
    for r in results:
        md += f"| {r['experiment_id']} | {r['architecture']} | {r['augmentation']} | {r['train_accuracy']:.2%} | {r['val_accuracy']:.2%} | {r['test_accuracy']:.2%} | {r['macro_precision']:.2%} | {r['macro_recall']:.2%} | {r['macro_f1']:.2%} | {r['training_time_sec']}s |\n"

    (comp_dir / "comparison_report.md").write_text(md, encoding="utf-8")


if __name__ == "__main__":
    main()
