import uuid
import secrets
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from datetime import datetime
from app.db import (
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

class DoctorUpdateRequest(BaseModel):
    name: str
    email: str
    password: Optional[str] = None
    specialization: Optional[str] = None

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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat melihat seluruh daftar pasien")
    rows = db_get_all_patients()
    res = []
    for r in rows:
        res.append(PatientResponse(
            id=r["id"],
            no_rm=r["no_rm"],
            nik=decrypt_nik(r["nik_encrypted"]), # Unmasked for admin!
            name=r["name"],
            date_of_birth=r["date_of_birth"],
            created_by=r["created_by"],
            created_at=r["created_at"]
        ))
    return res

@router.post("/admin/patients", response_model=PatientCreateResponse)
def register_patient(request: PatientCreateRequest, current_user: dict = Depends(get_current_user)):
    role = current_user["role"]
    if role not in ["admin", "doctor"]:
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
    
    success = db_create_patient(
        patient_id=patient_id,
        no_rm=request.no_rm,
        nik_encrypted=encrypted_nik,
        password_hash=hashed_pass,
        name=request.name,
        date_of_birth=request.date_of_birth,
        created_by=current_user["user_id"]
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mendaftarkan pasien")
        
    if role == "doctor":
        link_id = str(uuid.uuid4())
        db_create_doctor_patient_link(link_id, current_user["user_id"], patient_id)
        
    write_audit_log(current_user["user_id"], role, "POST /api/v1/admin/patients", patient_id)
    
    return PatientCreateResponse(
        id=patient_id,
        no_rm=request.no_rm,
        name=request.name,
        temporary_password=temp_pass,
        message="Pasien berhasil didaftarkan"
    )

@router.put("/admin/patients/{patient_id}")
def update_patient_endpoint(patient_id: str, request: PatientUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit data pasien")
        
    patient = db_get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    hashed_pass = hash_password(request.password) if request.password else None
    encrypted_nik = encrypt_nik(request.nik)
    
    success = db_update_patient(
        patient_id=patient_id,
        no_rm=request.no_rm,
        nik_encrypted=encrypted_nik,
        password_hash=hashed_pass,
        name=request.name,
        date_of_birth=request.date_of_birth
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui data pasien")
        
    write_audit_log(current_user["user_id"], "admin", "PUT /api/v1/admin/patients", patient_id)
    return {"message": "Data pasien berhasil diperbarui"}

@router.delete("/admin/patients/{patient_id}")
def delete_patient_endpoint(patient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data pasien")
        
    if not db_get_patient_by_id(patient_id):
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
    success = db_delete_patient(patient_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus data pasien")
        
    write_audit_log(current_user["user_id"], "admin", "DELETE /api/v1/admin/patients", patient_id)
    return {"message": "Data pasien berhasil dihapus"}


# 2. Doctors CRUD

@router.get("/admin/doctors", response_model=List[DoctorResponse])
def get_all_doctors_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses daftar dokter")
    rows = db_get_all_doctors()
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mendaftarkan dokter baru")
        
    hashed = hash_password(request.password)
    doc_id = str(uuid.uuid4())
    
    success = db_create_doctor(
        doc_id=doc_id,
        name=request.name,
        email=request.email,
        password_hash=hashed,
        specialization=request.specialization
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit data dokter")
        
    if not db_get_doctor_by_id(doctor_id):
        raise HTTPException(status_code=404, detail="Dokter tidak ditemukan")
        
    hashed = hash_password(request.password) if request.password else None
    success = db_update_doctor(doctor_id, request.name, request.email, hashed, request.specialization)
    
    if not success:
        raise HTTPException(status_code=500, detail="Gagal memperbarui data dokter")
        
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/doctors/{doctor_id}")
    return {"message": "Data dokter berhasil diperbarui"}

@router.delete("/admin/doctors/{doctor_id}")
def delete_doctor_endpoint(doctor_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data dokter")
        
    if not db_get_doctor_by_id(doctor_id):
        raise HTTPException(status_code=404, detail="Dokter tidak ditemukan")
        
    success = db_delete_doctor(doctor_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus data dokter")
        
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/doctors/{doctor_id}")
    return {"message": "Data dokter berhasil dihapus"}


# 3. Doctor-Patient Assignments

@router.get("/admin/doctor-patient-assignments", response_model=List[AssignmentResponse])
def get_assignments_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengakses daftar hubungan dokter-pasien")
    rows = db_get_all_assignments()
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengelola hubungan dokter-pasien")
        
    if not db_get_doctor_by_id(request.doctor_id):
        raise HTTPException(status_code=400, detail="ID Dokter tidak valid")
        
    if not db_get_patient_by_id(request.patient_id):
        raise HTTPException(status_code=400, detail="ID Pasien tidak valid")
        
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
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mereset password pasien")
        
    if not db_get_patient_by_id(id):
        raise HTTPException(status_code=404, detail="Pasien tidak ditemukan")
        
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

class ArticleUpdateRequest(BaseModel):
    title: str
    content: str
    slug: str
    cover_image: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = "Edukasi BISINDO"
    status: Optional[str] = "published"

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


# ?? ENDPOINTS ??

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
            published_at=r["published_at"],
            created_at=r["created_at"],
            updated_at=r["updated_at"]
        ) for r in rows
    ]

@router.post("/admin/articles", response_model=ArticleResponse)
def create_article_endpoint(request: ArticleCreateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
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
        request.status
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
        published_at=now if request.status == "published" else None,
        created_at=now,
        updated_at=now
    )

@router.put("/admin/articles/{article_id}")
def update_article_endpoint(article_id: str, request: ArticleUpdateRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
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
        request.status
    )
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit artikel")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/articles/{article_id}")
    return {"message": "Artikel berhasil diperbarui"}

@router.delete("/admin/articles/{article_id}")
def delete_article_endpoint(article_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit review")
    success = db_update_review(review_id, request.name, request.role, request.rating, request.content, request.avatar)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit review")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/reviews/{review_id}")
    return {"message": "Review berhasil diperbarui"}

@router.delete("/admin/reviews/{review_id}")
def delete_review_endpoint(review_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit feed instagram")
    success = db_update_instagram_post(post_id, request.post_url, request.thumbnail_image, request.caption_short, request.display_order, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit feed instagram")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/instagram-posts/{post_id}")
    return {"message": "Feed post instagram berhasil diperbarui"}

@router.delete("/admin/instagram-posts/{post_id}")
def delete_instagram_post_endpoint(post_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
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
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat mengedit data mitra")
    success = db_update_mitra(mitra_id, request.name, request.logo, request.website_url, request.category, request.display_order, request.is_active)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal mengedit data mitra")
    write_audit_log(current_user["user_id"], "admin", f"PUT /api/v1/admin/mitra/{mitra_id}")
    return {"message": "Data mitra berhasil diperbarui"}

@router.delete("/admin/mitra/{mitra_id}")
def delete_mitra_endpoint(mitra_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Hanya admin yang dapat menghapus data mitra")
    success = db_delete_mitra(mitra_id)
    if not success:
        raise HTTPException(status_code=500, detail="Gagal menghapus data mitra")
    write_audit_log(current_user["user_id"], "admin", f"DELETE /api/v1/admin/mitra/{mitra_id}")
    return {"message": "Data mitra berhasil dihapus"}
