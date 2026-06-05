# Dokumentasi Dataset MedSign AI: Kosakata Medis MVP vs Abjad BISINDO A–Z

Dokumen ini mendokumentasikan arsitektur dataset, pembagian cakupan, serta penjelasan teknis mengenai dataset yang digunakan dalam pengembangan sistem penerjemah isyarat tangan klinis **MedSign AI**.

---

## 📋 1. Pembagian Cakupan Dataset

Untuk menjamin efisiensi sistem, kemudahan akses pasien, dan kesesuaian klinis dalam situasi darurat, dataset MedSign AI dibagi menjadi dua bagian terpisah berdasarkan perannya masing-masing:

| Karakteristik | Dataset Kosakata Medis (MVP) | Dataset Abjad BISINDO Publik (A–Z) |
| :--- | :--- | :--- |
| **Tujuan** | Komunikasi klinis instan (keluhan medis, lokasi tubuh, respons medis, darurat) | Pengejaan kalimat kustom huruf-demi-huruf (*Spelling Mode*) sebagai cadangan |
| **Sumber Data** | **Dataset Sintetis Prosedural MedSign** (3D Landmarks Generator dengan noise getaran alami) | **Dataset Publik Universitas Binus** ([rhiosutoyo/Indonesian-Sign-Language-BISINDO](https://github.com/rhiosutoyo/Indonesian-Sign-Language-BISINDO-Hand-Sign-Detection-Dataset)) |
| **Format Asli** | 3D Joint Coordinate Sequences (NumPy `.npy` arrays) | Foto Gambar Statis (`.jpg`) & Pascal VOC Annotation (`.xml`) |
| **Jenis Gerakan** | **Dinamis** (Sequence 30 frame, melacak pergerakan jari/tangan sepanjang ~1.0 detik) | **Statis** (1 frame posisi jari statis mewakili satu huruf A hingga Z) |
| **Jumlah Kelas** | 30 Kosakata Medis MVP | 26 Huruf Abjad (A–Z) |
| **Volume Data** | 1.350 Sequence Gerakan (45 sampel per kata) | 520 Gambar / Anotasi (20 sampel per huruf) |
| **Arsitektur Model** | Long Short-Term Memory (**LSTM**) Deep Learning | Multi-Layer Perceptron (**MLP**) Dense Jaringan Saraf |

---

## 🔬 2. Penjelasan Teknis Dataset

### A. Dataset Abjad BISINDO A–Z (Binus Public Dataset)
Dataset ini dikembangkan menggunakan kamera smartphone berkualitas tinggi, memotret tangan sukarelawan untuk 26 huruf alfabet BISINDO statis. Setiap gambar dilengkapi dengan file anotasi Pascal VOC (`.xml`) yang menentukan posisi kotak pembatas tangan (`bndbox`).

* **Metode Ekstraksi Landmarks (`process_alphabet_data.py`):**
  Untuk mempertahankan efisiensi pipeline koordinat MedSign AI, kami tidak melatih model CNN yang berat pada foto JPG mentah. Sebagai gantinya, kami memproses gambar-gambar tersebut secara offline:
  1. Script membaca koordinat pembatas (`xmin`, `ymin`, `xmax`, `ymax`) dari XML.
  2. Gambar di-crop pada wilayah tangan dengan memberi padding tambahan 30 piksel (membantu MediaPipe melacak sendi pergelangan/wrist secara akurat).
  3. MediaPipe Hands memproses gambar hasil crop untuk mengekstrak **21 titik sendi jari (63 koordinat numerik flat)**.
  4. Koordinat dinormalisasi menggunakan algoritma invarian posisi & skala Euclidean agar seragam.
  5. Hasilnya disimpan dalam file biner `backend/data/alphabet_coordinates.npz` (ukuran total hanya **128 KB**).

* **Model Klasifikasi (`train_alphabet_model.py`):**
  Model MLP statis dilatih pada koordinat ini dengan akurasi validasi mencapai **89,4%** dan loss validasi sebesar **0,33**. Model diekspor menjadi `bisindo_alphabet_v1.tflite` berukuran **38,3 KB** yang sangat responsif di CPU.

---

### B. Dataset Kosakata Medis MVP (MedSign Procedural Dataset)
Dalam skenario medis darurat, mengeja huruf satu per satu (seperti mengeja `S-A-K-I-T  S-E-K-A-L-I`) terlalu lambat dan berbahaya bagi pasien lemah. Pasien membutuhkan komunikasi 1-detik instan untuk kata medis lengkap.

* **Metode Pembangkitan Prosedural:**
  Karena keterbatasan dataset BISINDO medis publik di dunia nyata, MedSign AI menggunakan generator sintetis 3D landmarks anatomis (`generate_synthetic_data.py`).
  1. Generator memodelkan koordinat 3D baseline persendian tangan (Wrist, Thumb, Index, Middle, Ring, Pinky) sesuai tipe tangan (Mengepal, Terbuka, Pinch, V-Shape, Menunjuk).
  2. Gerakan temporal ditambahkan menggunakan fungsi matematika sinusoidal dan linier sepanjang 30 frame (sumbu X horizontal melambai untuk "tidak", sumbu Y vertikal mengangguk untuk "ya", sumbu Z mendorong maju untuk "bantuan segera").
  3. Ditambahkan derau Gaussian dinamis (noise) setingkat `0.005` hingga `0.012` untuk meniru getaran otot alami tangan manusia.
  4. Augmentasi spasial (skala acak `0.85-1.15`, rotasi sumbu Z `-0.15-0.15` rad, pergeseran translasi) diterapkan pada setiap sequence untuk invarian tata letak kamera.
  5. Hasilnya dilatih menggunakan model LSTM temporal dua lapis dengan akurasi tinggi dan diekspor ke `medsign_v1.tflite` berukuran **338,4 KB**.

---

## 💡 3. Panduan Penggunaan Sistem MedSign AI

### ⚡ Mode Kosakata Medis (Clinical Mode - Default)
* **Cara Kerja:** Sistem melacak gerakan tangan Anda selama 1 detik (30 frame), memprediksi kata medis lengkap secara dinamis, dan menambahkannya ke kalimat.
* **Sangat Cocok Untuk:** Keadaan darurat, keluhan nyeri, lokasi tubuh, respons cepat, dan instruksi dokter.

### ✏️ Mode Eja (Spelling Mode)
* **Cara Kerja:** Mengabaikan buffer 30 frame. Sistem melacak bentuk jari statis Anda (1 frame koordinat) setiap 500ms dan mencocokkannya ke abjad A–Z.
* **Histeresis & Hold-to-Type:** Huruf harus terdeteksi secara konsisten selama 3 frame berturut-turut (~1,5 detik) sebelum terketik di layar untuk menghindari salah ketik akibat kedipan gerakan.
* **Repeat Letter Lock:** Untuk mengetik huruf yang sama dua kali berturut-turut (misal: mengetik dua huruf `A` pada kata `MAAF`), angkat atau hilangkan tangan Anda sejenak dari layar kamera (untuk mereset lock) lalu peragakan pose huruf tersebut kembali.
* **Sangat Cocok Untuk:** Mengeja nama pasien, detail alamat kustom, atau kata keluhan spesifik yang belum tersedia dalam daftar kosakata klinis MVP.
