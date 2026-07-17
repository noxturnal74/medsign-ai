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
│   │   │   ├── predict.py
│   │   │   ├── session.py
│   │   │   └── vocabulary.py
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
