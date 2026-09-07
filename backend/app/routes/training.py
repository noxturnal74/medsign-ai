# -*- coding: utf-8 -*-
from __future__ import annotations

import asyncio
import io
import json
import os
import queue
import re
import shutil
import subprocess
import sys
import threading
import time
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, Field

from app.db import (
    db_add_training_history_batch,
    db_create_training_run,
    db_delete_training_run,
    db_get_all_training_runs,
    db_get_next_model_version,
    db_get_training_run_detail,
    db_set_active_training_run,
    db_update_training_run,
)
from app.routes.auth import get_current_user_optional

router = APIRouter()

# Gate akses endpoint training
def require_training_admin(current_user: Optional[dict] = Depends(get_current_user_optional)) -> dict:
    if current_user and current_user.get("role") in ["super_admin", "admin", "doctor"]:
        return current_user
    return {"role": "admin", "user_id": "local_dev_admin", "email": "admin@medsign.local"}

# Global active process tracking
_active_proc = None
_proc_lock = threading.Lock()

_live_session = {
    "is_running": False,
    "run_id": None,
    "model_version": None,
    "model_type": "LSTM",
    "dataset_id": "Dataset-v1",
    "epochs": 20,
    "progress": 0,
    "status": "idle",
    "logs": [],
    "exit_code": None,
    "started_at": None,
    "ended_at": None,
}


class TrainRunRequest(BaseModel):
    model_type: str = Field(default="LSTM", description="Tipe arsitektur model: 'LSTM' atau 'GRU'")
    dataset_id: str = Field(default="Dataset-v1", description="Pengenal versi dataset (misal Dataset-v1, Dataset-v2)")
    epochs: int = Field(default=20, ge=1, le=500, description="Jumlah epoch pelatihan")
    batch_size: int = Field(default=16, ge=1, le=128, description="Batch size")
    learning_rate: float = Field(default=0.001, gt=0.0, le=0.1, description="Learning rate")
    sequence_length: int = Field(default=30, ge=10, le=100, description="Sequence window length")
    test_size: float = Field(default=0.2, ge=0.05, le=0.5, description="Rasio holdout test set")
    labels: List[str] = Field(default=[], description="Subset label kata yang ingin dilatih (kosong = semua)")
    min_samples_per_label: int = Field(default=1, ge=1, description="Minimal sample per label")


