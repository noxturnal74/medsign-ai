# Buku Panduan Sistem MedSign

## Daftar Isi
- [Pendahuluan](#pendahuluan)
- [Panduan untuk Super Admin](#panduan-untuk-super-admin)
  - [Manajemen Fasilitas Kesehatan](#manajemen-fasilitas-kesehatan)
  - [Manajemen Administrator Faskes](#manajemen-administrator-faskes)
  - [Sistem Audit Logs](#sistem-audit-logs)
  - [Manajemen Database Backups](#manajemen-database-backups)
  - [Kelola Konten Homepage](#kelola-konten-homepage)
  - [Manajemen Grant & Akses](#manajemen-grant--akses)
- [Panduan untuk Admin](#panduan-untuk-admin)
  - [Kelola Data Pasien](#kelola-data-pasien)
  - [Kelola Akun Dokter](#kelola-akun-dokter)
  - [Kelola Relasi Dokter-Pasien](#kelola-relasi-dokter-pasien)
  - [Dasbor Data & Perekaman Landmark](#dasbor-data--perekaman-landmark)
  - [AI Dataset Augmentation & Rollback](#ai-dataset-augmentation--rollback)
  - [Balance Checker & Hapus Masal](#balance-checker--hapus-masal)
  - [Pelatihan Model Klinis](#pelatihan-model-klinis)
- [Panduan untuk Dokter](#panduan-untuk-dokter)
  - [Pencarian & Pemilihan Pasien](#pencarian--pemilihan-pasien)
  - [Memulai Sesi Konsultasi](#memulai-sesi-konsultasi)
  - [AI SOAP Writer (Clinical Notetaker)](#ai-soap-writer-clinical-notetaker)
  - [Catatan SOAP Medis & RME](#catatan-soap-medis--rme)
- [Pertanyaan Umum (FAQ)](#pertanyaan-umum-faq)
- [Istilah Penting (Glosarium)](#istilah-penting-glosarium)

---

## Pendahuluan
**MedSign AI** adalah platform bantu komunikasi BISINDO (Bahasa Isyarat Indonesia) untuk pasien tuli/tuna rungu di lingkungan faskes atau rumah sakit. Menggunakan computer vision dan deep learning, sistem menerjemahkan isyarat pasien ke dalam istilah medis terstruktur secara real-time.

### Peran Pengguna & Kewenangan
| Role | Siapa yang Pakai | Akses Utama |
|---|---|---|
| **Super Admin** | Staf IT RS Pusat / Developer | Manajemen Faskes, Admin Faskes, Audit Logs Global, ML Model Global, Konten Homepage |
| **Admin** | Perekam Medis / Staf Faskes | Registrasi Pasien, Reset Password, Kelola Dokter, Perekaman Landmark, Augmentasi Data, Training Model |
| **Dokter** | Tenaga Medis / Pemeriksa | Pilih Pasien, Mulai Konsultasi, input RME, AI SOAP Writer, preset tanggapan medis |

---

## Panduan untuk Super Admin

### Manajemen Fasilitas Kesehatan
**Apa fungsinya:** Mengelola daftar fasilitas kesehatan (Faskes) yang terintegrasi dengan sistem MedSign AI.
**Langkah-langkah:**
1. Klik menu **Kelola Faskes** pada sidebar kiri.
2. Klik tombol **Tambah Faskes** di bagian kanan atas.
3. Isi data kode faskes unik, nama rumah sakit/klinik, alamat, kontak, dan logo faskes.
4. Klik **Simpan**.
> 📷 [Screenshot: Halaman Kelola Faskes dengan modal tambah data]

### Manajemen Administrator Faskes
**Apa fungsinya:** Mengelola akun Administrator (Admin lokal) untuk masing-masing faskes terdaftar.
**Langkah-langkah:**
1. Klik menu **Kelola Admin Faskes** pada sidebar.
2. Klik tombol **Tambah Administrator**.
3. Pilih faskes yang ditugaskan, isi username, nama lengkap, email, password, dan status keaktifan.
4. Klik **Simpan**.
> 📷 [Screenshot: Form tambah administrator faskes]

### Sistem Audit Logs
**Apa fungsinya:** Memantau log audit keamanan global untuk merekam setiap aktivitas sensitif (seperti akses data rekam medis pasien).
**Langkah-langkah:**
1. Klik menu **Sistem Audit Logs** di sidebar.
2. Gunakan filter berdasarkan peran aktor, jenis aksi, atau rentang tanggal.
3. Klik **Ekspor CSV** jika ingin mengunduh log audit untuk keperluan kepatuhan hukum.
> 📷 [Screenshot: Daftar log audit dengan filter pencarian]

### Manajemen Database Backups
**Apa fungsinya:** Melakukan pencadangan (*backup*) data SQLite / PostgreSQL secara berkala untuk pemulihan bencana.
**Langkah-langkah:**
1. Klik menu **Database Backups**.
2. Klik **Buat Backup Baru** untuk memicu pencadangan database secara asinkron.
3. Untuk memulihkan data lama, pilih berkas backup di tabel riwayat lalu klik **Restore Backup**.
**Peringatan:** Proses *Restore* akan menimpa data saat ini. Lakukan hanya jika terjadi korupsi data!
> 📷 [Screenshot: Riwayat cadangan database dan tombol buat backup]

### Kelola Konten Homepage
**Apa fungsinya:** Mengelola konten dinamis yang tampil di landing page depan faskes (mitra, ulasan ulasan, instagram feed, artikel, dokumentasi tim).
**Langkah-langkah:**
1. Klik menu **Kelola Konten**.
2. Pilih sub-tab modul yang ingin diubah (misalnya **Tentang Kami**).
3. Klik **Tambah Item Baru**, lalu isi form dan klik **Upload Gambar/Foto** untuk memperbarui poster visual.
4. Klik **Simpan**.
> 📷 [Screenshot: Halaman Kelola Konten Homepage - Tab Tentang Kami]

### Manajemen Grant & Akses
**Apa fungsinya:** Mengatur hak akses fitur ML tingkat lanjut (perekaman, augmentasi, training) untuk akun dokter atau admin tertentu.
**Langkah-langkah:**
1. Klik menu **Grant & Akses**.
2. Pilih nama dokter/admin dari daftar.
3. Centang modul akses yang diizinkan (seperti `balance_checker` atau `train_model`).
4. Klik **Terapkan Hak Akses**.
> 📷 [Screenshot: Form centang hak akses grant faskes]

---

## Panduan untuk Admin

### Kelola Data Pasien
**Apa fungsinya:** Mendaftarkan pasien tuli baru dan mengelola kredensial RME mereka.
**Langkah-langkah:**
1. Masuk ke halaman **Portal Admin**, lalu pilih menu **Kelola Pasien**.
2. Klik **Tambah Pasien Baru**, isi NIK, Nama Lengkap, dan Tanggal Lahir (sistem akan menolak pendaftaran mandiri oleh pasien demi melindungi NIK).
3. Jika pasien lupa password, klik **Reset Password** pada baris data pasien untuk menghasilkan password acak baru.
> 📷 [Screenshot: Halaman kelola data pasien dengan opsi tambah dan reset password]

### Kelola Akun Dokter
**Apa fungsinya:** Mendaftarkan dan mengaktifkan akun dokter pemeriksa di faskes setempat.
**Langkah-langkah:**
1. Pilih menu **Kelola Dokter** di bawah Portal Admin.
2. Klik **Tambah Dokter**, masukkan nama, spesialisasi, dan nomor lisensi medis.
3. Gunakan tombol togol status untuk mengaktifkan atau menonaktifkan akun dokter.
> 📷 [Screenshot: Tabel dokter dengan togol status keaktifan]

### Kelola Relasi Dokter-Pasien
**Apa fungsinya:** Menugaskan pasien ke dokter tertentu agar dokter tersebut berhak mengakses rekam medis pasien RLS.
**Langkah-langkah:**
1. Pilih menu **Penugasan Dokter-Pasien**.
2. Pilih nama dokter, lalu centang daftar pasien tuli yang ditugaskan di bawah naungannya.
3. Klik **Simpan Relasi**.
> 📷 [Screenshot: Form hubungan relasi dokter dan pasien]

### Dasbor Data & Perekaman Landmark
**Apa fungsinya:** Merekam titik landmark tangan responden untuk kebutuhan pembuatan dataset BISINDO medis.
**Langkah-langkah:**
1. Buka menu **Dataset & Training**, lalu klik tab **Rekam Dataset**.
2. Pilih responden (signer), kata target target dari daftar kosakata, dan jumlah iterasi perekaman.
3. Klik **Aktifkan Kamera** dan setujui izin kamera. Posisikan tangan di layar hingga terdeteksi lingkaran 3D hijau.
4. Lakukan gerakan isyarat berulang kali saat hitungan mundur dimulai.
> 📷 [Screenshot: Kamera rekam dataset landmark tangan]

### AI Dataset Augmentation & Rollback
**Apa fungsinya:** Melipatgandakan sampel latih isyarat secara otomatis menggunakan teknik AI spasial dan temporal untuk mengatasi data yang timpang.
**Langkah-langkah:**
1. Buka tab **AI Augmentation**.
2. Pilih kata yang akan diaugmentasi, isi jumlah variasi, dan centang metode manipulasi yang diinginkan.
3. Klik **Jalankan Augmentasi**.
4. Jika hasil pelatihan menurun, klik tombol **Rollback** untuk mengembalikan dataset ke versi asli sebelum augmentasi dilakukan.
> 📷 [Screenshot: Panel parameter AI Augmentasi data]

### Balance Checker & Hapus Masal
**Apa fungsinya:** Memantau persebaran jumlah file sampel untuk tiap kosakata dan menghapus file yang tidak valid secara masal.
**Langkah-langkah:**
1. Buka tab **Balance Checker**.
2. Cari kata target pada kolom pencarian. Kata yang kekurangan sampel akan berwarna merah dengan keterangan *NEED MORE DATA*.
3. Klik **Check Dataset** pada kata yang bermasalah.
4. Di dalam modal popup, pilih baris sampel yang tidak valid (rusak/kosong), lalu klik tombol merah **Hapus Terpilih**.
> 📷 [Screenshot: Halaman Balance Checker dan modal check dataset]

### Pelatihan Model Klinis
**Apa fungsinya:** Melatih ulang model AI BISINDO (`medsign_mvp_v1.tflite`) menggunakan dataset landmark terbaru.
**Langkah-langkah:**
1. Buka tab **Training Model**.
2. Pilih arsitektur model (contoh: **gru**) dan tentukan jumlah epoch (default **120**).
3. Klik **Mulai Pelatihan**. Pantau kurva kemajuan dan log training secara real-time.
**Catatan:** Pelatihan akan ditolak otomatis oleh sistem jika jumlah sampel latih per kata kurang dari batas 30 sampel valid.
> 📷 [Screenshot: Kurva training model dan log berjalan]

---

## Panduan untuk Dokter

### Pencarian & Pemilihan Pasien
**Apa fungsinya:** Membuka data profil rekam medis pasien tuli yang sedang berkunjung.
**Langkah-langkah:**
1. Pada **Dashboard Dokter**, masukkan nama atau nomor rekam medis (RM) pasien pada kolom pencarian.
2. Klik baris data pasien yang cocok untuk memuat detail riwayat kesehatannya.
> 📷 [Screenshot: Fitur cari pasien di dashboard dokter]

### Memulai Sesi Konsultasi
**Apa fungsinya:** Memulai perekaman dan pembacaan isyarat real-time untuk konsultasi aktif dokter-pasien.
**Langkah-langkah:**
1. Setelah memilih pasien, klik tombol **Mulai Sesi Konsultasi** berwarna biru kontras.
2. Sistem akan membuka layar ganda (atau layar tunggal). Kamera pasien akan otomatis aktif mendeteksi sendi tangan (MediaPipe 3D).
3. Teks hasil terjemahan isyarat pasien akan muncul secara real-time di layar.
> 📷 [Screenshot: Layar diagnosis konsultasi aktif]

### AI SOAP Writer (Clinical Notetaker)
**Apa fungsinya:** Merangkum seluruh jalannya percakapan isyarat dan teks dokter-pasien menjadi draf draf catatan medis SOAP terstruktur secara asinkron.
**Langkah-langkah:**
1. Selama sesi konsultasi berlangsung, sistem merekam log pertukaran pesan.
2. Setelah sesi selesai, klik tombol **Buat SOAP Note** di panel kanan.
3. AI Notetaker (didukung oleh Google Gemini) akan otomatis menyusun draf catatan dalam kategori:
   * **S (Subjective):** Keluhan utama pasien tuli.
   * **O (Objective):** Hasil pemeriksaan fisik / instruksi dokter.
   * **A (Assessment):** Kesimpulan evaluasi klinis sementara.
   * **P (Plan):** Rencana tindak lanjut (resep obat/rujukan).
> 📷 [Screenshot: Panel hasil draf SOAP Note otomatis]

### Catatan SOAP Medis & RME
**Apa fungsinya:** Menyunting, menyetujui, dan menyimpan rangkuman SOAP Note ke dalam rekam medis elektronik resmi pasien.
**Langkah-langkah:**
1. Baca draf rangkuman SOAP dari AI Notetaker dengan teliti.
2. Klik tombol **Edit** pada bagian SOAP yang ingin diubah untuk melakukan koreksi manual.
3. Klik **Simpan Rekam Medis** untuk menyimpan draf ke database Supabase secara permanen.
**Catatan:** Selalu verifikasi draf SOAP karena AI Notetaker hanya meringkas teks percakapan tanpa menambahkan diagnosis luar.
> 📷 [Screenshot: Layar edit dan persetujuan draf rekam medis]

---

## Pertanyaan Umum (FAQ)

**Q: Mengapa kamera pasien tidak dapat mendeteksi gerakan tangan kiri saya?**
* **A:** Sistem hand-landmark MedSign menggunakan model penuh (*modelComplexity: 1*). Jika tangan Anda tidak terdeteksi, pastikan pencahayaan ruangan cukup terang, kamera tidak buram, dan posisi kedua tangan berada di dalam garis putus-putus target pemindaian layar.

**Q: Mengapa tombol "Buat SOAP Note" tidak menghasilkan ringkasan atau menampilkan error koneksi?**
* **A:** Hal ini disebabkan karena jaringan internet faskes terputus atau API Key Google Gemini belum terkonfigurasi di berkas `.env` server. Sistem akan otomatis masuk ke *Fallback Mode* (ekstraksi kata kunci lokal) agar notetaker tetap bisa menulis SOAP secara terbatas.

**Q: Apakah data rekam medis pasien aman di cloud Supabase?**
* **A:** Sangat aman. Supabase menerapkan kebijakan Row Level Security (RLS) di mana dokter hanya bisa membuka rekam medis pasien terdaftar di bawah naungannya, dan pasien hanya dapat membuka datanya sendiri.

**Q: Bagaimana jika terjadi kesalahan rekam sampel isyarat saat ambil data dataset?**
* **A:** Anda dapat membuka tab **Balance Checker**, pilih kata terkait, klik **Check Dataset**, cari file yang salah lalu klik **Hapus Terpilih** untuk menghapusnya secara masal.

**Q: Berapa lama batas waktu sesi aktif dokter tetap tersimpan?**
* **A:** Sesi login memiliki masa aktif maksimal 2 jam. Jika aplikasi tidak digunakan selama 2 jam, sistem keamanan otomatis akan me-logout akun Anda dan mengarahkan kembali ke halaman login.

---

## Istilah Penting (Glosarium)

* **Model (TFLite):** File kecerdasan buatan terkompresi hasil training yang berisi pola-pola koordinat isyarat BISINDO klinis.
* **Landmark Tangan:** 21 titik koordinat sendi jari tangan yang dibaca oleh kamera menggunakan algoritma MediaPipe.
* **SOAP Note:** Standar penulisan catatan medis di rumah sakit yang terbagi atas Subjective, Objective, Assessment, dan Plan.
* **Session ID:** Nomor identitas sesi konsultasi yang menghubungkan percakapan dokter-pasien secara real-time.
* **Rollback:** Fitur untuk membatalkan proses augmentasi data dan mengembalikan berkas dataset ke versi awal yang orisinal.
