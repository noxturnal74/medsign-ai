import sqlite3
import os
import hashlib
import hmac
import uuid
import httpx
from datetime import datetime
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
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")

# Determine if we should connect to production Supabase or fall back to local SQLite
USE_SUPABASE = bool(SUPABASE_URL and SUPABASE_KEY and "supabase" in SUPABASE_URL)

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
        cursor.execute("SELECT id, name, email, password_hash, specialization, created_at FROM doctors WHERE email = ?", (email,))
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
        cursor.execute("SELECT id, name, email, password_hash, created_at FROM admins WHERE email = ?", (email,))
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
        cursor.execute("SELECT id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, must_change_password FROM patients")
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
        cursor.execute("SELECT id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, must_change_password FROM patients WHERE id = ?", (patient_id,))
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
        cursor.execute("SELECT id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, must_change_password FROM patients WHERE no_rm = ?", (no_rm,))
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

def db_create_patient(patient_id: str, no_rm: str, nik_encrypted: str, password_hash: str, name: str, date_of_birth: str, created_by: str) -> bool:
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients"
            body = {
                "id": patient_id,
                "no_rm": no_rm,
                "nik_encrypted": nik_encrypted,
                "password_hash": password_hash,
                "name": name,
                "date_of_birth": date_of_birth,
                "created_by": created_by,
                "created_at": created_at,
                "must_change_password": True
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
            """INSERT INTO patients (id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, must_change_password)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)""",
            (patient_id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at)
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
        cursor.execute("SELECT id, patient_id, doctor_id, model_version, status, started_at, ended_at FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def db_create_session(session_id: str, patient_id: str, doctor_id: str, model_version: str, started_at: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/sessions"
            body = {
                "id": session_id,
                "patient_id": patient_id,
                "doctor_id": doctor_id,
                "model_version": model_version,
                "status": "ongoing",
                "started_at": started_at
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
            "INSERT INTO sessions (id, patient_id, doctor_id, model_version, status, started_at) VALUES (?, ?, ?, ?, 'ongoing', ?)",
            (session_id, patient_id, doctor_id, model_version, started_at)
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

def write_audit_log(actor_id: str, actor_role: str, action: str, target_patient_id: str = None):
    log_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/audit_logs"
            body = {
                "id": log_id,
                "actor_id": actor_id,
                "actor_role": actor_role,
                "action": action,
                "target_patient_id": target_patient_id,
                "created_at": created_at
            }
            httpx.post(url, headers=get_supabase_headers(), json=body)
        except Exception as e:
            print("Supabase audit log error:", e)
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO audit_logs (id, actor_id, actor_role, action, target_patient_id, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (log_id, actor_id, actor_role, action, target_patient_id, created_at)
        )
        conn.commit()
        conn.close()

# ── TEST HELPERS (FOR TEST ISOLATION) ──

def db_create_doctor(doc_id: str, name: str, email: str, password_hash: str, specialization: str = None) -> bool:
    created_at = datetime.utcnow().isoformat()
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctors"
            body = {
                "id": doc_id,
                "name": name,
                "email": email,
                "password_hash": password_hash,
                "specialization": specialization,
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
            "INSERT INTO doctors (id, name, email, password_hash, specialization, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (doc_id, name, email, password_hash, specialization, created_at)
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
        cursor.execute("SELECT id, patient_id, doctor_id, model_version, status, started_at, ended_at FROM sessions WHERE patient_id = ?", (patient_id,))
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
        cursor.execute("SELECT id, name, email, password_hash, specialization, created_at FROM doctors WHERE id = ?", (doctor_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None

def init_db():
    if USE_SUPABASE:
        return
        
    conn = get_db_connection()
    cursor = conn.cursor()
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
    CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL,
        actor_role TEXT NOT NULL CHECK(actor_role IN ('admin', 'doctor', 'patient')),
        action TEXT NOT NULL,
        target_patient_id TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (target_patient_id) REFERENCES patients(id) ON DELETE SET NULL
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
    # Seed default Admin (unmodified for local tests)
    cursor.execute("SELECT id FROM admins WHERE email = 'admin@medsign.com'")
    if not cursor.fetchone():
        admin_pass = "AdminPassword123"
        hashed = hash_password(admin_pass)
        admin_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO admins (id, name, email, password_hash, created_at) VALUES (?, 'System Admin', 'admin@medsign.com', ?, ?)",
            (admin_id, hashed, datetime.utcnow().isoformat())
        )
        
    # Seed highest Admin
    cursor.execute("SELECT id FROM admins WHERE email = 'administrat0r'")
    admin_id_highest = None
    row_admin = cursor.fetchone()
    if not row_admin:
        hashed = hash_password("TahutekumEnak123!@#")
        admin_id_highest = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO admins (id, name, email, password_hash, created_at) VALUES (?, 'Highest Admin', 'administrat0r', ?, ?)",
            (admin_id_highest, hashed, datetime.utcnow().isoformat())
        )
    else:
        admin_id_highest = row_admin["id"]

    # Seed doctor
    cursor.execute("SELECT id FROM doctors WHERE email = 'bitapargazen@gmail.com'")
    doc_id = None
    row_doc = cursor.fetchone()
    if not row_doc:
        doc_id = str(uuid.uuid4())
        hashed_doc = hash_password("bitaganteng123")
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, specialization, created_at) VALUES (?, 'Dr. Bita Pargazen', 'bitapargazen@gmail.com', ?, 'Umum', ?)",
            (doc_id, hashed_doc, datetime.utcnow().isoformat())
        )
    else:
        doc_id = row_doc["id"]

    # Seed patient Glenn Perkasa
    glenn_exists = False
    cursor.execute("SELECT id, nik_encrypted FROM patients")
    for row in cursor.fetchall():
        if decrypt_nik(row["nik_encrypted"]) == "390572816403":
            glenn_exists = True
            break
            
    if not glenn_exists:
        pat_id = str(uuid.uuid4())
        hashed_pat = hash_password("glennperkasa123")
        encrypted_nik = encrypt_nik("390572816403")
        creator_id = admin_id_highest if admin_id_highest else str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO patients (id, no_rm, nik_encrypted, password_hash, name, date_of_birth, created_by, created_at, must_change_password) VALUES (?, 'RM390572816403', ?, ?, 'Glenn Perkasa', '1990-01-01', ?, ?, 0)",
            (pat_id, encrypted_nik, hashed_pat, creator_id, datetime.utcnow().isoformat())
        )
        
        # Link Dr. Bita Pargazen to Patient Glenn Perkasa
        if doc_id:
            link_id = str(uuid.uuid4())
            cursor.execute(
                "INSERT INTO doctor_patient (id, doctor_id, patient_id, assigned_at) VALUES (?, ?, ?, ?)",
                (link_id, doc_id, pat_id, datetime.utcnow().isoformat())
            )

    # -- ARTICLES, INSTAGRAM_POSTS, REVIEWS, MITRA TABLES --
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
        status TEXT DEFAULT 'published',
        published_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS instagram_posts (
        id TEXT PRIMARY KEY,
        post_url TEXT NOT NULL,
        thumbnail_image TEXT,
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
        role TEXT,
        rating REAL,
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

    # Seed default articles
    cursor.execute("SELECT COUNT(*) FROM articles")
    if cursor.fetchone()[0] == 0:
        articles_data = [
            ("art_1", "MedSign Hadir sebagai Sistem Pendeteksi Bahasa Isyarat Indonesia untuk Mendukung Komunikasi Inklusif antara Pasien Tunarungu dan Tenaga Medis", "medsign-sistem-pendeteksi-bisindo-ma-chung", "/assets/article-machung.jpg", "MedSign Hadir sebagai Sistem Pendeteksi Bahasa Isyarat Indonesia untuk Mendukung Komunikasi Inklusif antara Pasien Tunarungu dan Tenaga Medis. Artikel rujukan berita: https://machung.ac.id/berita/medsign-sistem-pendeteksi-bisindo-mahasiswa-ma-chung/", "Inovasi BISINDO mahasiswa Universitas Ma Chung.", "Edukasi BISINDO", "Admin"),
            ("art_2", "MedSign Manfaatkan Teknologi Pendeteksian BISINDO untuk Membantu Menjembatani Komunikasi antara Pasien Tuli dan Tenaga Medis", "medsign-manfaatkan-teknologi-pendeteksian-bisindo", "/assets/article-berita7.jpg", "MedSign Manfaatkan Teknologi Pendeteksian BISINDO untuk Membantu Menjembatani Komunikasi antara Pasien Tuli dan Tenaga Medis. Rujukan link: https://www.berita7terkini.com/2026/08/medsign-inovasi-mahasiswa-universitas.html?m=1", "MedSign menjembatani komunikasi medis dan pasien Tuli.", "Berita Utama", "Admin"),
            ("art_3", "Media Tionghoa Menyoroti MedSign, Inovasi Mahasiswa Ma Chung bagi Komunikasi Pasien Tuli dan Tenaga Medis", "media-tionghoa-menyoroti-medsign-daily", "/assets/article-daily.jpg", "Media Tionghoa Menyoroti MedSign, Inovasi Mahasiswa Ma Chung bagi Komunikasi Pasien Tuli dan Tenaga Medis. Rujukan dokumen lengkap: https://drive.google.com/file/d/1HQbjowaVY4-EqMrFOriWFQjvEeYgCr6z/view?usp=sharing", "Zhong-Zhong Daily menyoroti inovasi MedSign.", "Berita Utama", "Admin"),
            ("art_4", "MedSign, Inovasi Mahasiswa Ma Chung Malang untuk Mengurangi Hambatan Komunikasi Pasien Tuli di Fasilitas Kesehatan", "medsign-radar-malang-jawapos", "/assets/article-1.jpg", "MedSign, Inovasi Mahasiswa Ma Chung Malang untuk Mengurangi Hambatan Komunikasi Pasien Tuli di Fasilitas Kesehatan. Artikel rujukan Radar Malang Jawapos: https://radarmalang.jawapos.com/pendidikan/2608120025/medsign-dorong-akses-komunikasi-yang-setara-bagi-pasien-tunarungu-di-layanan-kesehatan-oleh-tim-medsign-universitas-ma-chung?page=1#goog_rewarded", "MedSign mendorong akses komunikasi setara di fasilitas kesehatan.", "Berita Utama", "Admin")
        ]
        for item in articles_data:
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "INSERT INTO articles (id, title, slug, cover_image, content, excerpt, category, author, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)",
                (item[0], item[1], item[2], item[3], item[4], item[5], item[6], item[7], now, now, now)
            )

    # Seed default instagram posts
    cursor.execute("SELECT COUNT(*) FROM instagram_posts")
    if cursor.fetchone()[0] == 0:
        ig_data = [
            ("ig_1", "https://www.instagram.com/p/C-medsign1", "/Homepage/ezgif-frame-001.png", "MedSign AI: Menjembatani komunikasi dokter-pasien tuli. #PKMKC #MaChung", 1),
            ("ig_2", "https://www.instagram.com/p/C-medsign2", "/Homepage/ezgif-frame-015.png", "Teknologi MediaPipe 21 Titik Landmark Tangan untuk akurasi tinggi. #ComputerVision", 2),
            ("ig_3", "https://www.instagram.com/p/C-medsign3", "/Homepage/ezgif-frame-030.png", "Model GRU/LSTM klinis dilatih khusus kosakata medis BISINDO. #DeepLearning", 3),
            ("ig_4", "https://www.instagram.com/p/C-medsign4", "/Homepage/ezgif-frame-049.png", "Kolaborasi PKM-KC Universitas Ma Chung bersama Diktisaintek. #InovasiMedis", 4)
        ]
        for item in ig_data:
            cursor.execute(
                "INSERT INTO instagram_posts (id, post_url, thumbnail_image, caption_short, display_order, is_active, added_at) VALUES (?, ?, ?, ?, ?, 1, ?)",
                (item[0], item[1], item[2], item[3], item[4], datetime.utcnow().isoformat())
            )

    # Seed default reviews
    cursor.execute("SELECT COUNT(*) FROM reviews")
    if cursor.fetchone()[0] == 0:
        reviews_data = [
            ("rev_1", "Dr. Clara", "Dokter Umum RSUD", 5.0, "Sangat membantu saat melayani pasien tuli. Aplikasi ini mempercepat proses anamnesis secara signifikan.", "/assets/loren_2.jpg"),
            ("rev_2", "Glenn Perkasa", "Responden Teman Tuli", 5.0, "Saya merasa lebih didengar dan dipahami saat berkonsultasi dengan dokter. Prosesnya instan.", "/assets/albert_2.jpg"),
            ("rev_3", "Prof. Hendra", "Reviewer Program PKM", 4.8, "Inovasi yang luar biasa untuk inklusivitas pelayanan kesehatan di Indonesia. Model AI bekerja optimal.", "/assets/glenn_2.jpg")
        ]
        for item in reviews_data:
            cursor.execute(
                "INSERT INTO reviews (id, name, role, rating, content, avatar, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (item[0], item[1], item[2], item[3], item[4], item[5], datetime.utcnow().isoformat())
            )

    # Seed default mitra
    cursor.execute("SELECT COUNT(*) FROM mitra")
    if cursor.fetchone()[0] == 0:
        mitra_data = [
            ("mit_1", "Kemdikbudristek", "/assets/logo-kemdikbudristek.png", "https://kemdikbud.go.id", "Kementerian", 1),
            ("mit_2", "Diktisaintek Berdampak", "/assets/logo-diktisaintek.png", "https://diktisaintek.kemdikbud.go.id", "Kementerian", 2),
            ("mit_3", "PKM", "/assets/logo-pkm-full.png", "https://simbelmawa.kemdikbud.go.id", "Program", 3),
            ("mit_4", "Simbelmawa", "/assets/logo-simbelmawa.png", "https://simbelmawa.kemdikbud.go.id", "Program", 4),
            ("mit_5", "Universitas Ma Chung", "/assets/logo-umc.png", "https://machung.ac.id", "Institusi Pendidikan", 5)
        ]
        for item in mitra_data:
            cursor.execute(
                "INSERT INTO mitra (id, name, logo, website_url, category, display_order, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?)",
                (item[0], item[1], item[2], item[3], item[4], item[5], datetime.utcnow().isoformat())
            )
            
    conn.commit()
    conn.close()

init_db()


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
        cursor.execute("SELECT id, name, email, password_hash, specialization, created_at FROM doctors")
        rows = cursor.fetchall()
        conn.close()
        return [dict(r) for r in rows]

def db_update_doctor(doctor_id: str, name: str, email: str, password_hash: str, specialization: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/doctors?id=eq.{doctor_id}"
            body = {"name": name, "email": email, "specialization": specialization}
            if password_hash:
                body["password_hash"] = password_hash
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        if password_hash:
            cursor.execute("UPDATE doctors SET name = ?, email = ?, password_hash = ?, specialization = ? WHERE id = ?", (name, email, password_hash, specialization, doctor_id))
        else:
            cursor.execute("UPDATE doctors SET name = ?, email = ?, specialization = ? WHERE id = ?", (name, email, specialization, doctor_id))
        conn.commit()
        conn.close()
        return True

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

def db_update_patient(patient_id: str, no_rm: str, nik_encrypted: str, password_hash: str, name: str, date_of_birth: str) -> bool:
    if USE_SUPABASE:
        try:
            url = f"{SUPABASE_URL}/rest/v1/patients?id=eq.{patient_id}"
            body = {"no_rm": no_rm, "nik_encrypted": nik_encrypted, "name": name, "date_of_birth": date_of_birth}
            if password_hash:
                body["password_hash"] = password_hash
            r = httpx.patch(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 200
        except Exception as e:
            print("Supabase error:", e)
            return False
    else:
        conn = get_db_connection()
        cursor = conn.cursor()
        if password_hash:
            cursor.execute("UPDATE patients SET no_rm = ?, nik_encrypted = ?, password_hash = ?, name = ?, date_of_birth = ? WHERE id = ?", (no_rm, nik_encrypted, password_hash, name, date_of_birth, patient_id))
        else:
            cursor.execute("UPDATE patients SET no_rm = ?, nik_encrypted = ?, name = ?, date_of_birth = ? WHERE id = ?", (no_rm, nik_encrypted, name, date_of_birth, patient_id))
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

def db_create_article(article_id: str, title: str, slug: str, cover_image: str, content: str, excerpt: str, category: str, author: str, status: str = "published") -> bool:
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
                "published_at": pub_at,
                "created_at": now,
                "updated_at": now
            }
            r = httpx.post(url, headers=get_supabase_headers(), json=body)
            return r.status_code == 201
        
        conn = get_db_connection()
        pub_at = now if status == "published" else None
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO articles (id, title, slug, cover_image, content, excerpt, category, author, status, published_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (article_id, title, slug, cover_image, content, excerpt, category, author, status, pub_at, now, now)
        )
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print("db_create_article error:", e)
        return False

def db_update_article(article_id: str, title: str, slug: str, cover_image: str, content: str, excerpt: str, category: str, author: str, status: str) -> bool:
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
            "UPDATE articles SET title = ?, slug = ?, cover_image = ?, content = ?, excerpt = ?, category = ?, author = ?, status = ?, published_at = ?, updated_at = ? WHERE id = ?",
            (title, slug, cover_image, content, excerpt, category, author, status, pub_at, now, article_id)
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