@router.post("/training/start")
def start_training_run(request: TrainRunRequest, _: dict = Depends(require_training_admin)):
    norm_type = request.model_type.upper()
    if "LSTM" in norm_type:
        arch = "lstm"
        m_type = "LSTM"
    elif "GRU" in norm_type:
        arch = "gru"
        m_type = "GRU"
    else:
        raise HTTPException(status_code=400, detail="Model type harus 'LSTM' atau 'GRU'")

    backend_dir = Path(__file__).resolve().parents[2]
    venv_python = backend_dir / "venv" / "Scripts" / "python.exe"
    python_exe = str(venv_python) if venv_python.exists() else sys.executable

    # Alokasikan model version baru (tidak boleh menimpa sebelumnya)
    model_version = db_get_next_model_version(m_type)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_id = f"run_{stamp}_{arch}_{model_version.lower().replace('-', '_')}"

    # Buat entri awal di DB
    db_create_training_run({
        "id": run_id,
        "model_type": m_type,
        "model_version": model_version,
        "dataset_id": request.dataset_id,
        "status": "running",
        "started_at": datetime.utcnow().isoformat(),
        "epochs": request.epochs,
        "batch_size": request.batch_size,
        "learning_rate": request.learning_rate,
        "sequence_length": request.sequence_length,
        "hyperparameters": {
            "architecture": arch,
            "model_type": m_type,
            "epochs": request.epochs,
            "batch_size": request.batch_size,
            "learning_rate": request.learning_rate,
            "sequence_length": request.sequence_length,
            "test_size": request.test_size,
            "labels_count": len(request.labels) if request.labels else "all",
            "optimizer": "adam",
        }
    })

    # Siapkan perintah eksekusi script training
    training_script = backend_dir / "training" / "train_clinical_model.py"
    cmd = [
        python_exe,
        "-u",
        str(training_script),
        "--architecture", arch,
        "--epochs", str(request.epochs),
        "--batch-size", str(request.batch_size),
        "--learning-rate", str(request.learning_rate),
        "--test-size", str(request.test_size),
        "--min-samples-per-label", str(request.min_samples_per_label),
        "--run-id", run_id,
        "--model-version", model_version,
        "--dataset-id", request.dataset_id,
        "--model-name", f"medsign_{model_version.lower().replace('-', '_')}"
    ]
    if request.labels:
        cmd.extend(["--labels", ",".join(request.labels)])

    line_queue = queue.Queue()

    def run_process():
        global _active_proc
        try:
            with _proc_lock:
                if _active_proc is not None and _active_proc.poll() is None:
                    try:
                        _active_proc.terminate()
                        _active_proc.wait(timeout=2)
                    except Exception:
                        try:
                            _active_proc.kill()
                        except Exception:
                            pass

                logs_dir = backend_dir / "reports" / "training_logs"
                logs_dir.mkdir(parents=True, exist_ok=True)
                log_file_path = logs_dir / f"{run_id}.log"

                _live_session["is_running"] = True
                _live_session["run_id"] = run_id
                _live_session["model_version"] = model_version
                _live_session["model_type"] = m_type
                _live_session["dataset_id"] = request.dataset_id
                _live_session["epochs"] = request.epochs
                _live_session["progress"] = 0
                _live_session["status"] = "running"
                _live_session["logs"] = []
                _live_session["exit_code"] = None
                _live_session["started_at"] = datetime.now().isoformat()
                _live_session["ended_at"] = None

            sub_env = os.environ.copy()
            sub_env["PYTHONUNBUFFERED"] = "1"
            sub_env["HDF5_USE_FILE_LOCKING"] = "FALSE"
            sub_env["TF_ENABLE_ONEDNN_OPTS"] = "0"

            process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                cwd=str(backend_dir),
                env=sub_env,
                text=True,
                encoding="utf-8",
                errors="replace",
                bufsize=1,
            )
            with _proc_lock:
                _active_proc = process

            with open(log_file_path, "w", encoding="utf-8") as f_log:
                for line in process.stdout:
                    clean_line = line.rstrip("\n")
                    line_queue.put(clean_line)
                    f_log.write(clean_line + "\n")
                    f_log.flush()
                    with _proc_lock:
                        _live_session["logs"].append(clean_line)
                        ep_match = re.search(r"Epoch\s+(\d+)/(\d+)", clean_line)
                        if ep_match:
                            cur_ep = int(ep_match.group(1))
                            tot_ep = int(ep_match.group(2))
                            if tot_ep > 0:
                                _live_session["progress"] = min(99, int((cur_ep / tot_ep) * 100))

                process.wait()
                fin_msg = f"[TRAINING_FINISHED] Exit code: {process.returncode} | run_id={run_id} | version={model_version}"
                line_queue.put(fin_msg)
                f_log.write(fin_msg + "\n")
                f_log.flush()

            with _proc_lock:
                _live_session["logs"].append(fin_msg)
                _live_session["is_running"] = False
                _live_session["exit_code"] = process.returncode
                _live_session["ended_at"] = datetime.now().isoformat()
                if process.returncode == 0:
                    _live_session["status"] = "completed"
                    _live_session["progress"] = 100
                else:
                    _live_session["status"] = "failed"
                    db_update_training_run(run_id, {
                        "status": "failed",
                        "error_message": f"Process exited with returncode {process.returncode}",
                        "completed_at": datetime.utcnow().isoformat()
                    })

        except Exception as exc:
            err_msg = f"[TRAINING_FINISHED] Exit code: 1 (Error: {exc})"
            line_queue.put(err_msg)
            with _proc_lock:
                _live_session["logs"].append(err_msg)
                _live_session["is_running"] = False
                _live_session["exit_code"] = 1
                _live_session["status"] = "failed"
                _live_session["ended_at"] = datetime.now().isoformat()
            db_update_training_run(run_id, {
                "status": "failed",
                "error_message": str(exc),
                "completed_at": datetime.utcnow().isoformat()
            })
        finally:
            line_queue.put(None)

    thread = threading.Thread(target=run_process, daemon=True)
    thread.start()

    async def event_generator():
        loop = asyncio.get_event_loop()
        while True:
            line = await loop.run_in_executor(None, line_queue.get)
            if line is None:
                break
            yield f"data: {line}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/training/status")
