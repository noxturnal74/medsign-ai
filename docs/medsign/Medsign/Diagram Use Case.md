# Diagram Use Case - MedSign AI

Dokumen ini mendefinisikan hubungan antara aktor (pengguna) dan fungsionalitas sistem (use cases) pada platform MedSign AI.

## 1. Visualisasi Use Case (Mermaid)

```mermaid
usecaseDiagram
    actor Pasien as "Pasien Tuli"
    actor Dokter as "Dokter Pemeriksa"
    actor Admin as "Admin Faskes"
    actor SuperAdmin as "Super Admin"

    %% Boundary System
    rect "Sistem MedSign AI"
        usecase UC_Login as "Login & Autentikasi (JWT/RBAC)"
        usecase UC_Kamera as "Aktifkan Kamera & Deteksi Sendi 3D (MediaPipe)"
        usecase UC_Translasi as "Translasi BISINDO Medis (TFLite)"
        usecase UC_TTS as "Ketik & Bersuara (Text-to-Speech)"
        usecase UC_Log as "Tulis Sesi Log Percakapan"
        usecase UC_Quick as "Kirim preset Tanggapan Medis Cepat"
        usecase UC_STT as "Speech-to-Text Dokter"
        usecase UC_SOAP as "Generate Draf SOAP Note (Gemini 3.6)"
        usecase UC_RME as "Sunting & Simpan Rekam Medis (Supabase)"
        usecase UC_Histori as "Lihat Histori Konsultasi Pasien"
        usecase UC_RegPasien as "Registrasi & Reset Password Pasien"
        usecase UC_RegDokter as "Registrasi & Kelola Akun Dokter"
        usecase UC_Assign as "Penugasan Relasi Dokter-Pasien"
        usecase UC_Record as "Perekaman Dataset Landmark"
        usecase UC_Augment as "AI Dataset Augmentasi & Rollback"
        usecase UC_Balance as "Balance Checker & Hapus Masal"
        usecase UC_Train as "Pelatihan Model Klinis Asinkron"
        usecase UC_Faskes as "Manajemen Faskes Global"
        usecase UC_AdminFaskes as "Manajemen Admin Faskes"
        usecase UC_Audit as "Sistem Audit Logs Keamanan"
        usecase UC_Backup as "Database Backups & Restore"
        usecase UC_Homepage as "Kelola Konten Homepage (Mitra/Tentang Kami)"
    end

    %% Relasi Pasien
    Pasien --> UC_Login
    Pasien --> UC_Kamera
    Pasien --> UC_Translasi
    Pasien --> UC_TTS
    Pasien --> UC_Log

    %% Relasi Dokter
    Dokter --> UC_Login
    Dokter --> UC_Kamera
    Dokter --> UC_Translasi
    Dokter --> UC_Quick
    Dokter --> UC_STT
    Dokter --> UC_SOAP
    Dokter --> UC_RME
    Dokter --> UC_Histori
    Dokter --> UC_Log

    %% Relasi Admin
    Admin --> UC_Login
    Admin --> UC_RegPasien
    Admin --> UC_RegDokter
    Admin --> UC_Assign
    Admin --> UC_Record
    Admin --> UC_Augment
    Admin --> UC_Balance
    Admin --> UC_Train

    %% Relasi Super Admin
    SuperAdmin --> UC_Login
    SuperAdmin --> UC_Faskes
    SuperAdmin --> UC_AdminFaskes
    SuperAdmin --> UC_Audit
    SuperAdmin --> UC_Backup
    SuperAdmin --> UC_Homepage
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
