# Diagram Activity - MedSign AI

Dokumen ini mendefinisikan diagram aktivitas alur kerja (workflow) untuk masing-masing aktor dalam sistem MedSign AI.

## 1. Alur Aktivitas Dokter (Konsultasi & SOAP Note)

```mermaid
activityDiagram
    start
    :Dokter masuk ke sistem via Login Portal;
    if (Peran = 'doctor'?) then (Ya)
        :Buka Dashboard Dokter;
        :Cari Pasien berdasarkan Nama / Rekam Medis (RM);
        if (Pasien Ditemukan?) then (Ya)
            :Pilih Pasien;
            :Klik tombol 'Mulai Sesi Konsultasi';
            :Aktifkan Kamera & Deteksi Landmark Tangan Pasien;
            while (Sesi Konsultasi Berlangsung)
                :Pasien memeragakan isyarat BISINDO;
                :Sistem menerjemahkan isyarat pasien ke teks real-time;
                :Dokter merespon via Speech-to-Text / Ketik Kustom;
                :Teks disimpan otomatis ke log sesi percakapan database;
            endwhile
            :Dokter klik tombol 'Buat SOAP Note';
            :Sistem memicu Google Gemini 3.6 (atau Fallback) secara asinkron;
            :Draf SOAP Note (S, O, A, P) ditampilkan;
            :Dokter meninjau & menyunting draf rekam medis;
            :Dokter klik tombol 'Simpan Rekam Medis';
            :Sistem menyimpan catatan SOAP ke Supabase & mengakhiri sesi;
            :Sistem otomatis mengalihkan tampilan ke Histori Sesi Pasien;
        else (Tidak)
            :Tampilkan pesan pasien tidak terdaftar;
        endif
    else (Tidak)
        :Akses Ditolak (HTTP 403);
    endif
    stop
```

## 2. Alur Aktivitas Pasien (Translasi & TTS)

```mermaid
activityDiagram
    start
    :Pasien login menggunakan NIK & Kata Sandi dari Admin;
    :Persetujuan & Proteksi Privasi Kamera ditampilkan;
    if (Pasien menyetujui?) then (Ya)
        :Buka Kamera depan & mulai pemindaian landmark 3D;
        if (Tangan terdeteksi di area target?) then (Ya)
            :Tampilkan status 'Menganalisis gerakan...';
            :Mulai isyarat BISINDO;
            :Sistem menampilkan teks terjemahan real-time;
            :Teks disimpan ke log dan dibacakan via TTS (Sanitasi spasi);
        else (Tidak)
            :Tampilkan status 'Posisikan tangan di layar';
        endif
        if (Pasien ingin mengetik teks bebas?) then (Ya)
            :Ketik pesan pada input box 'Text-to-Speech';
            :Klik tombol 'Ucapkan' / tekan Enter;
            :Sistem melafalkan teks & menyimpan log ke sesi aktif;
        endif
    else (Tidak)
        :Kembali ke Beranda depan;
    endif
    stop
```

## 3. Alur Aktivitas Admin (Pendaftaran & Pelatihan Model)

```mermaid
activityDiagram
    start
    :Admin login ke Portal Admin lokal faskes;
    fork
        :Kelola Data Pasien;
        :Registrasi NIK Pasien Baru (at-rest encryption);
    fork again
        :Kelola Relasi Pendampingan;
        :Tugaskan Pasien di bawah naungan Dokter Pemeriksa;
    fork again
        :Dasbor ML - Ambil Data Dataset;
        :Pilih Signer, target kata & rekam landmark tangan;
        :Balance Checker mendeteksi kecukupan sampel;
        if (Sampel rusak terdeteksi?) then (Ya)
            :Lakukan Hapus Masal pada file .npy yang rusak;
        endif
        if (Model Overfitting?) then (Ya)
            :Lakukan Rollback ke versi dataset orisinal;
        endif
        if (Data Cukup?) then (Ya)
            :Klik 'Mulai Training Model' (Epoch: 120, GRU/LSTM);
            :Backend melatih model asinkron & memicu Auto-Reload TFLite;
        endif
    end split
    stop
```

## 4. Alur Aktivitas Super Admin (Manajemen Keamanan & Faskes)

```mermaid
activityDiagram
    start
    :Super Admin login ke Keamanan Global Portal;
    fork
        :Kelola Fasilitas Kesehatan (Faskes);
        :Registrasi kode Faskes & Admin lokal lokal;
    fork again
        :Pantau Sistem Keamanan & Kepatuhan;
        :Monitor Audit Logs global (Akses RME Dokter);
        :Unduh file log audit berupa CSV untuk regulasi;
    fork again
        :Database Maintenance;
        :Picu Backup database Supabase asinkron;
    fork again
        :Homepage Management;
        :Upload Konten Baru (Tentang Kami, Mitra, Instagram);
        :Simpan update ke database Supabase;
    end split
    stop
```