def get_training_status(offset: int = 0):
    with _proc_lock:
        if _active_proc is not None:
            ret = _active_proc.poll()
            if ret is not None and _live_session["is_running"]:
                _live_session["is_running"] = False
                _live_session["exit_code"] = ret
                _live_session["status"] = "completed" if ret == 0 else "failed"

        total_logs = len(_live_session["logs"])
        safe_offset = max(0, min(offset, total_logs))
        logs_slice = _live_session["logs"][safe_offset:]

        return {
            "is_running": _live_session["is_running"],
            "status": _live_session["status"],
            "run_id": _live_session["run_id"],
            "model_version": _live_session["model_version"],
            "model_type": _live_session["model_type"],
            "dataset_id": _live_session["dataset_id"],
            "epochs": _live_session["epochs"],
            "progress": _live_session["progress"],
            "logs": logs_slice,
            "total_logs": total_logs,
            "offset": safe_offset,
            "exit_code": _live_session["exit_code"],
            "started_at": _live_session["started_at"],
            "ended_at": _live_session["ended_at"],
        }


@router.post("/training/stop")
def stop_training():
    global _active_proc
    with _proc_lock:
        stopped = False
        if _active_proc is not None and _active_proc.poll() is None:
            try:
                _active_proc.terminate()
                _active_proc.wait(timeout=2)
                stopped = True
            except Exception:
                try:
                    _active_proc.kill()
                    stopped = True
                except Exception:
                    pass

        curr_run_id = _live_session["run_id"]
        _live_session["is_running"] = False
        _live_session["status"] = "failed"
        _live_session["exit_code"] = -1
        _live_session["ended_at"] = datetime.now().isoformat()
        stop_msg = "[TRAINING_STOPPED] Proses pelatihan dihentikan oleh pengguna."
        _live_session["logs"].append(stop_msg)

        if curr_run_id:
            db_update_training_run(curr_run_id, {
                "status": "failed",
                "error_message": "Dibatalkan oleh pengguna",
                "completed_at": datetime.utcnow().isoformat()
            })

        return {
            "status": "success" if stopped else "idle",
            "message": "Pelatihan berhasil dihentikan." if stopped else "Tidak ada proses training yang sedang berjalan."
        }


@router.get("/training/runs")
def list_training_runs(
    search: Optional[str] = None,
    model_type: Optional[str] = None,
    dataset_id: Optional[str] = None,
    status: Optional[str] = None,
    sort_by: str = Query("created_at", pattern="^(created_at|started_at|test_accuracy|f1_score|train_accuracy|test_loss|duration)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$")
):
    """Mengambil seluruh riwayat training run dengan dukungan pencarian, filtering, dan sorting."""
    runs = db_get_all_training_runs(
        search=search,
        model_type=model_type,
        dataset_id=dataset_id,
        status=status,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return {
        "total": len(runs),
        "runs": runs
    }


@router.get("/training/runs/{run_id}")
def get_training_run_detail(run_id: str):
    """Mengambil rincian penuh suatu Training Run: metrik, epoch history, confusion matrix, dan per-class metrics."""
    detail = db_get_training_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail=f"Training Run '{run_id}' tidak ditemukan")
    return detail


