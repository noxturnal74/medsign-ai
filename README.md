# MedSign AI 🤟
## Sistem Pendukung Komunikasi Medis Tunarungu Berbasis BISINDO

MedSign AI adalah aplikasi web asisten komunikasi medis dua arah yang dirancang khusus untuk menjembatani hambatan komunikasi antara pasien tunarungu (Teman Tuli) dan tenaga medis di fasilitas kesehatan (Puskesmas, Rumah Sakit, Klinik) seluruh Indonesia.

Aplikasi ini menggunakan teknologi **Computer Vision** real-time berbasis MediaPipe untuk mengekstrak koordinat landmark tangan dan model **Deep Learning (FastAPI LSTM)** untuk mengenali gerak isyarat Bahasa Isyarat Indonesia (BISINDO) klinis, serta mengubahnya menjadi teks besar dan audio (*Text-to-Speech*).

---

## 1. Tujuan Proyek
*   **Aksesibilitas Kesehatan Inklusif:** Menyediakan alternatif penerjemah BISINDO klinis otomatis yang siaga 24/7 di UGD maupun meja pendaftaran.
*   **Mengurangi Misdiagnosis:** Membantu dokter umum melakukan sesi anamnesis secara mendalam, cepat, dan terarah tanpa perantara manusia guna meminimalisir kesalahan interpretasi gejala.
*   **Hak Privasi Pasien:** Menjamin kerahasiaan rekam medis personal Teman Tuli agar tidak harus bergantung pada pendamping keluarga.

---

## 2. Fitur Utama MVP
1.  **Deteksi Kamera Real-Time (`CameraFeed.jsx`):** Integrasi aliran kamera browser otomatis dengan overlay kanvas landmark tangan 21 titik berbasis MediaPipe.
2.  **Penerjemah Hibrida (`TranslationDisplay.jsx`):** Translasi otomatis kata dinamis (buffer 30 frame) dan huruf statis (CNN A-Z spelling) dengan indikator persentase keyakinan (*confidence score*).
3.  **Respon Medis Dokter (`DoctorPanel.jsx`):** Fasilitas bagi dokter untuk mengetik instruksi klinis bebas serta tombol pintas Frasa Cepat medis (10 preset).
4.  **Bantuan Suara Otomatis (Text-to-Speech):** Suara lafal Indonesia berlatensi rendah menggunakan integrasi Web Speech API.
5.  **Panduan Kosakata Pintasan (`VocabularyGuide.jsx`):** Grid 35 kosakata medis prioritas terbagi dalam 5 kategori klinis, berfungsi sebagai pintasan klik manual bila kamera terganggu.
6.  **Pencatatan Sesi & Ekspor (`SessionLog.jsx`):** Linimasa transkrip dua arah terstruktur (Pasien vs Dokter) dengan tombol salin papan klip dan ekspor `.txt`.
7.  **Emergency Alert (`EmergencyAlert.jsx`):** Blinking alarm merah visual jika mendeteksi kata-kata bernilai darurat (*emergency*).
8.  **AI Dataset Augmentation (`DataCollection.jsx` & `augmentation_service.py`):** Panel manajemen dan pelipatan dataset secara spasial/temporal (seperti mirroring, rotasi, translasi, dan noise temporal) untuk meningkatkan volume dataset training dan generalisasi model deep learning.

---

## 3. Teknologi yang Digunakan
*   **Frontend:** React 18 + Vite 5 + TailwindCSS 3 + Lucide Icons + MediaPipe Hands JS
*   **Backend:** FastAPI Python 3.11 + Uvicorn + WebSockets
*   **Machine Learning:** TensorFlow/Keras LSTM model + TFLite runtime (CPU optimized)
*   **Infrastruktur:** Docker + Vercel Deployment

---

