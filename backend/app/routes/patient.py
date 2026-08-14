import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.db import (
    db_get_patient_by_id,
    db_check_doctor_patient_link,
    db_get_doctor_patients,
    db_get_all_patients,
    db_get_patient_sessions,
    decrypt_nik,
    mask_nik,
    write_audit_log
)
from app.routes.auth import get_current_user

router = APIRouter()

class PatientResponse(BaseModel):
    id: str
    no_rm: str
    nik: str
    name: str
    date_of_birth: str
    created_by: Optional[str] = None
    created_at: str

class SessionResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: Optional[str] = None
    model_version: str
    status: str
    started_at: str
    ended_at: Optional[str] = None

# ── ENDPOINTS ──

@router.get("/patients/{patient_id}", response_model=PatientResponse)
def get_patient_details(patient_id: str, current_user: dict = Depends(get_current_user)):
    patient = db_get_patient_by_id(patient_id)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    role = current_user["role"]
    user_id = current_user["user_id"]
    
    if role == "patient":
        if patient_id != user_id:
            raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak dapat melihat data pasien lain")
        nik = mask_nik(decrypt_nik(patient["nik_encrypted"]))
        
    elif role == "doctor":
        if not db_check_doctor_patient_link(user_id, patient_id):
            raise HTTPException(status_code=403, detail="Akses ditolak: Pasien tidak terdaftar di relasi dokter-pasien Anda")
        nik = decrypt_nik(patient["nik_encrypted"])
        
    else: # admin
        nik = decrypt_nik(patient["nik_encrypted"])
        
    res = PatientResponse(
        id=patient["id"],
        no_rm=patient["no_rm"],
        nik=nik,
        name=patient["name"],
        date_of_birth=patient["date_of_birth"],
        created_by=patient["created_by"],
        created_at=patient["created_at"]
    )
    
    write_audit_log(user_id, role, f"GET /api/v1/patients/{patient_id}", patient_id)
    
    return res

@router.get("/doctor/patients", response_model=List[PatientResponse])
def get_doctor_patients_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat melihat pasien terdaftar")
        
    rows = db_get_doctor_patients(current_user["user_id"])
    
    res = []
    for r in rows:
        res.append(PatientResponse(
            id=r["id"],
            no_rm=r["no_rm"],
            nik=decrypt_nik(r["nik_encrypted"]),
            name=r["name"],
            date_of_birth=r["date_of_birth"],
            created_by=r["created_by"],
            created_at=r["created_at"]
        ))
        
    write_audit_log(current_user["user_id"], "doctor", "GET /api/v1/doctor/patients")
    
    return res

@router.get("/doctor/patients/search", response_model=List[PatientResponse])
def search_patients(q: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["doctor", "admin"]:
        raise HTTPException(status_code=403, detail="Hanya dokter dan admin yang dapat mencari pasien")
        
    rows = db_get_all_patients()
    
    res = []
    for r in rows:
        decrypted_nik = decrypt_nik(r["nik_encrypted"])
        query_lower = q.lower()
        if (query_lower in decrypted_nik or 
            query_lower in r["no_rm"].lower() or 
            query_lower in r["name"].lower()):
            
            if current_user["role"] == "doctor":
                if not db_check_doctor_patient_link(current_user["user_id"], r["id"]):
                    continue # Skip unassigned patient
            
            res.append(PatientResponse(
                id=r["id"],
                no_rm=r["no_rm"],
                nik=decrypted_nik,
                name=r["name"],
                date_of_birth=r["date_of_birth"],
                created_by=r["created_by"],
                created_at=r["created_at"]
            ))
            
    write_audit_log(current_user["user_id"], current_user["role"], f"GET /api/v1/doctor/patients/search?q={q}")
    
    return res

@router.get("/patients/{patient_id}/sessions", response_model=List[SessionResponse])
def get_patient_sessions_by_id(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]
    if role == "patient" and patient_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    elif role == "doctor":
        if not db_check_doctor_patient_link(user_id, patient_id):
            raise HTTPException(status_code=403, detail="Akses ditolak")
            
    rows = db_get_patient_sessions(patient_id)
    res = []
    for r in rows:
        res.append(SessionResponse(
            id=r["id"],
            patient_id=r["patient_id"],
            doctor_id=r["doctor_id"],
            model_version=r["model_version"],
            status=r["status"],
            started_at=r["started_at"],
            ended_at=r["ended_at"]
        ))
    return res

@router.get("/patient/me/sessions", response_model=List[SessionResponse])
def get_patient_sessions_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat melihat sesi konsultasi mereka sendiri")
        
    rows = db_get_patient_sessions(current_user["user_id"])
    
    res = []
    for r in rows:
        res.append(SessionResponse(
            id=r["id"],
            patient_id=r["patient_id"],
            doctor_id=r["doctor_id"],
            model_version=r["model_version"],
            status=r["status"],
            started_at=r["started_at"],
            ended_at=r["ended_at"]
        ))
        
    write_audit_log(current_user["user_id"], "patient", "GET /api/v1/patient/me/sessions", current_user["user_id"])
    
    return res
