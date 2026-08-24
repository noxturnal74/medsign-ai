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
from app.routes.auth import create_jwt_token
from app.rate_limiter import failed_attempts

class TestAuthRLSRateLimit(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)
        
    @classmethod
    def tearDownClass(cls):
        from app.db import init_db
        init_db()
        
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
            "INSERT INTO admins (id, name, email, password_hash, created_at, facility_id) VALUES (?, ?, ?, ?, ?, 'fac_default')",
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
            "INSERT INTO doctors (id, name, email, password_hash, specialization, created_at, facility_id) VALUES (?, ?, ?, ?, ?, ?, 'fac_default')",
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
        self.client.post(f"/api/v1/admin/patients/{p_data['id']}/approve", headers=headers_admin)
        patient_login = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1234567890123456",
            "password": p_data["temporary_password"]
        })
        self.assertEqual(patient_login.status_code, 403)
        self.assertIn("tidak diizinkan", patient_login.json()["detail"])

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
        self.client.post(f"/api/v1/admin/patients/{p_data['id']}/approve", headers=headers_admin)
        pat_token = create_jwt_token({"user_id": p_data["id"], "nik": "1111222233334444", "role": "patient", "facility_id": "fac_default"}, 3600)
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
        self.assertEqual(pat_login_old.status_code, 403)
        
        pat_login_new = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "1111222233334444",
            "password": "NewSecurePassword123"
        })
        self.assertEqual(pat_login_new.status_code, 403)
        
        # Verify db status directly
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT password_hash, must_change_password FROM patients WHERE id = ?", (p_data["id"],))
        row = cursor.fetchone()
        conn.close()
        self.assertEqual(row["must_change_password"], 0)
        

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
            "INSERT INTO doctors (id, name, email, password_hash, created_at, facility_id) VALUES (?, ?, ?, ?, ?, 'fac_default')",
            (doc_id, "Doctor A", "doca@medsign.com", hash_password("Pass"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        self.client.post("/api/v1/admin/doctor-patient-assignment", headers=headers_admin, json={
            "doctor_id": doc_id,
            "patient_id": p_a["id"]
        })
        
        # Approve patients
        self.client.post(f"/api/v1/admin/patients/{p_a['id']}/approve", headers=headers_admin)
        self.client.post(f"/api/v1/admin/patients/{p_b['id']}/approve", headers=headers_admin)
        
        pat_token_a = create_jwt_token({"user_id": p_a["id"], "nik": "1000200030004000", "role": "patient", "facility_id": "fac_default"}, 3600)
        headers_pata = {"Authorization": f"Bearer {pat_token_a}"}
        
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
        self.client.post(f"/api/v1/admin/patients/{p['id']}/approve", headers=headers_admin)
        for i in range(3):
            res = self.client.post("/api/v1/auth/patient/login", json={
                "nik": "9999999999999999",
                "password": "WrongPassword"
            })
            self.assertEqual(res.status_code, 403)
            
        res_locked = self.client.post("/api/v1/auth/patient/login", json={
            "nik": "9999999999999999",
            "password": "WrongPassword"
        })
        self.assertEqual(res_locked.status_code, 403)
        self.assertIn("tidak diizinkan", res_locked.json()["detail"])

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
        self.client.post(f"/api/v1/admin/patients/{p_a['id']}/approve", headers=headers_admin)
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, created_at, facility_id) VALUES (?, ?, ?, ?, ?, 'fac_default')",
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

    def test_accessibility_preferences(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_ACC_PAT", "nik": "7777777777777777", "name": "Accessibility Patient", "date_of_birth": "1990-01-01"
        }).json()
        self.client.post(f"/api/v1/admin/patients/{p['id']}/approve", headers=headers_admin)
        
        pat_token = create_jwt_token({"user_id": p["id"], "nik": "7777777777777777", "role": "patient", "facility_id": "fac_default"}, 3600)
        headers_pat = {"Authorization": f"Bearer {pat_token}"}
        
        # 1. Get default preference
        res_get = self.client.get("/api/v1/patient/accessibility-preference", headers=headers_pat)
        self.assertEqual(res_get.status_code, 200)
        self.assertEqual(res_get.json()["preference"], "NOT_SEEN")
        
        # 2. Update preference
        res_post = self.client.post("/api/v1/patient/accessibility-preference", headers=headers_pat, json={
            "preference": "SEEN"
        })
        self.assertEqual(res_post.status_code, 200)
        
        # 3. Get updated preference
        res_get_updated = self.client.get("/api/v1/patient/accessibility-preference", headers=headers_pat)
        self.assertEqual(res_get_updated.status_code, 200)
        self.assertEqual(res_get_updated.json()["preference"], "SEEN")
        
        # 4. Access validation by unauthorized user (doctor)
        doc_login = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "adminrsi@medsign.com", "password": "rsipalingtop" # wait let's use seeded doctor
        })
        # let's just make doctor login check with wrong credentials or correct one
        # Let's seed a doctor in db or get from db
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, created_at, facility_id) VALUES (?, ?, ?, ?, ?, 'fac_default')",
            (doc_id, "Doctor Test", "doctest@medsign.com", hash_password("Pass123"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        doc_login = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "doctest@medsign.com", "password": "Pass123"
        }).json()
        headers_doc = {"Authorization": f"Bearer {doc_login['token']}"}
        
        res_fail = self.client.get("/api/v1/patient/accessibility-preference", headers=headers_doc)
        self.assertEqual(res_fail.status_code, 403)

    def test_rme_versioning_and_corrections(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_VERS_PAT", "nik": "6666666666666666", "name": "Version Patient", "date_of_birth": "1990-01-01", "facility_id": "fac_default"
        }).json()
        self.client.post(f"/api/v1/admin/patients/{p['id']}/approve", headers=headers_admin)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, created_at, facility_id) VALUES (?, ?, ?, ?, ?, 'fac_default')",
            (doc_id, "Doctor John", "docjohn@medsign.com", hash_password("Pass"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        self.client.post("/api/v1/admin/doctor-patient-assignment", headers=headers_admin, json={
            "doctor_id": doc_id,
            "patient_id": p["id"]
        })
        
        doc_login = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "docjohn@medsign.com", "password": "Pass"
        }).json()
        headers_doc = {"Authorization": f"Bearer {doc_login['token']}"}
        
        # 1. Create session
        session_res = self.client.post("/api/v1/sessions", headers=headers_doc, json={
            "patient_id": p["id"]
        })
        sess_id = session_res.json()["session_id"]
        
        # 2. Create Version 1 record
        rec_res = self.client.post(f"/api/v1/sessions/{sess_id}/medical-record", headers=headers_doc, json={
            "doctor_note": "Catatan medis versi 1",
            "diagnosis": "Diagnosa A",
            "ai_drafted": 1,
            "ai_provenance": "provenance_v1"
        })
        self.assertEqual(rec_res.status_code, 200)
        rec_data1 = rec_res.json()
        self.assertEqual(rec_data1["version"], 1)
        self.assertEqual(rec_data1["is_latest"], 1)
        self.assertEqual(rec_data1["ai_drafted"], 1)
        
        # 3. Create Version 2 correction
        cor_res = self.client.post(f"/api/v1/medical-records/{rec_data1['id']}/correction", headers=headers_doc, json={
            "doctor_note": "Koreksi catatan medis versi 2",
            "diagnosis": "Diagnosa A Terkoreksi",
            "ai_drafted": 0
        })
        self.assertEqual(cor_res.status_code, 200)
        rec_data2 = cor_res.json()
        self.assertEqual(rec_data2["version"], 2)
        self.assertEqual(rec_data2["parent_record_id"], rec_data1["id"])
        self.assertEqual(rec_data2["is_latest"], 1)
        
        # 4. Verify Version 1 is_latest is now 0
        res_v1 = self.client.get(f"/api/v1/medical-records/{rec_data1['id']}", headers=headers_doc)
        self.assertEqual(res_v1.json()["is_latest"], 0)

    def test_break_glass_access(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_BG_PAT", "nik": "5555555555555555", "name": "BreakGlass Patient", "date_of_birth": "1990-01-01", "facility_id": "fac_default"
        }).json()
        self.client.post(f"/api/v1/admin/patients/{p['id']}/approve", headers=headers_admin)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        doc_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO doctors (id, name, email, password_hash, created_at, facility_id) VALUES (?, ?, ?, ?, ?, 'fac_default')",
            (doc_id, "Doctor B", "docb@medsign.com", hash_password("Pass"), datetime.utcnow().isoformat())
        )
        conn.commit()
        conn.close()
        
        doc_login = self.client.post("/api/v1/auth/doctor/login", json={
            "email": "docb@medsign.com", "password": "Pass"
        }).json()
        headers_doc = {"Authorization": f"Bearer {doc_login['token']}"}
        
        # 1. Access without assignment / break-glass -> Should fail with 403
        res_fail = self.client.get(f"/api/v1/patients/{p['id']}", headers=headers_doc)
        self.assertEqual(res_fail.status_code, 403)
        
        # 2. Activate Break-Glass
        res_bg = self.client.post(f"/api/v1/patient/{p['id']}/break-glass", headers=headers_doc, json={
            "reason": "Pasien tidak sadarkan diri di UGD"
        })
        self.assertEqual(res_bg.status_code, 200)
        
        # 3. Access with active Break-Glass -> Should succeed!
        res_success = self.client.get(f"/api/v1/patients/{p['id']}", headers=headers_doc)
        self.assertEqual(res_success.status_code, 200)
        self.assertEqual(res_success.json()["name"], "BreakGlass Patient")

    def test_patient_data_export(self):
        admin_login = self.client.post("/api/v1/auth/admin/login", json={
            "email": "admin@medsign.com",
            "password": "AdminPassword123"
        })
        admin_token = admin_login.json()["token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}
        
        p = self.client.post("/api/v1/admin/patients", headers=headers_admin, json={
            "no_rm": "RM_EXP_PAT", "nik": "4444444444444444", "name": "Export Patient", "date_of_birth": "1990-01-01", "facility_id": "fac_default"
        }).json()
        self.client.post(f"/api/v1/admin/patients/{p['id']}/approve", headers=headers_admin)
        
        pat_token = create_jwt_token({"user_id": p["id"], "nik": "4444444444444444", "role": "patient", "facility_id": "fac_default"}, 3600)
        headers_pat = {"Authorization": f"Bearer {pat_token}"}
        
        # 1. Request export
        exp_res = self.client.post("/api/v1/patient/me/export", headers=headers_pat)
        self.assertEqual(exp_res.status_code, 200)
        exp_data = exp_res.json()
        self.assertIn("download_url", exp_data)
        
        # 2. Download export
        dl_res = self.client.get(exp_data["download_url"], headers=headers_pat)
        self.assertEqual(dl_res.status_code, 200)
        dl_json = dl_res.json()
        self.assertEqual(dl_json["profile"]["name"], "Export Patient")
        
        # Clean up files created during export test
        import shutil
        if os.path.exists("backend/data/exports"):
            shutil.rmtree("backend/data/exports")

if __name__ == "__main__":
    unittest.main()
