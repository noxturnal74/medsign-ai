from fastapi.responses import StreamingResponse
import io
import csv
import uuid
import secrets
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Response
from pydantic import BaseModel, Field
from datetime import datetime
import json
from app.db import (
    db_get_all_facilities,
    db_get_facility_by_id,
    db_create_facility,
    db_update_facility,
    db_delete_facility,
    db_create_facility_admin,
    db_update_facility_admin,
    db_get_all_admins,
    db_get_admin_by_id,
    db_get_all_audit_logs,
    db_get_setting,
    db_set_setting,
    db_get_facility_audit_logs,
    db_create_incident,
    db_update_incident,
    db_get_all_incidents,
    db_create_backup_log,
    db_get_all_backup_logs,
    db_get_all_instagram_posts,
    db_create_instagram_post,
    db_update_instagram_post,
    db_delete_instagram_post,
    db_get_all_mitra,
    db_create_mitra,
    db_update_mitra,
    db_delete_mitra,
    db_get_all_articles,
    db_create_article,
    db_update_article,
    db_delete_article,
    db_get_all_reviews,
    db_create_review,
    db_update_review,
    db_delete_review,
    db_get_all_video_tutorials,
    db_create_video_tutorial,
    db_update_video_tutorial,
    db_delete_video_tutorial,
    db_get_all_brand_pkm,
    db_create_brand_pkm,
    db_update_brand_pkm,
    db_delete_brand_pkm,
    db_get_dashboard_moduls,
    db_save_dashboard_moduls,
    db_update_admin_profile,
    db_get_all_sessions,
    hash_password,
    db_get_patient_by_no_rm,
    db_get_all_patients,
    db_create_patient,
    db_create_doctor_patient_link,
    db_get_doctor_by_id,
    db_get_patient_by_id,
    db_check_doctor_patient_link,
    db_update_patient_password,
    hash_password,
    encrypt_nik,
    decrypt_nik,
    write_audit_log,
    db_get_all_doctors,
    db_create_doctor,
    db_update_doctor,
    db_delete_doctor,
    db_update_patient,
    db_delete_patient,
    db_get_all_assignments,
    db_delete_doctor_patient_link
)
from app.routes.auth import get_current_user

router = APIRouter()

# ── REQUEST/RESPONSE MODELS ──

class PatientCreateRequest(BaseModel):
    no_rm: str
    nik: str = Field(..., min_length=8, max_length=16)
    name: str
    date_of_birth: str
    facility_id: Optional[str] = None

class PatientCreateResponse(BaseModel):
    id: str
    no_rm: str
    name: str
    temporary_password: str
    message: str

class PatientUpdateRequest(BaseModel):
    no_rm: str
    nik: str = Field(..., min_length=8, max_length=16)
    name: str
    date_of_birth: str
    password: Optional[str] = None
    facility_id: Optional[str] = None
    verification_status: Optional[str] = None
    is_active: Optional[int] = None

class PatientResponse(BaseModel):
    id: str
    no_rm: str
    nik: str
    name: str
    date_of_birth: str
    created_by: Optional[str] = None
    created_at: str

class DoctorCreateRequest(BaseModel):
    name: str
    email: str
    password: str
    specialization: Optional[str] = None
    facility_id: Optional[str] = None

class DoctorUpdateRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    specialization: Optional[str] = None
    facility_id: Optional[str] = None
    status: Optional[str] = None
    is_active: Optional[int] = None

class DoctorResponse(BaseModel):
    id: str
    name: str
    email: str
    specialization: Optional[str] = None
    created_at: str

class AssignmentRequest(BaseModel):
    doctor_id: str
    patient_id: str

class AssignmentResponse(BaseModel):
    id: str
    doctor_id: str
    patient_id: str
    assigned_at: str

class ResetPasswordResponse(BaseModel):
    temporary_password: str
    message: str

# ── ENDPOINTS ──

# 1. Patients CRUD

