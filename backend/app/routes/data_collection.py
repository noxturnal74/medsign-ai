# -*- coding: utf-8 -*-
from __future__ import annotations
import re
import asyncio
import subprocess
from fastapi.responses import StreamingResponse

import os
from pathlib import Path
from typing import List

import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

class SaveSampleRequest(BaseModel):
    label: str = Field(..., description="Slug label yang direkam")
    signer_id: str = Field(..., description="ID peraga/responden")
    session_id: str = Field(..., description="ID sesi perekaman")
    take_index: int = Field(..., description="Index pengambilan data (mulai dari 1)")
    frames: List[List[float]] = Field(..., description="Sequence berisi tepat 30 frame data landmark, masing-masing 63 float")

@router.post("/save-sample")
def save_sample(request: SaveSampleRequest):
    # Validasi signer_id format (lowercase and underscore only)
    if not re.match(r"^[a-z0-9_]+$", request.signer_id):
        raise HTTPException(
            status_code=400,
            detail="Signer ID harus menggunakan format lowercase underscore saja (contoh: albert_william)"
        )
    # 1. Validasi frames
    if len(request.frames) != 30:
        raise HTTPException(status_code=400, detail="Sequence frames harus berjumlah tepat 30")
    for idx, f in enumerate(request.frames):
        if len(f) != 63:
            raise HTTPException(status_code=400, detail=f"Frame {idx} harus memiliki tepat 63 koordinat")

    # 2. Tentukan target path
    # backend/data/landmarks/<label>/<signer_id>
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"

    label_dir = landmarks_dir / request.label / request.signer_id
    label_dir.mkdir(parents=True, exist_ok=True)

    take_id = f"{request.session_id}_{request.label}_{request.take_index:03d}"
    filename = f"{request.label}_{request.signer_id}_{take_id}.npy"
    file_path = label_dir / filename

    try:
        # 3. Simpan sebagai file numpy
        arr = np.array(request.frames, dtype=np.float32)
        np.save(str(file_path), arr)

        # Update recordings.csv (format: timestamp,filepath,label,signer,frames)
        csv_path = backend_dir / "data" / "metadata" / "recordings.csv"
        import csv
        from datetime import datetime

        # Make metadata folder if not exists
        csv_path.parent.mkdir(parents=True, exist_ok=True)

        file_exists = csv_path.exists()
        with csv_path.open("a", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            if not file_exists:
                writer.writerow(["timestamp", "filepath", "label", "signer", "frames"])
            writer.writerow([
                datetime.now().isoformat(),
                f"landmarks/{request.label}/{request.signer_id}/{filename}",
                request.label,
                request.signer_id,
                30
            ])

        return {
            "status": "success",
            "message": f"Sample berhasil disimpan ke {filename}",
            "file_path": str(file_path),
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")


@router.get("/dataset/signers")
def get_dataset_signers():
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"

    # Default signers from mockup
    signers = {"albert_william", "albert_cheng", "glenn", "loren"}

    if landmarks_dir.exists():
        for label_dir in landmarks_dir.iterdir():
            if label_dir.is_dir():
                for signer_dir in label_dir.iterdir():
                    if signer_dir.is_dir():
                        signer_id = signer_dir.name.strip().lower()
                        if signer_id:
                            signers.add(signer_id)

    return sorted(list(signers))


@router.get("/dataset/balance")
def get_dataset_balance():
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"

    from app.ml.labels import load_label_items
    label_items = load_label_items()

    signers_list = get_dataset_signers()

    balance_data = []
    for item in label_items:
        label = item["slug"]
        label_display = item["display"]
        category = item.get("category", "clinical")

        signer_counts = {}
        total_samples = 0
        for signer in signers_list:
            signer_dir = landmarks_dir / label / signer
            count = 0
            if signer_dir.exists():
                count = len(list(signer_dir.glob("*.npy")))
            signer_counts[signer] = count
            total_samples += count

        min_required = 5 * len(signers_list)
        if total_samples >= min_required:
            status = "Cukup"
        elif total_samples > 0:
            status = "Kurang"
        else:
            status = "Belum"

        balance_data.append({
            "label": label,
            "display": label_display,
            "category": category,
            "counts": signer_counts,
            "total": total_samples,
            "status": status
        })

    return {
        "signers": signers_list,
        "balance": balance_data
    }


class TrainRequest(BaseModel):
    labels: List[str] = Field(default=[], description="Subset kata yang dilatih")
    epochs: int = Field(default=120, description="Jumlah epochs")
    architecture: str = Field(default="gru", description="Architecture gru atau lstm")
    test_size: float = Field(default=0.2, description="Rasio test split (0.1 - 0.5)")


@router.post("/dataset/train")
def train_dataset(request: TrainRequest):
    async def log_generator():
        backend_dir = Path(__file__).resolve().parents[2]
        training_script = backend_dir / "training" / "train_clinical_model.py"

        import sys
        import threading
        import queue

        # PENTING: sys.executable di dalam uvicorn worker menunjuk ke Python uv
        # (sistem), bukan venv Python — karena venv\Scripts\python.exe adalah
        # shim yang diredirect oleh uv ke Python instalasi globalnya.
        # Akibatnya training subprocess dijalankan tanpa TensorFlow tersedia.
        # Solusi: pakai path eksplisit ke venv\Scripts\python.exe.
        venv_python = backend_dir / "venv" / "Scripts" / "python.exe"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        cmd = [
            python_exe,
            str(training_script),
            "--epochs", str(request.epochs),
            "--architecture", request.architecture,
            "--test-size", str(request.test_size),
            "--min-samples-per-label", "1"
        ]

        if request.labels:
            cmd.extend(["--labels", ",".join(request.labels)])

        print("Running training:", " ".join(cmd))


        # NOTE: Gunakan subprocess.Popen (bukan asyncio.create_subprocess_exec) yang
        # dijalankan di thread terpisah. Di Windows, asyncio.create_subprocess_exec
        # membutuhkan ProactorEventLoop; jika event loop yang aktif adalah
        # SelectorEventLoop, subprocess creation akan gagal dengan NotImplementedError.
        # Pendekatan berbasis thread + queue ini tidak tergantung asyncio event loop
        # policy sama sekali, sehingga selalu bekerja di Windows.
        line_queue = queue.Queue()

        def run_process():
            try:
                process = subprocess.Popen(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    cwd=str(backend_dir),
                    text=True,
                    encoding="utf-8",
                    errors="replace",
                    bufsize=1,
                )
                for line in process.stdout:
                    line_queue.put(line.rstrip("\n"))
                process.wait()
                line_queue.put(f"[TRAINING_FINISHED] Exit code: {process.returncode}")
            except Exception as exc:
                line_queue.put(f"[TRAINING_FINISHED] Exit code: 1 (Error: {exc})")
            finally:
                line_queue.put(None)

        thread = threading.Thread(target=run_process, daemon=True)
        thread.start()

        loop = asyncio.get_event_loop()
        while True:
            line_str = await loop.run_in_executor(None, line_queue.get)
            if line_str is None:
                break
            yield f"data: {line_str}\n\n"

    return StreamingResponse(log_generator(), media_type="text/event-stream")
