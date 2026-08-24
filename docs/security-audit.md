# MedSign AI — Security Audit Report

This report evaluates the security configuration of the MedSign platform, specifically access control, rate limiting, and tenant isolation.

---

## 1. Security Gate Status

**STATUS: PASS**

- **Cross-facility authorization:** Secured. Facility Admin and Doctor queries are restricted by `facility_id` from the JWT token. Mismatches return `403 Forbidden`.
- **Patient data authorization:** Secured. Patients can only query their own data (`patient_id == current_user.user_id`).
- **Medical record authorization:** Secured. Isolated at the database query level; accessed via secured endpoints with JWT validation.
- **KTP/NIK access control:** Encrypted at rest using AES-256 and masked in the UI.
- **Password storage:** Hashed using PBKDF2-SHA256 with random salts. Plaintext passwords are never stored.
- **Audit integrity:** Audit logs are saved for all status transitions and sensitive requests.

---

## 2. Rate Limiting and Lockout
- Failed login requests are rate-limited. After multiple failures within a 1-minute window, the account is temporarily locked, returning a `429 Too Many Requests` status code.
- General API requests are rate-limited via FastAPI middleware to prevent DDoS attacks.
