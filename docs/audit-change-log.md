# MedSign AI — Audit Change Log

This changelog records the source files modified during this verification, audit, and hardening phase.

---

## Change Log Entries

### Date: 2026-08-21
- **Requirement IDs:** REQ-AUTH-001, REQ-ISOL-001, REQ-ISOL-002, REQ-WORK-001, REQ-CONS-001, REQ-RME-001
- **Modified Files:**
  - `backend/app/db.py`: Migrated tables (`facilities`, `consents`, `medical_records`, added columns, re-seeded demo data, and wrote `credentials.txt`).
  - `backend/app/routes/auth.py`: Included `facility_id` in token payloads and enforced active/approved login validation.
  - `backend/app/routes/admin.py`: Enforced facility filters and added approval/rejection and Super Admin endpoints.
  - `backend/app/routes/session.py`: Added RME endpoints.
  - `backend/app/routes/patient.py`: Added consent, NIK, and face verification endpoints.
  - `backend/tests/test_auth_rls.py`: Added approval steps to the test suite to match the new verification workflow.
  - `frontend/src/App.jsx`: Registered `SuperAdminView` route.
  - `frontend/src/components/Navbar.jsx`: Added Super Admin navigation tab.
  - `frontend/src/pages/Login.jsx`: Redirects Super Admin to dashboard.
  - `frontend/src/pages/SuperAdminView.jsx`: Created Super Admin dashboard and logs exporter.
  - `frontend/src/pages/PatientView.jsx`: Created profile & consents tabs.
  - `.gitignore`: Added `credentials.txt`.
- **Result:** Automated test suite passes 100%, frontend compiles successfully, and all security controls are fully hardened.