## 4. Struktur Folder Proyek
```txt
medsign-ai/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CameraFeed.jsx
│   │   │   ├── TranslationDisplay.jsx
│   │   │   ├── DoctorPanel.jsx
│   │   │   ├── VocabularyGuide.jsx
│   │   │   ├── SessionLog.jsx
│   │   │   ├── EmergencyAlert.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── Layout.jsx
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── PatientView.jsx
│   │   │   ├── DoctorView.jsx
│   │   │   ├── DataCollection.jsx
│   │   │   ├── MotionVisualizer.jsx
│   │   │   ├── UserManual.jsx
│   │   │   └── About.jsx
│   │   ├── hooks/
│   │   │   ├── useWebcam.js
│   │   │   ├── useMediaPipe.js
│   │   │   └── useWebSocket.js
│   │   ├── data/
│   │   │   └── vocabulary.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   ├── data_collection.py
│   │   │   ├── nlg.py
│   │   │   ├── predict.py
│   │   │   ├── session.py
│   │   │   └── vocabulary.py
│   │   ├── services/
│   │   │   ├── augmentation_service.py
│   │   │   ├── nlg_service.py
│   │   │   └── slt_adapter.py
│   │   └── schemas.py
│   ├── requirements.txt
│   └── Dockerfile
├── docs/
│   ├── PRD.md.pdf
│   ├── SRS.md.pdf
│   ├── SDD.md.pdf
│   ├── UI_UX_FLOW.md.pdf
│   ├── TASK_BREAKDOWN.md.pdf
│   └── PROJECT_CONTEXT_PROMPT.md.pdf
├── vercel.json
├── .gitignore
└── README.md
```

---

## 5. Panduan Instalasi & Menjalankan Lokal

### Prasyarat
*   Node.js v18 atau v20+
*   Python 3.10 atau 3.11+
*   Koneksi Internet (untuk memuat pustaka MediaPipe)

### 5.0 Cara Cepat: Jalankan Frontend + Backend Bersamaan (1 Terminal)
Proyek ini sudah dilengkapi `package.json` di folder root yang memakai tool `concurrently` untuk menjalankan kedua server sekaligus dalam satu jendela terminal, dengan log masing-masing diberi label warna `[BACKEND]` dan `[FRONTEND]`.

1. **Setup sekali saja** (hanya perlu dilakukan sekali di awal, atau setiap kali `requirements.txt`/`package.json` berubah):
   ```bash
   # Dari folder root medsign-ai/
   npm install

   # Buat virtual environment Python & pasang dependensi backend
   npm run setup:backend

   # Pasang dependensi frontend
   npm run install:frontend
   ```
2. **Jalankan keduanya bersamaan:**
   ```bash
   npm run dev
   ```
3. Tunggu hingga muncul log berikut, lalu buka browser ke `http://localhost:3000` (atau port lain jika 3000 sedang dipakai, akan terlihat di log `[FRONTEND]`):
   ```
   [BACKEND] INFO:     Uvicorn running on http://0.0.0.0:8000
   [FRONTEND]   VITE  ready in ... ms
   [FRONTEND]   ➜  Local:   http://localhost:3000/
   ```
4. Untuk menghentikan kedua server, tekan `Ctrl+C` sekali saja di terminal tersebut — `concurrently` akan menghentikan kedua proses child sekaligus.

> 💡 Jika Anda ingin menjalankan frontend dan backend secara terpisah (misalnya untuk debugging), ikuti panduan manual di bagian **5.1** dan **5.2** di bawah ini.

### 5.1 Menjalankan Frontend (Manual/Terpisah)
1. Masuk ke folder frontend:
   ```bash
   cd frontend
   ```
2. Pasang semua pustaka dependensi:
   ```bash
   npm install
   ```
3. Jalankan server pengembangan Vite lokal:
   ```bash
   npm run dev
   ```
4. Buka alamat `http://localhost:3000` di peramban (browser) Google Chrome/Microsoft Edge Anda.

### 5.2 Menjalankan Backend (Manual/Terpisah)
1. Masuk ke folder backend:
   ```bash
   cd backend
   ```
