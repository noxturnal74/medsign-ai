import uuid
import time
from datetime import datetime
from typing import Optional, Literal, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.db import (
    db_get_patient_by_id,
    db_check_doctor_patient_link,
    db_create_session,
    db_get_session_by_id,
    db_end_session,
    db_create_session_log,
    db_get_session_logs,
    write_audit_log,
    db_save_session_summary
)
from app.routes.auth import get_current_user

router = APIRouter()

class SessionCreateRequest(BaseModel):
    patient_id: str
    model_version: str = "medsign_mvp_v1"

class SessionCreateResponse(BaseModel):
    session_id: str
    message: str

class LogEntryRequest(BaseModel):
    session_id: str = Field(..., description="UUID sesi konsultasi")
    role: Literal["patient", "doctor"] = Field(..., description="Role pengirim pesan")
    text: str = Field(..., description="Teks pesan hasil translasi / ketikan")
    confidence: Optional[float] = Field(None, description="Nilai keyakinan model jika dari isyarat")
    timestamp: str = Field(..., description="Waktu terkirim")

class LogEntryResponse(BaseModel):
    id: str
    status: str

class LogEntryData(BaseModel):
    id: str
    session_id: str
    role: str
    text: str
    confidence: Optional[float] = None
    timestamp: str

# ── ENDPOINTS ──

@router.post("/sessions", response_model=SessionCreateResponse)
def create_session(request: SessionCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat memulai sesi konsultasi")
        
    patient = db_get_patient_by_id(request.patient_id)
    if not patient:
        raise HTTPException(status_code=400, detail="Pasien tidak ditemukan")
        
    if not db_check_doctor_patient_link(current_user["user_id"], request.patient_id):
        raise HTTPException(status_code=403, detail="Akses ditolak: Pasien ini tidak terdaftar di relasi Anda")
        
    session_id = str(uuid.uuid4())
    started_at = datetime.utcnow().isoformat()
    
    success = db_create_session(session_id, request.patient_id, current_user["user_id"], request.model_version, started_at)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memulai sesi konsultasi")
        
    write_audit_log(current_user["user_id"], "doctor", f"POST /api/v1/sessions (Start session {session_id})", request.patient_id)
    return SessionCreateResponse(session_id=session_id, message="Sesi konsultasi dimulai")

@router.post("/sessions/{session_id}/end")
def end_session(session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat mengakhiri sesi konsultasi")
        
    session_row = db_get_session_by_id(session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        
    if session_row["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak memiliki wewenang atas sesi ini")
        
    ended_at = datetime.utcnow().isoformat()
    success = db_end_session(session_id, ended_at)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengakhiri sesi konsultasi")
        
    write_audit_log(current_user["user_id"], "doctor", f"POST /api/v1/sessions/{session_id}/end", session_row["patient_id"])
    return {"message": "Sesi konsultasi selesai"}

@router.post("/session/log", response_model=LogEntryResponse)
def log_session_entry(entry: LogEntryRequest, current_user: dict = Depends(get_current_user)):
    session_row = db_get_session_by_id(entry.session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        
    role = current_user["role"]
    user_id = current_user["user_id"]
    if role == "patient" and session_row["patient_id"] != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak: Sesi ini bukan milik Anda")
    elif role == "doctor" and session_row["doctor_id"] != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak terdaftar sebagai dokter untuk sesi ini")
        
    log_id = str(uuid.uuid4())
    success = db_create_session_log(log_id, entry.session_id, entry.role, entry.text, entry.confidence, entry.timestamp)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan log sesi")
        
    return LogEntryResponse(id=log_id, status="ok")

class SummaryUpdateRequest(BaseModel):
    summary: str

@router.post("/sessions/{session_id}/summary")
def update_session_summary(session_id: str, request: SummaryUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat menyimpan ringkasan sesi")
        
    session_row = db_get_session_by_id(session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        
    if session_row["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak memiliki wewenang atas sesi ini")
        
    success = db_save_session_summary(session_id, request.summary)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan ringkasan sesi")
        
    write_audit_log(current_user["user_id"], "doctor", f"POST /api/v1/sessions/{session_id}/summary", session_row["patient_id"])
    return {"message": "Ringkasan sesi berhasil disimpan"}

@router.get("/sessions/{session_id}/logs", response_model=List[LogEntryData])
def get_session_logs(session_id: str, current_user: dict = Depends(get_current_user)):
    session_row = db_get_session_by_id(session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        
    role = current_user["role"]
    user_id = current_user["user_id"]
    if role == "patient" and session_row["patient_id"] != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    elif role == "doctor" and session_row["doctor_id"] != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    rows = db_get_session_logs(session_id)
    return [
        LogEntryData(
            id=r["id"],
            session_id=r["session_id"],
            role=r["role"],
            text=r["text"],
            confidence=r["confidence"],
            timestamp=r["timestamp"]
        ) for r in rows
    ]
