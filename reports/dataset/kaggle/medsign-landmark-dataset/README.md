# MedSign BISINDO Landmark Dataset
### Master Spatio-Temporal 3D Hand Landmarks for Clinical Sign Language Translation

<p align="center">
  <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/medsign-logo.png" width="260" alt="MedSign AI Logo" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-Proprietary%20%2F%20HAKI-dc2626.svg?style=flat-square&logo=shield" alt="License" />
  <img src="https://img.shields.io/badge/Classes-249%20Medical%20%26%20Alphanumeric%20Classes-0284c7.svg?style=flat-square&logo=database" alt="Classes" />
  <img src="https://img.shields.io/badge/Format-30%20Frames%20x%2063%20Features%20(.npy%20%26%20.csv)-059669.svg?style=flat-square&logo=numpy" alt="Format" />
  <img src="https://img.shields.io/badge/Accuracy-91.99%25%20(GRU)-amber.svg?style=flat-square&logo=tensorflow" alt="Accuracy" />
  <img src="https://img.shields.io/badge/Portal-medsign.id-0f172a.svg?style=flat-square&logo=googlechrome" alt="Portal" />
</p>

---

## 1. Dokumentasi Visual Landmark & Gestur Klinis BISINDO
Dokumentasi visual ekstraksi koordinat spasio-temporal sendi tangan 3D menggunakan Google MediaPipe Hands untuk kosakata klinis rumah sakit:

<table>
  <thead>
    <tr>
      <th align="center">Isyarat: Nyeri Dada (Clinical)</th>
      <th align="center">Isyarat: Bantuan Segera (Emergency)</th>
      <th align="center">Isyarat: Konfirmasi / Ya</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/gesture-nyeri-dada.jpg" width="260" alt="Isyarat Nyeri Dada" /><br>
        <em>Deteksi 21 Sendi Tangan pada Area Dada</em>
      </td>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/gesture-bantuan-segera.jpg" width="260" alt="Isyarat Bantuan Segera" /><br>
        <em>Ekstraksi Fitur Spatio-Temporal Respon Cepat</em>
      </td>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/gesture-ya.jpg" width="260" alt="Isyarat Ya" /><br>
        <em>Anotasi Sumbu Koordinat Spasial X, Y, Z</em>
      </td>
    </tr>
  </tbody>
</table>

