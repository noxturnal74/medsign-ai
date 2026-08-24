# MedSign AI — Compliance Documentation

This document describes the technical controls designed to support compliance with Indonesian healthcare regulations and personal data protection laws.

*Note: The platform is **designed to support compliance**; final legal and operational compliance depends on the deployment environment, organization-specific procedures, data processing contracts, and governance policies.*

---

## 1. Relevant Regulations

### A. UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)
- **Sensitive Personal Data:** Health data and biometric data are classified as specific personal data under UU PDP, requiring higher security standards, explicit notice, and a valid lawful basis (such as explicit consent or legal obligation).
- **Consent Management:** Explicit notice and consent forms must be presented before biometric/face data processing.
- **Lawful Bases:** The platform enforces explicit consent, contractual necessity, and legal obligation as valid processing bases.

### B. Permenkes No. 24 Tahun 2022 tentang Rekam Medis
- **Security & Confidentiality:** Electronic medical records (RME) must be managed securely with isolated access.
- **Data Isolation:** Enforces multi-facility boundaries ensuring that a facility's RME cannot be accessed by other clinics/hospitals.
- **RME Variables:** catatans are split into raw conversation logs, SOAP summaries, and diagnosis.

### C. UU No. 17 Tahun 2023 tentang Kesehatan
- **Patient Rights & Confidentiality:** Protects the patient's right to health information privacy. NIK and other identifiers are masked in typical user interfaces.

### D. Kepmenkes No. HK.01.07/MENKES/1423/2022
- **RME Variables & Metadata:** Outlines data standards for RME systems in Indonesia.

---

## 2. Technical Controls Matrix

| Regulatory Requirement | Platform Feature / Control | Implementation Details |
| ---------------------- | -------------------------- | ---------------------- |
| Sensitive Data Protection | NIK Masking & Encryption | NIK is encrypted at rest using AES-GCM and masked as `************1234` in patient-facing and standard views. |
| Tenant Isolation | Multi-Hospital Isolation | Enforces `facility_id` constraints at the SQLite query level for all admins, doctors, and sessions. |
| Informed Consent | Explicit Consent Tracker | Consent history logs IP address, user agent, consent type, and a hash of the accepted terms. |
| Auditability | Secured Audit Logging | Logs all administrative actions, status transitions, and patient data accesses. Excludes passwords/biometrics. |
| Access Control | RBAC & JWT Authorization | Role-based JWT validation ensures Super Admin, Admin, Doctor, and Patient access boundaries. |
