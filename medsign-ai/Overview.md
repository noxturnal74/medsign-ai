# Overview Proyek: MedSign AI ???

**MedSign AI** adalah aplikasi asisten komunikasi medis dua arah untuk menjembatani hambatan komunikasi antara pasien tunarungu (Teman Tuli) dan tenaga medis di fasilitas kesehatan (Puskesmas, Klinik, Rumah Sakit) seluruh Indonesia.

Sistem ini mentranslasikan gerakan isyarat BISINDO klinis secara real-time menjadi teks & suara, dan mengubah respon dokter (teks/frasa cepat) menjadi ucapan audio (Text-to-Speech).

## ?? Tujuan Proyek
1.  **Aksesibilitas Kesehatan Inklusif**: Menyediakan alat bantu komunikasi otomatis di faskes 24/7.
2.  **Mengurangi Misdiagnosis**: Membantu dokter melakukan anamnesis mendalam tanpa kendala bahasa.
3.  **Privasi Pasien**: Teman Tuli tidak harus selalu didampingi keluarga saat berkonsultasi medis.

## ??? Fitur Utama (MVP)
*   **Deteksi Kamera Real-Time**: Aliran kamera dengan overlay visualisasi 21 koordinat landmark tangan berbasis MediaPipe.
*   **Penerjemah Hibrida (Hybrid Translation)**:
    *   *Mode Kosakata Medis (Clinical Mode)*: Deteksi gerakan dinamis menggunakan model LSTM (30 frame sequence).
    *   *Mode Huruf Statis (Spelling Mode)*: Deteksi huruf abjad statis untuk ejaan kustom (nama/singkatan).
*   **Respon Medis Dokter & Audio Speech**: Fitur ketik bebas dan tombol pintas (10 preset) dilengkapi Text-to-Speech lafal Bahasa Indonesia.
*   **Panduan Kosakata Pintasan (Shortcut)**: Grid 35 kosakata medis prioritas dalam 5 kategori klinis untuk opsi input manual.
*   **Blinking Emergency Alert**: Alarm merah berkedip otomatis ketika mendeteksi gejala darurat (misal: "nyeri dada", "sesak napas").
*   **Pencatatan Sesi (Session Log)**: Transkrip sesi interaktif yang dapat disalin atau diekspor ke file `.txt`.
