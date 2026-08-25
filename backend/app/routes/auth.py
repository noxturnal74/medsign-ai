import hmac
import hashlib
import base64
import json
import uuid
import time
from datetime import datetime
from typing import Optional, Literal
from fastapi import APIRouter, HTTPException, Depends, Security, Response, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from app.db import (
    db_get_doctor_by_email,
    db_get_admin_by_email,
    db_get_all_patients,
    db_get_patient_by_id,
    db_update_patient_password,
    hash_password,
    verify_password,
    decrypt_nik
)
from app.rate_limiter import check_lockout, record_failure, record_success

import os as _os
SECRET_KEY = _os.getenv("MEDSIGN_JWT_SECRET", "medsign_clinical_secret_key")
if SECRET_KEY == "medsign_clinical_secret_key":
    print("[SECURITY WARNING] MEDSIGN_JWT_SECRET tidak diset — memakai default dev. Set env ini di produksi!")
ACCESS_TOKEN_EXPIRE_MINUTES = 10080  # 7 days for local prototype demo
REFRESH_TOKEN_EXPIRE_DAYS = 7

router = APIRouter()
security = HTTPBearer(auto_error=False)

def create_jwt_token(payload: dict, expires_in_seconds: int) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    exp_payload = payload.copy()
    exp_payload["exp"] = int(time.time()) + expires_in_seconds
    
    h_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    p_b64 = base64.urlsafe_b64encode(json.dumps(exp_payload).encode()).decode().rstrip("=")
    msg = f"{h_b64}.{p_b64}"
    sig = hmac.new(SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
    return f"{msg}.{sig_b64}"

def verify_jwt_token(token: str) -> Optional[dict]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            print("[JWT DEBUG] Invalid format (not 3 parts)")
            return None
        h_b64, p_b64, sig_b64 = parts
        msg = f"{h_b64}.{p_b64}"
        sig = hmac.new(SECRET_KEY.encode(), msg.encode(), hashlib.sha256).digest()
        expected_sig_b64 = base64.urlsafe_b64encode(sig).decode().rstrip("=")
        if not hmac.compare_digest(sig_b64, expected_sig_b64):
            print("[JWT DEBUG] Signature mismatch")
            return None
            
        rem = len(p_b64) % 4
        if rem > 0:
            p_b64 += "=" * (4 - rem)
        payload_data = base64.urlsafe_b64decode(p_b64.encode()).decode()
        payload = json.loads(payload_data)
        
        if payload.get("exp", 0) < time.time():
            print(f"[JWT DEBUG] Token expired. Exp: {payload.get('exp')}, Current: {time.time()}")
            return None
        return payload
    except Exception as e:
        print("[JWT DEBUG] Exception:", e)
        return None

async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Security(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Token missing")
    payload = verify_jwt_token(credentials.credentials)
    if not payload:
        raise HTTPException(status_code=401, detail="Token invalid or expired")
    return payload

def find_patient_by_nik(nik: str) -> Optional[dict]:
    patients = db_get_all_patients()
    for patient in patients:
        decrypted = decrypt_nik(patient["nik_encrypted"])
        if decrypted == nik:
            return patient
    return None

class DoctorAdminLoginRequest(BaseModel):
    email: str
    password: str

class PatientLoginRequest(BaseModel):
    nik: str = Field(..., min_length=8, max_length=16, description="NIK Pasien")
    password: str

class LoginResponse(BaseModel):
    token: str
    role: str
    user_id: str
    must_change_password: Optional[bool] = None

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

# ── ENDPOINTS ──

@router.post("/auth/doctor/login", response_model=LoginResponse)
def doctor_login(request: DoctorAdminLoginRequest, response: Response):
    lockout_time = check_lockout(request.email, is_patient=False)
    if lockout_time > 0.0:
        raise HTTPException(
            status_code=429,
            detail=f"Terlalu banyak percobaan gagal. Akun dikunci. Silakan coba lagi dalam {int(lockout_time)} detik."
        )
        
    doctor = db_get_doctor_by_email(request.email)
    
    if not doctor or not verify_password(request.password, doctor["password_hash"]):
        record_failure(request.email)
        raise HTTPException(status_code=401, detail="Email atau password salah")
        
    if doctor.get("is_active", 1) == 0:
        raise HTTPException(status_code=403, detail="Akun dokter dinonaktifkan oleh administrator")
        record_failure(request.email)
        raise HTTPException(status_code=401, detail="Email atau password salah")
        
    record_success(request.email)
    
    access_token = create_jwt_token(
        {"user_id": doctor["id"], "email": doctor["email"], "role": "doctor", "facility_id": doctor.get("facility_id")},
        ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    refresh_token = create_jwt_token(
        {"user_id": doctor["id"], "email": doctor["email"], "role": "doctor", "facility_id": doctor.get("facility_id")},
        REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return LoginResponse(token=access_token, role="doctor", user_id=doctor["id"])

@router.post("/auth/admin/login", response_model=LoginResponse)
def admin_login(request: DoctorAdminLoginRequest, response: Response):
    lockout_time = check_lockout(request.email, is_patient=False)
    if lockout_time > 0.0:
        raise HTTPException(
            status_code=429,
            detail=f"Terlalu banyak percobaan gagal. Akun dikunci. Silakan coba lagi dalam {int(lockout_time)} detik."
        )
        
    admin = db_get_admin_by_email(request.email)
    
    if not admin or not verify_password(request.password, admin["password_hash"]):
        record_failure(request.email)
        raise HTTPException(status_code=401, detail="Email atau password salah")
        
    record_success(request.email)
    
    role = "super_admin" if (admin["email"] == "administrator" or admin.get("username") == "administrator") else "admin"
    access_token = create_jwt_token(
        {"user_id": admin["id"], "email": admin["email"], "role": role, "facility_id": admin.get("facility_id")},
        ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    refresh_token = create_jwt_token(
        {"user_id": admin["id"], "email": admin["email"], "role": role, "facility_id": admin.get("facility_id")},
        REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return LoginResponse(token=access_token, role=role, user_id=admin["id"])

@router.post("/auth/patient/login", response_model=LoginResponse)
def patient_login(request: PatientLoginRequest, response: Response):
    raise HTTPException(
        status_code=403,
        detail="Akses masuk (login) untuk pasien tidak diizinkan di sistem ini."
    )
    # The rest of the function remains unreachable but preserved for structure

    lockout_time = check_lockout(request.nik, is_patient=True)
    if lockout_time > 0.0:
        raise HTTPException(
            status_code=429,
            detail=f"Terlalu banyak percobaan gagal. Akun dikunci. Silakan coba lagi dalam {int(lockout_time)} detik."
        )
        
    patient = find_patient_by_nik(request.nik)
    
    if not patient or patient["password_hash"] is None or not verify_password(request.password, patient["password_hash"]):
        record_failure(request.nik)
        raise HTTPException(status_code=401, detail="NIK atau password salah")
        
    if patient.get("is_active", 1) == 0 or patient.get("verification_status", "PENDING") != "APPROVED":
        raise HTTPException(status_code=403, detail="Akun pasien belum aktif atau disetujui oleh administrator. Status saat ini: " + patient.get("verification_status", "PENDING"))
        
    record_success(request.nik)
    
    access_token = create_jwt_token(
        {"user_id": patient["id"], "nik": request.nik, "role": "patient", "facility_id": patient.get("facility_id")},
        ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )
    refresh_token = create_jwt_token(
        {"user_id": patient["id"], "nik": request.nik, "role": "patient", "facility_id": patient.get("facility_id")},
        REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600
    )
    
    return LoginResponse(
        token=access_token,
        role="patient",
        user_id=patient["id"],
        must_change_password=bool(patient["must_change_password"])
    )

@router.post("/auth/patient/change-password")
def change_password(request: ChangePasswordRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "patient":
        raise HTTPException(status_code=403, detail="Hanya pasien yang dapat mengganti password pasien")
        
    patient = db_get_patient_by_id(current_user["user_id"])
    
    if not patient or not verify_password(request.old_password, patient["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
        
    hashed_new = hash_password(request.new_password)
    db_update_patient_password(current_user["user_id"], hashed_new, 0)
    
    return {"message": "Password berhasil diperbarui"}

@router.post("/auth/refresh", response_model=LoginResponse)
def refresh(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
        
    payload = verify_jwt_token(refresh_token)
    if not payload:
        raise HTTPException(status_code=401, detail="Refresh token invalid or expired")
        
    new_payload = {"user_id": payload["user_id"], "role": payload["role"], "facility_id": payload.get("facility_id")}
    if "email" in payload:
        new_payload["email"] = payload["email"]
    elif "nik" in payload:
        new_payload["nik"] = payload["nik"]
        
    access_token = create_jwt_token(new_payload, ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    
    return LoginResponse(token=access_token, role=payload["role"], user_id=payload["user_id"])

@router.post("/auth/logout")
def logout(response: Response):
    response.delete_cookie("refresh_token")
    return {"message": "Berhasil logout"}
