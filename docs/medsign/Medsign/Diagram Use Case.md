# Diagram Use Case - MedSign AI

Dokumen ini mendefinisikan hubungan antara aktor (pengguna) dan fungsionalitas sistem (use cases) pada platform MedSign AI.

## 1. Visualisasi Use Case (Mermaid)

```mermaid
flowchart TB
    %% Actors
    Pasien["Pasien Tuli (Aktor)"]
    Dokter["Dokter Pemeriksa (Aktor)"]
    Admin["Admin Faskes (Aktor)"]
    SuperAdmin["Super Admin (Aktor)"]

    subgraph Sistem_MedSign_AI ["Sistem MedSign AI"]
        %% Patient Use Cases
        UC_Login["Autentikasi & Login (JWT/RBAC)"]
        UC_Kamera["Deteksi Sendi Tangan 3D (MediaPipe)"]
        UC_Translasi["Translasi Isyarat BISINDO Real-Time"]
        UC_TTS["Ketik & Bersuara (Text-to-Speech)"]
        UC_Log["Simpan Log Percakapan Sesi"]
        
        %% Doctor Use Cases
        UC_Quick["Preset Tanggapan Medis Cepat"]
        UC_STT["Speech-to-Text Dokter"]
        UC_SOAP["Draf SOAP Note Otomatis (Gemini 3.6)"]
        UC_RME["Sunting & Simpan RME (Supabase)"]
        UC_Histori["Lihat Histori Konsultasi Pasien"]
        
        %% Admin Use Cases
        UC_RegPasien["Registrasi & Reset Password Pasien"]
        UC_RegDokter["Registrasi & Kelola Akun Dokter"]
        UC_Assign["Penugasan Relasi Dokter-Pasien (RLS)"]
        UC_Record["Perekaman Dataset Landmark (Npy)"]
        UC_Augment["AI Dataset Augmentasi & Rollback"]
        UC_Balance["Balance Checker & Hapus Masal"]
        UC_Train["Pelatihan Model Klinis Asinkron"]
        
        %% Super Admin Use Cases
        UC_Faskes["Manajemen Faskes Global"]
        UC_AdminFaskes["Manajemen Akun Admin Faskes"]
        UC_Audit["Sistem Audit Logs & Ekspor CSV"]
        UC_Backup["Database Backups & Restore"]
        UC_Homepage["Kelola Konten Homepage (Mitra/Tentang Kami)"]
    end

    %% Connections
    Pasien --> UC_Login
    Pasien --> UC_Kamera
    Pasien --> UC_Translasi
    Pasien --> UC_TTS
    Pasien --> UC_Log

    Dokter --> UC_Login
    Dokter --> UC_Kamera
    Dokter --> UC_Translasi
    Dokter --> UC_Quick
    Dokter --> UC_STT
    Dokter --> UC_SOAP
    Dokter --> UC_RME
    Dokter --> UC_Histori
    Dokter --> UC_Log

    Admin --> UC_Login
    Admin --> UC_RegPasien
    Admin --> UC_RegDokter
    Admin --> UC_Assign
    Admin --> UC_Record
    Admin --> UC_Augment
    Admin --> UC_Balance
    Admin --> UC_Train

    SuperAdmin --> UC_Login
    SuperAdmin --> UC_Faskes
    SuperAdmin --> UC_AdminFaskes
    SuperAdmin --> UC_Audit
    SuperAdmin --> UC_Backup
    SuperAdmin --> UC_Homepage

    %% Style nodes
    style Pasien fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0f172a
    style Dokter fill:#e0f2fe,stroke:#0284c7,stroke-width:2px,color:#0f172a
    style Admin fill:#fef3c7,stroke:#d97706,stroke-width:2px,color:#0f172a
    style SuperAdmin fill:#f3e8ff,stroke:#7e22ce,stroke-width:2px,color:#0f172a
```

---

## 2. Penjelasan Aktor & Use Case

### A. Aktor: Pasien Tuli
Pasien Tuli bertindak sebagai subjek pemeriksaan yang menggunakan bahasa isyarat BISINDO untuk menyampaikan keluhan medis.
* **Login & Autentikasi:** Masuk ke sistem menggunakan NIK dan kata sandi yang dibuat oleh Admin/Dokter.
* **Aktifkan Kamera & Deteksi 3D:** Membuka kamera depan untuk memulai pelacakan 21 titik koordinat landmark tangan.
* **Translasi BISINDO Medis:** Menampilkan hasil konversi gerakan isyarat ke teks klinis secara real-time.
* **Ketik & Bersuara (TTS):** Menggunakan keyboard virtual untuk mengetik teks bebas yang kemudian dibacakan oleh mesin suara (SpeechSynthesis) tanpa melafalkan underscore/setrip.
* **Tulis Sesi Log Percakapan:** Menyimpan teks yang diucapkan pasien secara real-time ke dalam log database sesi konsultasi.

### B. Aktor: Dokter Pemeriksa
Dokter bertindak sebagai pemeriksa medis yang mendiagnosis dan berkomunikasi dengan pasien tuli.
* **Login & Autentikasi:** Masuk dengan email dan kata sandi khusus faskes lokal.
* **Kamera & Translasi:** Membaca teks hasil deteksi BISINDO pasien di layarnya.
* **Kirim preset Tanggapan Medis Cepat:** Mengirimkan preset tanggapan klinis yang paling sering digunakan (seperti menanyakan keluhan).
* **Speech-to-Text Dokter:** Merekam suara dokter saat berbicara menjadi teks tertulis untuk pasien.
* **Generate Draf SOAP Note:** Memicu rangkuman medis SOAP otomatis menggunakan model Gemini 3.6 Flash atau fallback lokal.
* **Sunting & Simpan Rekam Medis:** Mengedit draf SOAP Note lalu menyimpannya ke database Supabase secara permanen.
* **Lihat Histori Konsultasi Pasien:** Memantau riwayat RME lama milik pasien yang ditugaskan di bawah naungannya.

### C. Aktor: Admin Faskes
Admin faskes bertindak sebagai pengelola operasional medis di rumah sakit/klinik setempat.
* **Registrasi & Reset Password Pasien:** Mendaftarkan pasien tuli baru secara offline (tidak ada registrasi mandiri demi proteksi NIK) dan me-reset kata sandi bermasalah.
* **Registrasi & Kelola Akun Dokter:** Mengelola akun dokter pemeriksa dan status keaktifannya.
* **Penugasan Relasi Dokter-Pasien:** Menugaskan relasi pendampingan antara dokter dan pasien tuli (syarat isolasi data RLS).
* **Dasbor ML (Perekaman, Augmentasi, Balance, Training):** Mengelola dataset landmark (pengambilan data, manipulasi visual, visualisasi keseimbangan, dan pemicuan pelatihan model klinis baru).

### D. Aktor: Super Admin
Super Admin bertindak sebagai administrator sistem tingkat tertinggi (IT Pusat / Developer).
* **Manajemen Faskes Global:** Mendaftarkan dan mengelola profil rumah sakit/klinik yang terintegrasi.
* **Manajemen Admin Faskes:** Membuat dan mengelola akun Administrator lokal faskes.
* **Sistem Audit Logs Keamanan:** Mengawasi dan mengekspor seluruh log jejak audit akses data medis sensitif.
* **Database Backups & Restore:** Mengelola pencadangan database secara berkala.
* **Kelola Konten Homepage:** Memperbarui konten eksternal landing page (Mitra, Instagram, Ulasan, dan Tentang Kami).
