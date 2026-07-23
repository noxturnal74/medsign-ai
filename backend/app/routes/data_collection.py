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


class DeleteSampleRequest(BaseModel):
    label: str
    signer: str
    filename: str

@router.get("/dataset/samples/{label}")
def get_dataset_samples(label: str):
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
def delete_dataset_sample(request: DeleteSampleRequest):
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
def delete_dataset_samples_bulk(request: BulkDeleteSamplesRequest):
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
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks" / label
    if landmarks_dir.exists():
        npy_files = list(landmarks_dir.glob("**/*.npy"))
        if npy_files:
            try:
                arr = np.load(str(npy_files[0]))
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
    landmarks_dir = backend_dir / "data" / "landmarks"

    if model_type == "alphabet":
        alphabet_classes = [chr(i) for i in range(ord('A'), ord('Z') + 1)] + [str(i) for i in range(1, 10)]
        label_items = [
            {
                "id": idx,
                "slug": char,
                "display": char,
                "category": "Abjad" if char.isalpha() else "Angka",
                "emergency": False
            }
            for idx, char in enumerate(alphabet_classes)
        ]
    else:
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
def finalize_model(request: FinalizeModelRequest):
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
def train_dataset(request: TrainRequest):
    async def log_generator():
        backend_dir = Path(__file__).resolve().parents[2]
        import sys
        import threading
        import queue

        venv_python = backend_dir / "venv" / "Scripts" / "python.exe"
        python_exe = str(venv_python) if venv_python.exists() else sys.executable

        if request.model_type == "alphabet":
            training_script = backend_dir / "training" / "train_alphabet_model.py"
            cmd = [
                python_exe,
                str(training_script),
                "--epochs", str(request.epochs),
                "--model-name", "bisindo_alphabet_v1_temp"
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
    file: UploadFile = File(...)
):
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
def auto_fix_models():
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
    take_index: int = Form(1)
):
    if not re.match(r"^[a-z0-9_]+$", signer_id):
        raise HTTPException(
            status_code=400,
            detail="Signer ID harus menggunakan format lowercase underscore saja"
        )
    
    contents = await file.read()
    
    try:
        f_io = io.BytesIO(contents)
        arr = np.load(f_io)
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
        clean_filename = orig_name
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
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks" / request.label
    
    if not landmarks_dir.exists():
        raise HTTPException(status_code=404, detail=f"Dataset untuk kata '{request.label}' belum memiliki data asli.")
        
    npy_files = list(landmarks_dir.glob("**/*.npy"))
    original_files = [f for f in npy_files if "_aug_" not in f.name]
    
    if not original_files:
        raise HTTPException(status_code=404, detail="Tidak ditemukan sampel asli untuk kata ini.")
        
    try:
        arr = np.load(str(original_files[0]))
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
def generate_augmentation(request: AugmentGenerateRequest):
    backend_dir = Path(__file__).resolve().parents[2]
    landmarks_dir = backend_dir / "data" / "landmarks"
    
    # 1. Determine which labels to augment
    labels_to_process = []
    if request.selection == "all":
        # Get all folders in landmarks_dir
        if landmarks_dir.exists():
            labels_to_process = [d.name for d in landmarks_dir.iterdir() if d.is_dir()]
    elif request.selection == "selected":
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
                        arr = np.load(str(file_path))
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
def delete_generated_augmentation():
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
