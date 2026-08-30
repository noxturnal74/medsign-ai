# README - MedSign AI (BISINDO Medical Translator)

## Overview
**MedSign AI** is a clinical sign language translation system designed to bridge the communication gap between Deaf/Hard of Hearing patients and healthcare professionals in hospital environments.
* **Why it matters:** Hospital settings are critical, high-stakes environments where communication barriers can lead to wrong diagnoses. MedSign AI provides real-time BISINDO translation to ensure safe, inclusive, and accurate healthcare.
* **Who it is for:**
  * **Patients:** Access real-time sign translation and clinical records via the Patient Portal.
  * **Doctors:** View active diagnosis translations, medical history, and clinical SOAP notes.
  * **ML Engineers:** Record datasets, balance dataset samples, and retrain models direct from the dashboard.

## Technical Architecture & Stack
* **Backend:** FastAPI (Python), Supabase/PostgreSQL (Database)
* **Frontend:** React + Vite, Lenis (Smooth Scroll), Tailwind CSS
* **ML Pipeline:** MediaPipe Hands (Full model, complexity: 1), TFLite GRU/LSTM clinical model (frame_count=30, feature_count=63)
* **Integration:** REST API connection to Supabase database, WebSockets real-time coordinate streaming.

## Linkages & Navigation Map
This Obsidian vault serves as the central documentation index. Below are links connecting all project files:
* Refer to the [[Buku Panduan Sistem MedSign.md|Buku Panduan Sistem MedSign]] for user manuals.
* View [[Diagram Use Case.md|Diagram Use Case]] to understand system boundaries and actors.
* Refer to [[Diagram Activity.md|Diagram Activity]] for detailed workflows and process lifecycles.
* Check [[Panduan Deployment VPS IDwebhost.md|Panduan Deployment VPS IDwebhost]] for deployment instructions.
* Check [[STATUS.md|STATUS]] for the current project state, active milestones, and blockers.
* View [[progress.md|Progress Diary]] for chronological updates, fixes, and release history.
* Refer to [[decisions.md|Decisions Log]] to trace key technical and design architectural decisions.

## Project Document Index
Below are links to the formal project documentation located in the parent directory:

### 1. Manuals & User Guides
* [Buku Panduan MedSign AI (Word)](../BUKU_PANDUAN_MEDSIGN_AI.docx)
* [Buku Panduan MedSign AI (PDF)](../BUKU_PANDUAN_MEDSIGN_AI.pdf)
* [User Manual (HTML)](../manual.html)
* [Panduan Responden Fathur](../PANDUAN_RESPONDEN_FATHUR.md)

### 2. Machine Learning & Dataset Pipeline
* [Bisindo Dataset Dokumentasi](../BISINDO_DATASET_DOKUMENTASI.md)
* [Data Collection Plan](../DATA_COLLECTION_PLAN.md)
* [Model Decision Guide](../MODEL_DECISION.md)
* [Realtime Demo Guide](../README_REALTIME_DEMO.md)
* [Dataset Recording Guide](../README_REKAM_DATASET.md)
* [Model Training Guide](../README_TRAINING_MODEL.md)

### 3. Security, Privacy & Compliance Audit
* [Compliance Report](../compliance.md)
* [Privacy Risk Assessment](../privacy-risk-assessment.md)
* [Security Audit Report](../security-audit.md)
* [Implementation Audit & Change Log](../implementation-audit.md)
* [Remediation Plan](../remediation-plan.md)
* [Test Evidence](../test-evidence.md)
* [Audit Change Log](../audit-change-log.md)

### 4. Technical Design & Implementation
* [Project Brief (Auth & Sessions)](../PROJECT_BRIEF.md)
* [Technical Plan](../TECHNICAL_PLAN.md)
* [AI Clinical Communication Guidelines](../AI_CLINICAL_COMMUNICATION_GUIDELINES.md)
* [Implementation Verification](../IMPLEMENTATION_VERIFICATION.md)
* [Revisi Hari Ini (19 Juli 2026)](../REVISI_HARI_INI.md)
* [Revisi Akhir Pengembangan](../REVISI_AKHIR_PENGEMBANGAN.md)

### 5. System Specifications (PDFs)
* [Product Requirement Document (PRD)](../PRD.md.pdf)
* [Software Design Description (SDD)](../SDD.md.pdf)
* [Software Requirement Specification (SRS)](../SRS.md.pdf)
* [Task Breakdown](../TASK_BREAKDOWN.md.pdf)
* [Project Context Prompt](../PROJECT_CONTEXT_PROMPT.md.pdf)
* [UI/UX Flow Diagram](../UI_UX_FLOW.md.pdf)

### 6. Media & Resource Folders
* [Assets Directory](../assets/)
* [Screenshots Gallery](../screenshots/)
* [Superpowers Design specs](../superpowers/)

## Useful Links
* **Backend URL:** `http://localhost:8000`
* **Frontend URL:** `http://localhost:3001`
* **Obsidian Docs:** `docs/`
