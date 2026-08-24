# MedSign AI — Privacy Impact & Risk Assessment

This document assesses the privacy risks associated with processing sensitive healthcare and biometric information on the MedSign platform and details the implemented mitigation strategies.

---

## 1. Privacy Risk Matrix

| Risk Area | Threat Scenario | Impact | Mitigation Strategy |
| --------- | --------------- | ------ | ------------------- |
| **Biometric Verification** | Unauthorized capture or misuse of facial verification images. | High | - Explicit notice and BIOMETRIC_VERIFICATION consent required.<br>- Captured images are accessed through secure endpoints.<br>- Passwords and biometric indicators are never printed in plaintext in system logs. |
| **Cross-Facility Data Access** | Admin of Facility A accesses patients or consultations of Facility B. | Critical | - Facility boundary is enforced in every backend query.<br>- `facility_id` check in `/admin/*` routes returns `403 Forbidden` if there is a mismatch. |
| **Speech-to-Text Processing** | Audio recordings sent to third-party APIs expose clinical secrets. | High | - Microphones must be started explicitly by the doctor (no auto-record).<br>- Only clinical transcriptions are processed; raw audio is not stored. |
| **Medical Record Disclosure** | Patients or unassigned doctors access unauthorized SOAP notes. | Critical | - Doctor-patient assignment link checked before allowing access.<br>- Patient-specific check enforces `patient_id == current_user.id`. |
| **Identity Data Leakage** | NIK exposed in cleartext on administration dashboards. | High | - NIK is encrypted at rest.<br>- Dashboard views display masked NIKs only. |
