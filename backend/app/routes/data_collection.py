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
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from app.routes.auth import get_current_user

router = APIRouter()


def require_ml_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Gate untuk endpoint berbahaya (training, upload model, delete dataset).
    Hanya super_admin / admin / doctor yang diizinkan."""
    if current_user.get("role") not in ["super_admin", "admin", "doctor"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return current_user

class SaveSampleRequest(BaseModel):
    label: str = Field(..., description="Slug label yang direkam")
    signer_id: str = Field(..., description="ID peraga/responden")
    session_id: str = Field(..., description="ID sesi perekaman")
    take_index: int = Field(..., description="Index pengambilan data (mulai dari 1)")
    frames: List[List[float]] = Field(..., description="Sequence berisi tepat 30 frame data landmark, masing-masing 63 float")

@router.post("/save-sample")
def save_sample(request: SaveSampleRequest, _: dict = Depends(require_ml_user)):
    # Validasi signer_id format (lowercase and underscore only)
    if not re.match(r"^[a-z0-9_]+$", request.signer_id):
        raise HTTPException(
            status_code=400,
            detail="Signer ID harus menggunakan format lowercase underscore saja (contoh: albert_william)"
        )
    if not re.match(r"^[a-z0-9_-]+$", request.label):
        raise HTTPException(
            status_code=400,
            detail="Label tidak valid"
        )
    if not re.match(r"^[a-zA-Z0-9_-]+$", request.session_id):
        raise HTTPException(
            status_code=400,
            detail="Session ID tidak valid"
        )
    # 1. Validasi frames
    if len(request.frames) != 30:
        raise HTTPException(status_code=400, detail="Sequence frames harus berjumlah tepat 30")
    for idx, f in enumerate(request.frames):
        if len(f) != 63:
            raise HTTPException(status_code=400, detail=f"Frame {idx} harus memiliki tepat 63 koordinat")

    # 2. Tentukan target path
    # backend/data/landmarks/<label>/<signer_id> (clinical)
    # backend/data/landmark_abjad_angka/<label>/<signer_id> (alphabet/number)
    backend_dir = Path(__file__).resolve().parents[2]
    
    # Check if label is alphabet/number (single char A-Z or 1-9)
    is_alphabet = len(request.label) == 1 and (request.label.isalpha() or request.label.isdigit())
    if is_alphabet:
        landmarks_dir = backend_dir / "data" / "landmark_abjad_angka"
        # Normalize label to lowercase for folder name
        label_normalized = request.label.lower()
    else:
        landmarks_dir = backend_dir / "data" / "landmarks"
        label_normalized = request.label

    label_dir = landmarks_dir / label_normalized / request.signer_id
    label_dir.mkdir(parents=True, exist_ok=True)

    take_id = f"{request.session_id}_{label_normalized}_{request.take_index:03d}"
    filename = f"{label_normalized}_{request.signer_id}_{take_id}.npy"
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

        # Determine folder prefix for filepath
        folder_prefix = "landmark_abjad_angka" if is_alphabet else "landmarks"
        filepath_in_csv = f"{folder_prefix}/{label_normalized}/{request.signer_id}/{filename}"

        file_exists = csv_path.exists()
        with csv_path.open("a", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            if not file_exists:
                writer.writerow(["timestamp", "filepath", "label", "signer", "frames"])
            writer.writerow([
                datetime.now().isoformat(),
                filepath_in_csv,
                label_normalized,
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


class DeleteSampleRequest(BaseModel):
    label: str
    signer: str
    filename: str

@router.get("/dataset/samples/{label}")
def get_dataset_samples(label: str):
    if not re.match(r"^[a-z0-9_-]+$", label):
        raise HTTPException(status_code=400, detail="Label tidak valid")
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks" / label
    
    samples = []
    if landmarks_dir.exists():
        from datetime import datetime
        for signer_dir in landmarks_dir.iterdir():
            if signer_dir.is_dir():
                signer_id = signer_dir.name
                for f in signer_dir.glob("*.npy"):
                    try:
                        stat = f.stat()
                        mtime = datetime.fromtimestamp(stat.st_mtime).strftime("%d/%m/%Y %H:%M")
                        samples.append({
                            "filename": f.name,
                            "signer": signer_id,
                            "size_kb": round(stat.st_size / 1024, 2),
                            "created_at": mtime
                        })
                    except Exception:
                        pass
    samples.sort(key=lambda x: x["created_at"], reverse=True)
    return samples

@router.post("/dataset/samples/delete")
def delete_dataset_sample(request: DeleteSampleRequest, _: dict = Depends(require_ml_user)):
    if not re.match(r"^[a-z0-9_-]+$", request.label):
        raise HTTPException(status_code=400, detail="Label tidak valid")
    if not re.match(r"^[a-z0-9_]+$", request.signer):
        raise HTTPException(status_code=400, detail="Signer tidak valid")
    if not request.filename.endswith(".npy") or "/" in request.filename or chr(92) in request.filename or ".." in request.filename:
        raise HTTPException(status_code=400, detail="Nama file tidak valid")
    backend_dir = Path(__file__).resolve().parents[2]
    file_path = backend_dir / "data" / "landmarks" / request.label / request.signer / request.filename
    if file_path.exists() and file_path.is_file():
        try:
            file_path.unlink()
            parent = file_path.parent
            if parent.exists() and not list(parent.iterdir()):
                parent.rmdir()
                grandparent = parent.parent
                if grandparent.exists() and not list(grandparent.iterdir()):
                    grandparent.rmdir()
            return {"status": "success", "message": f"File {request.filename} berhasil dihapus"}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menghapus file: {str(e)}")
    raise HTTPException(status_code=404, detail="File tidak ditemukan")


class BulkDeleteSampleItem(BaseModel):
    signer: str
    filename: str

class BulkDeleteSamplesRequest(BaseModel):
    label: str
    samples: List[BulkDeleteSampleItem]

@router.post("/dataset/samples/delete-bulk")
def delete_dataset_samples_bulk(request: BulkDeleteSamplesRequest, _: dict = Depends(require_ml_user)):
    if not re.match(r"^[a-z0-9_-]+$", request.label):
        raise HTTPException(status_code=400, detail="Label tidak valid")
    for item in request.samples:
        if not re.match(r"^[a-z0-9_]+$", item.signer):
            raise HTTPException(status_code=400, detail="Signer tidak valid")
        if not item.filename.endswith(".npy") or "/" in item.filename or chr(92) in item.filename or ".." in item.filename:
            raise HTTPException(status_code=400, detail="Nama file tidak valid")
    backend_dir = Path(__file__).resolve().parents[2]
    deleted_count = 0
    errors = []
    
    for item in request.samples:
        file_path = backend_dir / "data" / "landmarks" / request.label / item.signer / item.filename
        if file_path.exists() and file_path.is_file():
            try:
                file_path.unlink()
                deleted_count += 1
                
                parent = file_path.parent
                if parent.exists() and not list(parent.iterdir()):
                    parent.rmdir()
                    grandparent = parent.parent
                    if grandparent.exists() and not list(grandparent.iterdir()):
                        grandparent.rmdir()
            except Exception as e:
                errors.append(f"Gagal menghapus {item.filename}: {str(e)}")
                
    return {
        "status": "success" if not errors else "partial",
        "message": f"Berhasil menghapus {deleted_count} file.",
        "errors": errors
    }


@router.get("/dataset/health-report")
def get_dataset_health_report():
    backend_dir = Path(__file__).resolve().parents[2]
    report_path = backend_dir / "reports" / "DATASET_HEALTH_REPORT.md"
    if report_path.exists():
        try:
            return {
                "status": "success",
                "exists": True,
                "markdown": report_path.read_text(encoding="utf-8")
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}
    return {
        "status": "success",
        "exists": False,
        "markdown": "# Laporan tidak ditemukan\nLakukan validasi atau training terlebih dahulu."
    }

@router.get("/dataset/motion/{label}")
def get_dataset_motion(label: str):
    if not re.match(r"^[a-z0-9_-]+$", label):
        raise HTTPException(status_code=400, detail="Label tidak valid")
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks" / label
    if landmarks_dir.exists():
        npy_files = list(landmarks_dir.glob("**/*.npy"))
        if npy_files:
            try:
                arr = np.load(str(npy_files[0]), allow_pickle=False)
                if arr.shape == (30, 63):
                    return {
                        "status": "success",
                        "has_data": True,
                        "frames": arr.tolist()
                    }
            except Exception as e:
                print(f"Error loading landmarks: {e}")
    return {
        "status": "success",
        "has_data": False,
        "frames": []
    }

@router.get("/dataset/balance")
def get_dataset_balance(model_type: str = "clinical"):
    backend_dir = Path(__file__).resolve().parents[2]
    
    if model_type == "alphabet":
        landmarks_dir = backend_dir / "data" / "landmark_abjad_angka"
        alphabet_classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + [str(i) for i in range(1, 10)]
        label_items = [
            {
                "id": idx,
                "slug": char.lower() if char.isalpha() else char,  # store as lowercase for consistency
                "display": char,
                "category": "Abjad" if char.isalpha() else "Angka",
                "emergency": False
            }
            for idx, char in enumerate(alphabet_classes)
        ]
    else:
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
        latest_time = 0.0
        for signer in signers_list:
            signer_dir = landmarks_dir / label / signer
            count = 0
            if signer_dir.exists():
                npy_files = list(signer_dir.glob("*.npy"))
                count = len(npy_files)
                for f in npy_files:
                    try:
                        mtime = f.stat().st_mtime
                        if mtime > latest_time:
                            latest_time = mtime
                    except Exception:
                        pass
            signer_counts[signer] = count
            total_samples += count

        min_required = 5 * len(signers_list)
        if total_samples >= min_required:
            status = "Cukup"
        elif total_samples > 0:
            status = "Kurang"
        else:
            status = "Belum"

        from datetime import datetime
        last_updated = datetime.fromtimestamp(latest_time).strftime("%d/%m/%Y %H:%M") if latest_time > 0 else "-"

        balance_data.append({
            "label": label,
            "display": label_display,
            "category": category,
            "counts": signer_counts,
            "total": total_samples,
            "status": status,
            "last_updated": last_updated
        })

    return {
        "signers": signers_list,
        "balance": balance_data
    }
class TrainRequest(BaseModel):
    model_type: str = Field(default="clinical", description="Tipe model: 'clinical' atau 'alphabet'")
    labels: List[str] = Field(default=[], description="Subset kata yang dilatih")
    epochs: int = Field(default=120, description="Jumlah epochs")
    architecture: str = Field(default="gru", description="Architecture gru atau lstm")
    test_size: float = Field(default=0.2, description="Rasio test split (0.1 - 0.5)")

class FinalizeModelRequest(BaseModel):
    model_type: str = Field(..., description="Tipe model: 'clinical' atau 'alphabet'")
    action: str = Field(..., description="Aksi: 'replace' atau 'save_new'")


@router.post("/dataset/train/finalize")
def finalize_model(request: FinalizeModelRequest, _: dict = Depends(require_ml_user)):
    if request.model_type not in ["clinical", "alphabet"]:
        raise HTTPException(status_code=400, detail="model_type harus 'clinical' atau 'alphabet'")
    if request.action not in ["replace", "save_new"]:
        raise HTTPException(status_code=400, detail="action harus 'replace' atau 'save_new'")
    backend_dir = Path(__file__).resolve().parents[2]
    models_dir = backend_dir / "models"
    
    from datetime import datetime
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if request.model_type == "alphabet":
        temp_tflite = models_dir / "bisindo_alphabet_v1_temp.tflite"
        temp_h5 = models_dir / "bisindo_alphabet_v1_temp.h5"
        
        if not temp_tflite.exists():
            raise HTTPException(status_code=400, detail="Temporary alphabet model tidak ditemukan. Lakukan training terlebih dahulu.")
            
        if request.action == "replace":
            dest_tflite = models_dir / "bisindo_alphabet_v1.tflite"
            dest_h5 = models_dir / "bisindo_alphabet.h5"
            
            # Release file lock before copying on Windows
            from app.ml.model import ModelLoader
            loader = ModelLoader()
            with loader.lock:
                loader.alphabet_interpreter = None
                loader.alphabet_loaded = False
                import gc
                gc.collect()
                import time
                time.sleep(0.1)
                
                import shutil
                if temp_tflite.exists():
                    shutil.copy2(temp_tflite, dest_tflite)
                if temp_h5.exists():
                    shutil.copy2(temp_h5, dest_h5)
                
                # Load the new alphabet model immediately
                loader.load_alphabet(dest_tflite)
                
            return {"status": "success", "message": "Model abjad aktif berhasil digantikan dengan model baru."}
            
        elif request.action == "save_new":
            dest_tflite = models_dir / f"bisindo_alphabet_v1_{timestamp}.tflite"
            dest_h5 = models_dir / f"bisindo_alphabet_{timestamp}.h5"
            
            import shutil
            if temp_tflite.exists():
                shutil.copy2(temp_tflite, dest_tflite)
            if temp_h5.exists():
                shutil.copy2(temp_h5, dest_h5)
                
            return {
                "status": "success", 
                "message": f"Model abjad baru berhasil disimpan dengan nama bisindo_alphabet_v1_{timestamp}.tflite"
            }
            
    else: # clinical model
        temp_tflite = models_dir / "medsign_mvp_v1_temp.tflite"
        temp_h5 = models_dir / "medsign_mvp_v1_temp.h5"
        temp_json = models_dir / "medsign_mvp_v1_temp_labels.json"
        
        if not temp_tflite.exists():
            raise HTTPException(status_code=400, detail="Temporary clinical model tidak ditemukan. Lakukan training terlebih dahulu.")
            
        if request.action == "replace":
            dest_tflite = models_dir / "medsign_mvp_v1.tflite"
            dest_h5 = models_dir / "medsign_mvp_v1.h5"
            dest_json = models_dir / "medsign_mvp_v1_labels.json"
            
            # Release file lock before copying on Windows
            from app.ml.model import ModelLoader
            loader = ModelLoader()
            with loader.lock:
                loader.interpreter = None
                loader.loaded = False
                import gc
                gc.collect()
                import time
                time.sleep(0.1)
                
                import shutil
                if temp_tflite.exists():
                    shutil.copy2(temp_tflite, dest_tflite)
                if temp_h5.exists():
                    shutil.copy2(temp_h5, dest_h5)
                if temp_json.exists():
                    shutil.copy2(temp_json, dest_json)
                
                # Load the new clinical model immediately
                loader.load(dest_tflite)
                
            return {"status": "success", "message": "Model klinis aktif berhasil digantikan dengan model baru."}
            
        elif request.action == "save_new":
            dest_tflite = models_dir / f"medsign_mvp_v1_{timestamp}.tflite"
            dest_h5 = models_dir / f"medsign_mvp_v1_{timestamp}.h5"
            dest_json = models_dir / f"medsign_mvp_v1_{timestamp}_labels.json"
            
            import shutil
            if temp_tflite.exists():
                shutil.copy2(temp_tflite, dest_tflite)
            if temp_h5.exists():
                shutil.copy2(temp_h5, dest_h5)
            if temp_json.exists():
                shutil.copy2(temp_json, dest_json)
                
            return {
                "status": "success", 
                "message": f"Model klinis baru berhasil disimpan dengan nama medsign_mvp_v1_{timestamp}.tflite"
            }
            
    raise HTTPException(status_code=400, detail="Aksi atau tipe model tidak valid.")

@router.post("/dataset/train")
def train_dataset(request: TrainRequest, _: dict = Depends(require_ml_user)):
    if request.architecture not in ["gru", "lstm"]:
        raise HTTPException(status_code=400, detail="Architecture harus 'gru' atau 'lstm'")
    if not (1 <= request.epochs <= 1000):
        raise HTTPException(status_code=400, detail="Epochs harus di antara 1 dan 1000")
    if not (0.01 <= request.test_size <= 0.9):
        raise HTTPException(status_code=400, detail="Test size harus di antara 0.01 dan 0.9")
    if request.labels:
        for label in request.labels:
            if not re.match(r"^[a-z0-9_-]+$", label):
                raise HTTPException(status_code=400, detail=f"Label '{label}' tidak valid")
    async def log_generator():
        backend_dir = Path(__file__).resolve().parents[2]
        import sys
        import threading
        import queue

        venv_python = backend_dir / "venv" / "Scripts" / "python.exe"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        if request.model_type == "alphabet":
            training_script = backend_dir / "training" / "train_alphabet_dynamic.py"
            cmd = [
                python_exe,
                str(training_script),
                "--epochs", str(request.epochs),
                "--model-name", "bisindo_alphabet_v1_temp",
                "--architecture", request.architecture,
                "--landmarks-dir", str(backend_dir / "data" / "landmark_abjad_angka"),
            ]
        else:
            training_script = backend_dir / "training" / "train_clinical_model.py"
            cmd = [
                python_exe,
                str(training_script),
                "--epochs", str(request.epochs),
                "--architecture", request.architecture,
                "--test-size", str(request.test_size),
                "--min-samples-per-label", "1",
                "--model-name", "medsign_mvp_v1_temp"
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
# New endpoints for model upload, auto-fix, and sample upload
from fastapi import UploadFile, File, Form
import shutil
import io

@router.post("/dataset/model/upload")
async def upload_model_file(
    model_type: str = Form(..., description="Tipe model: 'clinical' atau 'alphabet'"),
    file: UploadFile = File(...),
    _: dict = Depends(require_ml_user)
):
    if model_type not in ["clinical", "alphabet"]:
        raise HTTPException(status_code=400, detail="model_type harus 'clinical' atau 'alphabet'")
    backend_dir = Path(__file__).resolve().parents[2]
    models_dir = backend_dir / "models"
    models_dir.mkdir(parents=True, exist_ok=True)
    
    filename = file.filename
    if not filename.endswith(".tflite"):
        raise HTTPException(status_code=400, detail="Hanya file model .tflite yang diperbolehkan")
        
    if model_type == "alphabet":
        dest_filename = "bisindo_alphabet_v1.tflite"
    else:
        dest_filename = "medsign_mvp_v1.tflite"
        
    dest_path = models_dir / dest_filename
    
    from app.ml.model import ModelLoader
    loader = ModelLoader()
    with loader.lock:
        if model_type == "alphabet":
            loader.alphabet_interpreter = None
            loader.alphabet_loaded = False
        else:
            loader.interpreter = None
            loader.loaded = False
        import gc
        gc.collect()
        import time
        time.sleep(0.1)
        
        try:
            contents = await file.read()
            with dest_path.open("wb") as f:
                f.write(contents)
                
            if model_type == "alphabet":
                loader.load_alphabet(dest_path)
            else:
                loader.load(dest_path)
                
            return {
                "status": "success",
                "message": f"Model {model_type} berhasil diunggah dengan nama {dest_filename} dan dimuat."
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Gagal menyimpan model: {str(e)}")


@router.post("/dataset/model/auto-fix")
def auto_fix_models(_: dict = Depends(require_ml_user)):
    backend_dir = Path(__file__).resolve().parents[2]
    models_dir = backend_dir / "models"
    
    if not models_dir.exists():
        models_dir.mkdir(parents=True, exist_ok=True)
        
    tflite_files = list(models_dir.glob("*.tflite"))
    if not tflite_files:
        raise HTTPException(
            status_code=404, 
            detail="Tidak ditemukan file model .tflite apapun di direktori backend/models."
        )
        
    fixed_clinical = False
    fixed_alphabet = False
    
    from app.ml.model import ModelLoader
    loader = ModelLoader()
    
    with loader.lock:
        # Check clinical model
        dest_clinical = models_dir / "medsign_mvp_v1.tflite"
        if not dest_clinical.exists() or not loader.loaded:
            candidates = [
                f for f in tflite_files 
                if "alphabet" not in f.name and f.name != "medsign_mvp_v1.tflite"
            ]
            if candidates:
                candidates.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                best_candidate = candidates[0]
                
                loader.interpreter = None
                loader.loaded = False
                import gc
                gc.collect()
                import time
                time.sleep(0.1)
                
                shutil.copy2(best_candidate, dest_clinical)
                loader.load(dest_clinical)
                fixed_clinical = True
                
        # Check alphabet model
        dest_alphabet = models_dir / "bisindo_alphabet_v1.tflite"
        if not dest_alphabet.exists() or not loader.alphabet_loaded:
            candidates = [
                f for f in tflite_files 
                if "alphabet" in f.name and f.name != "bisindo_alphabet_v1.tflite"
            ]
            if candidates:
                candidates.sort(key=lambda x: x.stat().st_mtime, reverse=True)
                best_candidate = candidates[0]
                
                loader.alphabet_interpreter = None
                loader.alphabet_loaded = False
                import gc
                gc.collect()
                import time
                time.sleep(0.1)
                
                shutil.copy2(best_candidate, dest_alphabet)
                loader.load_alphabet(dest_alphabet)
                fixed_alphabet = True
                
    if fixed_clinical or fixed_alphabet:
        msg = "Perbaikan model selesai."
        if fixed_clinical:
            msg += " Model clinical berhasil diperbaiki."
        if fixed_alphabet:
            msg += " Model abjad berhasil diperbaiki."
        return {"status": "success", "message": msg}
    else:
        if loader.loaded and loader.alphabet_loaded:
            return {"status": "success", "message": "Semua model sudah terdeteksi dan aktif."}
        else:
            raise HTTPException(
                status_code=400, 
                detail="Tidak dapat menemukan file cadangan .tflite untuk memulihkan model."
            )


@router.post("/dataset/upload-sample")
async def upload_dataset_sample(
    file: UploadFile = File(...),
    label: str = Form(...),
    signer_id: str = Form(...),
    session_id: str = Form("uploaded"),
    take_index: int = Form(1),
    _: dict = Depends(require_ml_user)
):
    if not re.match(r"^[a-z0-9_-]+$", label):
        raise HTTPException(
            status_code=400,
            detail="Label tidak valid"
        )
    if not re.match(r"^[a-z0-9_]+$", signer_id):
        raise HTTPException(
            status_code=400,
            detail="Signer ID harus menggunakan format lowercase underscore saja"
        )
    
    contents = await file.read()
    
    try:
        f_io = io.BytesIO(contents)
        arr = np.load(f_io, allow_pickle=False)
        if arr.shape != (30, 63):
            raise HTTPException(
                status_code=400,
                detail=f"Array shape harus (30, 63), tetapi file memiliki shape {arr.shape}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"File bukan file npy valid atau tidak bisa dibaca: {str(e)}"
        )
        
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"
    
    label_dir = landmarks_dir / label / signer_id
    label_dir.mkdir(parents=True, exist_ok=True)
    
    orig_name = file.filename
    if orig_name.endswith(".npy"):
        clean_filename = Path(orig_name).name
        if not clean_filename.endswith(".npy") or "/" in clean_filename or chr(92) in clean_filename or ".." in clean_filename:
            clean_filename = f"{label}_{signer_id}_uploaded_{take_index:03d}.npy"
    else:
        clean_filename = f"{label}_{signer_id}_uploaded_{take_index:03d}.npy"
        
    file_path = label_dir / clean_filename
    
    try:
        np.save(str(file_path), arr)
        
        csv_path = backend_dir / "data" / "metadata" / "recordings.csv"
        import csv
        from datetime import datetime
        csv_path.parent.mkdir(parents=True, exist_ok=True)
        file_exists = csv_path.exists()
        with csv_path.open("a", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            if not file_exists:
                writer.writerow(["timestamp", "filepath", "label", "signer", "frames"])
            writer.writerow([
                datetime.now().isoformat(),
                f"landmarks/{label}/{signer_id}/{clean_filename}",
                label,
                signer_id,
                30
            ])
            
        return {
            "status": "success",
            "message": f"File {clean_filename} berhasil diunggah dan disimpan.",
            "file_path": str(file_path)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal menyimpan file: {str(e)}")

# AI Dataset Augmentation Models & Routes
from app.services.augmentation_service import AugmentationService
augmentation_service = AugmentationService()

class AugmentPreviewRequest(BaseModel):
    label: str
    techniques: List[str]

class AugmentGenerateRequest(BaseModel):
    model_type: str = "clinical"
    selection: str = "all" # "all", "selected", "lacking", "low_confidence", "recommended"
    selected_labels: List[str] = []
    variations: int = 5
    techniques: List[str] = ["transformer"]
    enable_mirror: bool = True

@router.get("/dataset/augment/stats")
def get_augment_stats():
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"
    
    total_original = 0
    total_generated = 0
    
    if landmarks_dir.exists():
        for f in landmarks_dir.glob("**/*.npy"):
            if "_aug_" in f.name:
                total_generated += 1
            else:
                total_original += 1
                
    ratio = round(total_generated / max(1, total_original), 2)
    
    return {
        "total_original": total_original,
        "total_generated": total_generated,
        "augmentation_ratio": ratio,
        "estimated_total": total_original + total_generated
    }

@router.post("/dataset/augment/preview")
def preview_augmentation(request: AugmentPreviewRequest):
    if not re.match(r"^[a-z0-9_-]+$", request.label):
        raise HTTPException(status_code=400, detail="Label tidak valid")
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks" / request.label
    
    if not landmarks_dir.exists():
        raise HTTPException(status_code=404, detail=f"Dataset untuk kata '{request.label}' belum memiliki data asli.")
        
    npy_files = list(landmarks_dir.glob("**/*.npy"))
    original_files = [f for f in npy_files if "_aug_" not in f.name]
    
    if not original_files:
        raise HTTPException(status_code=404, detail="Tidak ditemukan sampel asli untuk kata ini.")
        
    try:
        arr = np.load(str(original_files[0]), allow_pickle=False)
        augmented = augmentation_service.augment(arr, request.techniques)
        
        # Validation checks
        if np.isnan(augmented).any() or np.isinf(augmented).any():
            raise HTTPException(status_code=422, detail="Augmentasi menghasilkan nilai tidak valid (NaN/Infinity).")
            
        return {
            "original": arr.tolist(),
            "augmented": augmented.tolist()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan preview: {str(e)}")

@router.post("/dataset/augment/generate")
def generate_augmentation(request: AugmentGenerateRequest, _: dict = Depends(require_ml_user)):
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"
    
    # 1. Determine which labels to augment
    labels_to_process = []
    if request.selection == "all":
        # Get all folders in landmarks_dir
        if landmarks_dir.exists():
            labels_to_process = [d.name for d in landmarks_dir.iterdir() if d.is_dir() and re.match(r"^[a-z0-9_-]+$", d.name)]
    elif request.selection == "selected":
        for label in request.selected_labels:
            if not re.match(r"^[a-z0-9_-]+$", label):
                raise HTTPException(status_code=400, detail=f"Label '{label}' tidak valid")
        labels_to_process = request.selected_labels
    elif request.selection in ["lacking", "low_confidence", "recommended"]:
        # Find labels from balanceData where total < 150
        # Let's read and evaluate balanceData dynamically
        balance_res = get_dataset_balance(request.model_type)
        balance_items = balance_res.get("balance", [])
        for item in balance_items:
            total = item.get("total", 0)
            # Smart thresholds
            if request.selection == "lacking" and total < 150:
                labels_to_process.append(item["label"])
            elif request.selection == "low_confidence":
                # Deterministic low confidence mapping matching frontend
                seed = sum(ord(c) for c in item["label"])
                avg_conf = min(96, max(30, 48 + (seed % 18) + (total * 1.6)))
                if avg_conf < 80 and total > 0:
                    labels_to_process.append(item["label"])
            elif request.selection == "recommended":
                # Smart recommend based on multiple conditions
                seed = sum(ord(c) for c in item["label"])
                avg_conf = min(96, max(30, 48 + (seed % 18) + (total * 1.6)))
                avg_acc = min(98, max(25, 40 + (seed % 22) + (total * 1.8)))
                unique_signers = len([c for c in item.get("counts", {}).values() if c > 0])
                confusion_rate = max(1, min(75, 48 - (total * 1.5) + (seed % 14)))
                recommend = avg_conf < 80 or avg_acc < 90 or total < 20 or unique_signers < 3 or confusion_rate > 15
                if recommend:
                    labels_to_process.append(item["label"])
                    
    if not labels_to_process:
        return {"status": "success", "message": "Tidak ada kosa kata yang terpilih untuk augmentasi.", "count": 0}
        
    generated_count = 0
    import csv
    from datetime import datetime
    
    csv_path = backend_dir / "data" / "metadata" / "recordings.csv"
    csv_path.parent.mkdir(parents=True, exist_ok=True)
    file_exists = csv_path.exists()
    
    # Save files and register
    try:
        with csv_path.open("a", newline="", encoding="utf-8") as csvfile:
            writer = csv.writer(csvfile)
            if not file_exists:
                writer.writerow(["timestamp", "filepath", "label", "signer", "frames"])
                
            for label in labels_to_process:
                label_dir = landmarks_dir / label
                if not label_dir.exists():
                    continue
                    
                # Find all original .npy files for this label
                original_files = []
                for p in label_dir.glob("**/*.npy"):
                    if "_aug_" not in p.name:
                        original_files.append(p)
                        
                for file_path in original_files:
                    try:
                        # Load original array
                        arr = np.load(str(file_path), allow_pickle=False)
                        if arr.shape != (30, 63):
                            continue
                            
                        signer_name = file_path.parent.name
                        base_name = file_path.stem
                        
                        # Determine variations count dynamically if custom or smart mode
                        # Smart Mode: lacking words get more variations
                        current_total = len(original_files)
                        actual_vars = request.variations
                        if request.selection == "recommended" or request.selection == "lacking":
                            if current_total < 10:
                                actual_vars = max(actual_vars, 8)
                            elif current_total < 50:
                                actual_vars = max(actual_vars, 5)
                                
                        for v_idx in range(1, actual_vars + 1):
                            # Generate variation
                            techniques = request.techniques.copy()
                            if request.enable_mirror and np.random.choice([True, False]):
                                techniques.append("mirror")
                                
                            augmented = augmentation_service.augment(arr, techniques)
                            
                            # Validation
                            if np.isnan(augmented).any() or np.isinf(augmented).any():
                                continue # Skip invalid outputs
                                
                            # Save file
                            aug_filename = f"{base_name}_aug_{v_idx:03d}.npy"
                            dest_path = file_path.parent / aug_filename
                            np.save(str(dest_path), augmented)
                            
                            # Append to recordings.csv
                            writer.writerow([
                                datetime.now().isoformat(),
                                f"landmarks/{label}/{signer_name}/{aug_filename}",
                                label,
                                signer_name,
                                30
                            ])
                            generated_count += 1
                    except Exception as e:
                        print(f"Error processing {file_path}: {e}")
                        
        return {
            "status": "success",
            "message": f"Berhasil men-generate {generated_count} file sampel augmentasi baru.",
            "count": generated_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal melakukan proses augmentasi: {str(e)}")

@router.post("/dataset/augment/delete")
def delete_generated_augmentation(_: dict = Depends(require_ml_user)):
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"
    
    deleted_count = 0
    if landmarks_dir.exists():
        # Find and delete all *_aug_*.npy files
        for p in list(landmarks_dir.glob("**/*_aug_*.npy")):
            try:
                p.unlink()
                deleted_count += 1
            except Exception as e:
                print(f"Gagal menghapus {p}: {e}")
                
    # Update recordings.csv by filtering out augmented files
    csv_path = backend_dir / "data" / "metadata" / "recordings.csv"
    if csv_path.exists():
        try:
            rows = []
            with csv_path.open("r", newline="", encoding="utf-8") as csvfile:
                reader = csv.reader(csvfile)
                headers = next(reader)
                rows.append(headers)
                for r in reader:
                    # check if the filepath contains _aug_
                    if "_aug_" not in r[1]:
                        rows.append(r)
                        
            with csv_path.open("w", newline="", encoding="utf-8") as csvfile:
                writer = csv.writer(csvfile)
                writer.writerows(rows)
        except Exception as e:
            print(f"Gagal mengupdate recordings.csv: {e}")
            
    return {
        "status": "success",
        "message": f"Berhasil menghapus {deleted_count} file sampel hasil augmentasi.",
        "count": deleted_count
    }


import zipfile
import tempfile
from fastapi.responses import FileResponse

@router.get("/dataset/augment/download")
def download_augmented_dataset():
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"
    
    if not landmarks_dir.exists():
        raise HTTPException(status_code=404, detail="Dataset directory does not exist")
        
    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip.close()
    
    has_files = False
    with zipfile.ZipFile(temp_zip.name, "w", zipfile.ZIP_DEFLATED) as zipf:
        for p in landmarks_dir.glob("**/*_aug_*.npy"):
            has_files = True
            rel_path = p.relative_to(landmarks_dir)
            zipf.write(p, arcname=rel_path)
            
    if not has_files:
        try:
            os.unlink(temp_zip.name)
        except:
            pass
        raise HTTPException(status_code=404, detail="Tidak ditemukan file sampel hasil augmentasi untuk didownload.")
        
    return FileResponse(
        temp_zip.name,
        media_type="application/zip",
        filename="augmented_dataset.zip"
    )


# --- Model Selection & Management Endpoints ---
class ModelSelectRequest(BaseModel):
    model_name: str
    model_type: str = "clinical" # "clinical" | "alphabet"

@router.get("/dataset/models")
def list_available_models():
    import os
    backend_dir = Path(__file__).resolve().parents[2]
    models_dir = backend_dir / "models"
    
    tflite_files = list(models_dir.glob("*.tflite"))
    models_list = []
    
    from app.ml.model import ModelLoader
    loader = ModelLoader()
    active_clinical = loader.status().get("model_path")
    
    for f in tflite_files:
        try:
            mtime = datetime.fromtimestamp(f.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
            size_mb = round(f.stat().st_size / (1024 * 1024), 2)
        except Exception:
            mtime = "-"
            size_mb = 0.0
            
        is_active = False
        if active_clinical and Path(active_clinical).name == f.name:
            is_active = True
            
        models_list.append({
            "name": f.name,
            "size_mb": size_mb,
            "last_modified": mtime,
            "is_active": is_active,
            "type": "alphabet" if "alphabet" in f.name else "clinical"
        })
        
    return models_list

@router.post("/dataset/models/select")
def select_active_model(request: ModelSelectRequest, _: dict = Depends(require_ml_user)):
    try:
        from app.services.slt_adapter import SLTAdapterService
        service = SLTAdapterService()
        service.select_model(request.model_name, request.model_type)
        return {"status": "success", "message": f"Berhasil memuat model {request.model_name}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal memuat model: {str(e)}")

@router.post("/dataset/models/reset")
def reset_active_model(_: dict = Depends(require_ml_user)):
    try:
        from app.services.slt_adapter import SLTAdapterService
        service = SLTAdapterService()
        service.reset_model()
        return {"status": "success", "message": "Model berhasil direset ke default"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══ General-purpose file upload for homepage content ═══
UPLOAD_ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.mp4', '.webm', '.pdf'}
UPLOAD_MAX_SIZE_MB = 10

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    folder: str = Form("uploads"),
    _: dict = Depends(require_ml_user)
):
    ext = Path(file.filename).suffix.lower()
    if ext not in UPLOAD_ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Ekstensi '{ext}' tidak diizinkan. Yang diizinkan: {', '.join(UPLOAD_ALLOWED_EXTENSIONS)}")

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > UPLOAD_MAX_SIZE_MB:
        raise HTTPException(status_code=400, detail=f"Ukuran file {size_mb:.1f}MB melebihi batas {UPLOAD_MAX_SIZE_MB}MB")

    backend_dir = Path(__file__).resolve().parents[2]
    safe_folder = re.sub(r'[^a-zA-Z0-9_/]', '', folder).strip('/')
    upload_dir = backend_dir / "data" / safe_folder
    upload_dir.mkdir(parents=True, exist_ok=True)

    safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', Path(file.filename).name)
    file_path = upload_dir / safe_name
    counter = 1
    while file_path.exists():
        stem = Path(file.filename).stem
        file_path = upload_dir / f"{stem}_{counter}{ext}"
        counter += 1

    with open(file_path, "wb") as f:
        f.write(contents)

    relative = str(file_path.relative_to(backend_dir)).replace("\\", "/")
    return {
        "status": "success",
        "message": f"File '{safe_name}' berhasil diunggah",
        "path": relative,
        "filename": file_path.name,
        "size_kb": round(size_mb * 1024, 1)
    }


# ═══ Training Model Report Export (PDF, DOCX, Excel) ═══

from fastapi import Response
from datetime import datetime

@router.get("/dataset/train/report")
async def download_training_report(format: str = "pdf"):
    fmt = (format or "pdf").lower()
    if fmt not in ("pdf", "docx", "excel"):
        raise HTTPException(status_code=400, detail="Format harus pdf | docx | excel")
        
    backend_dir = Path(__file__).resolve().parents[2]
    metrics_path = backend_dir / "reports" / "training_metrics.json"
    if not metrics_path.exists():
        raise HTTPException(status_code=404, detail="Laporan training belum tersedia. Silakan jalankan training terlebih dahulu.")
        
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)
        
    loss, val_loss, acc, val_acc = 0.0, 0.0, 0.0, 0.0
    history_path = backend_dir / "reports" / "training_history.csv"
    if history_path.exists():
        import csv
        with open(history_path, "r", encoding="utf-8") as f:
            reader = list(csv.DictReader(f))
            if reader:
                last = reader[-1]
                loss = float(last.get("loss", 0.0))
                val_loss = float(last.get("val_loss", 0.0))
                acc = float(last.get("accuracy", 0.0))
                val_acc = float(last.get("val_accuracy", 0.0))
                
    if acc < 0.75:
        model_fit = "Underfitting (Model kurang mempelajari pola data latih, akurasi rendah)"
    elif val_loss > 1.8 * loss and (val_loss - loss) > 0.2:
        model_fit = "Overfitting (Model menghafal data latih, performa generalisasi data uji menurun)"
    else:
        model_fit = "Optimal (Model memiliki kemampuan generalisasi yang baik pada data latih dan uji)"
        
    report_items = []
    report_path = backend_dir / "reports" / "classification_report.txt"
    if report_path.exists():
        lines = report_path.read_text(encoding="utf-8").splitlines()
        for line in lines[2:]:
            line = line.strip()
            if not line or any(k in line for k in ("accuracy", "macro avg", "weighted avg")):
                continue
            parts = re.split(r'\s+', line)
            if len(parts) >= 5:
                report_items.append({
                    "label": parts[0],
                    "precision": float(parts[1]),
                    "recall": float(parts[2]),
                    "f1_score": float(parts[3]),
                    "support": int(parts[4])
                })
                
    table_rows = "".join([
        f"<tr><td>{item['label']}</td><td>{item['precision']:.2f}</td><td>{item['recall']:.2f}</td><td>{item['f1_score']:.2f}</td><td>{item['support']}</td></tr>"
        for item in report_items
    ])
    
    timestamp = datetime.now().strftime("%d/%m/%Y %H:%M")
    
    cm_img_path = backend_dir / "reports" / "confusion_matrix.png"
    cm_section = ""
    if cm_img_path.exists():
        api_base = os.getenv("VITE_API_BASE_URL", "http://localhost:8000")
        cm_section = f"""
        <h2>Confusion Matrix</h2>
        <div class="screenshot-wrap">
            <img src="{api_base}/reports/confusion_matrix.png" style="max-width: 100%; height: auto; border: 1px solid #e2e8f0; border-radius: 12px;" />
            <span class="screenshot-label">Gambar: Confusion Matrix MedSign AI</span>
        </div>
        """
        
    html_report = f"""<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Laporan Hasil Pelatihan Model MedSign AI</title>
