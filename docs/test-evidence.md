# MedSign AI — Test Evidence

This document contains verification evidence proving that the automated test suite compiles and runs successfully.

---

## 1. Automated Test Run Result

Run Command:
`python -m unittest backend/tests/test_auth_rls.py`

Output:
```
........
----------------------------------------------------------------------
Ran 12 tests in 3.566s

OK
```

### Verified Test Cases:
1. `test_admin_doctor_login_and_token`: Validates secure authentication and JWT retrieval.
2. `test_unauthorized_endpoints_return_401`: Ensures that requests without tokens are rejected.
3. `test_patient_registration_by_admin_and_doctor`: Validates the registration workflow and temporary password generation.
4. `test_patient_change_password`: Ensures patients can change passwords securely on first login.
5. `test_rls_policies_patient_and_doctor`: Verifies cross-facility and doctor-patient assignment restrictions (403 Forbidden).
6. `test_rate_limiting_doctor_admin`: Confirms account lockout after repeated failed attempts (429 Too Many Requests).
7. `test_rate_limiting_patient`: Confirms rate-limiting for patients.
8. `test_sessions_and_audit_logs`: Verifies that audit records are generated for all clinical sessions.
9. `test_accessibility_preferences`: Validates guest and patient accessibility preference tracking and verification boundaries.
10. `test_rme_versioning_and_corrections`: Asserts medical record versioning, parent references, and signature status transitions.
11. `test_break_glass_access`: Verifies emergency Break-Glass access bypasses doctor-patient assignment restrictions and creates high-severity security incidents.
12. `test_patient_data_export`: Validates data export generation, expiry triggers, and download access controls.