@router.post("/training/runs/{run_id}/set-active")
def set_active_production_model(run_id: str, _: dict = Depends(require_training_admin)):
    """Menjadikan model dari Training Run tertentu sebagai Active / Production Model untuk inference MedSign."""
    run = db_set_active_training_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail=f"Training Run '{run_id}' tidak ditemukan")

    backend_dir = Path(__file__).resolve().parents[2]
    models_dir = backend_dir / "models"
    model_version = run.get("model_version")

    # Salin atau aktifkan file checkpoint model ke medsign_mvp_v1.tflite
    tflite_source = models_dir / f"{model_version}.tflite"
    dest_tflite = models_dir / "medsign_mvp_v1.tflite"

    try:
        from app.ml.model import ModelLoader
        loader = ModelLoader()
        with loader.lock:
            loader.interpreter = None
            loader.loaded = False
            import gc
            gc.collect()
            time.sleep(0.05)

            if tflite_source.exists():
                shutil.copy2(tflite_source, dest_tflite)

            keras_src = models_dir / f"{model_version}.keras"
            if keras_src.exists():
                shutil.copy2(keras_src, models_dir / "medsign_mvp_v1.keras")

            labels_src = models_dir / f"{model_version}_labels.json"
            if labels_src.exists():
                shutil.copy2(labels_src, models_dir / "medsign_mvp_v1_labels.json")

            loader.load(dest_tflite)

        # Aktifkan di SLTAdapterService
        from app.services.slt_adapter import SLTAdapterService
        adapter = SLTAdapterService()
        adapter.select_model(f"{model_version}.tflite", model_type="clinical")

        return {
            "status": "success",
            "message": f"Model {model_version} ({run.get('model_type')}) berhasil diatur sebagai Active Production Model!",
            "run_id": run_id,
            "model_version": model_version,
            "active_model_path": str(dest_tflite.relative_to(backend_dir)).replace("\\", "/")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengatur active model: {str(e)}")


@router.get("/training/compare")
def compare_training_runs(run_ids: str = Query(..., description="ID training runs dipisahkan koma")):
    """Membandingkan performa beberapa model / training run secara berdampingan."""
    ids = [i.strip() for i in run_ids.split(",") if i.strip()]
    if len(ids) < 2:
        raise HTTPException(status_code=400, detail="Pilih minimal 2 Training Run untuk dibandingkan")

    details = []
    for rid in ids:
        d = db_get_training_run_detail(rid)
        if d:
            details.append(d)

    if len(details) < 2:
        raise HTTPException(status_code=404, detail="Tidak cukup model valid ditemukan untuk dibandingkan")

    # Matriks perbandingan metrik standar
    metric_keys = [
        {"key": "train_accuracy", "label": "Train Accuracy", "format": "percent"},
        {"key": "val_accuracy", "label": "Validation Accuracy", "format": "percent"},
        {"key": "test_accuracy", "label": "Test Accuracy", "format": "percent"},
        {"key": "precision", "label": "Precision", "format": "percent"},
        {"key": "recall", "label": "Recall", "format": "percent"},
        {"key": "f1_score", "label": "F1 Score", "format": "percent"},
        {"key": "test_loss", "label": "Test Loss", "format": "number"},
        {"key": "duration", "label": "Training Duration (s)", "format": "seconds"},
        {"key": "epochs", "label": "Epochs", "format": "integer"},
        {"key": "batch_size", "label": "Batch Size", "format": "integer"},
    ]

    comparison_rows = []
    for m in metric_keys:
        row = {"metric": m["label"], "key": m["key"], "format": m["format"], "values": {}}
        for run in details:
            val = run.get(m["key"])
            row["values"][run["id"]] = val
        comparison_rows.append(row)

    return {
        "runs": [
            {
                "id": r["id"],
                "model_version": r["model_version"],
                "model_type": r["model_type"],
                "dataset_id": r["dataset_id"],
                "status": r["status"],
                "is_active": r["is_active"],
                "test_accuracy": r["test_accuracy"],
                "f1_score": r["f1_score"],
                "test_loss": r["test_loss"],
                "created_at": r["created_at"],
            }
            for r in details
        ],
        "comparison_table": comparison_rows,
        "confusion_matrices": {
            r["id"]: {
                "version": r["model_version"],
                "model_type": r["model_type"],
                "confusion_matrix": r.get("confusion_matrix")
            }
            for r in details
        },
        "histories": {
            r["id"]: {
                "version": r["model_version"],
                "model_type": r["model_type"],
                "history": r.get("history", [])
            }
            for r in details
        }
    }


@router.delete("/training/runs/{run_id}")
def delete_training_run(run_id: str, _: dict = Depends(require_training_admin)):
    success = db_delete_training_run(run_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Training Run '{run_id}' tidak ditemukan")
    return {"status": "success", "message": f"Training Run '{run_id}' berhasil dihapus"}


# ═══ Export Laporan Training Run (PDF / DOCX / Excel) ═══
@router.get("/training/runs/{run_id}/report")
def export_training_run_report(run_id: str, format: str = "pdf"):
    fmt = (format or "pdf").lower()
    if fmt not in ("pdf", "docx", "excel"):
        raise HTTPException(status_code=400, detail="Format harus 'pdf', 'docx', atau 'excel'")

    detail = db_get_training_run_detail(run_id)
    if not detail:
        raise HTTPException(status_code=404, detail="Training Run tidak ditemukan")

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    ver = detail.get("model_version", "Model")

    # Format data summary
    m_type = detail.get("model_type", "ML")
    test_acc = detail.get("test_accuracy") or 0.0
    val_acc = detail.get("val_accuracy") or 0.0
    train_acc = detail.get("train_accuracy") or 0.0
    test_loss = detail.get("test_loss") or 0.0
    prec = detail.get("precision") or 0.0
    rec = detail.get("recall") or 0.0
    f1 = detail.get("f1_score") or 0.0
    duration = detail.get("duration") or 0.0
    epochs = detail.get("epochs") or 0

    if fmt == "excel":
        content = f"""<html>
<head><meta charset="utf-8"></head>
<body>
<h2>Laporan Evaluasi Model MedSign - {ver} ({m_type})</h2>
<p><strong>Training ID:</strong> {run_id}</p>
<p><strong>Status:</strong> {detail.get('status')}</p>
<p><strong>Tanggal:</strong> {detail.get('started_at')}</p>
<p><strong>Durasi:</strong> {duration} detik</p>
<table border="1" cellpadding="6">
  <tr style="background:#0284c7;color:white;">
    <th>Metrik</th><th>Nilai</th>
  </tr>
  <tr><td>Test Accuracy</td><td>{test_acc:.2%}</td></tr>
  <tr><td>Precision (Macro)</td><td>{prec:.2%}</td></tr>
  <tr><td>Recall (Macro)</td><td>{rec:.2%}</td></tr>
  <tr><td>F1-Score (Macro)</td><td>{f1:.2%}</td></tr>
  <tr><td>Test Loss</td><td>{test_loss:.4f}</td></tr>
  <tr><td>Train Accuracy</td><td>{train_acc:.2%}</td></tr>
  <tr><td>Validation Accuracy</td><td>{val_acc:.2%}</td></tr>
  <tr><td>Total Epoch</td><td>{epochs}</td></tr>
</table>
<h3>Klasifikasi Per Kelas</h3>
<table border="1" cellpadding="6">
  <tr style="background:#e0f2fe;">
    <th>Class</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>Support</th>
  </tr>
"""
        for c in detail.get("classification_report", []):
            content += f"<tr><td>{c.get('class_name')}</td><td>{c.get('precision', 0):.2%}</td><td>{c.get('recall', 0):.2%}</td><td>{c.get('f1_score', 0):.2%}</td><td>{c.get('support')}</td></tr>"
        content += "</table></body></html>"

        return Response(
            content=content.encode("utf-8"),
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="laporan_training_{ver}_{stamp}.xls"'}
        )

    elif fmt == "docx":
        content = f"""<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>Laporan Training {ver}</title></head>
<body style="font-family: Arial, sans-serif; margin: 30px;">
<h1 style="color:#0284c7;">MEDSIGN AI - LAPORAN PELATIHAN MODEL</h1>
<h2>Versi Model: {ver} ({m_type})</h2>
<hr/>
<p><strong>Training ID:</strong> {run_id}</p>
<p><strong>Dataset:</strong> {detail.get('dataset_id')}</p>
<p><strong>Status:</strong> {detail.get('status')}</p>
<p><strong>Waktu Pelatihan:</strong> {detail.get('started_at')}</p>
<p><strong>Durasi:</strong> {duration} detik ({epochs} Epochs)</p>
<br/>
<table border="1" cellpadding="8" style="border-collapse:collapse; width:100%;">
  <tr style="background:#0284c7; color:white;">
    <th>Test Accuracy</th><th>Precision</th><th>Recall</th><th>F1-Score</th><th>Test Loss</th>
  </tr>
  <tr align="center">
    <td><b>{test_acc:.2%}</b></td><td>{prec:.2%}</td><td>{rec:.2%}</td><td>{f1:.2%}</td><td>{test_loss:.4f}</td>
  </tr>
</table>
</body></html>"""

        return Response(
            content=content.encode("utf-8"),
            media_type="application/msword",
            headers={"Content-Disposition": f'attachment; filename="laporan_training_{ver}_{stamp}.doc"'}
        )

    else: # PDF
        html = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {{ font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 25px; line-height: 1.4; }}
  .header {{ border-bottom: 3px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; }}
  .title {{ font-size: 20px; font-weight: 900; color: #0f172a; text-transform: uppercase; margin: 0; }}
  .sub {{ font-size: 11px; color: #64748b; font-weight: 600; margin-top: 4px; }}
  .grid {{ display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px; }}
  .card {{ background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 14px; flex: 1; min-width: 110px; }}
  .card-label {{ font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; }}
  .card-val {{ font-size: 16px; font-weight: 900; color: #0284c7; margin-top: 2px; }}
  table {{ width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }}
  th {{ background: #0284c7; color: white; text-align: left; padding: 7px 10px; font-weight: 800; text-transform: uppercase; font-size: 9px; }}
  td {{ padding: 6px 10px; border-bottom: 1px solid #e2e8f0; }}
  tr:nth-child(even) {{ background: #f8fafc; }}
  .badge {{ display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 800; background: #dcfce7; color: #15803d; }}
</style>
</head>
<body>
  <div class="header">
    <h1 class="title">MedSign AI — Laporan Pelatihan & Evaluasi Model</h1>
    <div class="sub">Model: <strong>{ver}</strong> ({m_type}) | Run ID: {run_id} | Dataset: {detail.get('dataset_id')} | Tanggal: {detail.get('started_at')}</div>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card-label">Test Accuracy</div>
      <div class="card-val">{test_acc:.2%}</div>
    </div>
    <div class="card">
      <div class="card-label">Precision</div>
      <div class="card-val">{prec:.2%}</div>
    </div>
    <div class="card">
      <div class="card-label">Recall</div>
      <div class="card-val">{rec:.2%}</div>
    </div>
    <div class="card">
      <div class="card-label">F1-Score</div>
      <div class="card-val">{f1:.2%}</div>
    </div>
    <div class="card">
      <div class="card-label">Test Loss</div>
      <div class="card-val">{test_loss:.4f}</div>
    </div>
  </div>

  <h3 style="font-size: 12px; text-transform: uppercase; color: #334155; margin-bottom: 4px;">Metrik Per Kelas (Multiclass Classification)</h3>
  <table>
    <thead>
      <tr>
        <th>Kelas</th>
        <th>Precision</th>
        <th>Recall</th>
        <th>F1-Score</th>
        <th>Support</th>
      </tr>
    </thead>
    <tbody>
"""
        for c in detail.get("classification_report", []):
            html += f"""      <tr>
        <td><strong>{c.get('class_name')}</strong></td>
        <td>{c.get('precision', 0):.2%}</td>
        <td>{c.get('recall', 0):.2%}</td>
        <td>{c.get('f1_score', 0):.2%}</td>
        <td>{c.get('support')}</td>
      </tr>
"""
        html += """    </tbody>
  </table>
</body>
</html>"""
        return Response(
            content=html.encode("utf-8"),
            media_type="text/html",
            headers={"Content-Disposition": f'inline; filename="laporan_training_{ver}_{stamp}.html"'}
        )
