# Project Brief: Autentikasi & Manajemen Sesi MedSign AI

## Metadata
- **Project Name**: MedSign AI Authentication & Session Management (Versi Rumah Sakit)
- **Owner**: MedSign AI Team (PKM-KC 2026)
- **Date**: 11 Agustus 2026
- **Status**: Approved / In Review

---

## 1. Overview
MedSign adalah sistem bantu komunikasi BISINDO untuk pasien tuli/tuna rungu di lingkungan rumah sakit. Proyek ini bertujuan untuk membangun sistem autentikasi yang aman dan sistem manajemen sesi/histori konsultasi berbasis peran (Role-Based Access Control / RBAC) yang terintegrasi antara backend (FastAPI), database (Supabase/PostgreSQL), dan frontend (React).

---

## 2. Tujuan & Tolok Ukur Keberhasilan (Goals)
1. **Autentikasi Berbasis Peran (RBAC)**: Dokter dan Admin dapat login menggunakan email/username + password untuk mendapatkan JWT token dengan informasi role yang valid.
2. **Keamanan Login Pasien**: Pasien login menggunakan NIK + password secara opsional. Tidak ada celah self-register oleh pasien guna menghindari pencurian NIK; akun pasien hanya dapat dibuat oleh Admin atau Dokter saat pendaftaran.
3. **Isolasi Data Pasien (RLS)**: Pasien hanya bisa mengakses data/histori milik mereka sendiri (mengembalikan HTTP 403 jika mengakses data pasien lain).
4. **Isolasi Akses Dokter**: Dokter hanya diizinkan mengakses data pasien yang terdaftar di bawah relasi dokter-pasien (`doctor_patient`) mereka.
5. **Keamanan Kredensial**: Password tidak boleh bocor atau muncul dalam response API, log server, atau error message dalam bentuk apa pun.
6. **Proteksi Endpoint**: Seluruh endpoint sensitif menolak akses tanpa token valid (HTTP 401).
7. **Rate Limiting & Keamanan Tambahan**: Proteksi brute-force login pada endpoint login (Dokter/Admin max 5x gagal, Pasien max 3x gagal per 15 menit), enkripsi NIK at-rest, dan pencatatan audit log append-only.

---

## 3. Ruang Lingkup (Scope)

### In Scope:
- **Database & Migrasi**: Schema tabel Supabase (`doctors`, `patients`, `admins`, `doctor_patient`, `sessions`, `audit_logs`) dan kebijakan RLS (Row Level Security).
- **Backend API (FastAPI)**:
  - Route login (`/auth/doctor/login`, `/auth/admin/login`, `/auth/patient/login`).
  - Manajemen sesi (`/auth/refresh`, `/auth/logout`, `/auth/patient/change-password`).
  - Pencarian & list pasien (`/doctor/patients`, `/doctor/patients/search`).
  - Pendaftaran pasien (`/admin/patients`), assignment (`/admin/doctor-patient-assignment`), reset password.
  - Rate limiting middleware/dependencies.
  - Middleware/dependency autentikasi & RBAC.
  - Audit logging otomatis saat data pasien diakses.
- **Unit Testing**: Unit test komprehensif untuk rate limit, akses RBAC, validasi RLS, dan pencegahan kebocoran password.

### Out of Scope:
- Implementasi fungsionalitas pengenalan gerakan BISINDO (MediaPipe/TFLite).
- Engine Text-to-Speech (TTS) dan Natural Language Generation (NLG).

---

## 4. Rencana Implementasi (Implementation Plan)

### Fase 1: Desain Skema Database & Migrasi (Supabase)
- Buat file SQL migrasi untuk mendefinisikan tabel `doctors`, `patients`, `admins`, `doctor_patient`, `sessions`, dan `audit_logs`.
- Aktifkan Row Level Security (RLS) di PostgreSQL dan buat policy untuk membatasi akses SELECT/INSERT/UPDATE sesuai hak akses role.

### Fase 2: Implementasi Backend API & Keamanan (FastAPI)
- Gunakan JWT token dengan access token berdurasi pendek dan refresh token via secure httpOnly cookie.
- Terapkan hashing password (bcrypt/argon2).
- Terapkan masking NIK (e.g. `327101********1234`) pada level serializer/response untuk user non-authorized.
- Bangun middleware rate limiter menggunakan in-memory cache atau Redis.
- Buat service audit logger otomatis (append-only) setiap kali endpoint pasien diakses.

### Fase 3: Integrasi Frontend (React)
- Integrasikan state management sesi di React context.
- Hubungkan form login dengan endpoint FastAPI.
- Terapkan mekanisme auto-refresh token dan force change password pada login pertama pasien.

### Fase 4: Pengujian & Validasi
- Tulis test suite (pytest/unittest) untuk memverifikasi kasus login, rate limit, akses RBAC, dan pencegahan kebocoran password.
- Lakukan simulasi penetration testing skala kecil terhadap RLS database.
