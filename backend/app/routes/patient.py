from datetime import datetime, timedelta
import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from app.db import (
    db_get_doctor_by_id,
    db_get_patient_timeline,
    db_create_break_glass_log,
    db_check_break_glass_active,
    db_create_export,
    db_get_export_by_id,
    db_update_export_status,
    db_update_patient_accessibility_preference,
    db_get_patient_medical_records,
    db_create_consent,
    db_get_patient_consents,
    db_update_patient,
    encrypt_nik,
    db_create_timeline_event,
    db_get_patient_medications,
    db_get_doctor_by_id,
    db_get_patient_by_id,
    db_check_doctor_patient_link,
    db_get_doctor_patients,
    db_get_all_patients,
    db_get_patient_sessions,
    db_update_doctor,
    db_get_facility_by_id,
    hash_password,
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
    summary: Optional[str] = None


class ConsentCreateRequest(BaseModel):
    consent_type: str
    purpose: str
    version: str
    consent_text_hash: str

class ConsentResponseData(BaseModel):
    id: str
    patient_id: str
    consent_type: str
    purpose: Optional[str] = None
    version: Optional[str] = None
    accepted_at: str
    status: str



class BreakGlassRequest(BaseModel):
    reason: str

class ExportResponse(BaseModel):
    export_id: str
    download_url: str
    expires_at: str

class AccessibilityPreferenceRequest(BaseModel):
    preference: str

class KtpVerifyRequest(BaseModel):
    nik: str
    name: str
    date_of_birth: str
    address: Optional[str] = None
    gender: Optional[str] = None

class FaceVerifyRequest(BaseModel):
    photo_b64: Optional[str] = None

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
        doctor = db_get_doctor_by_id(user_id)
        if not doctor:
            raise HTTPException(status_code=403, detail="Akses ditolak")
            
        # Break-Glass or assignment bypasses facility isolation in emergencies!
        is_break_glass = db_check_break_glass_active(user_id, patient_id)
        is_assigned = db_check_doctor_patient_link(user_id, patient_id)
        
        if not is_assigned and not is_break_glass:
            raise HTTPException(status_code=403, detail="Akses ditolak: Pasien tidak terdaftar atau memerlukan Break-Glass")
            
        nik = decrypt_nik(patient["nik_encrypted"])
        
    elif role == "admin":
        if patient.get("facility_id") != current_user.get("facility_id"):
            raise HTTPException(status_code=403, detail="Akses ditolak: Pasien berada di fasilitas lain")
        nik = decrypt_nik(patient["nik_encrypted"])
    else: # super_admin
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
    seen_ids = {r["id"] for r in rows}

    # Tambahkan pasien satu faskes agar bisa dipilih langsung oleh dokter
    # (sesi tetap divalidasi ulang di POST /sessions).
    doctor = db_get_doctor_by_id(current_user["user_id"]) or {}
    doc_facility = doctor.get("facility_id")
    if doc_facility:
        for r in db_get_all_patients():
            if r["id"] not in seen_ids and r.get("facility_id") == doc_facility:
                rows.append(r)
                seen_ids.add(r["id"])

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
    role = current_user["role"]
    if role not in ["doctor", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya dokter dan admin yang dapat mencari pasien")
        
    rows = db_get_all_patients()
    doctor = db_get_doctor_by_id(current_user["user_id"]) if role == "doctor" else None
    
    res = []
    for r in rows:
        # Check facility boundaries
        if role == "doctor":
            if doctor and r.get("facility_id") != doctor.get("facility_id"):
                continue
        elif role == "admin":
            if r.get("facility_id") != current_user.get("facility_id"):
                continue

        decrypted_nik = decrypt_nik(r["nik_encrypted"])
        query_lower = q.lower()
        if (query_lower in decrypted_nik or 
            query_lower in r["no_rm"].lower() or 
            query_lower in r["name"].lower()):
            
            if role == "doctor":
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

@router.get("/doctor/patients/find-by-nik", response_model=List[PatientResponse])
def find_patient_by_nik_for_break_glass(nik: str, current_user: dict = Depends(get_current_user)):
    """Cari pasien berdasarkan NIK untuk keperluan Akses Darurat (Break-Glass).
    Tidak mensyaratkan relasi dokter-pasien; dibatasi pada faskes dokter bila tersedia."""
    role = current_user["role"]
    if role not in ["doctor", "admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya dokter/admin yang dapat mencari pasien")
    if not nik or len(nik) < 6:
        raise HTTPException(status_code=400, detail="NIK tidak valid")

    doctor = db_get_doctor_by_id(current_user["user_id"]) if role == "doctor" else None
    doc_facility = doctor.get("facility_id") if doctor else None

    res = []
    for r in db_get_all_patients():
        if role == "doctor" and doc_facility and r.get("facility_id") != doc_facility:
            continue
        if role == "admin" and r.get("facility_id") != current_user.get("facility_id"):
            continue
        try:
            decrypted_nik = decrypt_nik(r["nik_encrypted"])
        except Exception:
            continue
        if decrypted_nik == nik.strip():
            res.append(PatientResponse(
                id=r["id"],
                no_rm=r["no_rm"],
                nik=decrypted_nik,
                name=r["name"],
                date_of_birth=r["date_of_birth"],
                created_by=r["created_by"],
                created_at=r["created_at"]
            ))

    write_audit_log(current_user["user_id"], role, f"GET /api/v1/doctor/patients/find-by-nik (found={len(res)})")
    return res


# ── Profil Mandiri Dokter (data diri, preferensi, pengaturan) ──

class DoctorMeResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    image: Optional[str] = None
    specialization: Optional[str] = None
    specialty: Optional[str] = None
    department: Optional[str] = None
    medical_license: Optional[str] = None
    availability: Optional[str] = None
    status: Optional[str] = None
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    created_at: Optional[str] = None

class DoctorMeUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    image: Optional[str] = None
    specialty: Optional[str] = None
    department: Optional[str] = None
    medical_license: Optional[str] = None
    availability: Optional[str] = None
    password: Optional[str] = None

@router.get("/doctor/me", response_model=DoctorMeResponse)
def get_doctor_me(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat mengakses profil ini")
    doc = db_get_doctor_by_id(current_user["user_id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Profil dokter tidak ditemukan")
    facility_name = None
    if doc.get("facility_id"):
        fac = db_get_facility_by_id(doc["facility_id"])
        if fac:
            facility_name = fac.get("name")
    return DoctorMeResponse(
        id=doc["id"],
        name=doc.get("name"),
        email=doc.get("email"),
        phone=doc.get("phone"),
        image=doc.get("image"),
        specialization=doc.get("specialization"),
        specialty=doc.get("specialty"),
        department=doc.get("department"),
        medical_license=doc.get("medical_license"),
        availability=doc.get("availability") or "available",
        status=doc.get("status"),
        facility_id=doc.get("facility_id"),
        facility_name=facility_name,
        created_at=doc.get("created_at"),
    )

@router.put("/doctor/me", response_model=DoctorMeResponse)
def update_doctor_me(req: DoctorMeUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat memperbarui profil ini")
    doc = db_get_doctor_by_id(current_user["user_id"])
    if not doc:
        raise HTTPException(status_code=404, detail="Profil dokter tidak ditemukan")

    new_password_hash = hash_password(req.password) if req.password else None
    if req.password and len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")

    ok = db_update_doctor(
        doctor_id=doc["id"],
        name=req.name if req.name is not None else doc.get("name"),
        email=doc.get("email"),
        password_hash=new_password_hash,
        specialization=doc.get("specialization"),
        facility_id=doc.get("facility_id"),
        phone=req.phone if req.phone is not None else doc.get("phone"),
        image=req.image if req.image is not None else doc.get("image"),
        medical_license=req.medical_license if req.medical_license is not None else doc.get("medical_license"),
        department=req.department if req.department is not None else doc.get("department"),
        status=doc.get("status"),
        availability=req.availability if req.availability is not None else doc.get("availability"),
        is_active=doc.get("is_active"),
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal memperbarui profil")

    if req.password:
        write_audit_log(current_user["user_id"], "doctor", "DOCTOR_SELF_UPDATE (password changed)", event_type="SECURITY")
    else:
        write_audit_log(current_user["user_id"], "doctor", "DOCTOR_SELF_UPDATE (profile)")

    return get_doctor_me(current_user)


@router.get("/patients/{patient_id}/sessions", response_model=List[SessionResponse])
def get_patient_sessions_by_id(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]
    if role == "patient" and patient_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    elif role == "doctor":
        is_linked = db_check_doctor_patient_link(user_id, patient_id)
        if not is_linked:
            is_break_glass = db_check_break_glass_active(user_id, patient_id)
            doctor = db_get_doctor_by_id(user_id) or {}
            patient = db_get_patient_by_id(patient_id)
            same_facility = bool(
                doctor.get("facility_id") and patient
                and patient.get("facility_id") == doctor["facility_id"]
            )
            if not is_break_glass and not same_facility:
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
            ended_at=r["ended_at"],
            summary=r.get("summary")
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
            ended_at=r["ended_at"],
            summary=r.get("summary")
        ))
        
    write_audit_log(current_user["user_id"], "patient", "GET /api/v1/patient/me/sessions", current_user["user_id"])
    
    return res


@router.post("/patient/consent", response_model=ConsentResponseData)
def create_patient_consent(req: ConsentCreateRequest, request: Request, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat memberikan persetujuan")
    
    consent_id = str(uuid.uuid4())
    ip_addr = request.client.host if request.client else "unknown"
    user_agt = request.headers.get("user-agent", "unknown")
    
    success = db_create_consent(
        consent_id=consent_id,
        patient_id=current_user["user_id"],
        consent_type=req.consent_type,
        purpose=req.purpose,
        version=req.version,
        ip_address=ip_addr,
        user_agent=user_agt,
        consent_text_hash=req.consent_text_hash
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan persetujuan")
        
    write_audit_log(current_user["user_id"], "patient", f"CONSENT_ACCEPTED (Type: {req.consent_type})", current_user["user_id"], event_type="CONSENT_ACCEPTED", ip_address=ip_addr, user_agent=user_agt)
    
    # Return response data
    return ConsentResponseData(
        id=consent_id,
        patient_id=current_user["user_id"],
        consent_type=req.consent_type,
        purpose=req.purpose,
        version=req.version,
        accepted_at=datetime.utcnow().isoformat(),
        status="accepted"
    )

@router.get("/patient/consent", response_model=List[ConsentResponseData])
def get_my_consents(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat melihat persetujuan mereka")
    consents = db_get_patient_consents(current_user["user_id"])
    return [
        ConsentResponseData(
            id=c["id"],
            patient_id=c["patient_id"],
            consent_type=c["consent_type"],
            purpose=c.get("purpose"),
            version=c.get("version"),
            accepted_at=c.get("accepted_at"),
            status=c.get("status")
        ) for c in consents
    ]

@router.post("/patient/verify/ktp")
def verify_patient_ktp(req: KtpVerifyRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat melakukan verifikasi NIK")
    
    patient = db_get_patient_by_id(current_user["user_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    # Encrypt the NIK
    encrypted_nik = encrypt_nik(req.nik)
    
    success = db_update_patient(
        patient_id=current_user["user_id"],
        no_rm=patient["no_rm"],
        nik_encrypted=encrypted_nik,
        password_hash=None,
        name=req.name,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        address=req.address,
        verification_status="KTP_VERIFIED",
        ktp_verification_status="KTP_VERIFIED"
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan verifikasi KTP")
        
    write_audit_log(current_user["user_id"], "patient", "KTP_VERIFIED (NIK submitted and matched)", current_user["user_id"], event_type="KTP_VERIFIED")
    return {"message": "Verifikasi KTP berhasil disimpan"}

@router.post("/patient/verify/face")
def verify_patient_face(req: FaceVerifyRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat melakukan verifikasi wajah")
        
    # Check if patient consented to biometric processing
    consents = db_get_patient_consents(current_user["user_id"])
    biometric_consent = any(c["consent_type"] == "BIOMETRIC_VERIFICATION" and c["status"] == "accepted" for c in consents)
    if not biometric_consent:
        raise HTTPException(status_code=400, detail="Akses ditolak: Persetujuan pemrosesan biometrik (BIOMETRIC_VERIFICATION) belum disetujui")
        
    patient = db_get_patient_by_id(current_user["user_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    success = db_update_patient(
        patient_id=current_user["user_id"],
        no_rm=patient["no_rm"],
        nik_encrypted=patient["nik_encrypted"],
        password_hash=None,
        name=patient["name"],
        date_of_birth=patient["date_of_birth"],
        verification_status="FACE_VERIFIED",
        face_verification_status="FACE_VERIFIED"
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan verifikasi wajah")
        
    write_audit_log(current_user["user_id"], "patient", "FACE_VERIFICATION_COMPLETED (Face photo processed)", current_user["user_id"], event_type="FACE_VERIFICATION_COMPLETED")
    return {"message": "Verifikasi wajah berhasil diproses"}


@router.get("/patient/accessibility-preference")
def get_accessibility_preference(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat memiliki preferensi aksesibilitas")
    
    patient = db_get_patient_by_id(current_user["user_id"])
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    return {"preference": patient.get("accessibility_intro_seen") or "NOT_SEEN"}

@router.post("/patient/accessibility-preference")
def update_accessibility_preference(req: AccessibilityPreferenceRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat memperbarui preferensi aksesibilitas")
        
    success = db_update_patient_accessibility_preference(current_user["user_id"], req.preference)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui preferensi")
        
    # Log audit event
    write_audit_log(current_user["user_id"], "patient", f"ACCESSIBILITY_SETTING_CHANGED (Status: {req.preference})", current_user["user_id"], event_type="ACCESSIBILITY_SETTING_CHANGED")
    
    return {"message": "Preferensi aksesibilitas diperbarui"}


@router.get("/patients/{patient_id}/timeline")
def get_patient_timeline_endpoint(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    user_id = current_user["user_id"]
    
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "patient" and patient_id != user_id:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    elif role == "doctor":
        # Enforce link or break-glass access
        if not db_check_doctor_patient_link(user_id, patient_id) and not db_check_break_glass_active(user_id, patient_id):
            raise HTTPException(status_code=403, detail="Akses ditolak: Anda tidak memiliki akses biasa atau akses Break-Glass")
    elif role == "admin":
        if patient.get("facility_id") != current_user.get("facility_id"):
            raise HTTPException(status_code=403, detail="Akses ditolak")
            
    events = db_get_patient_timeline(patient_id)
    return events

@router.post("/patient/{patient_id}/break-glass")
def request_break_glass_endpoint(patient_id: str, req: BreakGlassRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "doctor":
        raise HTTPException(status_code=403, detail="Hanya dokter yang dapat mengaktifkan Break-Glass")
        
    if not req.reason.strip():
        raise HTTPException(status_code=400, detail="Alasan Break-Glass harus diisi")
        
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    bg_id = str(uuid.uuid4())
    success = db_create_break_glass_log(bg_id, current_user["user_id"], patient_id, req.reason, duration_hours=2)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengaktifkan Break-Glass")
        
    # Write clinical timeline event
    db_create_timeline_event(
        str(uuid.uuid4()),
        patient_id,
        "VERIFICATION",
        "Akses Darurat (Break-Glass) Diaktifkan",
        f"Diaktifkan oleh dr. {current_user['user_id']} dengan alasan: {req.reason}",
        datetime.utcnow().isoformat(),
        bg_id
    )
        
    # Trigger security incident if a doctor activates break-glass
    from app.db import db_create_incident
    db_create_incident(
        str(uuid.uuid4()),
        "Emergency Break-Glass Activated",
        f"Doctor {current_user['user_id']} bypassed access boundaries to Patient {patient_id}. Reason: {req.reason}",
        "HIGH",
        "open"
    )
    
    write_audit_log(current_user["user_id"], "doctor", f"BREAK_GLASS_ACTIVATED (Patient: {patient_id} Reason: {req.reason})", patient_id, event_type="BREAK_GLASS_ACTIVATED")
    return {"message": "Akses darurat Break-Glass diaktifkan selama 2 jam."}

@router.post("/patient/me/export", response_model=ExportResponse)
def request_patient_export_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat mengekspor data sendiri")
        
    patient_id = current_user["user_id"]
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    # Gather export data
    timeline = db_get_patient_timeline(patient_id)
    records = db_get_patient_medical_records(patient_id)
    meds = db_get_patient_medications(patient_id)
    consents = db_get_patient_consents(patient_id)
    
    import json
    import time
    
    export_data = {
        "profile": {
            "name": patient["name"],
            "date_of_birth": patient["date_of_birth"],
            "no_rm": patient["no_rm"]
        },
        "consents": [dict(c) for c in consents],
        "timeline": [dict(t) for t in timeline],
        "medical_records": [dict(r) for r in records],
        "medications": [dict(m) for m in meds]
    }
    
    export_dir = "backend/data/exports"
    os.makedirs(export_dir, exist_ok=True)
    
    export_id = str(uuid.uuid4())
    filename = f"export_{patient_id}_{int(time.time())}.json"
    file_path = f"{export_dir}/{filename}"
    
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(export_data, f, ensure_ascii=False, indent=2)
        
    db_create_export(export_id, patient_id, file_path, expiry_hours=24)
    
    expires_str = (datetime.utcnow() + timedelta(hours=24)).isoformat()
    download_url = f"/api/v1/patient/export/{export_id}"
    
    write_audit_log(patient_id, "patient", "DATA_EXPORT_REQUESTED", patient_id, event_type="DATA_EXPORT_REQUESTED")
    return ExportResponse(export_id=export_id, download_url=download_url, expires_at=expires_str)

@router.get("/patient/export/{export_id}")
def download_patient_export_endpoint(export_id: str, current_user: dict = Depends(get_current_user)):
    export_row = db_get_export_by_id(export_id)
    if not export_row:
        raise HTTPException(status_code=404, detail="File ekspor tidak ditemukan")
        
    if export_row["patient_id"] != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: File ekspor ini bukan milik Anda")
        
    # Check expiry
    expiry = datetime.fromisoformat(export_row["expires_at"])
    if datetime.utcnow() > expiry:
        db_update_export_status(export_id, "expired")
        raise HTTPException(status_code=400, detail="Link ekspor sudah kedaluwarsa (berlaku 24 jam)")
        
    if not os.path.exists(export_row["file_path"]):
        raise HTTPException(status_code=404, detail="File fisik sudah dihapus dari server")
        
    # Return file response
    from fastapi.responses import FileResponse
    db_update_export_status(export_id, "downloaded")
    write_audit_log(current_user["user_id"], "patient", "DATA_EXPORT_DOWNLOADED", current_user["user_id"], event_type="DATA_EXPORT_DOWNLOADED")
    return FileResponse(export_row["file_path"], media_type="application/json", filename=os.path.basename(export_row["file_path"]))
