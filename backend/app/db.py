import sqlite3
import os
import hashlib
import hmac
import uuid
import secrets
import json
import httpx
from datetime import datetime, timedelta

from typing import Optional, List, Dict, Any
from pathlib import Path

# Load .env file manually (standard library only)
_env_path = Path(__file__).parent.parent / ".env"
if _env_path.exists():
    try:
        for line in _env_path.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                os.environ.setdefault(k.strip(), v.strip())
    except Exception as e:
        print("Manual env load failed:", e)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "medsign.db")
ENCRYPTION_KEY = os.getenv("MEDSIGN_ENCRYPTION_KEY", "medsign_secure_nik_key_2026")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SECRET_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY") or ""

def test_supabase_connection(url: str, key: str) -> bool:
    if not url or not key:
        return False
    import requests
    try:
        test_url = f"{url.rstrip('/')}/rest/v1/doctors?limit=1"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}"
        }
        res = requests.get(test_url, headers=headers, timeout=1.5)
        return res.status_code in (200, 404, 201)
    except Exception as e:
        print(f"[DB] Supabase connection check failed: {e}")
        return False

# Determine if we should connect to production Supabase or fall back to local SQLite
USE_SUPABASE = False
if SUPABASE_URL and SUPABASE_KEY and "supabase" in SUPABASE_URL:
    print("[DB] Testing connection to Supabase Cloud...")
    if test_supabase_connection(SUPABASE_URL, SUPABASE_KEY):
        USE_SUPABASE = True
        print("[DB] Supabase Cloud connected successfully. Using Supabase database.")
    else:
        print("[DB] Supabase connection failed or offline. Falling back to local SQLite database!")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str) -> str:
    salt = os.urandom(16)
    key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
    return salt.hex() + ":" + key.hex()

def verify_password(password: str, hashed: str) -> bool:
    try:
        salt_hex, key_hex = hashed.split(":")
        salt = bytes.fromhex(salt_hex)
        key = bytes.fromhex(key_hex)
        new_key = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000)
        return hmac.compare_digest(key, new_key)
    except Exception:
        return False

def encrypt_nik(nik: str) -> str:
    iv = os.urandom(16)
    plain_bytes = nik.encode('utf-8')
    cipher_bytes = bytearray()
    
    block_idx = 0
    while len(cipher_bytes) < len(plain_bytes):
        msg = iv + block_idx.to_bytes(4, 'big')
        h = hmac.new(ENCRYPTION_KEY.encode('utf-8'), msg, hashlib.sha256).digest()
        cipher_bytes.extend(h)
        block_idx += 1
        
    encrypted = bytes(p ^ k for p, k in zip(plain_bytes, cipher_bytes))
    return iv.hex() + ":" + encrypted.hex()

def decrypt_nik(encrypted_nik: str) -> str:
    try:
        iv_hex, encrypted_hex = encrypted_nik.split(":")
        iv = bytes.fromhex(iv_hex)
        encrypted_bytes = bytes.fromhex(encrypted_hex)
        
        cipher_bytes = bytearray()
        block_idx = 0
        while len(cipher_bytes) < len(encrypted_bytes):
            msg = iv + block_idx.to_bytes(4, 'big')
            h = hmac.new(ENCRYPTION_KEY.encode('utf-8'), msg, hashlib.sha256).digest()
            cipher_bytes.extend(h)
            block_idx += 1
            
        decrypted = bytes(c ^ k for c, k in zip(encrypted_bytes, cipher_bytes))
        return decrypted.decode('utf-8')
    except Exception:
        return ""

def mask_nik(nik: str) -> str:
    if len(nik) < 8:
        return nik
    return nik[:4] + "*" * (len(nik) - 8) + nik[-4:]

# ── SUPABASE CLIENT CONFIGURATION ──
def get_supabase_headers():
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

# ── DATABASE WRAPPER API ──

