# Dataset & AI Augmentation ??

Dataset latih untuk klasifikasi gerakan isyarat BISINDO klinis disimpan dalam bentuk file koordinat biner numpy (`.npy`).

## ?? Struktur Penyimpanan Dataset
```txt
backend/data/landmarks/
??? [label_kosakata_1]/
?   ??? albert_william/
?   ?   ??? session_1_frame_0.npy
?   ?   ??? session_1_frame_1.npy
?   ??? septi_ramadhani/
??? [label_kosakata_2]/
```
*   Setiap file `.npy` memiliki dimensi array `(30, 63)` (30 frame sequence, masing-masing frame memiliki 63 koordinat landmark).

## ? Fitur AI Augmentation
Untuk mengatasi masalah data imbalance (kekurangan data latih pada kelas tertentu), MedSign AI dilengkapi sistem **AI Dataset Augmentation** di backend (`augmentation_service.py`) dan frontend (`DataCollection.jsx`).

### Metode Augmentasi:
1.  **Spatial Transformation**:
    *   *Mirroring*: Mencerminkan koordinat horizontal (mengubah tangan kanan menjadi tangan kiri virtual).
    *   *Jittering (Noise)*: Menambahkan gaussian noise kecil untuk mensimulasikan getaran tangan alami.
    *   *Scale Variation*: Mengubah skala tangan secara dinamis.
2.  **Temporal Transformation**:
    *   *Time-warping / Speed alteration*: Mempercepat atau memperlambat gerakan landmark sequence tanpa mengubah lintasannya.

### Integrasi UI:
ML engineer dapat memantau rasio keseimbangan data di tab **Balance Checker**, lalu menggunakan tab **AI Augmentation** untuk melakukan *generate augmented dataset* secara massal atau mendownload ZIP arsip dataset untuk evaluasi lokal.
