import uuid
import time
from datetime import datetime
from typing import Optional, Literal, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from app.db import (
    db_create_timeline_event,
    db_create_medication,
    db_get_patient_medications,
    db_create_medical_record,
    db_get_patient_medical_records,
    db_get_session_medical_record,
    db_update_medical_record,
    db_get_doctor_by_id,
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


class MedicalRecordCreateRequest(BaseModel):
    doctor_note: Optional[str] = None
    medical_assessment: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendation: Optional[str] = None
    prescription: Optional[str] = None
    follow_up: Optional[str] = None
    ai_drafted: Optional[int] = 0
    ai_provenance: Optional[str] = None

class MedicalRecordResponse(BaseModel):
    id: str
    session_id: Optional[str] = None
    patient_id: str
    doctor_id: str
    facility_id: str
    raw_conversation: Optional[str] = None
    doctor_note: Optional[str] = None
    medical_assessment: Optional[str] = None
    diagnosis: Optional[str] = None
    recommendation: Optional[str] = None
    prescription: Optional[str] = None
    follow_up: Optional[str] = None
    version: Optional[int] = 1
    parent_record_id: Optional[str] = None
    is_latest: Optional[int] = 1
    signature_state: Optional[str] = "unsigned"
    signature_data: Optional[str] = None
    signature_date: Optional[str] = None
    ai_drafted: Optional[int] = 0
    ai_provenance: Optional[str] = None
    created_at: str
    updated_at: str

class MedicationItem(BaseModel):
    drug_name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None

class SignRecordRequest(BaseModel):
    signature_data: str


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


@router.post("/sessions/{session_id}/medical-record", response_model=MedicalRecordResponse)
def create_medical_record_endpoint(session_id: str, req: MedicalRecordCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat membuat rekam medis")
        
    session_row = db_get_session_by_id(session_id)
    if not session_row:
        raise HTTPException(status_code=404, detail="Sesi tidak ditemukan")
        
    if session_row["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak terdaftar sebagai dokter untuk sesi ini")
        
    # Check if medical record already exists for this session
    existing = db_get_session_medical_record(session_id)
    if existing:
        raise HTTPException(status_code=400, detail="Rekam medis untuk sesi ini sudah dibuat")
        
    # Concatenate raw conversation
    logs = db_get_session_logs(session_id)
    raw_conv = "\n".join([f"{l['role'].upper()}: {l['text']}" for l in logs])
    
    # Retrieve facility_id from doctor
    doctor = db_get_doctor_by_id(current_user["user_id"])
    fac_id = doctor.get("facility_id") if (doctor and doctor.get("facility_id")) else "fac_default"
    
    record_id = str(uuid.uuid4())
    success = db_create_medical_record(
        record_id=record_id,
        session_id=session_id,
        patient_id=session_row["patient_id"],
        doctor_id=session_row["doctor_id"],
        facility_id=fac_id,
        raw_conversation=raw_conv,
        doctor_note=req.doctor_note,
        medical_assessment=req.medical_assessment,
        diagnosis=req.diagnosis,
        recommendation=req.recommendation,
        prescription=req.prescription,
        follow_up=req.follow_up
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan rekam medis")

    # Update versioning and AI provenance fields
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE medical_records SET version = 1, parent_record_id = NULL, is_latest = 1, signature_state = 'unsigned',
        ai_drafted = ?, ai_provenance = ? WHERE id = ?
    """, (req.ai_drafted, req.ai_provenance, record_id))
    conn.commit()
    conn.close()

    # Create clinical timeline event
    db_create_timeline_event(
        str(uuid.uuid4()), 
        session_row["patient_id"], 
        "CONSULTATION", 
        "Konsultasi Medis Selesai", 
        f"Diagnosis: {req.diagnosis or 'Tidak ada'}", 
        session_row["started_at"], 
        record_id
    )
        
    write_audit_log(current_user["user_id"], "doctor", f"MEDICAL_RECORD_CREATED (Record: {record_id} for patient: {session_row['patient_id']})", session_row["patient_id"], facility_id=fac_id)
    
    # Retrieve and return
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
    rec = cursor.fetchone()
    conn.close()
    return MedicalRecordResponse(**dict(rec))

@router.get("/medical-records/{record_id}", response_model=MedicalRecordResponse)
def get_medical_record_by_id(record_id: str, current_user: dict = Depends(get_current_user)):
    # We fetch record from database directly using sqlite
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
        
    rec = dict(row)
    role = current_user["role"]
    user_id = current_user["user_id"]
    
    if role == "patient" and rec["patient_id"] != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak: Rekam medis ini bukan milik Anda")
    elif role == "doctor":
        # Check facility boundaries
        doctor = db_get_doctor_by_id(user_id)
        if not doctor or doctor.get("facility_id") != rec["facility_id"]:
            raise HTTPException(status_code=403, detail="Akses ditolak: Dokter dari faskes lain")
    elif role == "admin":
        if rec["facility_id"] != current_user.get("facility_id"):
            raise HTTPException(status_code=403, detail="Akses ditolak")
            
    return MedicalRecordResponse(**rec)

@router.put("/medical-records/{record_id}")
def update_medical_record_endpoint(record_id: str, req: MedicalRecordCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat memperbarui rekam medis")
        
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
        
    rec = dict(row)
    if rec["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Anda bukan dokter pembuat rekam medis ini")
        
    success = db_update_medical_record(
        record_id=record_id,
        doctor_note=req.doctor_note,
        medical_assessment=req.medical_assessment,
        diagnosis=req.diagnosis,
        recommendation=req.recommendation,
        prescription=req.prescription,
        follow_up=req.follow_up
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui rekam medis")
        
    write_audit_log(current_user["user_id"], "doctor", f"MEDICAL_RECORD_UPDATED (Record: {record_id})", rec["patient_id"], facility_id=rec["facility_id"])
    return {"message": "Rekam medis berhasil diperbarui"}

@router.get("/patients/{patient_id}/medical-records", response_model=List[MedicalRecordResponse])
def get_patient_medical_records_endpoint(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]
    
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "patient" and patient_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    elif role == "doctor":
        doctor = db_get_doctor_by_id(user_id)
        if not doctor or doctor.get("facility_id") != patient.get("facility_id"):
            raise HTTPException(status_code=403, detail="Akses ditolak")
    elif role == "admin":
        if patient.get("facility_id") != current_user.get("facility_id"):
            raise HTTPException(status_code=403, detail="Akses ditolak")
            
    records = db_get_patient_medical_records(patient_id)
    return [MedicalRecordResponse(**dict(r)) for r in records]


@router.post("/medical-records/{record_id}/correction", response_model=MedicalRecordResponse)
def correct_medical_record_endpoint(record_id: str, req: MedicalRecordCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat melakukan koreksi")
        
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
        
    parent_rec = dict(row)
    if parent_rec["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Hanya dokter pembuat yang dapat mengoreksi")
        
    if parent_rec["is_latest"] == 0:
        raise HTTPException(status_code=400, detail="Hanya versi terbaru yang dapat dikoreksi")
        
    # Mark old version as not latest
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE medical_records SET is_latest = 0 WHERE id = ?", (record_id,))
    conn.commit()
    conn.close()
    
    new_record_id = str(uuid.uuid4())
    success = db_create_medical_record(
        record_id=new_record_id,
        session_id=parent_rec.get("session_id"),
        patient_id=parent_rec["patient_id"],
        doctor_id=parent_rec["doctor_id"],
        facility_id=parent_rec["facility_id"],
        raw_conversation=parent_rec.get("raw_conversation"),
        doctor_note=req.doctor_note,
        medical_assessment=req.medical_assessment,
        diagnosis=req.diagnosis,
        recommendation=req.recommendation,
        prescription=req.prescription,
        follow_up=req.follow_up
    )
    if not success:
        # Rollback old version is_latest status
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE medical_records SET is_latest = 1 WHERE id = ?", (record_id,))
        conn.commit()
        conn.close()
        raise HTTPException(status_code=500, detail="Gagal menyimpan koreksi rekam medis")
        
    # Update versioning details
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE medical_records SET version = ?, parent_record_id = ?, is_latest = 1, signature_state = 'unsigned',
        ai_drafted = ?, ai_provenance = ? WHERE id = ?
    """, (parent_rec["version"] + 1, record_id, req.ai_drafted, req.ai_provenance, new_record_id))
    conn.commit()
    conn.close()
    
    # Save clinical timeline event
    db_create_timeline_event(
        str(uuid.uuid4()),
        parent_rec["patient_id"],
        "DIAGNOSIS",
        "Koreksi Catatan Medis",
        f"Koreksi ke versi {parent_rec['version'] + 1} oleh dr. {parent_rec['doctor_id']}",
        datetime.utcnow().isoformat(),
        new_record_id
    )
    
    write_audit_log(current_user["user_id"], "doctor", f"MEDICAL_RECORD_CORRECTED (Parent: {record_id} New: {new_record_id})", parent_rec["patient_id"], facility_id=parent_rec["facility_id"])
    
    # Retrieve and return
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (new_record_id,))
    rec = cursor.fetchone()
    conn.close()
    return MedicalRecordResponse(**dict(rec))

@router.post("/medical-records/{record_id}/sign")
def sign_medical_record_endpoint(record_id: str, req: SignRecordRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat menandatangani rekam medis")
        
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
        
    rec = dict(row)
    if rec["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: Hanya dokter pembuat yang dapat menandatangani")
        
    now = datetime.utcnow().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE medical_records SET signature_state = 'signed', signature_data = ?, signature_date = ?
        WHERE id = ?
    """, (req.signature_data, now, record_id))
    conn.commit()
    conn.close()
    
    write_audit_log(current_user["user_id"], "doctor", f"MEDICAL_RECORD_SIGNED (Record: {record_id})", rec["patient_id"], facility_id=rec["facility_id"])
    return {"message": "Rekam medis berhasil ditandatangani secara digital"}

@router.post("/medical-records/{record_id}/medications")
def add_medications_endpoint(record_id: str, items: List[MedicationItem], current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat meresepkan obat")
        
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE id = ?", (record_id,))
    row = cursor.fetchone()
    conn.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="Rekam medis tidak ditemukan")
        
    rec = dict(row)
    if rec["doctor_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    for item in items:
        med_id = str(uuid.uuid4())
        db_create_medication(
            med_id=med_id,
            record_id=record_id,
            name=item.drug_name,
            dosage=item.dosage,
            freq=item.frequency,
            dur=item.duration,
            inst=item.instructions
        )
        
        # Timeline event
        db_create_timeline_event(
            str(uuid.uuid4()),
            rec["patient_id"],
            "MEDICATION",
            f"Resep Obat: {item.drug_name}",
            f"Dosis: {item.dosage} | Frekuensi: {item.frequency} | Durasi: {item.duration}",
            datetime.utcnow().isoformat(),
            med_id
        )
        
    write_audit_log(current_user["user_id"], "doctor", f"MEDICATION_PRESCRIBED (Record: {record_id})", rec["patient_id"], facility_id=rec["facility_id"])
    return {"message": "Resep obat berhasil ditambahkan ke rekam medis"}