def db_get_doctor_by_email(email: str) -> Optional[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctors?email=eq.{email}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except Exception as e:
            print("Supabase error:", e)
        return None
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM doctors WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def db_get_admin_by_email(email: str) -> Optional[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/admins?email=eq.{email}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except Exception as e:
            print("Supabase error:", e)
        return None
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM admins WHERE email = ? OR username = ?", (email, email))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def db_get_all_patients() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def db_get_patient_by_id(patient_id: str) -> Optional[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients?id=eq.{patient_id}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except Exception as e:
            print("Supabase error:", e)
        return None
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients WHERE id = ?", (patient_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def db_get_patient_by_no_rm(no_rm: str) -> Optional[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients?no_rm=eq.{no_rm}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except Exception as e:
            print("Supabase error:", e)
        return None
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM patients WHERE no_rm = ?", (no_rm,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def db_update_patient_password(patient_id: str, hashed_pass: str, must_change: int) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients?id=eq.{patient_id}"
            body = {"password_hash": hashed_pass, "must_change_password": bool(must_change)}
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE patients SET password_hash = ?, must_change_password = ? WHERE id = ?", (hashed_pass, must_change, patient_id))
        conn.commit()
        conn.close()
        return True

def db_check_doctor_patient_link(doctor_id: str, patient_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctor_patient?doctor_id=eq.{doctor_id}&patient_id=eq.{patient_id}"
            r = httpx.get(url, headers=get_supabase_headers())
            return r.status_code == 200 and len(r.json()) > 0
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT 1 FROM doctor_patient WHERE doctor_id = ? AND patient_id = ?", (doctor_id, patient_id))
        row = cursor.fetchone()
        conn.close()
        return bool(row)

def db_get_doctor_patients(doctor_id: str) -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctor_patient?doctor_id=eq.{doctor_id}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code != 200 or not r.json():
                return []
            patient_ids = [row["patient_id"] for row in r.json()]
            
            ids_str = f"({','.join(patient_ids)})"
            url_pats = f"{SUPABASE_URL}/rest/v1/patients?id=in.{ids_str}"
            r_pats = httpx.get(url_pats, headers=get_supabase_headers())
            if r_pats.status_code == 200:
                return r_pats.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT p.id, p.no_rm, p.nik_encrypted, p.password_hash, p.name, p.date_of_birth, p.created_by, p.created_at, p.must_change_password 
            FROM patients p
            JOIN doctor_patient dp ON p.id = dp.patient_id
            WHERE dp.doctor_id = ?
        """, (doctor_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def db_create_patient(patient_id: str, no_rm: str, nik_encrypted: str, password_hash: str, name: str, date_of_birth: str, created_by: str, facility_id: str = None, gender: str = None, address: str = None, phone: str = None, email: str = None, emergency_contact: str = None, verification_status: str = 'PENDING', face_verification_status: str = 'PENDING', ktp_verification_status: str = 'PENDING', is_active: int = 0) -> bool:
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO patients (id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, must_change_password, facility_id, gender, address, phone, email, emergency_contact, verification_status, face_verification_status, ktp_verification_status, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (patient_id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, facility_id, gender, address, phone, email, emergency_contact, verification_status, face_verification_status, ktp_verification_status, is_active)
        )
        conn.commit()
        conn.close()
        return True
def db_create_doctor_patient_link(link_id: str, doctor_id: str, patient_id: str) -> bool:
    assigned_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctor_patient"
            body = {
                "id": link_id,
                "doctor_id": doctor_id,
                "patient_id": patient_id,
                "assigned_at": assigned_at
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO doctor_patient (id, doctor_id, patient_id, assigned_at) VALUES (?, ?, ?, ?)",
            (link_id, doctor_id, patient_id, assigned_at)
        )
        conn.commit()
        conn.close()
        return True

def db_get_session_by_id(session_id: str) -> Optional[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/sessions?id=eq.{session_id}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except Exception as e:
            print("Supabase error:", e)
        return None
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, doctor_id, model_version, status, started_at, ended_at, summary FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def db_create_session(session_id: str, patient_id: str, doctor_id: str, model_version: str, started_at: str) -> bool:
    if USE_SUPABASE:
        return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT facility_id FROM doctors WHERE id = ?", (doctor_id,))
        row = cursor.fetchone()
        facility_id = row[0] if (row and row[0]) else "fac_default"
        cursor.execute(
            "INSERT INTO sessions (id, patient_id, doctor_id, model_version, status, started_at, facility_id) VALUES (?, ?, ?, ?, 'ongoing', ?, ?)",
            (session_id, patient_id, doctor_id, model_version, started_at, facility_id)
        )
        conn.commit()
        conn.close()
        return True

def db_end_session(session_id: str, ended_at: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/sessions?id=eq.{session_id}"
            body = {"status": "completed", "ended_at": ended_at}
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE sessions SET status = 'completed', ended_at = ? WHERE id = ?", (ended_at, session_id))
        conn.commit()
        conn.close()
        return True

def db_create_session_log(log_id: str, session_id: str, role: str, text: str, confidence: Optional[float], timestamp: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/session_logs"
            body = {
                "id": log_id,
                "session_id": session_id,
                "role": role,
                "text": text,
                "confidence": confidence,
                "timestamp": timestamp
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO session_logs (id, session_id, role, text, confidence, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
            (log_id, session_id, role, text, confidence, timestamp)
        )
        conn.commit()
        conn.close()
        return True

def db_get_session_logs(session_id: str) -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/session_logs?session_id=eq.{session_id}&order=timestamp.asc"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, session_id, role, text, confidence, timestamp FROM session_logs WHERE session_id = ? ORDER BY timestamp ASC", (session_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def write_audit_log(
    actor_id: str,
    actor_role: str,
    action: str,
    target_patient_id: Optional[str] = None,
    facility_id: Optional[str] = None,
    event_type: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_id: Optional[str] = None,
    success: int = 1,
    failure_reason: Optional[str] = None,
    metadata: Optional[str] = None
):
    log_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        return
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO audit_logs (id, actor_id, actor_role, action, target_patient_id, facility_id, event_type, target_type, target_id, ip_address, user_agent, request_id, success, failure_reason, metadata, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (log_id, actor_id, actor_role, action, target_patient_id, facility_id, event_type, target_type, target_id, ip_address, user_agent, request_id, success, failure_reason, metadata, created_at)
        )
        conn.commit()
        conn.close()
def db_create_doctor(doc_id: str, name: str, email: str, password_hash: str, specialization: str = None, facility_id: str = None, phone: str = None, image: str = None, medical_license: str = None, department: str = None, status: str = 'active', availability: str = 'available', is_active: int = 1) -> bool:
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            """INSERT INTO doctors (id, name, email, password_hash, specialization, created_at, facility_id, phone, image, medical_license, department, status, availability, is_active)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (doc_id, name, email, password_hash, specialization, created_at, facility_id, phone, image, medical_license, department, status, availability, is_active)
        )
        conn.commit()
        conn.close()
        return True
def db_create_admin(admin_id: str, name: str, email: str, password_hash: str) -> bool:
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/admins"
            body = {
                "id": admin_id,
                "name": name,
                "email": email,
                "password_hash": password_hash,
                "created_at": created_at
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO admins (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (admin_id, name, email, password_hash, created_at)
        )
        conn.commit()
        conn.close()
        return True

def db_clear_tables():
    if USE_SUPABASE:
        try:
            for table in ["session_logs", "sessions", "doctor_patient", "patients", "doctors", "admins", "audit_logs"]:
                httpx.delete(f"{SUPABASE_URL}/rest/v1/{table}?id=not.is.null", headers=get_supabase_headers())
        except Exception as e:
            print("Supabase clear error:", e)
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM audit_logs")
        cursor.execute("DELETE FROM session_logs")
        cursor.execute("DELETE FROM sessions")
        cursor.execute("DELETE FROM doctor_patient")
        cursor.execute("DELETE FROM patients")
        cursor.execute("DELETE FROM doctors")
        cursor.execute("DELETE FROM admins")
        conn.commit()
        conn.close()

def db_get_all_sessions() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, doctor_id, model_version, status, started_at, ended_at, summary FROM sessions")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("db_get_all_sessions error:", e)
        return []

def db_get_patient_sessions(patient_id: str) -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/sessions?patient_id=eq.{patient_id}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, patient_id, doctor_id, model_version, status, started_at, ended_at, summary FROM sessions WHERE patient_id = ?", (patient_id,))
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def db_get_doctor_by_id(doctor_id: str) -> Optional[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctors?id=eq.{doctor_id}"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200 and r.json():
                return r.json()[0]
        except Exception as e:
            print("Supabase error:", e)
        return None
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM doctors WHERE id = ?", (doctor_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def init_db():
    if USE_SUPABASE:
        return
        
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create facilities table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS facilities (
        id TEXT PRIMARY KEY,
        facility_code TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        address TEXT,
        city TEXT,
        province TEXT,
        postal_code TEXT,
        phone TEXT,
        email TEXT,
        website TEXT,
        registration_number TEXT,
        logo TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    # Create consents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS consents (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        consent_type TEXT NOT NULL,
        purpose TEXT,
        version TEXT,
        accepted_at TEXT,
        withdrawn_at TEXT,
        ip_address TEXT,
        user_agent TEXT,
        consent_text_hash TEXT,
        status TEXT DEFAULT 'accepted',
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
    """)

    # Create medications table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medications (
        id TEXT PRIMARY KEY,
        medical_record_id TEXT,
        drug_name TEXT NOT NULL,
        dosage TEXT NOT NULL,
        frequency TEXT NOT NULL,
        duration TEXT NOT NULL,
        instructions TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (medical_record_id) REFERENCES medical_records(id) ON DELETE SET NULL
    )
    """)

    # Create clinical_timeline table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS clinical_timeline (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        event_title TEXT NOT NULL,
        event_description TEXT,
        event_date TEXT NOT NULL,
        reference_id TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
    """)

    # Create break_glass_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS break_glass_logs (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        reason TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'expired', 'revoked')),
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
    """)

    # Create security_incidents table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS security_incidents (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
        status TEXT DEFAULT 'open' CHECK(status IN ('open', 'investigating', 'resolved')),
        assigned_investigator TEXT,
        resolution_details TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
    )
    """)

    # Create backup_logs table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS backup_logs (
        id TEXT PRIMARY KEY,
        backup_name TEXT NOT NULL,
        backup_path TEXT NOT NULL,
        status TEXT DEFAULT 'success' CHECK(status IN ('success', 'failed')),
        integrity_checked INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)

    # Create data_exports table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS data_exports (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        requested_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        file_path TEXT NOT NULL,
        downloaded_at TEXT,
        status TEXT DEFAULT 'available' CHECK(status IN ('available', 'expired', 'downloaded')),
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
    """)

    # Create system_settings table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)

    # Seed default homepage section order
    cursor.execute("SELECT value FROM system_settings WHERE key = 'homepage_section_order'")
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO system_settings (key, value)
            VALUES ('homepage_section_order', 'dashboard_modul,mitra,reviews,instagram,articles,brand_pkm,video_tutorial')
        """)

    # Seed split screen mode setting
    cursor.execute("SELECT value FROM system_settings WHERE key = 'split_screen_enabled'")
    if not cursor.fetchone():
        cursor.execute("""
            INSERT INTO system_settings (key, value)
            VALUES ('split_screen_enabled', '0')
        """)

    # Create medical_records table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS medical_records (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        patient_id TEXT NOT NULL,
        doctor_id TEXT NOT NULL,
        facility_id TEXT NOT NULL,
        raw_conversation TEXT,
        doctor_note TEXT,
        medical_assessment TEXT,
        diagnosis TEXT,
        recommendation TEXT,
        prescription TEXT,
        follow_up TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE SET NULL,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        specialization TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        no_rm TEXT UNIQUE NOT NULL,
        nik_encrypted TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        name TEXT NOT NULL,
        date_of_birth TEXT NOT NULL,
        created_by TEXT,
        created_at TEXT NOT NULL,
        must_change_password INTEGER DEFAULT 1
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS doctor_patient (
        id TEXT PRIMARY KEY,
        doctor_id TEXT NOT NULL,
        patient_id TEXT NOT NULL,
        assigned_at TEXT NOT NULL,
        UNIQUE(doctor_id, patient_id),
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        patient_id TEXT NOT NULL,
        doctor_id TEXT,
        model_version TEXT NOT NULL,
        status TEXT DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'completed')),
        started_at TEXT NOT NULL,
        ended_at TEXT,
        summary TEXT,
        FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
        FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS session_logs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        text TEXT NOT NULL,
        confidence REAL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
    )
    """)

    # Migration: add missing columns to existing sessions table
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN summary TEXT")
    except Exception:
        pass  # column already exists
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN doctor_id TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN model_version TEXT NOT NULL DEFAULT 'unknown'")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN status TEXT DEFAULT 'ongoing' CHECK(status IN ('ongoing', 'completed'))")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN ended_at TEXT")
    except Exception:
        pass
    try:
        cursor.execute("ALTER TABLE sessions ADD COLUMN started_at TEXT NOT NULL DEFAULT ''")
    except Exception:
        pass

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        cover_image TEXT,
        content TEXT NOT NULL,
        excerpt TEXT,
        category TEXT,
        author TEXT,
        status TEXT DEFAULT 'draft',
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS instagram_posts (
        id TEXT PRIMARY KEY,
        post_url TEXT UNIQUE NOT NULL,
        thumbnail_image TEXT NOT NULL,
        caption_short TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        added_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        rating REAL CHECK(rating >= 0 AND rating <= 5),
        content TEXT NOT NULL,
        avatar TEXT,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mitra (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo TEXT NOT NULL,
        website_url TEXT,
        category TEXT,
        display_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS video_tutorial (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        video_url TEXT NOT NULL,
        thumbnail TEXT,
        duration TEXT,
        is_active INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS brand_pkm (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        logo TEXT,
        description TEXT,
        website_url TEXT,
        category TEXT DEFAULT 'program',
        is_active INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS dashboard_modul (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        icon TEXT,
        link TEXT,
        color TEXT DEFAULT 'sky',
        is_active INTEGER DEFAULT 1,
        display_order INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    def add_col(table, col, col_type):
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
        except sqlite3.OperationalError:
            pass

    add_col('admins', 'facility_id', 'TEXT')
    add_col('admins', 'username', 'TEXT')
    add_col('admins', 'phone', 'TEXT')
    add_col('admins', 'profile_photo', 'TEXT')
    add_col('admins', 'status', 'TEXT DEFAULT "active"')
    add_col('admins', 'last_login', 'TEXT')

    add_col('doctors', 'facility_id', 'TEXT')
    add_col('doctors', 'phone', 'TEXT')
    add_col('doctors', 'image', 'TEXT')
    add_col('doctors', 'medical_license', 'TEXT')
    add_col('doctors', 'specialty', 'TEXT')
    add_col('doctors', 'department', 'TEXT')
    add_col('doctors', 'status', 'TEXT DEFAULT "active"')
    add_col('doctors', 'availability', 'TEXT DEFAULT "available"')
    add_col('doctors', 'last_active_time', 'TEXT')
    add_col('doctors', 'is_active', 'INTEGER DEFAULT 1')

    add_col('patients', 'facility_id', 'TEXT')
    add_col('patients', 'gender', 'TEXT')
    add_col('patients', 'address', 'TEXT')
    add_col('patients', 'phone', 'TEXT')
    add_col('patients', 'email', 'TEXT')
    add_col('patients', 'emergency_contact', 'TEXT')
    add_col('patients', 'verification_status', 'TEXT DEFAULT "PENDING"')
    add_col('patients', 'face_verification_status', 'TEXT DEFAULT "PENDING"')
    add_col('patients', 'ktp_verification_status', 'TEXT DEFAULT "PENDING"')
    add_col('patients', 'is_active', 'INTEGER DEFAULT 0')
    add_col('patients', 'accessibility_intro_seen', 'TEXT DEFAULT "NOT_SEEN"')

    add_col('sessions', 'facility_id', 'TEXT')
    add_col('articles', 'ref_url', 'TEXT')

    # Add columns to medical_records
    add_col('medical_records', 'version', 'INTEGER DEFAULT 1')
    add_col('medical_records', 'parent_record_id', 'TEXT')
    add_col('medical_records', 'is_latest', 'INTEGER DEFAULT 1')
    add_col('medical_records', 'signature_state', 'TEXT DEFAULT "unsigned"')
    add_col('medical_records', 'signature_data', 'TEXT')
    add_col('medical_records', 'signature_date', 'TEXT')
    add_col('medical_records', 'ai_drafted', 'INTEGER DEFAULT 0')
    add_col('medical_records', 'ai_provenance', 'TEXT')

    cursor.execute("DROP TABLE IF EXISTS audit_logs")
    cursor.execute("""
    CREATE TABLE audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL CHECK(actor_role IN ('super_admin', 'admin', 'doctor', 'patient')),
        action TEXT NOT NULL,
        target_patient_id TEXT,
        facility_id TEXT,
        event_type TEXT,
        target_type TEXT,
        target_id TEXT,
        ip_address TEXT,
        user_agent TEXT,
        request_id TEXT,
        success INTEGER DEFAULT 1,
        failure_reason TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (target_patient_id) REFERENCES patients(id) ON DELETE SET NULL,
        FOREIGN KEY (facility_id) REFERENCES facilities(id) ON DELETE SET NULL
    )
    """)

    passwords = {
        "administrator": "TahutekumEnak123!@#",
        "adminrsi": "rsipalingtop",
        "bitapargazen@gmail.com": "bitaganteng123",
        "390572816403": "glennperkasa123"
    }
    
    cred_path = "credentials.txt"
    if os.path.exists(cred_path):
        try:
            with open(cred_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            for line in lines:
                if ":" in line:
                    parts = line.split(":")
                    if len(parts) >= 2:
                        key = parts[0].strip().replace("- Email", "").replace("- Username", "").replace("- Patient ID/NIK", "").replace("- Facility", "").strip()
                        val = parts[1].strip()
                        if "(" in val:
                            val = val.split("(")[0].strip()
                        cleaned_key = key.split()[-1] if key.split() else ""
                        if cleaned_key:
                            passwords[cleaned_key] = val
        except Exception as e:
            pass

    # Ensure generated passwords exist
    keys = ["admin_sentosa", "admin_medika", "dr_budi@rsi.com", "dr_siti@sentosa.com", "dr_agus@sentosa.com", "dr_dewi@medika.com", "dr_eko@medika.com", "3171011212850001", "3171022304900002", "3171031405920003", "3171044506880004", "3273011208910005", "3273022509930006", "3273031010940007", "3578011111950008", "3578022202960009", "3578031303970010", "3171050501980011", "3171061509970012", "3171072510960013"]
    for k in keys:
        if k not in passwords:
            passwords[k] = secrets.token_urlsafe(8)

    # 1. Seed facilities
    facilities_data = [
        ("fac_rsi", "RSI-001", "Rumah Sakit Islam Jakarta (RSI)", "Hospital", "Cempaka Putih", "Jakarta Pusat", "DKI Jakarta"),
        ("fac_sentosa", "CS-002", "Klinik Sentosa Malang", "Clinic", "Jl. Sentosa No. 10", "Malang", "Jawa Timur"),
        ("fac_medika", "MC-003", "Medika Center Surabaya", "Medical Center", "Jl. Medika No. 5", "Surabaya", "Jawa Timur")
    ]
    for fac in facilities_data:
        cursor.execute("SELECT id FROM facilities WHERE id = ?", (fac[0],))
        if not cursor.fetchone():
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO facilities (id, facility_code, name, type, address, city, province, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (fac[0], fac[1], fac[2], fac[3], fac[4], fac[5], fac[6], now, now))

    # 2. Seed Super Admin
    cursor.execute("SELECT id FROM admins WHERE email = 'administrator' OR username = 'administrator'")
    if not cursor.fetchone():
        hashed = hash_password(passwords["administrator"])
        cursor.execute("""
            INSERT INTO admins (id, name, email, username, password_hash, created_at, status)
            VALUES (?, 'Super Administrator', 'administrator', 'administrator', ?, ?, 'active')
        """, (str(uuid.uuid4()), hashed, datetime.utcnow().isoformat()))

    # 3. Seed Admins
    admins_to_seed = [
        ("adminrsi", "System Admin RSI", "adminrsi@medsign.com", "fac_rsi", "adminrsi"),
        ("admin_sentosa", "System Admin Sentosa", "admin_sentosa@medsign.com", "fac_sentosa", "admin_sentosa"),
        ("admin_medika", "System Admin Medika", "admin_medika@medsign.com", "fac_medika", "admin_medika")
    ]
    for username, name, email, fac_id, pwd_key in admins_to_seed:
        cursor.execute("SELECT id FROM admins WHERE username = ? OR email = ?", (username, email))
        if not cursor.fetchone():
            hashed = hash_password(passwords[pwd_key])
            cursor.execute("""
                INSERT INTO admins (id, name, email, username, password_hash, facility_id, created_at, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
            """, (str(uuid.uuid4()), name, email, username, hashed, fac_id, datetime.utcnow().isoformat()))

    # 4. Seed Doctors
    docs_to_seed = [
        ("bitapargazen@gmail.com", "Dr. Bita Pargazen", "Umum", "fac_rsi", "bitapargazen@gmail.com"),
        ("dr_budi@rsi.com", "Dr. Budi Santoso", "Spesialis THT", "fac_rsi", "dr_budi@rsi.com"),
        ("dr_siti@sentosa.com", "Dr. Siti Aminah", "Umum", "fac_sentosa", "dr_siti@sentosa.com"),
        ("dr_agus@sentosa.com", "Dr. Agus Wijaya", "Spesialis Anak", "fac_sentosa", "dr_agus@sentosa.com"),
        ("dr_dewi@medika.com", "Dr. Dewi Sartika", "Umum", "fac_medika", "dr_dewi@medika.com"),
        ("dr_eko@medika.com", "Dr. Eko Prasetyo", "Spesialis Syaraf", "fac_medika", "dr_eko@medika.com")
    ]
    for email, name, spec, fac_id, pwd_key in docs_to_seed:
        cursor.execute("SELECT id FROM doctors WHERE email = ?", (email,))
        if not cursor.fetchone():
            hashed = hash_password(passwords[pwd_key])
            cursor.execute("""
                INSERT INTO doctors (id, name, email, password_hash, specialization, facility_id, created_at, is_active, status, specialty)
                VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'active', ?)
            """, (str(uuid.uuid4()), name, email, hashed, spec, fac_id, datetime.utcnow().isoformat(), spec))

    # 5. Seed Patients
    patients_to_seed = [
        ("390572816403", "Glenn Perkasa", "1990-01-01", "fac_rsi", "390572816403", "APPROVED"),
        ("3171011212850001", "Andi Saputra", "1985-12-12", "fac_rsi", "3171011212850001", "APPROVED"),
        ("3171022304900002", "Budi Wijaya", "1990-04-23", "fac_rsi", "3171022304900002", "PENDING"),
        ("3171031405920003", "Citra Lestari", "1992-05-14", "fac_rsi", "3171031405920003", "APPROVED"),
        ("3171044506880004", "Dian Pratama", "1988-06-05", "fac_rsi", "3171044506880004", "IN_REVIEW"),
        ("3273011208910005", "Eka Rahmawati", "1991-08-12", "fac_sentosa", "3273011208910005", "APPROVED"),
        ("3273022509930006", "Fajar Nugroho", "1993-09-25", "fac_sentosa", "3273022509930006", "APPROVED"),
        ("3273031010940007", "Gita Permata", "1994-10-10", "fac_sentosa", "3273031010940007", "PENDING"),
        ("3578011111950008", "Hadi Kusuma", "1995-11-11", "fac_medika", "3578011111950008", "APPROVED"),
        ("3578022202960009", "Indah Cahyani", "1996-02-22", "fac_medika", "3578022202960009", "APPROVED"),
        ("3578031303970010", "Joko Susilo", "1997-03-13", "fac_medika", "3578031303970010", "PENDING")
    ]
    for nik, name, dob, fac_id, pwd_key, status in patients_to_seed:
        exists = False
        cursor.execute("SELECT id, nik_encrypted FROM patients")
        for row in cursor.fetchall():
            if decrypt_nik(row["nik_encrypted"]) == nik:
                exists = True
                break
        if not exists:
            hashed = hash_password(passwords[pwd_key])
            encrypted_nik = encrypt_nik(nik)
            cursor.execute("""
                INSERT INTO patients (id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_at, facility_id, verification_status, is_active, must_change_password)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            """, (str(uuid.uuid4()), "RM" + nik, encrypted_nik, hashed, name, dob, datetime.utcnow().isoformat(), fac_id, status, 1 if status == "APPROVED" else 0))

    # 5b. Seed 3 pasien khusus ter-link ke Dr. Bita Pargazen (bitapargazen@gmail.com)
    cursor.execute("SELECT id FROM doctors WHERE email = 'bitapargazen@gmail.com'")
    bita_row = cursor.fetchone()
    if bita_row:
        bita_doctor_id = bita_row["id"]
        bita_patients = [
            ("3171050501980011", "Sari Wulandari", "1998-05-05", "Perempuan"),
            ("3171061509970012", "Rizky Ramadhan", "1997-06-15", "Laki-laki"),
            ("3171072510960013", "Nadia Putri", "1996-07-25", "Perempuan"),
        ]
        for nik, name, dob, gender in bita_patients:
            # Cari pasien berdasarkan NIK (idempoten)
            cursor.execute("SELECT id, nik_encrypted FROM patients")
            patient_id = None
            for row in cursor.fetchall():
                try:
                    if decrypt_nik(row["nik_encrypted"]) == nik:
                        patient_id = row["id"]
                        break
                except Exception:
                    continue
            if not patient_id:
                patient_id = str(uuid.uuid4())
                hashed = hash_password(passwords[nik])
                cursor.execute("""
                    INSERT INTO patients (id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_at, facility_id, gender, verification_status, is_active, must_change_password)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'APPROVED', 1, 0)
                """, (patient_id, "RM" + nik, encrypt_nik(nik), hashed, name, dob, datetime.utcnow().isoformat(), "fac_rsi", gender))
            # Pastikan link dokter-pasien ada
            cursor.execute("SELECT id FROM doctor_patient WHERE doctor_id = ? AND patient_id = ?", (bita_doctor_id, patient_id))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO doctor_patient (id, doctor_id, patient_id, assigned_at) VALUES (?, ?, ?, ?)",
                    (str(uuid.uuid4()), bita_doctor_id, patient_id, datetime.utcnow().isoformat())
                )

    # 6. Seed Articles, Reviews, Mitra, IG posts
    cursor.execute("SELECT COUNT(*) FROM articles")
    if cursor.fetchone()[0] == 0:
        articles_data = [
            ("art_1", "MedSign Hadir sebagai Sistem Pendeteksi Bahasa Isyarat Indonesia untuk Mendukung Komunikasi Inklusif antara Pasien Tunarungu dan Tenaga Medis", "medsign-sistem-pendeteksi-bisindo", "/Homepage/ezgif-frame-008.png", "Upaya menciptakan layanan kesehatan yang inklusif terus dikembangkan melalui pemanfaatan teknologi. Salah satunya dilakukan oleh tim mahasiswa Universitas Ma Chung melalui MedSign, sebuah sistem pendeteksi Bahasa Isyarat Indonesia (BISINDO) berbasis computer vision dan deep learning yang dirancang untuk mendukung komunikasi antara tenaga medis dan pasien tunarungu. Proyek ini merupakan wujud nyata dari proposal mereka yang berhasil meraih pendanaan Program Kreativitas Mahasiswa bidang Karsa Cipta (PKM-KC) pada 22 Mei 2026. Artikel rujukan berita: https://machung.ac.id/berita/medsign-sistem-pendeteksi-bisindo-mahasiswa-ma-chung/", "MedSign Hadir sebagai Sistem Pendeteksi Bahasa Isyarat Indonesia untuk Mendukung Komunikasi Inklusif.", "Edukasi BISINDO", "Universitas Ma Chung"),
            ("art_2", "MedSign Manfaatkan Teknologi Pendeteksian BISINDO untuk Membantu Menjembatani Komunikasi antara Pasien Tuli dan Tenaga Medis", "medsign-manfaatkan-teknologi", "/Homepage/ezgif-frame-015.png", "Sejumlah mahasiswa Universitas Ma Chung mengembangkan MedSign, sebuah sistem berbasis computer vision dan deep learning yang dirancang untuk membantu komunikasi antara tenaga medis dan pasien tunarungu melalui deteksi Bahasa Isyarat Indonesia (BISINDO). Artikel rujukan link: https://www.berita7terkini.com/2026/08/medsign-inovasi-mahasiswa-universitas.html?m=1", "MedSign Manfaatkan Teknologi Pendeteksian BISINDO untuk Membantu Menjembatani Komunikasi.", "Berita Utama", "Berita7Terkini"),
            ("art_3", "Media Tionghoa Menyoroti MedSign, Inovasi Mahasiswa Ma Chung bagi Komunikasi Pasien Tuli dan Tenaga Medis", "media-tionghoa-menyoroti-medsign", "/Homepage/ezgif-frame-030.png", "瑪中大学(Universitas Ma Chung)数名学生成功研发Med- Sign系统,该系统基于计算机视觉与深 度学习技术,旨在通过识别印尼手语 (BISINDO),协助医护人员与听障患者之间的沟通交流。 Rujukan dokumen lengkap: https://drive.google.com/file/d/1HQbjowaVY4-EqMrFOriWFQjvEeYgCr6z/view?usp=sharing", "Media Tionghoa Menyoroti MedSign bagi Komunikasi Pasien Tuli.", "Internasional", "Media Tionghoa"),
            ("art_4", "MedSign, Inovasi Mahasiswa Ma Chung Malang untuk Mengurangi Hambatan Komunikasi Pasien Tuli di Fasilitas Kesehatan", "medsign-inovasi-mahasiswa-ma-chung", "/Homepage/ezgif-frame-049.png", "Pelayanan kesehatan yang setara tidak hanya berkaitan dengan ketersediaan fasilitas dan tenaga medis, tetapi juga akses komunikasi yang dapat dipahami oleh setiap pasien. Bagi penyandang tunarungu, keterbatasan komunikasi masih menjadi salah satu tantangan dalam menyampaikan keluhan maupun memahami informasi yang diberikan tenaga medis. Artikel rujukan Radar Malang Jawapos: https://radarmalang.jawapos.com/pendidikan/2608120025/medsign-dorong-akses-komunikasi-yang-setara-bagi-pasien-tunarungu-di-layanan-kesehatan-oleh-tim-medsign-universitas-ma-chung?page=1#goog_rewarded", "MedSign, Inovasi Mahasiswa Ma Chung Malang untuk Mengurangi Hambatan Komunikasi Pasien Tuli.", "Kesehatan", "Radar Malang Jawapos")
        ]
        for item in articles_data:
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO articles (id, title, slug, cover_image, content, excerpt, category, author, status, published_at, created_at, updated_at, ref_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)
            """, (item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], now, now, now, item[8]))

    cursor.execute("SELECT COUNT(*) FROM instagram_posts")
    if cursor.fetchone()[0] == 0:
        ig_data = [
            ("ig_1", "https://www.instagram.com/p/C-medsign1", "/Homepage/ezgif-frame-001.png", "MedSign AI: Menjembatani komunikasi dokter-pasien tuli. #PKMKC #MaChung", 1)
        ]
        for item in ig_data:
            cursor.execute("""
                INSERT INTO instagram_posts (id, post_url, thumbnail_image, caption_short, display_order, is_active, added_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            """, (item[0], item[1], item[2], item[3], item[4], datetime.utcnow().isoformat()))

    # 6b. Seed 3 post Instagram terbaru @medsign.pkmkc (idempoten per post_url)
    ig_new_posts = [
        ("ig_new_1", "https://www.instagram.com/p/Dccj5D-ksGL/", "https://www.instagram.com/p/Dccj5D-ksGL/media/?size=l", "Konten terbaru MedSign AI — edukasi & dokumentasi kegiatan PKM-KC.", 1),
        ("ig_new_2", "https://www.instagram.com/p/DccjpxGEuzm/", "https://www.instagram.com/p/DccjpxGEuzm/media/?size=l", "Konten terbaru MedSign AI — edukasi & dokumentasi kegiatan PKM-KC.", 2),
        ("ig_new_3", "https://www.instagram.com/p/DcQqPOHEqKw/", "https://www.instagram.com/p/DcQqPOHEqKw/media/?size=l", "Konten terbaru MedSign AI — edukasi & dokumentasi kegiatan PKM-KC.", 3),
        ("ig_new_4", "https://www.instagram.com/p/Dclp_ZCpiOd/", "https://www.instagram.com/p/Dclp_ZCpiOd/media/?size=l", "Mulai Konsultasi Dengan Teman Tuli.", 4),
    ]
    for item in ig_new_posts:
        cursor.execute("SELECT id FROM instagram_posts WHERE post_url = ?", (item[1],))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO instagram_posts (id, post_url, thumbnail_image, caption_short, display_order, is_active, added_at)
                VALUES (?, ?, ?, ?, ?, 1, ?)
            """, (item[0], item[1], item[2], item[3], item[4], datetime.utcnow().isoformat()))

    # 6c. Seed new Medium articles (idempotent per slug)
    medium_articles = [
        ("medium_1", "AI System Developed by Indonesian Students Aims to Bridge Communication Between Deaf Patients and Healthcare Professionals", "ai-system-developed-by-indonesian-students", "/Homepage/ezgif-frame-008.png", "An artificial intelligence system developed by Indonesian students from Universitas Ma Chung aims to bridge communication between deaf patients and healthcare professionals using computer vision and deep learning to translate Indonesian Sign Language (BISINDO). Read more on Medium.", "AI System Developed by Indonesian Students Aims to Bridge Communication.", "Internasional", "MedSign AI", "https://medium.com/@aimedsign/ai-system-developed-by-indonesian-students-aims-to-bridge-communication-between-deaf-patients-and-a2e10d192858"),
        ("medium_2", "Before It Ever Reaches a Patient, This Sign Language Website Had to Prove Itself First", "before-it-ever-reaches-a-patient", "/Homepage/ezgif-frame-015.png", "Before implementing a medical sign language translation system in a hospital setting, the software must go through rigorous validation, training, and testing to prove its accuracy and reliability for clinical use. Read the full article on Medium.", "Before It Ever Reaches a Patient, This Sign Language Website Had to Prove Itself.", "Edukasi BISINDO", "MedSign AI", "https://medium.com/@aimedsign/before-it-ever-reaches-a-patient-this-sign-language-website-had-to-prove-itself-first-ba200e1cfae0"),
        ("medium_3", "Inside a Malang Hospital: Students are Teaching AI to Bridge a Communication Gap", "inside-a-malang-hospital", "/Homepage/ezgif-frame-030.png", "Inside a hospital in Malang, students from Universitas Ma Chung are working closely with medical professionals to train an AI model on clinical gestures to eliminate communication barriers for Deaf patients. Read more on Medium.", "Inside a Malang Hospital: Students are Teaching AI to Bridge a Communication Gap.", "Berita Utama", "MedSign AI", "https://medium.com/@aimedsign/inside-a-malang-hospital-students-are-teaching-ai-to-bridge-a-communication-gap-ec60e028c4ba")
    ]
    for item in medium_articles:
        cursor.execute("SELECT id FROM articles WHERE slug = ?", (item[2],))
        if not cursor.fetchone():
            now = datetime.utcnow().isoformat()
            cursor.execute("""
                INSERT INTO articles (id, title, slug, cover_image, content, excerpt, category, author, status, published_at, created_at, updated_at, ref_url)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?, ?)
            """, (item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], now, now, now, item[8]))

    cursor.execute("SELECT COUNT(*) FROM reviews")
    if cursor.fetchone()[0] == 0:
        reviews_data = [
            ("rev_1", "Dr. Clara", "Dokter Umum RSUD", 5.0, "Sangat membantu saat melayani pasien tuli.", "/assets/loren_2.jpg")
        ]
        for item in reviews_data:
            cursor.execute("""
                INSERT INTO reviews (id, name, role, rating, content, avatar, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (item[0], item[1], item[2], item[3], item[4], item[5], datetime.utcnow().isoformat()))

    cursor.execute("SELECT COUNT(*) FROM mitra")
    if cursor.fetchone()[0] == 0:
        mitra_data = [
            ("mit_1", "Kemdikbudristek", "/assets/logo-kemdikbudristek.png", "https://kemdikbud.go.id", "Kementerian", 1)
        ]
        for item in mitra_data:
            cursor.execute("""
                INSERT INTO mitra (id, name, logo, website_url, category, display_order, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, ?, 1, ?)
            """, (item[0], item[1], item[2], item[3], item[4], item[5], datetime.utcnow().isoformat()))

    conn.commit()
    conn.close()

    try:
        with open("credentials.txt", "w", encoding="utf-8") as f:
            f.write("""========================================
MEDSIGN DEMO CREDENTIALS
========================================

SUPER ADMIN
Username: administrator
Password: TahutekumEnak123!@#

FACILITY ADMINS:
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Username: adminrsi
  Password: rsipalingtop
- Facility: Klinik Sentosa Malang
  Username: admin_sentosa
  Password: {admin_sentosa_pwd}
- Facility: Medika Center Surabaya
  Username: admin_medika
  Password: {admin_medika_pwd}

DOCTORS:
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Email: bitapargazen@gmail.com
  Password: bitaganteng123
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Email: dr_budi@rsi.com
  Password: {dr_budi_pwd}
- Facility: Klinik Sentosa Malang
  Email: dr_siti@sentosa.com
  Password: {dr_siti_pwd}
- Facility: Klinik Sentosa Malang
  Email: dr_agus@sentosa.com
  Password: {dr_agus_pwd}
- Facility: Medika Center Surabaya
  Email: dr_dewi@medika.com
  Password: {dr_dewi_pwd}
- Facility: Medika Center Surabaya
  Email: dr_eko@medika.com
  Password: {dr_eko_pwd}

PATIENTS:
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Patient ID/NIK: 390572816403 (Glenn Perkasa)
  Password: glennperkasa123
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Patient ID/NIK: 3171011212850001 (Andi Saputra)
  Password: {p_andi_pwd}
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Patient ID/NIK: 3171022304900002 (Budi Wijaya - PENDING)
  Password: {p_budi_pwd}
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Patient ID/NIK: 3171031405920003 (Citra Lestari)
  Password: {p_citra_pwd}
- Facility: Rumah Sakit Islam Jakarta (RSI)
  Patient ID/NIK: 3171044506880004 (Dian Pratama - IN_REVIEW)
  Password: {p_dian_pwd}
- Facility: Klinik Sentosa Malang
  Patient ID/NIK: 3273011208910005 (Eka Rahmawati)
  Password: {p_eka_pwd}
- Facility: Klinik Sentosa Malang
  Patient ID/NIK: 3273022509930006 (Fajar Nugroho)
  Password: {p_fajar_pwd}
- Facility: Klinik Sentosa Malang
  Patient ID/NIK: 3273031010940007 (Gita Permata - PENDING)
  Password: {p_gita_pwd}
- Facility: Medika Center Surabaya
  Patient ID/NIK: 3578011111950008 (Hadi Kusuma)
  Password: {p_hadi_pwd}
- Facility: Medika Center Surabaya
  Patient ID/NIK: 3578022202960009 (Indah Cahyani)
  Password: {p_indah_pwd}
- Facility: Medika Center Surabaya
  Patient ID/NIK: 3578031303970010 (Joko Susilo - PENDING)
  Password: {p_joko_pwd}
""".format(
                admin_sentosa_pwd=passwords.get("admin_sentosa", "admin_sentosa"),
                admin_medika_pwd=passwords.get("admin_medika", "admin_medika"),
                dr_budi_pwd=passwords.get("dr_budi@rsi.com", "dr_budi"),
                dr_siti_pwd=passwords.get("dr_siti@sentosa.com", "dr_siti"),
                dr_agus_pwd=passwords.get("dr_agus@sentosa.com", "dr_agus"),
                dr_dewi_pwd=passwords.get("dr_dewi@medika.com", "dr_dewi"),
                dr_eko_pwd=passwords.get("dr_eko@medika.com", "dr_eko"),
                p_andi_pwd=passwords.get("3171011212850001", "andi"),
                p_budi_pwd=passwords.get("3171022304900002", "budi"),
                p_citra_pwd=passwords.get("3171031405920003", "citra"),
                p_dian_pwd=passwords.get("3171044506880004", "dian"),
                p_eka_pwd=passwords.get("3273011208910005", "eka"),
                p_fajar_pwd=passwords.get("3273022509930006", "fajar"),
                p_gita_pwd=passwords.get("3273031010940007", "gita"),
                p_hadi_pwd=passwords.get("3578011111950008", "hadi"),
                p_indah_pwd=passwords.get("3578022202960009", "indah"),
                p_joko_pwd=passwords.get("3578031303970010", "joko")
            ))
    except Exception as e:
        pass



# ?? ADDITIONAL CRUD WRAPPERS ??

def db_get_all_doctors() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctors"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM doctors")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def db_update_doctor(doctor_id: str, name: str, email: str, password_hash: str, specialization: str, facility_id: str = None, phone: str = None, image: str = None, medical_license: str = None, department: str = None, status: str = None, availability: str = None, is_active: int = None) -> bool:
    if USE_SUPABASE:
        return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        if password_hash:
            cursor.execute("""
                UPDATE doctors SET name = ?, email = ?, password_hash = ?, specialization = ?,
                facility_id = COALESCE(?, facility_id), phone = COALESCE(?, phone), image = COALESCE(?, image),
                medical_license = COALESCE(?, medical_license), department = COALESCE(?, department),
                status = COALESCE(?, status), availability = COALESCE(?, availability), is_active = COALESCE(?, is_active)
                WHERE id = ?
            """, (name, email, password_hash, specialization, facility_id, phone, image, medical_license, department, status, availability, is_active, doctor_id))
        else:
            cursor.execute("""
                UPDATE doctors SET name = ?, email = ?, specialization = ?,
                facility_id = COALESCE(?, facility_id), phone = COALESCE(?, phone), image = COALESCE(?, image),
                medical_license = COALESCE(?, medical_license), department = COALESCE(?, department),
                status = COALESCE(?, status), availability = COALESCE(?, availability), is_active = COALESCE(?, is_active)
                WHERE id = ?
            """, (name, email, specialization, facility_id, phone, image, medical_license, department, status, availability, is_active, doctor_id))
        conn.commit()
        conn.close()
        return True

def db_update_admin_profile(admin_id: str, name: str = None, phone: str = None, profile_photo: str = None, password_hash: str = None) -> bool:
    """Update profil mandiri admin (hanya field yang diberikan, sisanya tetap)."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE admins SET
                name = COALESCE(?, name),
                phone = COALESCE(?, phone),
                profile_photo = COALESCE(?, profile_photo),
                password_hash = COALESCE(?, password_hash)
            WHERE id = ?
        """, (name, phone, profile_photo, password_hash, admin_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_admin_profile error:", e)
        return False

def db_delete_doctor(doctor_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctors?id=eq.{doctor_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM doctors WHERE id = ?", (doctor_id,))
        conn.commit()
        conn.close()
        return True

def db_update_patient(patient_id: str, no_rm: str, nik_encrypted: str, password_hash: str, name: str, date_of_birth: str, facility_id: str = None, gender: str = None, address: str = None, phone: str = None, email: str = None, emergency_contact: str = None, verification_status: str = None, face_verification_status: str = None, ktp_verification_status: str = None, is_active: int = None) -> bool:
    if USE_SUPABASE:
        return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        if password_hash:
            cursor.execute("""
                UPDATE patients SET no_rm = ?, nik_encrypted = ?, password_hash = ?, name = ?, date_of_birth = ?,
                facility_id = COALESCE(?, facility_id), gender = COALESCE(?, gender), address = COALESCE(?, address),
                phone = COALESCE(?, phone), email = COALESCE(?, email), emergency_contact = COALESCE(?, emergency_contact),
                verification_status = COALESCE(?, verification_status), face_verification_status = COALESCE(?, face_verification_status),
                ktp_verification_status = COALESCE(?, ktp_verification_status), is_active = COALESCE(?, is_active)
                WHERE id = ?
            """, (no_rm, nik_encrypted, password_hash, name, date_of_birth, facility_id, gender, address, phone, email, emergency_contact, verification_status, face_verification_status, ktp_verification_status, is_active, patient_id))
        else:
            cursor.execute("""
                UPDATE patients SET no_rm = ?, nik_encrypted = ?, name = ?, date_of_birth = ?,
                facility_id = COALESCE(?, facility_id), gender = COALESCE(?, gender), address = COALESCE(?, address),
                phone = COALESCE(?, phone), email = COALESCE(?, email), emergency_contact = COALESCE(?, emergency_contact),
                verification_status = COALESCE(?, verification_status), face_verification_status = COALESCE(?, face_verification_status),
                ktp_verification_status = COALESCE(?, ktp_verification_status), is_active = COALESCE(?, is_active)
                WHERE id = ?
            """, (no_rm, nik_encrypted, name, date_of_birth, facility_id, gender, address, phone, email, emergency_contact, verification_status, face_verification_status, ktp_verification_status, is_active, patient_id))
        conn.commit()
        conn.close()
        return True
def db_delete_patient(patient_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients?id=eq.{patient_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM patients WHERE id = ?", (patient_id,))
        conn.commit()
        conn.close()
        return True

def db_get_all_assignments() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctor_patient"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, doctor_id, patient_id, assigned_at FROM doctor_patient")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def db_delete_doctor_patient_link(doctor_id: str, patient_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctor_patient?doctor_id=eq.{doctor_id}&patient_id=eq.{patient_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM doctor_patient WHERE doctor_id = ? AND patient_id = ?", (doctor_id, patient_id))
        conn.commit()
        conn.close()
        return True

def db_save_session_summary(session_id: str, summary: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/sessions?id=eq.{session_id}"
            body = {"summary": summary}
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE sessions SET summary = ? WHERE id = ?", (summary, session_id))
        conn.commit()
        conn.close()
        return True


# ── SESSION CRUD: DELETE SESSION, DELETE LOG, UPDATE LOG, UPDATE SOAP ──

def db_delete_session(session_id: str) -> bool:
    if USE_SUPABASE:
        try:
            # Hapus logs dulu (cascade manual kalau RLS tidak auto-cascade)
            httpx.delete(f"{SUPABASE_URL}/rest/v1/session_logs?session_id=eq.{session_id}", headers=get_supabase_headers())
            r = httpx.delete(f"{SUPABASE_URL}/rest/v1/sessions?id=eq.{session_id}", headers=get_supabase_headers())
            return r.status_code in (200, 204)
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM session_logs WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        return True


def db_delete_session_log(log_id: str) -> bool:
    if USE_SUPABASE:
        try:
            r = httpx.delete(f"{SUPABASE_URL}/rest/v1/session_logs?id=eq.{log_id}", headers=get_supabase_headers())
            return r.status_code in (200, 204)
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM session_logs WHERE id = ?", (log_id,))
        conn.commit()
        conn.close()
        return True


def db_update_session_log(log_id: str, text: str) -> bool:
    if USE_SUPABASE:
        try:
            r = httpx.patch(
                f"{SUPABASE_URL}/rest/v1/session_logs?id=eq.{log_id}",
                headers=get_supabase_headers(),
                json={"text": text}
            )
            return r.status_code in (200, 204)
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE session_logs SET text = ? WHERE id = ?", (text, log_id))
        conn.commit()
        conn.close()
        return True


def db_update_session_soap(session_id: str, summary: str) -> bool:
    """Alias eksplisit untuk update SOAP/summary sesi yang sudah selesai."""
    return db_save_session_summary(session_id, summary)


# ── END SESSION CRUD ──


# ?? ARTICLES CRUD FOR LOCAL DB (COMPREHENSIVE) ??

def db_get_all_articles() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/articles?order=created_at.desc"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, slug, cover_image, content, excerpt, category, author, status, published_at, created_at, updated_at FROM articles ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_article(article_id: str, title: str, slug: str, cover_image: str, content: str, excerpt: str, category: str, author: str, status: str = "published", ref_url: str = None) -> bool:
    try:
        now = datetime.utcnow().isoformat()
        pub_at = now if status == "published" else None
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/articles"
            body = {
                "id": article_id,
                "title": title,
                "slug": slug,
                "cover_image": cover_image,
                "content": content,
                "excerpt": excerpt,
                "category": category,
                "author": author,
                "status": status,
                "ref_url": ref_url,
                "published_at": pub_at,
                "created_at": now,
                "updated_at": now
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO articles (id, title, slug, cover_image, content, excerpt, category, author, status, published_at, created_at, updated_at, ref_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (article_id, title, slug, cover_image, content, excerpt, category, author, status, pub_at, now, now, ref_url)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_article error:", e)
        return False

def db_update_article(article_id: str, title: str, slug: str, cover_image: str, content: str, excerpt: str, category: str, author: str, status: str, ref_url: str = None) -> bool:
    try:
        now = datetime.utcnow().isoformat()
        if USE_SUPABASE:
            url_check = f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}"
            r_check = httpx.get(url_check, headers=get_supabase_headers())
            pub_at = None
            if r_check.status_code == 200 and r_check.json():
                row = r_check.json()[0]
                pub_at = row.get("published_at")
                if row.get("status") != "published" and status == "published":
                    pub_at = now
            url = f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}"
            body = {
                "title": title,
                "slug": slug,
                "cover_image": cover_image,
                "content": content,
                "excerpt": excerpt,
                "category": category,
                "author": author,
                "status": status,
                "published_at": pub_at,
                "updated_at": now
            }
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
            
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Check current published status
        cursor.execute("SELECT status, published_at FROM articles WHERE id = ?", (article_id,))
        row = cursor.fetchone()
        pub_at = row["published_at"] if row else None
        if row and row["status"] != "published" and status == "published":
            pub_at = now

        cursor.execute(
            "UPDATE articles SET title = ?, slug = ?, cover_image = ?, content = ?, excerpt = ?, category = ?, author = ?, status = ?, published_at = ?, updated_at = ?, ref_url = ? WHERE id = ?",
            (title, slug, cover_image, content, excerpt, category, author, status, pub_at, now, ref_url, article_id)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_article error:", e)
        return False

def db_delete_article(article_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/articles?id=eq.{article_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM articles WHERE id = ?", (article_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_article error:", e)
        return False


# ?? INSTAGRAM POSTS CRUD FOR LOCAL DB ??

def db_get_all_instagram_posts() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/instagram_posts?order=display_order.asc,added_at.desc"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, post_url, thumbnail_image, caption_short, display_order, is_active, added_at FROM instagram_posts ORDER BY display_order ASC, added_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_instagram_post(post_id: str, post_url: str, thumbnail_image: str, caption_short: str, display_order: int, is_active: int) -> bool:
    try:
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/instagram_posts"
            body = {
                "id": post_id,
                "post_url": post_url,
                "thumbnail_image": thumbnail_image,
                "caption_short": caption_short,
                "display_order": display_order,
                "is_active": is_active,
                "added_at": datetime.utcnow().isoformat()
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO instagram_posts (id, post_url, thumbnail_image, caption_short, display_order, is_active, added_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (post_id, post_url, thumbnail_image, caption_short, display_order, is_active, datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_instagram_post error:", e)
        return False

def db_update_instagram_post(post_id: str, post_url: str, thumbnail_image: str, caption_short: str, display_order: int, is_active: int) -> bool:
    try:
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/instagram_posts?id=eq.{post_id}"
            body = {
                "post_url": post_url,
                "thumbnail_image": thumbnail_image,
                "caption_short": caption_short,
                "display_order": display_order,
                "is_active": is_active
            }
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE instagram_posts SET post_url = ?, thumbnail_image = ?, caption_short = ?, display_order = ?, is_active = ? WHERE id = ?",
            (post_url, thumbnail_image, caption_short, display_order, is_active, post_id)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_instagram_post error:", e)
        return False

def db_delete_instagram_post(post_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/instagram_posts?id=eq.{post_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM instagram_posts WHERE id = ?", (post_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_instagram_post error:", e)
        return False


# ?? MITRA (PARTNERS) CRUD FOR LOCAL DB ??

def db_get_all_mitra() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/mitra?order=display_order.asc,created_at.desc"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, logo, website_url, category, display_order, is_active, created_at FROM mitra ORDER BY display_order ASC, created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_mitra(mitra_id: str, name: str, logo: str, website_url: str, category: str, display_order: int, is_active: int) -> bool:
    try:
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/mitra"
            body = {
                "id": mitra_id,
                "name": name,
                "logo": logo,
                "website_url": website_url,
                "category": category,
                "display_order": display_order,
                "is_active": is_active,
                "created_at": datetime.utcnow().isoformat()
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO mitra (id, name, logo, website_url, category, display_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (mitra_id, name, logo, website_url, category, display_order, is_active, datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_mitra error:", e)
        return False

def db_update_mitra(mitra_id: str, name: str, logo: str, website_url: str, category: str, display_order: int, is_active: int) -> bool:
    try:
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/mitra?id=eq.{mitra_id}"
            body = {
                "name": name,
                "logo": logo,
                "website_url": website_url,
                "category": category,
                "display_order": display_order,
                "is_active": is_active
            }
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE mitra SET name = ?, logo = ?, website_url = ?, category = ?, display_order = ?, is_active = ? WHERE id = ?",
            (name, logo, website_url, category, display_order, is_active, mitra_id)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_mitra error:", e)
        return False

def db_delete_mitra(mitra_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/mitra?id=eq.{mitra_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM mitra WHERE id = ?", (mitra_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_mitra error:", e)
        return False


# ?? REVIEWS CRUD FOR LOCAL DB ??

def db_get_all_reviews() -> List[Dict[str, Any]]:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/reviews?order=created_at.desc"
            r = httpx.get(url, headers=get_supabase_headers())
            if r.status_code == 200:
                return r.json()
        except Exception as e:
            print("Supabase error:", e)
        return []
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, role, rating, content, avatar, created_at FROM reviews ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_review(review_id: str, name: str, role: str, rating: int, content: str, avatar: str = None) -> bool:
    try:
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/reviews"
            body = {
                "id": review_id,
                "name": name,
                "role": role,
                "rating": rating,
                "content": content,
                "avatar": avatar,
                "created_at": datetime.utcnow().isoformat()
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO reviews (id, name, role, rating, content, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (review_id, name, role, rating, content, avatar, datetime.utcnow().isoformat()))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_review error:", e)
        return False

def db_update_review(review_id: str, name: str, role: str, rating: int, content: str, avatar: str = None) -> bool:
    try:
        if USE_SUPABASE:
            url = f"{SUPABASE_URL}/rest/v1/reviews?id=eq.{review_id}"
            body = {
                "name": name,
                "role": role,
                "rating": rating,
                "content": content,
                "avatar": avatar
            }
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
            
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE reviews SET name = ?, role = ?, rating = ?, content = ?, avatar = ? WHERE id = ?",
                       (name, role, rating, content, avatar, review_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_review error:", e)
        return False

def db_delete_review(review_id: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/reviews?id=eq.{review_id}"
            r = httpx.delete(url, headers=get_supabase_headers())
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_review error:", e)
        return False


# ═══════════════════════════════════════════════════════════════════
# VIDEO TUTORIAL CRUD
# ═══════════════════════════════════════════════════════════════════

def db_get_all_video_tutorials() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, title, description, video_url, thumbnail, duration, is_active, display_order, created_at, updated_at FROM video_tutorial ORDER BY display_order ASC, created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("db_get_all_video_tutorials error:", e)
        return []

def db_create_video_tutorial(item_id: str, title: str, description: str, video_url: str, thumbnail: str, duration: str, display_order: int = 0) -> bool:
    try:
        now = datetime.utcnow().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO video_tutorial (id, title, description, video_url, thumbnail, duration, is_active, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
            (item_id, title, description, video_url, thumbnail, duration, display_order, now, now)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_video_tutorial error:", e)
        return False

def db_update_video_tutorial(item_id: str, title: str, description: str, video_url: str, thumbnail: str, duration: str, is_active: int, display_order: int) -> bool:
    try:
        now = datetime.utcnow().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE video_tutorial SET title = ?, description = ?, video_url = ?, thumbnail = ?, duration = ?, is_active = ?, display_order = ?, updated_at = ? WHERE id = ?",
            (title, description, video_url, thumbnail, duration, is_active, display_order, now, item_id)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_video_tutorial error:", e)
        return False

def db_delete_video_tutorial(item_id: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM video_tutorial WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_video_tutorial error:", e)
        return False


# ═══════════════════════════════════════════════════════════════════
# BRAND PKM CRUD
# ═══════════════════════════════════════════════════════════════════

def db_get_all_brand_pkm() -> List[Dict[str, Any]]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, logo, description, website_url, category, is_active, display_order, created_at, updated_at FROM brand_pkm ORDER BY display_order ASC, created_at DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print("db_get_all_brand_pkm error:", e)
        return []

def db_create_brand_pkm(item_id: str, name: str, logo: str, description: str, website_url: str, category: str, display_order: int = 0) -> bool:
    try:
        now = datetime.utcnow().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO brand_pkm (id, name, logo, description, website_url, category, is_active, display_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
            (item_id, name, logo, description, website_url, category, display_order, now, now)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_brand_pkm error:", e)
        return False

def db_update_brand_pkm(item_id: str, name: str, logo: str, description: str, website_url: str, category: str, is_active: int, display_order: int) -> bool:
    try:
        now = datetime.utcnow().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "UPDATE brand_pkm SET name = ?, logo = ?, description = ?, website_url = ?, category = ?, is_active = ?, display_order = ?, updated_at = ? WHERE id = ?",
            (name, logo, description, website_url, category, is_active, display_order, now, item_id)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_brand_pkm error:", e)
        return False

def db_delete_brand_pkm(item_id: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM brand_pkm WHERE id = ?", (item_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_brand_pkm error:", e)
        return False


# ═══════════════════════════════════════════════════════════════════
# DASHBOARD MODUL CRUD (stored in system_settings as JSON)
# ═══════════════════════════════════════════════════════════════════

def db_get_dashboard_moduls() -> List[Dict[str, Any]]:
    raw = db_get_setting("dashboard_moduls")
    if not raw:
        return []
    try:
        data = json.loads(raw)
        return data if isinstance(data, list) else []
    except Exception:
        return []

def db_save_dashboard_moduls(items: list) -> bool:
    return db_set_setting("dashboard_moduls", json.dumps(items))


def db_set_user_active_status(role: str, user_id: str, is_active: int) -> bool:
    if role not in ['doctor', 'patient']:
        raise ValueError("Invalid user role specified.")
    table = 'doctors' if role == 'doctor' else 'patients'
    if USE_SUPABASE:
        try:
            url = f'{SUPABASE_URL}/rest/v1/{table}?id=eq.{user_id}'
            body = {'is_active': bool(is_active)}
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
        except Exception as e:
            print('Supabase active toggle error:', e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        if table == 'doctors':
            cursor.execute('UPDATE doctors SET is_active = ? WHERE id = ?', (is_active, user_id))
        else:
            cursor.execute('UPDATE patients SET is_active = ? WHERE id = ?', (is_active, user_id))
        conn.commit()
        conn.close()
        return True


def db_get_all_facilities() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM facilities ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_get_facility_by_id(facility_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM facilities WHERE id = ?", (facility_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def db_create_facility(fac_id: str, code: str, name: str, ftype: str, address: str = None, city: str = None, province: str = None, postal_code: str = None, phone: str = None, email: str = None, website: str = None, registration_number: str = None, logo: str = None) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO facilities (id, facility_code, name, type, address, city, province, postal_code, phone, email, website, registration_number, logo, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
        """, (fac_id, code, name, ftype, address, city, province, postal_code, phone, email, website, registration_number, logo, now, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_facility error:", e)
        return False

def db_update_facility(fac_id: str, name: str, ftype: str, address: str, city: str, province: str, postal_code: str, phone: str, email: str, website: str, registration_number: str, status: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            UPDATE facilities SET name=?, type=?, address=?, city=?, province=?, postal_code=?, phone=?, email=?, website=?, registration_number=?, status=?, updated_at=?
            WHERE id=?
        """, (name, ftype, address, city, province, postal_code, phone, email, website, registration_number, status, now, fac_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_facility error:", e)
        return False

def db_delete_facility(fac_id: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM facilities WHERE id = ?", (fac_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_delete_facility error:", e)
        return False

def db_create_facility_admin(admin_id: str, name: str, email: str, username: str, password_hash: str, facility_id: str, phone: str = None, status: str = 'active') -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO admins (id, name, email, username, password_hash, facility_id, phone, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (admin_id, name, email, username, password_hash, facility_id, phone, status, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_facility_admin error:", e)
        return False

def db_update_facility_admin(admin_id: str, name: str, email: str, username: str, phone: str, status: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE admins SET name=?, email=?, username=?, phone=?, status=?
            WHERE id=?
        """, (name, email, username, phone, status, admin_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_facility_admin error:", e)
        return False

def db_get_all_admins() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admins")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_get_admin_by_id(admin_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM admins WHERE id = ?", (admin_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def db_create_consent(consent_id: str, patient_id: str, consent_type: str, purpose: str, version: str, ip_address: str, user_agent: str, consent_text_hash: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO consents (id, patient_id, consent_type, purpose, version, accepted_at, ip_address, user_agent, consent_text_hash, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'accepted')
        """, (consent_id, patient_id, consent_type, purpose, version, now, ip_address, user_agent, consent_text_hash))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_consent error:", e)
        return False

def db_get_patient_consents(patient_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM consents WHERE patient_id = ?", (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_medical_record(record_id: str, session_id: Optional[str], patient_id: str, doctor_id: str, facility_id: str, raw_conversation: str, doctor_note: str, medical_assessment: str, diagnosis: str, recommendation: str, prescription: str, follow_up: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO medical_records (id, session_id, patient_id, doctor_id, facility_id, raw_conversation, doctor_note, medical_assessment, diagnosis, recommendation, prescription, follow_up, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (record_id, session_id, patient_id, doctor_id, facility_id, raw_conversation, doctor_note, medical_assessment, diagnosis, recommendation, prescription, follow_up, now, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_medical_record error:", e)
        return False

def db_get_patient_medical_records(patient_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE patient_id = ? ORDER BY created_at DESC", (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_get_session_medical_record(session_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM medical_records WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def db_update_medical_record(record_id: str, doctor_note: str, medical_assessment: str, diagnosis: str, recommendation: str, prescription: str, follow_up: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            UPDATE medical_records SET doctor_note=?, medical_assessment=?, diagnosis=?, recommendation=?, prescription=?, follow_up=?, updated_at=?
            WHERE id=?
        """, (doctor_note, medical_assessment, diagnosis, recommendation, prescription, follow_up, now, record_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_medical_record error:", e)
        return False

def db_get_all_audit_logs() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_get_facility_audit_logs(facility_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs WHERE facility_id = ? ORDER BY created_at DESC", (facility_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_update_patient_accessibility_preference(patient_id: str, preference: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE patients SET accessibility_intro_seen = ? WHERE id = ?", (preference, patient_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_patient_accessibility_preference error:", e)
        return False


def db_create_timeline_event(event_id: str, patient_id: str, event_type: str, title: str, desc: str, date: str, ref_id: str = None) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO clinical_timeline (id, patient_id, event_type, event_title, event_description, event_date, reference_id)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (event_id, patient_id, event_type, title, desc, date, ref_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_timeline_event error:", e)
        return False

def db_get_patient_timeline(patient_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM clinical_timeline WHERE patient_id = ? ORDER BY event_date DESC", (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_medication(med_id: str, record_id: str, name: str, dosage: str, freq: str, dur: str, inst: str = None) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO medications (id, medical_record_id, drug_name, dosage, frequency, duration, instructions, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (med_id, record_id, name, dosage, freq, dur, inst, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_medication error:", e)
        return False

def db_get_patient_medications(patient_id: str) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT m.* FROM medications m
        JOIN medical_records r ON m.medical_record_id = r.id
        WHERE r.patient_id = ?
        ORDER BY m.created_at DESC
    """, (patient_id,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_break_glass_log(bg_id: str, doctor_id: str, patient_id: str, reason: str, duration_hours: int = 2) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow()
        now_str = now.isoformat()
        exp_str = (now + timedelta(hours=duration_hours)).isoformat() if 'timedelta' in globals() else (now.isoformat()) # let's import timedelta or parse manual
        # To avoid timedelta import issues, we do manual or import it
        exp_str = (datetime.utcnow() + timedelta(hours=duration_hours)).isoformat()
        cursor.execute("""
            INSERT INTO break_glass_logs (id, doctor_id, patient_id, reason, requested_at, expires_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
        """, (bg_id, doctor_id, patient_id, reason, now_str, exp_str))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_break_glass_log error:", e)
        return False

def db_check_break_glass_active(doctor_id: str, patient_id: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now_str = datetime.utcnow().isoformat()
        cursor.execute("""
            SELECT COUNT(*) FROM break_glass_logs 
            WHERE doctor_id = ? AND patient_id = ? AND status = 'active' AND expires_at > ?
        """, (doctor_id, patient_id, now_str))
        count = cursor.fetchone()[0]
        conn.close()
        return count > 0
    except Exception as e:
        print("db_check_break_glass_active error:", e)
        return False

def db_create_incident(inc_id: str, title: str, desc: str, severity: str, status: str = 'open', investigator: str = None) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO security_incidents (id, title, description, severity, status, assigned_investigator, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (inc_id, title, desc, severity, status, investigator, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_incident error:", e)
        return False

def db_update_incident(inc_id: str, status: str, details: str = None) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        if status == 'resolved':
            cursor.execute("""
                UPDATE security_incidents SET status = ?, resolution_details = ?, resolved_at = ?
                WHERE id = ?
            """, (status, details, now, inc_id))
        else:
            cursor.execute("""
                UPDATE security_incidents SET status = ?, resolution_details = ?
                WHERE id = ?
            """, (status, details, inc_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_incident error:", e)
        return False

def db_get_all_incidents() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM security_incidents ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_backup_log(b_id: str, name: str, path: str, status: str = 'success') -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        cursor.execute("""
            INSERT INTO backup_logs (id, backup_name, backup_path, status, integrity_checked, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
        """, (b_id, name, path, status, now))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_backup_log error:", e)
        return False

def db_get_all_backup_logs() -> List[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM backup_logs ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def db_create_export(export_id: str, patient_id: str, path: str, expiry_hours: int = 24) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow()
        now_str = now.isoformat()
        exp_str = (datetime.utcnow() + timedelta(hours=expiry_hours)).isoformat()
        cursor.execute("""
            INSERT INTO data_exports (id, patient_id, requested_at, expires_at, file_path, status)
            VALUES (?, ?, ?, ?, ?, 'available')
        """, (export_id, patient_id, now_str, exp_str, path))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_export error:", e)
        return False

def db_get_export_by_id(export_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM data_exports WHERE id = ?", (export_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def db_update_export_status(export_id: str, status: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE data_exports SET status = ? WHERE id = ?", (status, export_id))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_update_export_status error:", e)
        return False


def db_get_setting(key: str) -> Optional[str]:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
        row = cursor.fetchone()
        conn.close()
        return row[0] if row else None
    except Exception as e:
        print("db_get_setting error:", e)
        return None

def db_set_setting(key: str, value: str) -> bool:
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO system_settings (key, value)
            VALUES (?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value
        """, (key, value))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_set_setting error:", e)
        return False