2. Buat python virtual environment dan pasang dependensi:
   ```bash
   python -m venv venv
   # Untuk Windows:
   venv\\Scripts\\activate
   # Untuk macOS/Linux:
   source venv/bin/activate
   
   pip install -r requirements.txt
   ```
3. Jalankan server FastAPI uvicorn (WAJIB dijalankan sebagai modul dengan flag `-m`, bukan `python app/main.py`, karena skrip menggunakan import package `app.*` yang hanya bisa di-resolve lewat mode modul):
   ```bash
   python -m app.main
   ```
4. Tunggu sekitar 10-15 detik sampai muncul log `Uvicorn running on http://0.0.0.0:8000` (proses awal memuat model TensorFlow Lite dan aktif dalam mode reload). Server backend akan berjalan secara lokal di `http://localhost:8000`. Dokumentasi Swagger API dapat diakses langsung pada `http://localhost:8000/docs`, dan status kesehatan model dapat dicek pada `http://localhost:8000/health`.

   > ⚠️ **Catatan:** Menjalankan `python app/main.py` secara langsung akan menghasilkan error `ModuleNotFoundError: No module named 'app'`, karena Python tidak dapat menemukan package `app` pada `sys.path` saat file dieksekusi langsung sebagai skrip.

---

## 6. Cara Deploy ke Vercel (Frontend)
1. Pasang alat bantu Vercel CLI global jika belum ada:
   ```bash
   npm install -g vercel
   ```
2. Masuk ke folder root `medsign-ai` dan jalankan inisialisasi vercel:
   ```bash
   vercel
   ```
3. Ikuti langkah konfigurasi:
   *   Pilih akun & link ke proyek baru.
   *   Vercel akan mendeteksi `vercel.json` secara otomatis di root folder dan mengarahkan kompilasi statis dist dari sub-folder `frontend` sesuai konfigurasi.
   *   Jika ingin mengarahkan backend API real-time, Anda dapat mendaftarkan variabel lingkungan `VITE_API_BASE_URL` mengarah ke URL backend FastAPI produksi Anda.
   *   *Catatan:* Bila backend API belum dideploy, frontend akan tetap dapat berjalan penuh dengan beralih otomatis ke **Mode Demo Lokal** (*Simulated Gesture Engine*).

---

## 7. Instruksi Push ke GitHub
Harap lakukan inisialisasi repositori Git dan dorong kode Anda ke GitHub dengan panduan berikut:
1. Inisialisasi git lokal dari root folder `medsign-ai`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: MedSign AI prototype"
   ```
2. Masuk ke repositori GitHub Anda dan buat proyek baru kosong, lalu jalankan:
   ```bash
   git branch -M main
   # GANTI USERNAME DAN NAMA_REPO sesuai akun GitHub Anda:
   git remote add origin https://github.com/USERNAME/NAMA_REPO.git
   git push -u origin main
   ```

---

## 8. Pernyataan Batasan (Disclaimer Medis)
> ⚠️ **PENTING:** MedSign AI dirancang khusus sebagai alat bantu terjemahan isyarat BISINDO klinis dan asisten komunikasi interaktif dua arah. Sistem ini adalah produk purwarupa (prototype) akademis dan bukan merupakan alat diagnosis medis mandiri, pengganti praktisi kesehatan profesional, maupun pengganti penilaian medis klinis berlisensi.

---

## 9. Comprehensive System Operations & Telemedicine Architecture Guide

### Project Overview
MedSign is a secure healthcare management and telemedicine platform customized for the Indonesian healthcare landscape. It enables clinical deaf-mute accessibility through deep learning hand landmark translation and robust telemedicine consultations.

### Telemedicine Architecture
- **Frontend Layer:** Built using React 18 + Vite (configured to run on port `3001` via `vite.config.js`). It operates via state-based routing inside `App.jsx` instead of React Router.
- **Backend Layer:** FastAPI Python 3.11 running on port `8000`. Employs WebSockets (`/api/v1/stream`) for hand landmark translation and custom routers for telemedicine operations.
- **Database Layer:** SQLite database containing normalized schemas for facilities, users (admins, doctors, patients), consents, sessions, session logs, and medical records.

### Roles & RBAC Matrix
The system enforces strict role-based access control (RBAC) boundaries checkable server-side on every API route:
1. **SUPER_ADMIN (administrator):** Has global overview of all facilities, administrative audit logs, and can manage facilities and faskes admins.
2. **ADMIN (Facility Admin):** Manages doctors, patients, assignments, and audit logs belonging *only* to their own facility (enforced via `facility_id` database queries). Mismatched queries return `403 Forbidden`.
3. **DOCTOR:** Views assigned patients, conducts clinical sessions, uses persistent Speech-to-Text transcription, and writes official electronic medical records (RME).
4. **PATIENT:** Accesses own profile (NIK masked: `************1234`), consents tracking, and own consultation history.

### Environment Variables
Setup `.env` in the `backend/` folder:
```env
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=
SUPABASE_KEY=
```

### Database Setup, Migration & Seed Data
- Migrations are built into `app/db.py` under the `init_db()` function. When the server launches, it automatically checks, alters, and creates the required tables.
- Seeding inserts 3 mock facilities (RS Islam Jakarta, Klinik Sentosa Malang, Medika Center Surabaya), 3 facility admins, 5 doctors, and 10 patients with random credentials.

### Demo Credentials
On startup, a `credentials.txt` file is written to the root folder with all generated passwords. Passwords are hashed in the database using PBKDF2-SHA256.
- **Super Admin:** Username `administrator` / Password `TahutekumEnak123!@#`
- **Admin RSI:** Username `adminrsi` / Password `rsipalingtop`
- **Doctor RSI:** Email `dr.bita@medsign.local` / Password `DokterRSI2026!`
- **Patient RSI:** NIK `390572816403` / Password `glennperkasa123`

