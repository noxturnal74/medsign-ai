# Add environment clearing to the top of backend/tests/test_auth_rls.py
import os
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_KEY"] = ""

import unittest
import sys
import sqlite3
import time
import uuid
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app
from app.db import get_db_connection, hash_password, decrypt_nik
from app.rate_limiter import failed_attempts

class TestAuthRLSRateLimit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
    def setUp(self):
        failed_attempts.clear()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM audit_logs")
        cursor.execute("DELETE FROM session_logs")
        cursor.execute("DELETE FROM sessions")
        cursor.execute("DELETE FROM doctor_patient")
        cursor.execute("DELETE FROM patients")
        cursor.execute("DELETE FROM doctors")
        cursor.execute("DELETE FROM admins")
        
        admin_id = str(uuid.uuid4())
        hashed_admin_pass = hash_password("AdminPassword123")
        cursor.execute(
            "INSERT INTO admins (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (admin_id, "System Admin", "admin@medsign.com", hashed_admin_pass, datetime.utcnow().isoformat())
        )
        
        conn.commit()
        conn.close()

    def test_admin_doctor_login_and_token(self):
        response = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["role"], "admin")
        self.assertNotIn("password", data)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        hashed_doc_pass = hash_password("DocPassword123")
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, specialization, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (doc_id, "Dr. John", "john@medsign.com", hashed_doc_pass, "Bedah", datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        response = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "john@medsign.com",
            "password": "DocPassword123"
        })
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("token", data)
        self.assertEqual(data["role"], "doctor")
        self.assertNotIn("password", data)

    def test_unauthorized_endpoints_return_401(self):
        response = self.client.post("/api/v1/admin/patients", json={
            "no_rm": "RM001",
            "nik": "3271010101010001",
            "name": "Budi",
            "date_of_birth": "1990-01-01"
        })
        self.assertEqual(response.status_code, 401)
        
        response = self.client.get("/api/v1/patients/some-id")
        self.assertEqual(response.status_code, 401)

    def test_patient_registration_by_admin_and_doctor(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        create_res = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_PATA",
            "nik": "1234567890123456",
            "name": "Patient A",
            "date_of_birth": "1995-05-05"
        })
        self.assertEqual(create_res.status_code, 200)
        p_data = create_res.json()
        self.assertIn("temporary_password", p_data)
        self.assertNotIn("password", p_data)
        
        patient_login = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1234567890123456",
            "password": p_data["temporary_password"]
        })
        self.assertEqual(patient_login.status_code, 200)
        self.assertEqual(patient_login.json()["role"], "patient")
        self.assertEqual(patient_login.json()["must_change_password"], True)

    def test_patient_change_password(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        create_res = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_PATB",
            "nik": "1111222233334444",
            "name": "Patient B",
            "date_of_birth": "1995-05-05"
        })
        p_data = create_res.json()
        
        pat_login = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1111222233334444",
            "password": p_data["temporary_password"]
        })
        pat_token = pat_login.json()["token"]
        headers_pat = {"Authorization": f"Bearer {pat_token}"}
        
        change_res = self.client.post("/api/v1/auth/patient/change-password", headers=headers_pat, json={
            "old_password": p_data["temporary_password"],
            "new_password": "NewSecurePassword123"
        })
        self.assertEqual(change_res.status_code, 200)
        
        pat_login_old = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1111222233334444",
            "password": p_data["temporary_password"]
        })
        self.assertEqual(pat_login_old.status_code, 401)
        
        pat_login_new = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1111222233334444",
            "password": "NewSecurePassword123"
        })
        self.assertEqual(pat_login_new.status_code, 200)
        self.assertEqual(pat_login_new.json()["must_change_password"], False)

    def test_rls_policies_patient_and_doctor(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p_a = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_PATA", "nik": "1000200030004000", "name": "Patient A", "date_of_birth": "1990-01-01"
        }).json()
        p_b = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_PATB", "nik": "5000600070008000", "name": "Patient B", "date_of_birth": "1990-01-01"
        }).json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (doc_id, "Doctor A", "doca@medsign.com", hash_password("Pass"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        self.client.post("/api/v1/admin/doctor-patient-assignment", headers=headers_admin, json={
            "doctor_id": doc_id,
            "patient_id": p_a["id"]
        })
        
        pat_a_login = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1000200030004000", "password": p_a["temporary_password"]
        }).json()
        headers_pata = {"Authorization": f"Bearer {pat_a_login['token']}"}
        
        res_own = self.client.get(f"/api/v1/patients/{p_a['id']}", headers=headers_pata)
        self.assertEqual(res_own.status_code, 200)
        self.assertEqual(res_own.json()["nik"], "1000********4000")
        
        res_other = self.client.get(f"/api/v1/patients/{p_b['id']}", headers=headers_pata)
        self.assertEqual(res_other.status_code, 403)
        
        doc_a_login = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "doca@medsign.com", "password": "Pass"
        }).json()
        headers_doca = {"Authorization": f"Bearer {doc_a_login['token']}"}
        
        res_assigned = self.client.get(f"/api/v1/patients/{p_a['id']}", headers=headers_doca)
        self.assertEqual(res_assigned.status_code, 200)
        self.assertEqual(res_assigned.json()["nik"], "1000200030004000")
        
        res_unassigned = self.client.get(f"/api/v1/patients/{p_b['id']}", headers=headers_doca)
        self.assertEqual(res_unassigned.status_code, 403)

    def test_rate_limiting_doctor_admin(self):
        for i in range(5):
            res = self.client.post("/api/v1/auth/admin/login", json={
                "email": "admin@medsign.com",
                "password": "WrongPassword"
            })
            self.assertEqual(res.status_code, 401)
            
        res_locked = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "WrongPassword"
        })
        self.assertEqual(res_locked.status_code, 429)
        self.assertIn("Terlalu banyak percobaan gagal", res_locked.json()["detail"])

    def test_rate_limiting_patient(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_RL_PAT", "nik": "9999999999999999", "name": "Rate Patient", "date_of_birth": "1990-01-01"
        }).json()
        
        for i in range(3):
            res = self.client.post("/api/v1/auth/patient/login", json={
                "nik": "9999999999999999",
                "password": "WrongPassword"
            })
            self.assertEqual(res.status_code, 401)
            
        res_locked = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "9999999999999999",
            "password": "WrongPassword"
        })
        self.assertEqual(res_locked.status_code, 429)
        self.assertIn("Terlalu banyak percobaan gagal", res_locked.json()["detail"])

    def test_sessions_and_audit_logs(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p_a = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_SESS_PAT", "nik": "8888888888888888", "name": "Session Patient", "date_of_birth": "1990-01-01"
        }).json()
        
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
            (doc_id, "Doctor A", "doca_sess@medsign.com", hash_password("Pass"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        self.client.post("/api/v1/admin/doctor-patient-assignment", headers=headers_admin, json={
            "doctor_id": doc_id,
            "patient_id": p_a["id"]
        })
        
        doc_a_login = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "doca_sess@medsign.com", "password": "Pass"
        }).json()
        headers_doca = {"Authorization": f"Bearer {doc_a_login['token']}"}
        
        session_res = self.client.post("/api/v1/sessions", headers=headers_doca, json={
            "patient_id": p_a["id"]
        })
        self.assertEqual(session_res.status_code, 200)
        sess_id = session_res.json()["session_id"]
        
        log_res = self.client.post("/api/v1/session/log", headers=headers_doca, json={
            "session_id": sess_id,
            "role": "doctor",
            "text": "Halo, ada yang bisa saya bantu?",
            "timestamp": datetime.utcnow().isoformat()
        })
        self.assertEqual(log_res.status_code, 200)
        
        logs_get = self.client.get(f"/api/v1/sessions/{sess_id}/logs", headers=headers_doca)
        self.assertEqual(logs_get.status_code, 200)
        self.assertEqual(len(logs_get.json()), 1)
        self.assertEqual(logs_get.json()[0]["text"], "Halo, ada yang bisa saya bantu?")
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT actor_id, actor_role, action, target_patient_id FROM audit_logs WHERE target_patient_id = ?", (p_a["id"],))
        logs = cursor.fetchall()
        conn.close()
        
        self.assertGreaterEqual(len(logs), 3)

if __name__ == "__main__":
    unittest.main()
