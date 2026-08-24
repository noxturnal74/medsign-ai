# MedSign AI — Remediation & Hardening Plan

This document details the issues identified during the implementation audit and the remediation fixes applied to harden the platform.

---

## 1. Remediation Changelog

### A. Broken Tenant Isolation
- **Problem:** regular admins were able to query all patients and doctors across the entire database due to lack of `facility_id` filtering in backend routes.
- **Severity:** P0 (Critical data exposure).
- **Fix:** Added backend `facility_id` validation to `/admin/patients`, `/admin/doctors`, and `/patients/{id}`. Facility Admins are restricted to their own facility, and Super Admins can access all data.

### B. Missing Approval Workflow
- **Problem:** Patients were active immediately upon registration without going through an approval step, allowing unverified users to access services.
- **Severity:** P0 (Access Control).
- **Fix:** Set patient default status to `PENDING` and `is_active=0`. Added `/admin/patients/{id}/approve` and `/admin/patients/{id}/reject` endpoints for admins to approve/activate accounts.

### C. Missing Consent Controls
- **Problem:** No database tables or API endpoints existed to record patient consents for PDP compliance.
- **Severity:** P1 (Compliance Control Missing).
- **Fix:** Created `consents` table. Implemented `/patient/consent` POST/GET endpoints to track and enforce explicit consent before biometric verification.

### D. Missing Structured Medical Record
- **Problem:** Consultation summaries were just loose strings and raw chat logs were not structured into standard RME.
- **Severity:** P1 (Regulatory Requirement).
- **Fix:** Created `medical_records` table and `/sessions/{id}/medical-record` endpoint to structure chat transcriptions and SOAP notes.
