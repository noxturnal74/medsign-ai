# Technical Plan: Implementasi Autentikasi & Manajemen Sesi MedSign AI

Dokumen ini berisi detail teknis untuk implementasi fitur autentikasi berbasis peran (RBAC) dan manajemen sesi klinis di MedSign AI.

---

## 1. Skema Database (Supabase / PostgreSQL)

### 1.1 Tabel `doctors`
Menyimpan data identitas dan kredensial untuk tenaga medis (Dokter).
```sql
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    specialization VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 1.2 Tabel `patients`
Menyimpan data medis pasien. Password_hash bernilai `NULL` secara default hingga akun diaktifkan.
```sql
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    no_rm VARCHAR(50) UNIQUE NOT NULL,
    nik_encrypted TEXT NOT NULL, -- NIK dienkripsi at-rest
    password_hash VARCHAR(255),  -- Nullable, diset saat registrasi oleh admin/dokter
    name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 1.3 Tabel `admins`
Menyimpan data admin pengelola sistem RS.
```sql
CREATE TABLE admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 1.4 Tabel `doctor_patient`
Relasi pemetaan pasien ke dokter yang berwenang melayani.
```sql
CREATE TABLE doctor_patient (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (doctor_id, patient_id)
);
```

### 1.5 Tabel `sessions`
Mencatat riwayat konsultasi medis yang dilakukan dokter dengan pasien di ruang periksa.
```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    model_version VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'ongoing' CHECK (status IN ('ongoing', 'completed')),
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE
);
```

### 1.6 Tabel `audit_logs` (Append-Only)
Mencatat log audit akses data pasien demi kepatuhan regulasi data medis.
```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID NOT NULL,
    actor_role VARCHAR(20) NOT NULL CHECK (actor_role IN ('admin', 'doctor', 'patient')),
    action VARCHAR(255) NOT NULL,
    target_patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

---

## 2. Row Level Security (RLS) di PostgreSQL/Supabase
Untuk memastikan keamanan isolasi data, RLS akan diaktifkan pada tabel `patients`, `sessions`, `doctor_patient`, dan `audit_logs`.

Aturan Policy:
- **Tabel `patients`**:
  - `Admin`: Akses penuh (SELECT, INSERT, UPDATE).
  - `Doctor`: SELECT hanya untuk pasien yang terdaftar di `doctor_patient` relasi miliknya.
  - `Patient`: SELECT hanya untuk baris data miliknya sendiri.
- **Tabel `sessions`**:
  - `Doctor`: SELECT, INSERT, UPDATE untuk sesi di mana `doctor_id = auth.uid()`.
  - `Patient`: SELECT untuk sesi di mana `patient_id` miliknya sendiri.
- **Tabel `audit_logs`**:
  - Hanya sistem/backend yang dapat melakukan INSERT.
  - Tidak ada izin untuk UPDATE atau DELETE.

---

## 3. Desain API Endpoints (FastAPI)

### 3.1 Autentikasi
1. `POST /api/v1/auth/doctor/login`
2. `POST /api/v1/auth/admin/login`
3. `POST /api/v1/auth/patient/login`
4. `POST /api/v1/auth/patient/change-password`
5. `POST /api/v1/auth/refresh`
6. `POST /api/v1/auth/logout`

### 3.2 Fitur Dokter
1. `GET /api/v1/doctor/patients` (list pasien yang terdaftar)
2. `GET /api/v1/doctor/patients/search?q=` (cari pasien berdasarkan NIK/No.RM/nama)

### 3.3 Fitur Admin
1. `POST /api/v1/admin/patients` (buat pasien baru + generate password acak)
2. `POST /api/v1/admin/doctor-patient-assignment` (pasangkan dokter-pasien)
3. `POST /api/v1/admin/patients/{id}/reset-password` (reset password pasien)

### 3.4 Fitur Pasien
1. `GET /api/v1/patient/me/sessions` (list riwayat sesi pasien yang login)

---

## 4. Keamanan & Proteksi
- **Enkripsi NIK**: Menggunakan AES-256-GCM atau fungsi kriptografi pgcrypto di Supabase untuk mengenkripsi NIK pasien di tingkat database.
- **Rate Limiting**:
  - Dokter/Admin: 5 kali kesalahan login per 15 menit per akun IP.
  - Pasien: 3 kali kesalahan login per 15 menit per NIK.
- **Audit Logs**: Setiap request `GET /patients/{id}` atau read data pasien lainnya akan memicu penulisan baris baru ke tabel `audit_logs`.
- **JWT Storage**: Access token dikirim di response body (atau diatur via header), sedangkan Refresh Token disimpan di secure `HttpOnly` cookie.
