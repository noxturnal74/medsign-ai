# Arsitektur Machine Learning & Data Pipeline ??

MedSign AI menggunakan koordinat numerik landmark tangan (bukan data gambar/video mentah) untuk efisiensi CPU dan privasi data pasien.

## ?? Aliran Data Utama (Data Flow)
1.  **Kamera Browser**: Menangkap video input pada resolusi ringan.
2.  **MediaPipe Hands JS**: Mengekstrak 21 koordinat landmark tangan 3D (x, y, z) per tangan.
3.  **WebSocket Client**: Mengirimkan flat array 63 koordinat (21 landmark * 3 sumbu) ke backend dengan frekuensi konstan.
4.  **FastAPI Backend**:
    *   Menerima koordinat.
    *   Melakukan preprocessing & normalisasi.
    *   Menginput data sequence (30 frame) ke model LSTM.
    *   Mengirimkan prediksi kelas isyarat beserta confidence score kembali ke frontend.

## ?? Preprocessing & Normalisasi
Sebelum masuk ke model klasifikasi, koordinat diproses dengan:
1.  **Translasi Koordinat**: Menggeser pergelangan tangan (wrist / landmark 0) ke titik origin `(0, 0, 0)`. Semua landmark lain disesuaikan secara relatif.
2.  **Normalisasi Skala (Euclidean Normalization)**: Membagi koordinat dengan jarak Euclidean maksimum untuk mempertahankan rasio skala tangan terlepas dari jarak ke kamera.
3.  **Padding/Sequence Matching**: Mengunci panjang sequence tepat 30 frame (1 detik pada 30 FPS).
