# FastAPI API Documentation ??

Dokumen ini berisi daftar endpoint backend FastAPI (`backend/app/routes/`) beserta validasi keamanan input yang diterapkan.

## ?? Validasi Keamanan Input
Setiap endpoint penulisan data dan pelatihan model menerapkan validasi regex ketat pada schema request:
*   **Signer ID**: Hanya diperbolehkan huruf kecil dan underscore (lowercase underscore), contoh: `albert_william`.
*   **Label**: Hanya diperbolehkan huruf kecil, angka, garis bawah, dan tanda hubung (`^[a-z0-9_-]+$`).
*   **Session ID**: Hanya diperbolehkan karakter alfanumerik, garis bawah, dan tanda hubung (`^[a-zA-Z0-9_-]+$`).
*   **Path Traversal Prevention**: File-file yang dihapus/diakses divalidasi agar tidak mengandung komponen direktori seperti `..`, `/`, atau `\`.

## ?? Endpoint Utama

### ?? Koleksi & Pengolahan Dataset (`data_collection.py`)
*   `POST /dataset/samples/save`: Menyimpan sampel landmarks `(30, 63)` baru ke server.
*   `GET /dataset/samples/{label}`: Mengambil sampel file koordinat terdaftar untuk label tertentu.
*   `POST /dataset/samples/delete`: Menghapus satu file sampel koordinat secara permanen.
*   `POST /dataset/samples/delete-bulk`: Menghapus beberapa sampel koordinat sekaligus.
*   `GET /dataset/health-report`: Mendapatkan laporan kesehatan dataset (distribusi sampel per label & imbalance flag).

### ? AI Dataset Augmentation (`data_collection.py`)
*   `GET /dataset/augment/stats`: Mendapatkan rasio perbandingan sampel asli vs sampel hasil augmentasi.
*   `POST /dataset/augment/preview`: Pratinjau efek augmentasi koordinat secara grafis.
*   `POST /dataset/augment/generate`: Memicu pembuatan data augmentasi massal berdasarkan teknik spasial & temporal yang dipilih.
*   `POST /dataset/augment/delete`: Menghapus seluruh file hasil augmentasi untuk membersihkan ruang penyimpanan.

### ?? Pelatihan Model (`data_collection.py`)
*   `POST /dataset/train`: Memulai proses pelatihan model LSTM secara lokal.
*   `POST /dataset/train/finalize`: Mengintegrasikan model terbaik hasil latih ke folder produksi (`models/`).
