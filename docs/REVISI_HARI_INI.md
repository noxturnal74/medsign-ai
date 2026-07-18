# Dokumen Revisi & Pengembangan MedSign AI (19 Juli 2026)

Dokumen ini mendokumentasikan seluruh pembaruan, perbaikan bug (*bug fixes*), optimalisasi performa (*performance optimization*), dan penambahan fitur baru yang diimplementasikan pada proyek **MedSign AI** (FastAPI + React) dan **MedSign Web** (Next.js) hari ini.

---

## 1. Optimalisasi Performa & Stabilitas ML (FPS Boost)
*   **Masalah**: Kamera input pasien mengalami lag parah (hanya berjalan pada 4-9 FPS) karena pengiriman koordinat menggunakan salinan kanvas (`offscreenCanvas`) yang memicu sumbatan pemrosesan browser (*GPU-to-CPU readback*).
*   **Perbaikan**: Mengubah alur pengiriman di `useMediaPipe.js` untuk menggunakan elemen `<video>` secara langsung (`image: videoElement`). Ini mengaktifkan akselerasi perangkat keras GPU native browser tanpa *readback stall*, melejitkan FPS ke batas kamera (**30+ FPS**).
*   **Stabilitas WebSocket**: Menginstal library `websockets` di venv backend dan menambahkannya ke `requirements.txt` untuk memperbaiki kegagalan koneksi WebSocket yang sebelumnya memicu status `404 Not Found` pada rute `/api/v1/stream`.

---

## 2. Pencegahan Spam Kata Berulang (Hold-Gesture Prevention)
*   **Masalah**: Ketika tangan diam pada posisi isyarat tertentu, sistem terus memprediksi kata yang sama (misal: "PUSING") setiap detik, menyepam box kalimat dan melafalkannya berkali-kali via Text-to-Speech (TTS).
*   **Perbaikan**: Menambahkan sistem *Duplicate Guard* (`lastAppendedWordRef`) di `CameraFeed.jsx`. Kata berurutan yang sama akan dilewati dan tidak akan disuarakan ulang. Sistem pengaman ini otomatis di-reset menjadi `null` begitu tangan diturunkan (deteksi hilang).

---

## 3. Fitur Hapus Masal (Bulk Delete Dataset)
*   **Masalah**: Pengelola data kesulitan menghapus data sampel yang salah satu per satu ketika jumlah data mencapai ratusan file.
*   **Perbaikan**:
    *   **Backend**: Menambahkan rute `/api/v1/dataset/samples/delete-bulk` untuk memproses penghapusan masal file `.npy` pada disk server dalam satu request HTTP.
    *   **Frontend**: Menambahkan checkbox seleksi pada baris header (pilih semua) dan baris sampel individual di dalam modal **Check Dataset**. Menyediakan panel melayang merah **Hapus Terpilih ({jumlah} file)** yang interaktif.

---

## 4. Pilihan Multi-Bahasa (Localization ID / EN)
*   **MedSign AI (Vite + React)**: 
    *   Menambahkan dropdown bahasa **ID 🇮🇩 / EN 🇬🇧** di Navbar dengan visual glass.
    *   Teks UI (Beranda, Pasien, Dokter, Panduan, Tentang) dan status ejaan diterjemahkan dinamis.
    *   **Penerjemahan Real-Time**: Kata hasil prediksi isyarat dari model (seperti `dada` -> `Chest`, `dahak` -> `Phlegm`) otomatis diterjemahkan ke bahasa aktif secara real-time pada layar konsultasi dan dilafalkan oleh TTS.
*   **MedSign Web (Next.js Landing Page)**:
    *   Membuat `LanguageProvider` dan `useLanguage` React Context.
    *   Navbar dan section Hero Next.js disesuaikan agar langsung bertransisi bahasa secara dinamis.

---

## 5. Visual Efek 3D & Gerakan (Motion Graphics)
*   **Deteksi Sendi 3D**: Mengintegrasikan koordinat kedalaman `z` dari MediaPipe di `useMediaPipe.js`. Diameter sendi lingkaran (*joints*) dan ketebalan tulang penhubung (*bones*) diubah skalanya secara dinamis sesuai jarak tangan ke kamera. Menambahkan *highlight reflection* putih pada sendi agar menyerupai bola 3D melayang.
*   **3D Card Hover (Linear-Style)**: Membuat kelas CSS `.perspective-card` dengan properti *perspective 3D*. Kartu metrik di beranda dan kartu status di halaman dataset akan melayang dan miring secara 3D mengikuti kursor mouse saat di-hover.

---

## 6. Modul 3D Motion Graphics Visualizer (5 Pilihan Durasi)
*   **Fungsi**: Menu baru **Motion** (`MotionVisualizer.jsx`) ditambahkan di Navbar navigasi utama.
*   **Fitur**:
    *   **Fungsi Neon Trails**: Tracing jejak neon berkilau pada ujung jari (vibe After Effects seperti video rujukan menit 1:22:47) saat melakukan gerakan isyarat.
    *   **5 Pilihan Durasi HAKI**: Durasi animasi After Effects Export dapat dipilih: **10 detik, 30 detik, 45 detik, 1 menit, dan 2 menit** secara real-time.
    *   **Ekspor HAKI**: Ditambahkan tombol simulasi ekspor MP4 beresolusi 1920x1080 (HD) dengan indikator kemajuan visual (*progress bar*).

---

## 7. Perbaikan Bug UI & Fleksibilitas Layout
*   **UI Nabrak (Vocabulary Guide)**: Menetapkan tinggi tombol kosakata secara konsisten (`h-[52px]`), menyusun rata tengah secara vertikal (`justify-center`), dan menambahkan utilitas `leading-tight` agar teks nama kata dan nama kategori tidak menumpuk.
*   **Layout Melar (Record Tab)**: Menambahkan class `content-start` pada container grid kata target agar tombol-tombol tersusun rapat ke atas dan tidak renggang saat jumlah kata yang dicari sedikit.
*   **Auto-Clear Preview**: Preview hasil terjemahan akan otomatis di-reset kembali ke status awal **`MENUNGGU ISYARAT`** jika deteksi tangan hilang dari layar selama 1.5 detik (tangan diturunkan).
*   **Auto-Reload Model**: Backend otomatis memuat ulang model TFLite baru dan labels sidecar-nya segera setelah proses training selesai tanpa memerlukan restart server manual.
*   **Syntax & Typo Errors**: Memperbaiki kurung siku berlebih (`]`) di line 255 dan typo `ensure_ascci` menjadi `ensure_ascii` di line 314 pada file `train_clinical_model.py`.

---
*Laporan revisi selesai dibuat secara komprehensif.*