### Identity Verification (KTP & NIK Workflow)
1. **Request:** Patient registers NIK and details (`POST /api/v1/patient/verify/ktp`).
2. **Biometric Consent:** Patient must explicitly agree to biometric terms (`POST /api/v1/patient/consent` with type `BIOMETRIC_VERIFICATION`).
3. **Face Verification:** Patient captures selfie photo (`POST /api/v1/patient/verify/face`).
4. **Admin Approval:** Facility Admin reviews verification status and approves or rejects (`POST /api/v1/admin/patients/{id}/approve`). Accounts are only active and able to log in after approval.

### File Storage Security
All sensitive documents (such as KTP images or face photos) are kept in private directories. URLs to these assets are not public, and access requires backend session authorization checks.

### Speech-to-Text (STT) Setup
Telemedicine consult session utilizes persistent browser-native Speech-to-Text. The microphone must be started explicitly by the doctor (no auto-record). The transcription is editable, and the mic button remains repeatable indefinitely.

### Secure Audit Logging & Security Controls
- Audit records log event types (such as `CONSENT_ACCEPTED`, `KTP_VERIFIED`, `MEDICAL_RECORD_CREATED`) with user IP, browser agent, success flag, and facility context.
- Rate-limiting blocks brute-force login attempts (locking accounts after 5 failures for 60 seconds with `429 Too Many Requests`).
- Passwords are hashed, sensitive data is encrypted/masked, and SQL Injection/XSS mitigations are active.

### Compliance Notes (Indonesian Law)
- **UU No. 27/2022 (UU PDP):** Biometric and health data require explicit patient consent before processing.
- **Permenkes No. 24/2022:** Electronic Medical catatans (RME) are structurally stored in `medical_records` table and isolated per healthcare facility.
- **UU No. 17/2023:** Guarantees patient confidentiality. Identifiers like NIK are masked in standard views.

### Testing
To run the automated security, rate limiting, and cross-facility isolation test suite:
```bash
python -m unittest backend/tests/test_auth_rls.py
```

### Deployment
Frontend can be compiled to production HTML/JS:
```bash
cd frontend && npm run build
```
FastAPI backend can be containerized using `backend/Dockerfile`.