@router.get("/admin/patients", response_model=List[PatientResponse])
def get_all_patients_admin(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat melihat seluruh daftar pasien")
    rows = db_get_all_patients()
    if role == "admin":
        rows = [r for r in rows if r.get("facility_id") == current_user["facility_id"]]
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
    return res

@router.post("/admin/patients", response_model=PatientCreateResponse)
def register_patient(request: PatientCreateRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "doctor", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin dan dokter yang dapat mendaftarkan pasien")
        
    if db_get_patient_by_no_rm(request.no_rm):
        raise HTTPException(status_code=400, detail="Nomor RM sudah digunakan")
        
    rows = db_get_all_patients()
    for r in rows:
        decrypted = decrypt_nik(r["nik_encrypted"])
        if decrypted == request.nik:
            raise HTTPException(status_code=400, detail="NIK sudah terdaftar")
            
    temp_pass = secrets.token_hex(6)
    hashed_pass = hash_password(temp_pass)
    
    patient_id = str(uuid.uuid4())
    encrypted_nik = encrypt_nik(request.nik)
    
    fac_id = current_user.get("facility_id") if role in ["admin", "doctor"] else request.facility_id
    
    success = db_create_patient(
        patient_id=patient_id,
        no_rm=request.no_rm,
        nik_encrypted=encrypted_nik,
        password_hash=hashed_pass,
        name=request.name,
        date_of_birth=request.date_of_birth,
        created_by=current_user["user_id"],
        facility_id=fac_id,
        verification_status="APPROVED" if role == "super_admin" else "PENDING",
        is_active=1 if role == "super_admin" else 0
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mendaftarkan pasien")
        
    if role == "doctor":
        link_id = str(uuid.uuid4())
        db_create_doctor_patient_link(link_id, current_user["user_id"], patient_id)
        
    write_audit_log(current_user["user_id"], role, "POST /api/v1/admin/patients", patient_id, facility_id=fac_id)
    
    return PatientCreateResponse(
        id=patient_id,
        no_rm=request.no_rm,
        name=request.name,
        temporary_password=temp_pass,
        message="Pasien berhasil didaftarkan"
    )

@router.put("/admin/patients/{patient_id}")
def update_patient_endpoint(patient_id: str, request: PatientUpdateRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit data pasien")
        
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "admin" and patient.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: pasien bukan bagian dari faskes Anda")
        
    hashed_pass = hash_password(request.password) if request.password else None
    encrypted_nik = encrypt_nik(request.nik)
    
    # Audit status transitions
    prev_status = patient.get("verification_status")
    new_status = request.verification_status
    if new_status and prev_status != new_status:
        write_audit_log(current_user["user_id"], role, f"Status Transition: {prev_status} -> {new_status}", patient_id, facility_id=patient.get("facility_id"))
        
    success = db_update_patient(
        patient_id=patient_id,
        no_rm=request.no_rm,
        nik_encrypted=encrypted_nik,
        password_hash=hashed_pass,
        name=request.name,
        date_of_birth=request.date_of_birth,
        facility_id=request.facility_id,
        verification_status=request.verification_status,
        is_active=request.is_active
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui data pasien")
        
    write_audit_log(current_user["user_id"], "admin", "PUT /api/v1/admin/patients", patient_id)
    return {"message": "Data pasien berhasil diperbarui"}

@router.delete("/admin/patients/{patient_id}")
def delete_patient_endpoint(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data pasien")
        
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "admin" and patient.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    success = db_delete_patient(patient_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus data pasien")
        
    write_audit_log(current_user["user_id"], "admin", "DELETE /api/v1/admin/patients", patient_id)
    return {"message": "Data pasien berhasil dihapus"}


# 2. Doctors CRUD

@router.get("/admin/doctors", response_model=List[DoctorResponse])
def get_all_doctors_admin(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses daftar dokter")
    rows = db_get_all_doctors()
    if role == "admin":
        rows = [r for r in rows if r.get("facility_id") == current_user["facility_id"]]
    return [
        DoctorResponse(
            id=r["id"],
            name=r["name"],
            email=r["email"],
            specialization=r.get("specialization"),
            created_at=r["created_at"]
        ) for r in rows
    ]

@router.post("/admin/doctors", response_model=DoctorResponse)
def register_doctor(request: DoctorCreateRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mendaftarkan dokter baru")
        
    hashed = hash_password(request.password)
    doc_id = str(uuid.uuid4())
    
    fac_id = current_user.get("facility_id") if role == "admin" else request.facility_id
    
    success = db_create_doctor(
        doc_id=doc_id,
        name=request.name,
        email=request.email,
        password_hash=hashed,
        specialization=request.specialization,
        facility_id=fac_id
    )
    
    if not success:
        raise HTTPException(status_code=400, detail="Email dokter sudah terdaftar atau gagal dibuat")
        
    write_audit_log(current_user["user_id"], "admin", f"POST /api/v1/admin/doctors (Create {doc_id})")
    
    doc = db_get_doctor_by_id(doc_id)
    return DoctorResponse(
        id=doc["id"],
        name=doc["name"],
        email=doc["email"],
        specialization=doc.get("specialization"),
        created_at=doc["created_at"]
    )

@router.put("/admin/doctors/{doctor_id}")
def update_doctor_endpoint(doctor_id: str, request: DoctorUpdateRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit data dokter")
        
    doctor = db_get_doctor_by_id(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Dokter tidak ditemukan")
        
    if role == "admin" and doctor.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    hashed = hash_password(request.password) if request.password else None
    success = db_update_doctor(
        doctor_id=doctor_id,
        name=request.name,
        email=request.email,
        password_hash=hashed,
        specialization=request.specialization,
        facility_id=request.facility_id,
        status=request.status,
        is_active=request.is_active
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui data dokter")
        
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/doctors/{doctor_id}")
    return {"message": "Data dokter berhasil diperbarui"}

@router.delete("/admin/doctors/{doctor_id}")
def delete_doctor_endpoint(doctor_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data dokter")
        
    doctor = db_get_doctor_by_id(doctor_id)
    if not doctor:
        raise HTTPException(status_code=404, detail="Dokter tidak ditemukan")
        
    if role == "admin" and doctor.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    success = db_delete_doctor(doctor_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus data dokter")
        
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/doctors/{doctor_id}")
    return {"message": "Data dokter berhasil dihapus"}


# 3. Doctor-Patient Assignments

@router.get("/admin/doctor-patient-assignments", response_model=List[AssignmentResponse])
def get_assignments_admin(current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses daftar hubungan dokter-pasien")
    rows = db_get_all_assignments()
    if role == "admin":
        fac_id = current_user["facility_id"]
        doc_ids = {d["id"] for d in db_get_all_doctors() if d.get("facility_id") == fac_id}
        rows = [r for r in rows if r.get("doctor_id") in doc_ids]
    return [
        AssignmentResponse(
            id=r["id"],
            doctor_id=r["doctor_id"],
            patient_id=r["patient_id"],
            assigned_at=r["assigned_at"]
        ) for r in rows
    ]

@router.post("/admin/doctor-patient-assignment")
def assign_doctor_patient(request: AssignmentRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengelola hubungan dokter-pasien")
        
    doc = db_get_doctor_by_id(request.doctor_id)
    pat = db_get_patient_by_id(request.patient_id)
    if not doc or not pat:
        raise HTTPException(status_code=404, detail="Dokter atau pasien tidak ditemukan")
        
    if role == "admin":
        fac_id = current_user["facility_id"]
        if doc.get("facility_id") != fac_id or pat.get("facility_id") != fac_id:
            raise HTTPException(status_code=403, detail="Akses ditolak: dokter atau pasien berada di luar faskes Anda")
        
    if db_check_doctor_patient_link(request.doctor_id, request.patient_id):
        return {"message": "Dokter dan pasien sudah terhubung"}
        
    link_id = str(uuid.uuid4())
    success = db_create_doctor_patient_link(link_id, request.doctor_id, request.patient_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghubungkan dokter-pasien")
        
    write_audit_log(
        current_user["user_id"], 
        "admin", 
        f"POST /api/v1/admin/doctor-patient-assignment (Link: {request.doctor_id} to {request.patient_id})", 
        request.patient_id
    )
    
    return {"message": "Hubungan dokter-pasien berhasil disimpan"}

@router.post("/admin/doctor-patient-assignment/remove")
def remove_doctor_patient_assignment(request: AssignmentRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus hubungan dokter-pasien")
        
    if not db_check_doctor_patient_link(request.doctor_id, request.patient_id):
        raise HTTPException(status_code=400, detail="Hubungan dokter-pasien tidak ditemukan")
        
    success = db_delete_doctor_patient_link(request.doctor_id, request.patient_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus hubungan dokter-pasien")
        
    write_audit_log(
        current_user["user_id"], 
        "admin", 
        f"DELETE /api/v1/admin/doctor-patient-assignment (Link: {request.doctor_id} to {request.patient_id})", 
        request.patient_id
    )
    return {"message": "Hubungan dokter-pasien berhasil dihapus"}

@router.post("/admin/patients/{id}/reset-password", response_model=ResetPasswordResponse)
def reset_patient_password(id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mereset password pasien")
        
    patient = db_get_patient_by_id(id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "admin" and patient.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    temp_pass = secrets.token_hex(6)
    hashed_pass = hash_password(temp_pass)
    
    success = db_update_patient_password(id, hashed_pass, 1)
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mereset password pasien")
        
    write_audit_log(current_user["user_id"], "admin", "POST /api/v1/admin/patients/reset-password", id)
    
    return ResetPasswordResponse(
        temporary_password=temp_pass,
        message="Password pasien berhasil di-reset"
    )



# ?? ARTICLES & REVIEWS API DTO MODELS ??

class ArticleCreateRequest(BaseModel):
    title: str
    content: str
    slug: str
    cover_image: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = "Edukasi BISINDO"
    status: Optional[str] = "published"
    ref_url: Optional[str] = None

class ArticleUpdateRequest(BaseModel):
    title: str
    content: str
    slug: str
    cover_image: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = "Edukasi BISINDO"
    status: Optional[str] = "published"
    ref_url: Optional[str] = None

class ArticleResponse(BaseModel):
    id: str
    title: str
    slug: str
    cover_image: Optional[str] = None
    content: str
    excerpt: Optional[str] = None
    category: Optional[str] = None
    author: str
    status: str
    ref_url: Optional[str] = None
    published_at: Optional[str] = None
    created_at: str
    updated_at: str

class ReviewCreateRequest(BaseModel):
    name: str
    role: str
    rating: float = 5.0
    content: str
    avatar: Optional[str] = None

class ReviewUpdateRequest(BaseModel):
    name: str
    role: str
    rating: float = 5.0
    content: str
    avatar: Optional[str] = None

class ReviewResponse(BaseModel):
    id: str
    name: str
    role: str
    rating: float
    content: str
    avatar: Optional[str] = None
    created_at: str


# ?? INSTAGRAM POSTS DTO MODELS ??

class InstagramPostCreateRequest(BaseModel):
    post_url: str
    thumbnail_image: str
    caption_short: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[int] = 1

class InstagramPostUpdateRequest(BaseModel):
    post_url: str
    thumbnail_image: str
    caption_short: Optional[str] = None
    display_order: Optional[int] = 0
    is_active: Optional[int] = 1

class InstagramPostResponse(BaseModel):
    id: str
    post_url: str
    thumbnail_image: str
    caption_short: Optional[str] = None
    display_order: int
    is_active: int
    added_at: str


# ?? MITRA (PARTNERS) DTO MODELS ??

class MitraCreateRequest(BaseModel):
    name: str
    logo: str
    website_url: Optional[str] = None
    category: Optional[str] = "Mitra"
    display_order: Optional[int] = 0
    is_active: Optional[int] = 1

class MitraUpdateRequest(BaseModel):
    name: str
    logo: str
    website_url: Optional[str] = None
    category: Optional[str] = "Mitra"
    display_order: Optional[int] = 0
    is_active: Optional[int] = 1

class MitraResponse(BaseModel):
    id: str
    name: str
    logo: str
    website_url: Optional[str] = None
    category: Optional[str] = None
    display_order: int
    is_active: int
    created_at: str


# ═══ VIDEO TUTORIAL DTO ═══

class VideoTutorialCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    display_order: Optional[int] = 0

class VideoTutorialUpdateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    is_active: Optional[int] = 1
    display_order: Optional[int] = 0

class VideoTutorialResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    video_url: str
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    is_active: int
    display_order: int
    created_at: str
    updated_at: str


# ═══ BRAND PKM DTO ═══

class BrandPkmCreateRequest(BaseModel):
    name: str
    logo: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    category: Optional[str] = "program"
    display_order: Optional[int] = 0

class BrandPkmUpdateRequest(BaseModel):
    name: str
    logo: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    category: Optional[str] = "program"
    is_active: Optional[int] = 1
    display_order: Optional[int] = 0

class BrandPkmResponse(BaseModel):
    id: str
    name: str
    logo: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    category: Optional[str] = None
    is_active: int
    display_order: int
    created_at: str
    updated_at: str


# ═══ DASHBOARD MODUL DTO ═══

class DashboardModulItem(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    icon: Optional[str] = None
    link: Optional[str] = None
    color: Optional[str] = "sky"
    is_active: bool = True
    display_order: int = 0

class DashboardModulListRequest(BaseModel):
    items: List[DashboardModulItem]

# 1. ARTICLES ENDPOINTS
@router.get("/articles", response_model=List[ArticleResponse])
def get_articles_endpoint():
    rows = db_get_all_articles()
    return [
        ArticleResponse(
            id=r["id"],
            title=r["title"],
            slug=r["slug"],
            cover_image=r["cover_image"],
            content=r["content"],
            excerpt=r["excerpt"],
            category=r["category"],
            author=r["author"],
            status=r["status"],
            ref_url=r.get("ref_url"),
            published_at=r["published_at"],
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        ) for r in rows
    ]

@router.post("/admin/articles", response_model=ArticleResponse)
def create_article_endpoint(request: ArticleCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat membuat artikel")
    article_id = str(uuid.uuid4())
    success = db_create_article(
        article_id,
        request.title,
        request.slug,
        request.cover_image,
        request.content,
        request.excerpt,
        request.category,
        "Admin",
        request.status,
        request.ref_url
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat artikel")
    write_audit_log(current_user["user_id"], "admin", f"POST /api/v1/admin/articles (ID: {article_id})")
    
    now = datetime.utcnow().isoformat()
    return ArticleResponse(
        id=article_id,
        title=request.title,
        slug=request.slug,
        cover_image=request.cover_image,
        content=request.content,
        excerpt=request.excerpt,
        category=request.category,
        author="Admin",
        status=request.status,
        ref_url=request.ref_url,
        published_at=now if request.status == "published" else None,
        created_at=now,
        updated_at=now
    )

@router.put("/admin/articles/{article_id}")
def update_article_endpoint(article_id: str, request: ArticleUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit artikel")
    success = db_update_article(
        article_id,
        request.title,
        request.slug,
        request.cover_image,
        request.content,
        request.excerpt,
        request.category,
        "Admin",
        request.status,
        request.ref_url
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit artikel")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/articles/{article_id}")
    return {"message": "Artikel berhasil diperbarui"}

@router.delete("/admin/articles/{article_id}")
def delete_article_endpoint(article_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus artikel")
    success = db_delete_article(article_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus artikel")
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/articles/{article_id}")
    return {"message": "Artikel berhasil dihapus"}


# 2. REVIEWS ENDPOINTS
@router.get("/reviews", response_model=List[ReviewResponse])
def get_reviews_endpoint():
    rows = db_get_all_reviews()
    return [
        ReviewResponse(
            id=r["id"],
            name=r["name"],
            role=r["role"],
            rating=r["rating"],
            content=r["content"],
            avatar=r.get("avatar"),
            created_at=r["created_at"]
        ) for r in rows
    ]

@router.post("/admin/reviews", response_model=ReviewResponse)
def create_review_endpoint(request: ReviewCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat membuat review")
    review_id = str(uuid.uuid4())
    success = db_create_review(review_id, request.name, request.role, request.rating, request.content, request.avatar)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat review")
    write_audit_log(current_user["user_id"], "admin", f"POST /api/v1/admin/reviews (ID: {review_id})")
    return ReviewResponse(
        id=review_id,
        name=request.name,
        role=request.role,
        rating=request.rating,
        content=request.content,
        avatar=request.avatar,
        created_at=datetime.utcnow().isoformat()
    )

@router.put("/admin/reviews/{review_id}")
def update_review_endpoint(review_id: str, request: ReviewUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit review")
    success = db_update_review(review_id, request.name, request.role, request.rating, request.content, request.avatar)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit review")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/reviews/{review_id}")
    return {"message": "Review berhasil diperbarui"}

@router.delete("/admin/reviews/{review_id}")
def delete_review_endpoint(review_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus review")
    success = db_delete_review(review_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus review")
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/reviews/{review_id}")
    return {"message": "Review berhasil dihapus"}


# 3. INSTAGRAM POSTS ENDPOINTS
@router.get("/instagram-posts", response_model=List[InstagramPostResponse])
def get_instagram_posts_endpoint():
    rows = db_get_all_instagram_posts()
    return [
        InstagramPostResponse(
            id=r["id"],
            post_url=r["post_url"],
            thumbnail_image=r["thumbnail_image"],
            caption_short=r["caption_short"],
            display_order=r["display_order"],
            is_active=r["is_active"],
            added_at=r["added_at"]
        ) for r in rows
    ]

@router.post("/admin/instagram-posts", response_model=InstagramPostResponse)
def create_instagram_post_endpoint(request: InstagramPostCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengelola feed instagram")
    post_id = str(uuid.uuid4())
    success = db_create_instagram_post(post_id, request.post_url, request.thumbnail_image, request.caption_short, request.display_order, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat feed post instagram")
    write_audit_log(current_user["user_id"], "admin", f"POST /api/v1/admin/instagram-posts (ID: {post_id})")
    
    return InstagramPostResponse(
        id=post_id,
        post_url=request.post_url,
        thumbnail_image=request.thumbnail_image,
        caption_short=request.caption_short,
        display_order=request.display_order,
        is_active=request.is_active,
        added_at=datetime.utcnow().isoformat()
    )

@router.put("/admin/instagram-posts/{post_id}")
def update_instagram_post_endpoint(post_id: str, request: InstagramPostUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit feed instagram")
    success = db_update_instagram_post(post_id, request.post_url, request.thumbnail_image, request.caption_short, request.display_order, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit feed instagram")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/instagram-posts/{post_id}")
    return {"message": "Feed post instagram berhasil diperbarui"}

@router.delete("/admin/instagram-posts/{post_id}")
def delete_instagram_post_endpoint(post_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus feed instagram")
    success = db_delete_instagram_post(post_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus feed instagram")
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/instagram-posts/{post_id}")
    return {"message": "Feed post instagram berhasil dihapus"}


# 4. MITRA (PARTNERS) ENDPOINTS
@router.get("/mitra", response_model=List[MitraResponse])
def get_mitra_endpoint():
    rows = db_get_all_mitra()
    return [
        MitraResponse(
            id=r["id"],
            name=r["name"],
            logo=r["logo"],
            website_url=r["website_url"],
            category=r["category"],
            display_order=r["display_order"],
            is_active=r["is_active"],
            created_at=r["created_at"]
        ) for r in rows
    ]

@router.post("/admin/mitra", response_model=MitraResponse)
def create_mitra_endpoint(request: MitraCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengelola data mitra")
    mitra_id = str(uuid.uuid4())
    success = db_create_mitra(mitra_id, request.name, request.logo, request.website_url, request.category, request.display_order, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat data mitra")
    write_audit_log(current_user["user_id"], "admin", f"POST /api/v1/admin/mitra (ID: {mitra_id})")
    
    return MitraResponse(
        id=mitra_id,
        name=request.name,
        logo=request.logo,
        website_url=request.website_url,
        category=request.category,
        display_order=request.display_order,
        is_active=request.is_active,
        created_at=datetime.utcnow().isoformat()
    )

@router.put("/admin/mitra/{mitra_id}")
def update_mitra_endpoint(mitra_id: str, request: MitraUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit data mitra")
    success = db_update_mitra(mitra_id, request.name, request.logo, request.website_url, request.category, request.display_order, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit data mitra")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/mitra/{mitra_id}")
    return {"message": "Data mitra berhasil diperbarui"}

@router.delete("/admin/mitra/{mitra_id}")
def delete_mitra_endpoint(mitra_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data mitra")
    success = db_delete_mitra(mitra_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus data mitra")
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/mitra/{mitra_id}")
    return {"message": "Data mitra berhasil dihapus"}



class SuperAdminOverviewResponse(BaseModel):
    total_facilities: int
    active_facilities: int
    total_admins: int
    active_doctors: int
    total_patients: int
    pending_verifications: int
    active_consultations: int
    completed_consultations: int
    security_events: int
    system_errors: int
    weekly_sessions: List[dict]

class FacilityOverviewItem(BaseModel):
    id: str
    facility_code: str
    name: str
    type: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    status: str
    admin_name: Optional[str] = None
    doctor_count: int
    patient_count: int
    active_sessions: int

class FacilityCreateRequest(BaseModel):
    facility_code: str
    name: str
    type: str
    address: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    registration_number: Optional[str] = None

class AdminCreateRequest(BaseModel):
    name: str
    email: str
    username: str
    password: str
    facility_id: str
    phone: Optional[str] = None

class AdminUpdateRequest(BaseModel):
    name: str
    email: str
    username: str
    phone: Optional[str] = None
    status: str

class AdminResponse(BaseModel):
    id: str
    name: str
    email: str
    username: Optional[str] = None
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    phone: Optional[str] = None
    status: str
    created_at: str


class IncidentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    severity: str

class IncidentUpdateRequest(BaseModel):
    status: str
    resolution_details: Optional[str] = None

class IncidentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    assigned_investigator: Optional[str] = None
    resolution_details: Optional[str] = None
    created_at: str
    resolved_at: Optional[str] = None

class BackupResponse(BaseModel):
    id: str
    backup_name: str
    backup_path: str
    status: str
    integrity_checked: int
    created_at: str


class SystemSettingRequest(BaseModel):
    key: str
    value: str

class ToggleStatusRequest(BaseModel):
    role: str
    user_id: str
    is_active: int

@router.post('/admin/users/toggle-status')
def toggle_user_active_status(request: ToggleStatusRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ['admin', 'super_admin']:
        raise HTTPException(status_code=403, detail='Hanya admin yang dapat mengelola status aktif/nonaktif user')
        
    if request.role == 'doctor':
        target = db_get_doctor_by_id(request.user_id)
    else:
        target = db_get_patient_by_id(request.user_id)
        
    if not target:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
        
    if role == 'admin' and target.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: user bukan bagian dari faskes Anda")
    from app.db import db_set_user_active_status
    success = db_set_user_active_status(request.role, request.user_id, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail='Gagal memperbarui status aktif/nonaktif')
    write_audit_log(current_user['user_id'], 'admin', f'POST /api/v1/admin/users/toggle-status ({request.role} {request.user_id} active={request.is_active})')
    return {'message': 'Status aktif/nonaktif user berhasil diperbarui'}


@router.post("/admin/patients/{patient_id}/approve")
def approve_patient_registration(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menyetujui registrasi pasien")
        
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "admin" and patient.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: pasien bukan bagian dari faskes Anda")
        
    # Generate unique RM number if needed or use existing
    no_rm = patient["no_rm"]
    if no_rm.startswith("RM") and len(no_rm) > 10:
        # RM was RM + NIK; let's keep it or update it if desired.
        pass
        
    success = db_update_patient(
        patient_id=patient_id,
        no_rm=patient["no_rm"],
        nik_encrypted=patient["nik_encrypted"],
        password_hash=None,
        name=patient["name"],
        date_of_birth=patient["date_of_birth"],
        verification_status="APPROVED",
        is_active=1
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyetujui registrasi pasien")
        
    write_audit_log(current_user["user_id"], role, "PATIENT_CREATED (Registration approved and activated)", patient_id, facility_id=patient.get("facility_id"))
    return {"message": "Registrasi pasien berhasil disetujui dan diaktifkan"}

@router.post("/admin/patients/{patient_id}/reject")
def reject_patient_registration(patient_id: str, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menolak registrasi pasien")
        
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    if role == "admin" and patient.get("facility_id") != current_user["facility_id"]:
        raise HTTPException(status_code=403, detail="Akses ditolak: pasien bukan bagian dari faskes Anda")
        
    success = db_update_patient(
        patient_id=patient_id,
        no_rm=patient["no_rm"],
        nik_encrypted=patient["nik_encrypted"],
        password_hash=None,
        name=patient["name"],
        date_of_birth=patient["date_of_birth"],
        verification_status="REJECTED",
        is_active=0
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menolak registrasi pasien")
        
    write_audit_log(current_user["user_id"], role, "KTP_REJECTED (Registration rejected)", patient_id, facility_id=patient.get("facility_id"))
    return {"message": "Registrasi pasien ditolak"}


@router.get("/superadmin/overview", response_model=SuperAdminOverviewResponse)
def get_superadmin_overview(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak: Hanya Super Admin yang dapat mengakses overview global")
        
    facs = db_get_all_facilities()
    total_facs = len(facs)
    active_facs = len([f for f in facs if f.get("status") == "active"])
    
    admins = db_get_all_admins()
    total_admins = len(admins)
    
    doctors = db_get_all_doctors()
    active_docs = len([d for d in doctors if d.get("is_active", 1) == 1])
    
    patients = db_get_all_patients()
    total_patients = len(patients)
    pending_verif = len([p for p in patients if p.get("verification_status") not in ["APPROVED", "REJECTED"]])
    
    # We can connect to SQLite directly to count sessions status and security logs
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE status = 'ongoing'")
    active_consultations = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM sessions WHERE status = 'completed'")
    completed_consultations = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM audit_logs WHERE action LIKE '%fail%' OR action LIKE '%lockout%' OR action LIKE '%unauthorized%'")
    security_events = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM audit_logs WHERE success = 0")
    system_errors = cursor.fetchone()[0]
    
    conn.close()
    
    # Sesi 7 hari terakhir (Sen..Min)
    from datetime import datetime as _dt, timedelta as _td
    today = _dt.utcnow().date()
    week_days = [today - _td(days=i) for i in range(6, -1, -1)]
    day_names = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    weekly = []
    
    all_sessions = db_get_all_sessions()
    for d in week_days:
        count = sum(1 for s in all_sessions if (s.get("started_at") or "")[:10] == d.isoformat())
        weekly.append({"day": day_names[d.weekday()], "date": d.isoformat(), "sessions": count})
    
    return SuperAdminOverviewResponse(
        total_facilities=total_facs,
        active_facilities=active_facs,
        total_admins=total_admins,
        active_doctors=active_docs,
        total_patients=total_patients,
        pending_verifications=pending_verif,
        active_consultations=active_consultations,
        completed_consultations=completed_consultations,
        security_events=security_events,
        system_errors=system_errors,
        weekly_sessions=weekly
    )

@router.get("/superadmin/facilities-overview", response_model=List[FacilityOverviewItem])
def get_superadmin_facilities_overview(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    facs = db_get_all_facilities()
    doctors = db_get_all_doctors()
    patients = db_get_all_patients()
    admins = db_get_all_admins()
    
    from app.db import get_db_connection
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT facility_id, COUNT(*) FROM sessions WHERE status='ongoing' GROUP BY facility_id")
    active_sessions_map = dict(cursor.fetchall())
    conn.close()
    
    res = []
    for f in facs:
        fac_id = f["id"]
        # Find admin assigned
        fac_admin = next((a for a in admins if a.get("facility_id") == fac_id), None)
        admin_name = fac_admin["name"] if fac_admin else "Belum ditugaskan"
        
        doc_count = len([d for d in doctors if d.get("facility_id") == fac_id])
        pat_count = len([p for p in patients if p.get("facility_id") == fac_id])
        
        active_sess = active_sessions_map.get(fac_id, 0)
        
        res.append(FacilityOverviewItem(
            id=fac_id,
            facility_code=f["facility_code"],
            name=f["name"],
            type=f["type"],
            address=f.get("address"),
            city=f.get("city"),
            province=f.get("province"),
            status=f.get("status", "active"),
            admin_name=admin_name,
            doctor_count=doc_count,
            patient_count=pat_count,
            active_sessions=active_sess
        ))
    return res

@router.post("/superadmin/facilities")
def create_facility_endpoint(req: FacilityCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    fac_id = str(uuid.uuid4())
    success = db_create_facility(
        fac_id=fac_id,
        code=req.facility_code,
        name=req.name,
        ftype=req.type,
        address=req.address,
        city=req.city,
        province=req.province,
        postal_code=req.postal_code,
        phone=req.phone,
        email=req.email,
        website=req.website,
        registration_number=req.registration_number
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat fasilitas")
        
    write_audit_log(current_user["user_id"], "super_admin", f"FACILITY_CREATED (Name: {req.name})", target_id=fac_id, target_type="facility")
    return {"message": "Fasilitas berhasil dibuat", "id": fac_id}

@router.put("/superadmin/facilities/{id}")
def update_facility_endpoint(id: str, req: FacilityCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    fac = db_get_facility_by_id(id)
    if not fac:
        raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        
    success = db_update_facility(
        fac_id=id,
        name=req.name,
        ftype=req.type,
        address=req.address,
        city=req.city,
        province=req.province,
        postal_code=req.postal_code,
        phone=req.phone,
        email=req.email,
        website=req.website,
        registration_number=req.registration_number,
        status="active"
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui fasilitas")
        
    write_audit_log(current_user["user_id"], "super_admin", f"FACILITY_UPDATED (Name: {req.name})", target_id=id, target_type="facility")
    return {"message": "Fasilitas berhasil diperbarui"}

@router.delete("/superadmin/facilities/{id}")
def delete_facility_endpoint(id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    if not db_get_facility_by_id(id):
        raise HTTPException(status_code=404, detail="Fasilitas tidak ditemukan")
        
    success = db_delete_facility(id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus fasilitas")
        
    write_audit_log(current_user["user_id"], "super_admin", f"FACILITY_DELETED (ID: {id})", target_id=id, target_type="facility")
    return {"message": "Fasilitas berhasil dihapus"}

@router.get("/superadmin/admins", response_model=List[AdminResponse])
def get_superadmin_admins(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    admins = db_get_all_admins()
    facs = db_get_all_facilities()
    facs_map = {f["id"]: f["name"] for f in facs}
    
    res = []
    for a in admins:
        # Skip super admin itself
        if a["email"] == "administrator":
            continue
        fac_name = facs_map.get(a.get("facility_id"), "Belum ditugaskan")
        res.append(AdminResponse(
            id=a["id"],
            name=a["name"],
            email=a["email"],
            username=a.get("username"),
            facility_id=a.get("facility_id"),
            facility_name=fac_name,
            phone=a.get("phone"),
            status=a.get("status", "active"),
            created_at=a.get("created_at", "")
        ))
    return res

@router.post("/superadmin/admins")
def create_facility_admin_endpoint(req: AdminCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    hashed = hash_password(req.password)
    admin_id = str(uuid.uuid4())
    success = db_create_facility_admin(
        admin_id=admin_id,
        name=req.name,
        email=req.email,
        username=req.username,
        password_hash=hashed,
        facility_id=req.facility_id,
        phone=req.phone
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat admin fasilitas")
        
    write_audit_log(current_user["user_id"], "super_admin", f"ADMIN_CREATED (Admin: {req.username} for fac: {req.facility_id})", target_id=admin_id, target_type="admin")
    return {"message": "Admin fasilitas berhasil dibuat", "id": admin_id}

@router.put("/superadmin/admins/{id}")
def update_facility_admin_endpoint(id: str, req: AdminUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    admin = db_get_admin_by_id(id)
    if not admin:
        raise HTTPException(status_code=404, detail="Admin tidak ditemukan")
        
    success = db_update_facility_admin(
        admin_id=id,
        name=req.name,
        email=req.email,
        username=req.username,
        phone=req.phone,
        status=req.status
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui admin")
        
    write_audit_log(current_user["user_id"], "super_admin", f"ADMIN_UPDATED (Admin: {req.username})", target_id=id, target_type="admin")
    return {"message": "Admin fasilitas berhasil diperbarui"}

@router.get("/superadmin/audit-logs")
def get_superadmin_audit_logs(
    facility_id: Optional[str] = None,
    actor_role: Optional[str] = None,
    event_type: Optional[str] = None,
    export_csv: bool = False,
    current_user: dict = Depends(get_current_user)
):
    role = current_user["role"]
    if role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    # If role is admin, automatically enforce facility filter
    if role == "admin":
        facility_id = current_user["facility_id"]
        logs = db_get_facility_audit_logs(facility_id)
    else:
        # Super admin can fetch all
        if facility_id:
            logs = db_get_facility_audit_logs(facility_id)
        else:
            logs = db_get_all_audit_logs()
            
    # Apply code-level filters for role and type
    if actor_role:
        logs = [l for l in logs if l.get("actor_role") == actor_role]
    if event_type:
        logs = [l for l in logs if l.get("event_type") == event_type]
        
    if export_csv:
        # Export as CSV download
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["ID", "Timestamp", "Actor ID", "Actor Role", "Action", "Target ID", "Facility ID", "Success"])
        for l in logs:
            writer.writerow([
                l.get("id"),
                l.get("created_at"),
                l.get("actor_id"),
                l.get("actor_role"),
                l.get("action"),
                l.get("target_id") or l.get("target_patient_id") or "",
                l.get("facility_id") or "",
                l.get("success")
            ])
        output.seek(0)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=audit_logs.csv"}
        )
        
    return logs


@router.post("/superadmin/incidents")
def create_incident_endpoint(req: IncidentCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    inc_id = str(uuid.uuid4())
    success = db_create_incident(
        inc_id=inc_id,
        title=req.title,
        desc=req.description,
        severity=req.severity,
        status="open"
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal membuat insiden keamanan")
        
    write_audit_log(current_user["user_id"], "super_admin", f"SECURITY_INCIDENT_CREATED (Inc: {inc_id})", target_id=inc_id, target_type="incident")
    return {"message": "Insiden keamanan berhasil dilaporkan", "id": inc_id}

@router.put("/superadmin/incidents/{id}")
def update_incident_endpoint(id: str, req: IncidentUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    success = db_update_incident(
        inc_id=id,
        status=req.status,
        details=req.resolution_details
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui insiden")
        
    write_audit_log(current_user["user_id"], "super_admin", f"SECURITY_INCIDENT_UPDATED (Inc: {id} status: {req.status})", target_id=id, target_type="incident")
    return {"message": "Insiden keamanan berhasil diperbarui"}

@router.get("/superadmin/incidents", response_model=List[IncidentResponse])
def get_incidents_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    incidents = db_get_all_incidents()
    return [IncidentResponse(**dict(i)) for i in incidents]

@router.post("/superadmin/backups")
def create_backup_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    import shutil
    import time
    
    timestamp = int(time.time())
    db_file = "backend/medsign.db"
    backup_dir = "backend/backups"
    os.makedirs(backup_dir, exist_ok=True)
    
    backup_name = f"medsign_backup_{timestamp}.db"
    backup_path = f"{backup_dir}/{backup_name}"
    
    try:
        shutil.copy2(db_file, backup_path)
        b_id = str(uuid.uuid4())
        db_create_backup_log(b_id, backup_name, backup_path, "success")
        
        write_audit_log(current_user["user_id"], "super_admin", f"SYSTEM_BACKUP_CREATED (File: {backup_name})", target_id=b_id, target_type="backup")
        return {"message": "Backup database berhasil diselesaikan", "backup_name": backup_name}
    except Exception as e:
        b_id = str(uuid.uuid4())
        db_create_backup_log(b_id, backup_name, backup_path, "failed")
        raise HTTPException(status_code=500, detail=f"Gagal melakukan backup database: {str(e)}")

@router.get("/superadmin/backups", response_model=List[BackupResponse])
def get_backup_logs_endpoint(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
    logs = db_get_all_backup_logs()
    return [BackupResponse(**dict(l)) for l in logs]


@router.get("/superadmin/settings")
def get_superadmin_settings(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    order = db_get_setting("homepage_section_order") or "dashboard_modul,mitra,reviews,instagram,articles,brand_pkm,video_tutorial"
    split_enabled = db_get_setting("split_screen_enabled") or "0"
    return {"homepage_section_order": order, "split_screen_enabled": split_enabled}

@router.post("/superadmin/settings")
def update_superadmin_settings(req: SystemSettingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")
        
    success = db_set_setting(req.key, req.value)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menyimpan konfigurasi")
        
    write_audit_log(current_user["user_id"], "super_admin", f"SYSTEM_SETTING_CHANGED ({req.key}={req.value})", target_id=req.key, target_type="setting")
    return {"message": "Konfigurasi sistem berhasil disimpan"}

@router.get("/homepage/layout")
def get_homepage_layout():
    # Public endpoint to read the section order
    raw = db_get_setting("homepage_section_order") or "mitra,reviews,instagram,articles,brand_pkm,video_tutorial"
    # dashboard_modul sudah dihapus dari homepage — bersihkan dari setting lama
    sections = [s.strip() for s in raw.split(",") if s.strip() and s.strip() != "dashboard_modul"]
    order = ",".join(sections) if sections else "mitra,reviews,instagram,articles,brand_pkm,video_tutorial"
    split_enabled = db_get_setting("split_screen_enabled") or "0"
    return {"homepage_section_order": order, "split_screen_enabled": split_enabled}


# ═══ DOKUMENTASI TIM (galeri About) — disimpan di system_settings ═══

class TeamGalleryItem(BaseModel):
    id: str
    title: str
    caption: Optional[str] = None
    image_url: str
    display_order: int = 0

class TeamGalleryListRequest(BaseModel):
    items: List[TeamGalleryItem]

@router.get("/about/team-gallery")
def get_team_gallery():
    raw = db_get_setting("team_gallery")
    if not raw:
        return {"items": []}
    try:
        data = json.loads(raw)
        return {"items": data if isinstance(data, list) else []}
    except Exception:
        return {"items": []}

@router.post("/admin/team-gallery")
def save_team_gallery(req: TeamGalleryListRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    items = [i.model_dump() for i in req.items]
    if not db_set_setting("team_gallery", json.dumps(items)):
        raise HTTPException(status_code=500, detail="Gagal menyimpan galeri dokumentasi tim")
    return {"message": "Dokumentasi tim berhasil disimpan", "items": items}


# ═══════════════════════════════════════════════════════════════════
#  VIDEO TUTORIAL CRUD
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/video-tutorials", response_model=List[VideoTutorialResponse])
def get_video_tutorials(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return [VideoTutorialResponse(**r) for r in db_get_all_video_tutorials()]

@router.post("/admin/video-tutorials", response_model=VideoTutorialResponse)
def create_video_tutorial(req: VideoTutorialCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    item_id = str(uuid.uuid4())
    ok = db_create_video_tutorial(item_id, req.title, req.description or "", req.video_url, req.thumbnail or "", req.duration or "", req.display_order or 0)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal membuat video tutorial")
    items = db_get_all_video_tutorials()
    created = next((i for i in items if i["id"] == item_id), None)
    return VideoTutorialResponse(**created) if created else VideoTutorialResponse(id=item_id, **req.model_dump(), is_active=1, display_order=req.display_order or 0, created_at="", updated_at="")

@router.put("/admin/video-tutorials/{item_id}")
def update_video_tutorial(item_id: str, req: VideoTutorialUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    ok = db_update_video_tutorial(item_id, req.title, req.description or "", req.video_url, req.thumbnail or "", req.duration or "", req.is_active or 1, req.display_order or 0)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal mengupdate video tutorial")
    return {"message": "Video tutorial berhasil diperbarui"}

@router.delete("/admin/video-tutorials/{item_id}")
def delete_video_tutorial(item_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    ok = db_delete_video_tutorial(item_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal menghapus video tutorial")
    return {"message": "Video tutorial berhasil dihapus"}


# ═══════════════════════════════════════════════════════════════════
#  BRAND PKM CRUD
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/brand-pkm", response_model=List[BrandPkmResponse])
def get_brand_pkm(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    return [BrandPkmResponse(**r) for r in db_get_all_brand_pkm()]

@router.post("/admin/brand-pkm", response_model=BrandPkmResponse)
def create_brand_pkm(req: BrandPkmCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    item_id = str(uuid.uuid4())
    ok = db_create_brand_pkm(item_id, req.name, req.logo or "", req.description or "", req.website_url or "", req.category or "program", req.display_order or 0)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal membuat brand PKM")
    items = db_get_all_brand_pkm()
    created = next((i for i in items if i["id"] == item_id), None)
    return BrandPkmResponse(**created) if created else BrandPkmResponse(id=item_id, **req.model_dump(), is_active=1, display_order=req.display_order or 0, created_at="", updated_at="")

@router.put("/admin/brand-pkm/{item_id}")
def update_brand_pkm(item_id: str, req: BrandPkmUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    ok = db_update_brand_pkm(item_id, req.name, req.logo or "", req.description or "", req.website_url or "", req.category or "program", req.is_active or 1, req.display_order or 0)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal mengupdate brand PKM")
    return {"message": "Brand PKM berhasil diperbarui"}

@router.delete("/admin/brand-pkm/{item_id}")
def delete_brand_pkm(item_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    ok = db_delete_brand_pkm(item_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal menghapus brand PKM")
    return {"message": "Brand PKM berhasil dihapus"}


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD MODUL CRUD (stored in system_settings as JSON)
# ═══════════════════════════════════════════════════════════════════

@router.get("/admin/dashboard-moduls")
def get_dashboard_moduls():
    return {"items": db_get_dashboard_moduls()}

@router.post("/admin/dashboard-moduls")
def save_dashboard_moduls(req: DashboardModulListRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Akses ditolak")
    items = [item.model_dump() for item in req.items]
    ok = db_save_dashboard_moduls(items)
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal menyimpan modul dashboard")
    return {"message": "Modul dashboard berhasil disimpan", "items": items}


# ═══════════════════════════════════════════════════════════════════
#  DASHBOARD ADMIN FASKES: OVERVIEW & LAPORAN (PDF/Excel/Word/CSV)
# ═══════════════════════════════════════════════════════════════════

def _scoped_facility_stats(current_user: dict) -> dict:
    """Kumpulkan statistik: admin = faskes sendiri, super_admin = global."""
    role = current_user["role"]
    fac_id = current_user.get("facility_id") if role == "admin" else None

    doctors = db_get_all_doctors()
    if fac_id:
        doctors = [d for d in doctors if d.get("facility_id") == fac_id]
    patients = db_get_all_patients()
    if fac_id:
        patients = [p for p in patients if p.get("facility_id") == fac_id]
    sessions = db_get_all_sessions()
    if fac_id:
        pid_set = {p["id"] for p in patients}
        sessions = [s for s in sessions if s.get("patient_id") in pid_set]

    facility_name = None
    if fac_id:
        fac = db_get_facility_by_id(fac_id)
        facility_name = fac.get("name") if fac else None
    elif role == "super_admin":
        facility_name = "Semua Fasilitas (Global)"

    # Sesi 7 hari terakhir (Sen..Min)
    from datetime import datetime as _dt, timedelta as _td
    today = _dt.utcnow().date()
    week_days = [today - _td(days=i) for i in range(6, -1, -1)]
    day_names = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"]
    weekly = []
    for d in week_days:
        count = sum(1 for s in sessions if (s.get("started_at") or "")[:10] == d.isoformat())
        weekly.append({"day": day_names[d.weekday()], "date": d.isoformat(), "sessions": count})

    return {
        "facility_id": fac_id,
        "facility_name": facility_name,
        "total_doctors": len(doctors),
        "active_doctors": len([d for d in doctors if d.get("is_active", 1)]),
        "total_patients": len(patients),
        "pending_verifications": len([p for p in patients if (p.get("verification_status") or "").upper() in ("PENDING", "IN_REVIEW")]),
        "approved_patients": len([p for p in patients if (p.get("verification_status") or "").upper() == "APPROVED"]),
        "active_consultations": len([s for s in sessions if s.get("status") == "ongoing"]),
        "completed_consultations": len([s for s in sessions if s.get("status") == "completed"]),
        "weekly_sessions": weekly,
        "_doctors": doctors,
        "_patients": patients,
        "_sessions": sessions,
    }

class AdminOverviewResponse(BaseModel):
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    total_doctors: int
    active_doctors: int
    total_patients: int
    pending_verifications: int
    approved_patients: int
    active_consultations: int
    completed_consultations: int
    weekly_sessions: List[dict]

@router.get("/admin/overview", response_model=AdminOverviewResponse)
def get_admin_overview(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses overview")
    stats = _scoped_facility_stats(current_user)
    stats.pop("_doctors"); stats.pop("_patients"); stats.pop("_sessions")
    return AdminOverviewResponse(**stats)

@router.get("/admin/report")
def download_admin_report(format: str = "pdf", current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengunduh laporan")

    fmt = (format or "pdf").lower()
    if fmt not in ("pdf", "xlsx", "xls", "doc", "csv"):
        raise HTTPException(status_code=400, detail="format harus pdf | xlsx | xls | doc | csv")

    from datetime import datetime as _dt
    stats = _scoped_facility_stats(current_user)
    now_str = _dt.now().strftime("%d/%m/%Y %H:%M")
    stamp = _dt.now().strftime("%Y%m%d_%H%M%S")
    title = "Laporan MedSign AI"
    subtitle = f"{stats['facility_name'] or 'Global'} — {now_str}"

    doctors = stats["_doctors"]; patients = stats["_patients"]; sessions = stats["_sessions"]
    summary_rows = [
        ("Total Dokter", stats["total_doctors"]),
        ("Dokter Aktif", stats["active_doctors"]),
        ("Total Pasien", stats["total_patients"]),
        ("Pasien Terverifikasi (APPROVED)", stats["approved_patients"]),
        ("Menunggu Verifikasi", stats["pending_verifications"]),
        ("Konsultasi Berlangsung", stats["active_consultations"]),
        ("Konsultasi Selesai", stats["completed_consultations"]),
    ]
    weekly = stats["weekly_sessions"]

    if fmt == "csv":
        import csv as _csv, io as _io
        buf = _io.StringIO()
        w = _csv.writer(buf)
        w.writerow([title, subtitle])
        w.writerow([])
        w.writerow(["Ringkasan", "Nilai"])
        for k, v in summary_rows:
            w.writerow([k, v])
        w.writerow([])
        w.writerow(["Hari", "Tanggal", "Jumlah Sesi"])
        for d in weekly:
            w.writerow([d["day"], d["date"], d["sessions"]])
        w.writerow([])
        w.writerow(["Daftar Pasien", "No. RM", "Status Verifikasi"])
        for p in patients:
            w.writerow([p.get("name"), p.get("no_rm"), p.get("verification_status")])
        buf.seek(0)
        return Response(
            content=buf.getvalue().encode("utf-8-sig"),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="laporan_medsign_{stamp}.csv"'}
        )

    if fmt in ("xls", "xlsx"):
        # SpreadsheetML — dibuka native oleh Excel
        import io as _io
        def esc(v): return str(v if v is not None else "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        rows_xml = []
        rows_xml.append('<Row><Cell ss:StyleID="h"><Data ss:Type="String">' + esc(title) + '</Data></Cell></Row>')
        rows_xml.append('<Row><Cell><Data ss:Type="String">' + esc(subtitle) + '</Data></Cell></Row>')
        rows_xml.append('<Row></Row>')
        rows_xml.append('<Row><Cell ss:StyleID="h"><Data ss:Type="String">Ringkasan</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Nilai</Data></Cell></Row>')
        for k, v in summary_rows:
            rows_xml.append(f'<Row><Cell><Data ss:Type="String">{esc(k)}</Data></Cell><Cell><Data ss:Type="Number">{int(v)}</Data></Cell></Row>')
        rows_xml.append('<Row></Row>')
        rows_xml.append('<Row><Cell ss:StyleID="h"><Data ss:Type="String">Hari</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Tanggal</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Sesi</Data></Cell></Row>')
        for d in weekly:
            rows_xml.append(f'<Row><Cell><Data ss:Type="String">{esc(d["day"])}</Data></Cell><Cell><Data ss:Type="String">{esc(d["date"])}</Data></Cell><Cell><Data ss:Type="Number">{d["sessions"]}</Data></Cell></Row>')
        rows_xml.append('<Row></Row>')
        rows_xml.append('<Row><Cell ss:StyleID="h"><Data ss:Type="String">Pasien</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">No. RM</Data></Cell><Cell ss:StyleID="h"><Data ss:Type="String">Verifikasi</Data></Cell></Row>')
        for p in patients:
            rows_xml.append(f'<Row><Cell><Data ss:Type="String">{esc(p.get("name"))}</Data></Cell><Cell><Data ss:Type="String">{esc(p.get("no_rm"))}</Data></Cell><Cell><Data ss:Type="String">{esc(p.get("verification_status"))}</Data></Cell></Row>')

        xml = f'''<?xml version="1.0"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles><Style ss:ID="h"><Font ss:Bold="1"/></Style></Styles>
 <Worksheet ss:Name="Laporan"><Table>{''.join(rows_xml)}</Table></Worksheet>
</Workbook>'''
        return Response(
            content=xml.encode("utf-8"),
            media_type="application/vnd.ms-excel",
            headers={"Content-Disposition": f'attachment; filename="laporan_medsign_{stamp}.xls"'}
        )

    if fmt == "doc":
        def esc(v): return str(v if v is not None else "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
        summary_html = "".join(f"<tr><td>{esc(k)}</td><td><b>{int(v)}</b></td></tr>" for k, v in summary_rows)
        weekly_html = "".join(f"<tr><td>{esc(d['day'])}</td><td>{esc(d['date'])}</td><td>{d['sessions']}</td></tr>" for d in weekly)
        patients_html = "".join(f"<tr><td>{esc(p.get('name'))}</td><td>{esc(p.get('no_rm'))}</td><td>{esc(p.get('verification_status'))}</td></tr>" for p in patients)
        html = f'''<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><title>{esc(title)}</title></head>
<body style="font-family:Calibri,Arial,sans-serif">
<h1 style="color:#053D67">{esc(title)}</h1>
<p>{esc(subtitle)}</p>
<h2>Ringkasan</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse">{summary_html}</table>
<h2>Sesi 7 Hari Terakhir</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse"><tr><th>Hari</th><th>Tanggal</th><th>Sesi</th></tr>{weekly_html}</table>
<h2>Daftar Pasien ({len(patients)})</h2><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse"><tr><th>Nama</th><th>No. RM</th><th>Verifikasi</th></tr>{patients_html}</table>
</body></html>'''
        return Response(
            content=html.encode("utf-8"),
            media_type="application/msword",
            headers={"Content-Disposition": f'attachment; filename="laporan_medsign_{stamp}.doc"'}
        )

    # PDF — reportlab
    import io as _io
    from reportlab.lib.pagesizes import A4
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle

    buf = _io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, title=title)
    styles = getSampleStyleSheet()
    els = [
        Paragraph(f"<b>{title}</b>", styles["Title"]),
        Paragraph(subtitle, styles["Normal"]),
        Spacer(1, 14),
        Paragraph("<b>Ringkasan</b>", styles["Heading2"]),
    ]
    summary_table = Table([[k, str(v)] for k, v in summary_rows], colWidths=[300, 150])
    summary_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0f2fe")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    els.append(summary_table)
    els += [Spacer(1, 12), Paragraph("<b>Sesi 7 Hari Terakhir</b>", styles["Heading2"])]
    weekly_table = Table([["Hari", "Tanggal", "Sesi"]] + [[d["day"], d["date"], str(d["sessions"])] for d in weekly], colWidths=[150, 150, 150])
    weekly_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0f2fe")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
    ]))
    els.append(weekly_table)
    els += [Spacer(1, 12), Paragraph(f"<b>Daftar Pasien ({len(patients)})</b>", styles["Heading2"])]
    patient_rows = [["Nama", "No. RM", "Verifikasi"]] + [
        [str(p.get("name") or ""), str(p.get("no_rm") or ""), str(p.get("verification_status") or "")] for p in patients[:200]
    ]
    patient_table = Table(patient_rows, colWidths=[220, 130, 100])
    patient_table.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#e0f2fe")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
    ]))
    els.append(patient_table)
    doc.build(els)
    pdf_bytes = buf.getvalue()
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="laporan_medsign_{stamp}.pdf"'}
    )


# ════════════════════════════════════════════════════════════════════════
#  MANAJEMEN GRANT FITUR ML / DATASET PER USER
#  Super Admin dapat memberikan/ mencabut akses fitur berikut ke Admin & Dokter:
#    - record_dataset    : Rekam Dataset
#    - balance_checker   : Balance Checker
#    - ai_augmentation   : AI Augmentation
#    - train_model       : Training Model
# ════════════════════════════════════════════════════════════════════════

GRANT_KEYS = ["record_dataset", "balance_checker", "ai_augmentation", "train_model"]
GRANT_LABELS = {
    "record_dataset": "Rekam Dataset",
    "balance_checker": "Balance Checker",
    "ai_augmentation": "AI Augmentation",
    "train_model": "Training Model",
}


class UserGrantsRequest(BaseModel):
    user_id: str
    grants: dict


def _default_grants_for_role(role: str) -> dict:
    # Super admin selalu mendapatkan seluruh fitur.
    if role == "super_admin":
        return {k: True for k in GRANT_KEYS}
    return {k: False for k in GRANT_KEYS}


def _load_grants_store() -> dict:
    raw = db_get_setting("user_feature_grants")
    if not raw:
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def _save_grants_store(store: dict) -> bool:
    return db_set_setting("user_feature_grants", json.dumps(store))


@router.get("/superadmin/grants")
def get_superadmin_grants(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")

    store = _load_grants_store()
    result = []

    def _role_of(acc: dict) -> str:
        if acc.get("email") == "administrator" or acc.get("username") == "administrator":
            return "super_admin"
        return "admin"

    for a in db_get_all_admins():
        role = _role_of(a)
        g = store.get(str(a["id"]), _default_grants_for_role(role))
        result.append({
            "user_id": str(a["id"]),
            "name": a.get("name"),
            "email": a.get("email"),
            "role": role,
            "facility_name": a.get("facility_name"),
            "grants": g,
        })

    for d in db_get_all_doctors():
        role = "doctor"
        g = store.get(str(d["id"]), _default_grants_for_role(role))
        result.append({
            "user_id": str(d["id"]),
            "name": d.get("name"),
            "email": d.get("email"),
            "role": role,
            "facility_name": d.get("facility_name"),
            "grants": g,
        })

    return {"users": result}


@router.post("/superadmin/grants")
def update_superadmin_grants(req: UserGrantsRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "super_admin":
        raise HTTPException(status_code=403, detail="Akses ditolak")

    clean = {k: bool(req.grants.get(k, False)) for k in GRANT_KEYS}
    store = _load_grants_store()
    store[str(req.user_id)] = clean
    if not _save_grants_store(store):
        raise HTTPException(status_code=500, detail="Gagal menyimpan grant fitur")

    write_audit_log(
        current_user["user_id"], "super_admin",
        f"USER_GRANTS_UPDATED (user={req.user_id})",
        target_id=req.user_id, target_type="user"
    )
    return {"message": "Grant fitur berhasil diperbarui", "grants": clean}


@router.get("/user/grants")
def get_user_grants(current_user: dict = Depends(get_current_user)):
    role = current_user.get("role")
    store = _load_grants_store()
    g = store.get(str(current_user["user_id"]), _default_grants_for_role(role))
    return {"user_id": current_user["user_id"], "role": role, "grants": g}


# ── Profil Mandiri Admin ──

class AdminMeResponse(BaseModel):
    id: str
    name: Optional[str] = None
    email: Optional[str] = None
    username: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    facility_id: Optional[str] = None
    facility_name: Optional[str] = None
    role: str = "admin"

class AdminMeUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None
    password: Optional[str] = None

def _admin_me_payload(admin: dict) -> AdminMeResponse:
    facility_name = None
    if admin.get("facility_id"):
        fac = db_get_facility_by_id(admin["facility_id"])
        if fac:
            facility_name = fac.get("name")
    role = "super_admin" if (admin.get("email") == "administrator" or admin.get("username") == "administrator") else "admin"
    return AdminMeResponse(
        id=str(admin.get("id")),
        name=admin.get("name"),
        email=admin.get("email"),
        username=admin.get("username"),
        phone=admin.get("phone"),
        profile_photo=admin.get("profile_photo"),
        facility_id=admin.get("facility_id"),
        facility_name=facility_name,
        role=role,
    )

@router.get("/admin/me", response_model=AdminMeResponse)
def get_admin_me(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses profil ini")
    admin = db_get_admin_by_id(current_user["user_id"])
    if not admin:
        raise HTTPException(status_code=404, detail="Profil admin tidak ditemukan")
    return _admin_me_payload(admin)

@router.put("/admin/me", response_model=AdminMeResponse)
def update_admin_me(req: AdminMeUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["admin", "super_admin"]:
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat memperbarui profil ini")
    admin = db_get_admin_by_id(current_user["user_id"])
    if not admin:
        raise HTTPException(status_code=404, detail="Profil admin tidak ditemukan")

    new_hash = hash_password(req.password) if req.password else None
    if req.password and len(req.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")

    ok = db_update_admin_profile(
        admin_id=str(admin["id"]),
        name=req.name if req.name is not None else None,
        phone=req.phone if req.phone is not None else None,
        profile_photo=req.profile_photo if req.profile_photo is not None else None,
        password_hash=new_hash,
    )
    if not ok:
        raise HTTPException(status_code=500, detail="Gagal memperbarui profil")

    if req.password:
        write_audit_log(current_user["user_id"], current_user["role"], "ADMIN_SELF_UPDATE (password changed)", event_type="SECURITY")
    else:
        write_audit_log(current_user["user_id"], current_user["role"], "ADMIN_SELF_UPDATE (profile)")

    return _admin_me_payload(db_get_admin_by_id(current_user["user_id"]))
