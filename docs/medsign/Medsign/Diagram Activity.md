# Diagram Activity - MedSign AI

Dokumen ini mendefinisikan diagram aktivitas alur kerja (workflow) untuk masing-masing aktor dalam sistem MedSign AI.

## 1. Alur Aktivitas Dokter (Konsultasi & SOAP Note)

```mermaid
flowchart TD
    Start([Mulai]) --> Login[Dokter masuk ke sistem via Login Portal]
    Login --> CheckRole{Peran = 'doctor'?}
    
    CheckRole -- Ya --> Dashboard[Buka Dashboard Dokter]
    CheckRole -- Tidak --> AccessDenied[Akses Ditolak - HTTP 403]
    
    Dashboard --> SearchPatient[Cari Pasien berdasarkan Nama / Rekam Medis]
    SearchPatient --> CheckFound{Pasien Ditemukan?}
    
    CheckFound -- Ya --> SelectPatient[Pilih Pasien & Klik 'Mulai Sesi']
    CheckFound -- Tidak --> NotFound[Tampilkan Pesan Pasien Tidak Terdaftar]
    
    SelectPatient --> StartCam[Aktifkan Kamera & Deteksi Landmark Tangan]
    StartCam --> LoopStart[Pasien memeragakan isyarat BISINDO]
    LoopStart --> Translate[Sistem menerjemahkan isyarat ke teks real-time]
    Translate --> DoctorResponse[Dokter merespon via Speech-to-Text / Preset]
    DoctorResponse --> SaveLog[Teks disimpan otomatis ke log database sesi]
    
    SaveLog --> CheckSelesai{Konsultasi Selesai?}
    CheckSelesai -- Tidak --> LoopStart
    CheckSelesai -- Ya --> ClickSOAP[Dokter klik 'Buat SOAP Note']
    
    ClickSOAP --> TriggerGemini[Sistem memicu Gemini 3.6 secara asinkron]
    TriggerGemini --> DraftSOAP[Draf SOAP Note S, O, A, P ditampilkan]
    DraftSOAP --> EditSOAP[Dokter meninjau & menyunting draf rekam medis]
    EditSOAP --> SaveRME[Dokter klik 'Simpan Rekam Medis']
    SaveRME --> EndSession[Sistem menyimpan catatan SOAP ke Supabase & mengakhiri sesi]
    EndSession --> Redirect[Sistem otomatis mengalihkan tampilan ke Histori Sesi Pasien]
    Redirect --> End([Selesai])
    
    NotFound --> End
    AccessDenied --> End
```

## 2. Alur Aktivitas Pasien (Translasi & TTS)

```mermaid
flowchart TD
    Start([Mulai]) --> Login[Pasien login menggunakan NIK & Password]
    Login --> Consent[Persetujuan & Proteksi Privasi Kamera ditampilkan]
    Consent --> CheckConsent{Pasien menyetujui?}
    
    CheckConsent -- Tidak --> Home[Kembali ke Beranda depan]
    CheckConsent -- Ya --> StartCam[Buka Kamera depan & pemindaian landmark 3D]
    
    StartCam --> CheckHand{Tangan terdeteksi di area target?}
    CheckHand -- Ya --> Analyzing[Tampilkan 'Menganalisis gerakan...' & Mulai BISINDO]
    CheckHand -- Tidak --> PositionHand[Tampilkan 'Posisikan tangan di layar']
    
    Analyzing --> OutputTTS[Teks terjemahan real-time tampil & dilafalkan via TTS]
    PositionHand --> OutputTTS
    
    OutputTTS --> CheckType{Pasien ingin mengetik teks bebas?}
    CheckType -- Ya --> TypeText[Ketik pesan & klik 'Ucapkan' / Enter]
    CheckType -- Tidak --> End([Selesai])
    
    TypeText --> Speak[Sistem melafalkan teks & menyimpan log ke sesi aktif]
    Speak --> End
    Home --> End
```

## 3. Alur Aktivitas Admin (Pendaftaran & Pelatihan Model)

```mermaid
flowchart TD
    Start([Mulai]) --> Login[Admin login ke Portal Admin lokal faskes]
    Login --> ActionBranch{Pilih Aktivitas}
    
    ActionBranch --> Pasien[Kelola Data Pasien]
    Pasien --> RegPasien[Registrasi NIK Pasien Baru - Enkripsi Supabase]
    RegPasien --> End([Selesai])
    
    ActionBranch --> Relasi[Kelola Relasi Pendampingan]
    Relasi --> Assign[Tugaskan Pasien di bawah naungan Dokter Pemeriksa]
    Assign --> End
    
    ActionBranch --> DasborML[Dasbor ML - Ambil Data Dataset]
    DasborML --> Record[Pilih Signer, target kata & rekam landmark tangan]
    Record --> BalanceCheck[Balance Checker memantau sebaran sampel]
    BalanceCheck --> CheckCorrupt{Ada sampel rusak?}
    
    CheckCorrupt -- Ya --> BulkDelete[Lakukan Hapus Masal pada file .npy yang rusak]
    CheckCorrupt -- Tidak --> CheckOverfit{Model Overfitting?}
    BulkDelete --> CheckOverfit
    
    CheckOverfit -- Ya --> Rollback[Lakukan Rollback ke versi dataset orisinal]
    CheckOverfit -- Tidak --> CheckCukup{Data Cukup / Min 30?}
    Rollback --> CheckCukup
    
    CheckCukup -- Ya --> Train[Klik 'Mulai Training Model' - Epoch: 120, GRU/LSTM]
    CheckCukup -- Tidak --> Record
    
    Train --> AutoReload[Backend melatih model & memicu Auto-Reload TFLite]
    AutoReload --> End
```

## 4. Alur Aktivitas Super Admin (Manajemen Keamanan & Faskes)

```mermaid
flowchart TD
    Start([Mulai]) --> Login[Super Admin login ke Keamanan Global Portal]
    Login --> ActionBranch{Pilih Aktivitas}
    
    ActionBranch --> Faskes[Kelola Faskes Global]
    Faskes --> RegFaskes[Registrasi Faskes & Akun Admin lokal baru]
    RegFaskes --> End([Selesai])
    
    ActionBranch --> Audit[Pantau Sistem Keamanan & Kepatuhan]
    Audit --> Monitor[Monitor Audit Logs global untuk akses data medis]
    Monitor --> Export[Unduh file log audit berupa CSV]
    Export --> End
    
    ActionBranch --> Maintenance[Database Maintenance]
    Maintenance --> Backup[Picu Backup database Supabase asinkron]
    Backup --> End
    
    ActionBranch --> Homepage[Homepage Management]
    Homepage --> Upload[Upload Konten Baru - Tentang Kami / Mitra]
    Upload --> Save[Simpan update ke database Supabase]
    Save --> End
```