<p align="center">
  <strong>Visualisasi 3D Motion Landmarks & Pelacakan Trajektori Gestur:</strong><br>
  <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/5_motion.png" width="720" alt="3D Motion Visualizer MedSign" /><br>
  <em>Pelacakan 21 sendi tangan temporal (30 frame) dan orientasi pergelangan tangan (wrist joint #0) secara real-time.</em>
</p>

---

## 2. Ketentuan Akses & Hak Cipta Dataset (Proprietary Notice)
> **PERNYATAAN LISENSI TERBATAS (RESTRICTED ACCESS / NOT AN OPEN-DOWNLOAD DATASET)**
>
> Dataset Landmark MedSign (mencakup total 249 kelas kosakata klinis, istilah medis, serta ejaan alfanumerik) merupakan **karya basis data terproteksi Hak Kekayaan Intelektual (HAKI) milik MedSign AI Indonesia**. Seluruh hak cipta dilindungi undang-undang (*All Rights Reserved*).
>
> Dilarang menyalin, mengunduh secara massal, mendistribusikan ulang, menjual kembali, membuat repositori cermin (*mirroring*), atau memanfaatkan master dataset lengkap untuk kepentingan komersial tanpa perjanjian lisensi resmi tertulis.
>
> Halaman Kaggle ini berfungsi sebagai **Kanal Dokumentasi Publik (*Public Documentation Layer*), Kamus Data (*Data Dictionary*), dan Pratinjau Sampel Terbatas (*Public Preview: .npy & .csv*)**. Akses terhadap master dataset penuh (22.541 data klinis & 5.487 data alfanumerik) dikelola secara resmi melalui portal:  
> **https://medsign.id**

---

## 3. Tim Peneliti & Pengembang MedSign AI (Tentang Kami - medsign.id)
Dataset dan sistem MedSign dikembangkan melalui program inovasi **PKM-KC (Karsa Cipta) Universitas Ma Chung** berkolaborasi dengan komunitas Tuli dan mitra fasilitas kesehatan resmi:

<table>
  <thead>
    <tr>
      <th align="center" width="90">Foto</th>
      <th>Nama & Peran</th>
      <th>Program Studi & Institusi</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/glenn_abraham.jpg" width="75" style="border-radius:10px;" alt="Glenn Emmanuel Abraham" />
      </td>
      <td><strong>Glenn Emmanuel Abraham</strong><br><em>Ketua Tim / UI/UX Designer & Dataset Collector</em></td>
      <td>Program Studi Informatika, Universitas Ma Chung</td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/albert_william.jpg" width="75" style="border-radius:10px;" alt="Albert William Saputra" />
      </td>
      <td><strong>Albert William Saputra</strong><br><em>Fullstack Developer & AI Integration</em></td>
      <td>Program Studi Informatika, Universitas Ma Chung</td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/albert_cheng.jpg" width="75" style="border-radius:10px;" alt="Albert Cheng" />
      </td>
      <td><strong>Albert Cheng</strong><br><em>Integration, Farmakologi & Dataset Collector</em></td>
      <td>Program Studi Farmasi, Universitas Ma Chung</td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/lorensa_amelia.jpg" width="75" style="border-radius:10px;" alt="Lorensa Amelia" />
      </td>
      <td><strong>Lorensa Amelia</strong><br><em>Public Relations, Marketing & Dataset Collector</em></td>
      <td>Program Studi Manajemen, Universitas Ma Chung</td>
    </tr>
    <tr>
      <td align="center">
        <img src="https://raw.githubusercontent.com/noxturnal74/medsign-ai/main/frontend/public/assets/kestrilia.png" width="75" style="border-radius:10px;" alt="Dr. Kestrilia Rega Prillianti" />
      </td>
      <td><strong>Dr. Kestrilia Rega Prillianti, S.Si., M.Si.</strong><br><em>Dosen Pembimbing Riset</em></td>
      <td>Dosen Peneliti, Universitas Ma Chung</td>
    </tr>
  </tbody>
</table>

### Mitra Kerjasama Fasilitas Kesehatan Resmi:
1. **Apotek Ma Chung**: Mitra validasi alur farmasi, etiket resep, aturan pakai, serta nama obat-obatan klinis.
2. **Puskesmas Janti Malang**: Mitra validasi layanan primer, alur penerimaan pendaftaran, serta anamnesis keluhan pasien tuli.
3. **Komunitas Teman Tuli & Responden Penutur Asli BISINDO**.

---

## 4. Cakupan & Taksonomi 249 Kelas MedSign
Master dataset mencakup **249 kelas terstandarisasi** sesuai kamus medis `labels.json` (`version: medsign-clinical-full-v1`), yang dikelompokkan ke dalam 2 domain independen:

1. **Domain Kosakata Klinis**: Kosakata anamnesis, gejala (sakit, demam, sesak, nyeri dada), anatomi tubuh, kondisi pasien, tindakan medis, informed consent, dan istilah obat/farmasi.
2. **Domain Alfanumerik (Fingerspelling)**: Ejaan jari alfabet A-Z (26 kelas) dan angka 0-9 (10 kelas) untuk nomor rekam medis, NIK pasien, serta dosis obat.

| Parameter Evaluasi | Domain Kosakata Klinis | Domain Alfanumerik |
|---|:---:|:---:|
| **Target Kelas Master** | **200+ Kelas Klinis** | **36 Kelas (A-Z & 0-9)** |
| **Total Sampel Master di Repositori** | **22.541 Sampel Sequence** | **5.487 Sampel Sequence** |
| **Akurasi Pengujian Terbaik (Full Scale)** | **91.73% (LSTM + Aug)** | **91.99% (GRU + Aug)** |
| **Dimensi Fitur per Frame** | 63 Fitur (21 Sendi x 3 Sumbu X, Y, Z) | 63 Fitur (21 Sendi x 3 Sumbu X, Y, Z) |
| **Panjang Jendela Waktu** | 30 Frame Temporal (30 FPS) | 30 Frame Temporal (30 FPS) |

---

## 5. Unit Observasi & Topologi Sendi MediaPipe
- **1 Sampel Sequence** = Tepat **30 frame temporal** berturutan (sampling video 30 FPS).
- **1 Frame Temporal** = **21 titik sendi tangan** x **3 sumbu koordinat spasial (X, Y, Z)** = **63 fitur numerik**.
- **Dimensi Input Tensor** = `(Batch_Size, 30, 63)`.

```text
                  [12] Middle Tip
                   |
     [8] Index Tip |  [16] Ring Tip
           |      [11]     |
          [7]      |      [15]    [20] Pinky Tip
           |      [10]     |       |
 [4] Thumb [6]     |      [14]    [19]
      |     \      |      /       |
     [3]    [5]   [9]   [13]     [18]
      \      \     |    /       /
      [2]     \    |   /       /
        \      \   |  /       /
        [1]-----[0: WRIST]----[17]
```

### Cara Membaca Format Sampel NumPy (.npy):
```python
import numpy as np

# Memuat sampel sekuens array .npy dari repositori:
sample = np.load("data/clinical/sample_npy/sakit_sample.npy")
print("Bentuk Tensor :", sample.shape)  # Output: (30, 63) -> 30 frame x 63 koordinat
print("Tipe Data     :", sample.dtype)  # Output: float32
print("Rentang Nilai :", sample.min(), "s.d.", sample.max())
```

---

## 6. Hasil Pengujian & Benchmark Baseline (Deep Learning)

| Task Domain | Arsitektur Model | Protokol Augmentasi | Test Accuracy | Macro F1-Score | Ukuran Model TFLite |
|---|:---:|:---:|:---:|:---:|:---:|
| **Clinical Words (200 Kelas)** | LSTM | Pure Original | 80.37% | 79.17% | 167.38 KB |
| **Clinical Words (200 Kelas)** | **LSTM** | **With Augmentation** | **91.73%** | **91.05%** | **168.98 KB (Best)** |
| **Clinical Words (200 Kelas)** | GRU | Pure Original | 81.77% | 80.21% | 171.16 KB |
| **Clinical Words (200 Kelas)** | GRU | With Augmentation | 90.73% | 89.95% | 171.16 KB |
| **Alphabet & Numbers (36 Kelas)** | LSTM | Pure Original | 81.51% | 80.71% | 156.16 KB |
| **Alphabet & Numbers (36 Kelas)** | LSTM | With Augmentation | 86.34% | 85.54% | 156.16 KB |
| **Alphabet & Numbers (36 Kelas)** | GRU | Pure Original | 85.06% | 84.55% | 158.35 KB |
| **Alphabet & Numbers (36 Kelas)** | **GRU** | **With Augmentation** | **91.99%** | **91.77%** | **158.35 KB (Best)** |

---

## 7. Struktur Berkas Repositori (Showcase & Sample Package)
```text
medsign-bisindo-landmark-dataset/
├── dataset-cover-image.png                          # Cover banner visual resmi
├── dataset-metadata.json                            # Metadata Kaggle (deskripsi, sumber, skema)
├── README.md                                        # Dokumentasi ilmiah lengkap
├── data/
│   ├── clinical/
│   │   ├── clinical_landmarks_sample.csv            # Sampel tabular terstruktur kelas klinis
│   │   └── sample_npy/                              # Sampel array NumPy asli (30, 63)
│   │       ├── sakit_sample.npy
│   │       ├── dokter_sample.npy
│   │       ├── obat_sample.npy
│   │       ├── demam_sample.npy
│   │       └── sesak_sample.npy
│   └── alphanumeric/
│       ├── alphanumeric_landmarks_sample.csv        # Sampel tabular terstruktur kelas ejaan
│       └── sample_npy/                              # Sampel array NumPy asli (30, 63)
│           ├── 0_sample.npy
│           ├── 1_sample.npy
│           ├── a_sample.npy
│           ├── b_sample.npy
│           └── c_sample.npy
└── metadata/
    ├── category_mapping.csv                         # Taksonomi kategori makro dataset
    ├── label_mapping.csv                            # Kamus 236 kelas terpasang
    ├── data_dictionary.csv                          # Spesifikasi teknis 68 variabel terukur
    └── checksums.txt                                # Nilai hash SHA-256 integritas data
```

---

## 8. Prosedur Permohonan Akses Dataset Master Lengkap
Akses terhadap master dataset lengkap (*Full Master CSV & Sequences: 22.541 data klinis dan 5.487 data alfanumerik*) diatur melalui perjanjian lisensi resmi:

1. **Academic Research License**: Diberikan kepada universitas, dosen, dan peneliti akademis untuk tujuan riset publikasi non-komersial.
2. **Institutional Healthcare License**: Diberikan kepada institusi rumah sakit, puskesmas, dan klinik mitra faskes.
3. **Commercial License**: Diperlukan untuk pengembangan produk, aplikasi, atau perangkat kecerdasan buatan komersial berbayar.

Silakan ajukan permohonan akses melalui portal resmi MedSign:  
**Portal Resmi:** [https://medsign.id](https://medsign.id)  
**Kontak Lisensi:** licensing@medsign.id

---

## 9. Sitasi & Metadata Publikasi
```bibtex
@dataset{medsign2026landmark,
  author    = {Abraham, Glenn Emmanuel and Saputra, Albert William and Cheng, Albert and Amelia, Lorensa and Prillianti, Kestrilia Rega},
  title     = {MedSign: Indonesian Medical Sign Language (BISINDO) Spatio-Temporal 3D Landmark Dataset},
  year      = {2026},
  publisher = {MedSign AI Indonesia},
  url       = {https://medsign.id},
  note      = {Proprietary HAKI-Protected Dataset. Licensed via medsign.id}
}
```

<p align="center">
  <strong>Copyright (c) 2026 MedSign AI Indonesia - All Rights Reserved.</strong><br>
  <em>Bridging Healthcare Communication Barriers with Inclusive Artificial Intelligence.</em>
</p>