<style>
  body {{ font-family: sans-serif; color: #1e293b; padding: 25px; line-height: 1.5; }}
  h1, h2, h3 {{ color: #0f172a; }}
  .grid {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }}
  .card {{ background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; }}
  .card-title {{ font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; }}
  .card-value {{ font-size: 20px; font-weight: 800; color: #0f172a; margin-top: 5px; }}
  .status-box {{ background: #eff6ff; border: 1px solid #bfdbfe; padding: 15px; border-radius: 12px; margin-bottom: 20px; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 15px; }}
  th, td {{ border: 1px solid #e2e8f0; padding: 8px; text-align: left; font-size: 11px; }}
  th {{ background: #f1f5f9; color: #475569; }}
  .screenshot-wrap {{ margin: 15px 0; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #f8fafc; padding: 10px; text-align: center; }}
  .screenshot-label {{ display: block; color: #64748b; font-size: 8px; font-weight: 700; margin-top: 5px; }}
</style>
</head>
<body>
  <h1>Laporan Hasil Pelatihan Model MedSign AI</h1>
  <p>Dihasilkan pada: {{timestamp}}</p>
  
  <h2>Ringkasan Metrik Utama</h2>
  <div class="grid">
    <div class="card"><div class="card-title">Akurasi Uji (Test Acc)</div><div class="card-value">{{metrics.get("test_accuracy", 0.0):.2%}}</div></div>
    <div class="card"><div class="card-title">Loss Uji (Test Loss)</div><div class="card-value">{{metrics.get("test_loss", 0.0):.4f}}</div></div>
    <div class="card"><div class="card-title">Total Kelas (Labels)</div><div class="card-value">{{metrics.get("num_classes", 0)}}</div></div>
    <div class="card"><div class="card-title">Total Sampel</div><div class="card-value">{{metrics.get("num_samples", 0)}}</div></div>
  </div>
  
  <div class="status-box">
    <strong>Evaluasi Kelayakan Model (Fit Assessment):</strong>
    <p style="margin: 5px 0 0 0; font-size: 13px; font-weight: bold; color: #1e3a8a;">
      {{model_fit}}
    </p>
    <p style="margin: 5px 0 0 0; font-size: 11px; color: #475569;">
      Training Loss: {{loss:.4f}} | Val Loss: {{val_loss:.4f}} | Training Acc: {{acc:.2%}} | Val Acc: {{val_acc:.2%}}
    </p>
  </div>
  
  <h2>Laporan Klasifikasi per Kosakata</h2>
  <table>
    <thead>
      <tr>
        <th>Kosakata (Label)</th>
        <th>Precision</th>
        <th>Recall</th>
        <th>F1-Score</th>
        <th>Jumlah Sampel (Support)</th>
      </tr>
    </thead>
    <tbody>
      {{table_rows}}
    </tbody>
  </table>
  
  {{cm_section}}
</body>
</html>
"""

    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    
    if fmt == "pdf":
        from playwright.async_api import async_playwright
        temp_html_path = backend_dir / "reports" / f"temp_report_{stamp}.html"
        temp_html_path.write_text(html_report, encoding="utf-8")
        
        pdf_path = backend_dir / "reports" / f"temp_report_{stamp}.pdf"
        
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.newPage()
            await page.goto("file://" + str(temp_html_path), wait_until="networkidle")
            await page.waitForTimeout(1000)
            await page.pdf(
                path=str(pdf_path),
                format="A4",
                print_background=True,
                margin={"top": "15mm", "right": "15mm", "bottom": "15mm", "left": "15mm"}
            )
            await browser.close()
            
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()
            
        if temp_html_path.exists():
            temp_html_path.unlink()
        if pdf_path.exists():
            pdf_path.unlink()
            
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="laporan_training_{stamp}.pdf"'}
        )
        
    elif fmt == "docx":
        return Response(
            content=html_report.encode("utf-8"),
            media_type="application/msword",
            headers={"Content-Disposition": f'attachment; filename="laporan_training_{stamp}.doc"'}
        )
        
    elif fmt == "excel":
        return Response(
            content=html_report.encode("utf-8"),
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="laporan_training_{stamp}.xls"'}
        )
