# DATA_COLLECTION_PLAN

## Tujuan

Fase data collection ini menyiapkan dataset MedSign MVP untuk 12 label:

```text
sakit, nyeri, sesak, batuk, demam, pusing, mual, muntah, ya, tidak, tolong, selesai
```

Kontrak data tidak boleh berubah setelah model dilatih:

| Item | Nilai |
|---|---:|
| Frame per sequence | 30 |
| Fitur per frame | 63 |
| Landmark | 21 titik tangan x/y/z |
| Format sample training | `.npy` |
| Shape wajib | `(30, 63)` |
| Sumber label | `backend/data/metadata/labels.json` |
| Folder dataset training | `backend/data/landmarks` |
| Folder sample invalid | `backend/data/invalid_samples` |

## Target Minimum

Untuk setiap signer:

| Item | Target |
|---|---:|
| Label | 12 |
| Take per label | 10 |
| Total take per signer | 120 |

Sebelum training atau demo PKM:

| Item | Target |
|---|---:|
| Valid sample per label | Minimal 30 |
| Invalid sample | 0 dipakai training |
| Empty frame ratio | Maksimal 10 persen per sample |
| Shape sample | Semua `(30, 63)` |

Jika ada sample invalid, validator akan memindahkannya ke `backend/data/invalid_samples` saat dijalankan dengan `--quarantine-invalid`.

## Panduan Operator

Gunakan instruksi yang sama untuk semua label dan signer:

1. Pastikan peraga berada di posisi stabil dengan pencahayaan cukup.
2. Minta peraga menaruh tangan di posisi siap.
3. Operator memberi aba-aba `MULAI`.
4. Peraga melakukan gesture dengan jelas dan tidak terlalu cepat.
5. Peraga kembali ke posisi siap setelah gesture.
6. Operator lanjut ke take berikutnya hanya setelah peraga siap.
7. Ulangi take jika tangan keluar frame, gesture ragu-ragu, atau kamera gagal mendeteksi tangan.

## Dry Run Sebelum Rekam

Cek satu label tanpa menyimpan data:

```powershell
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\capture_landmarks.py --label sakit --signer-id signer_001 --take-id dry --dry-run
```

Cek workflow penuh satu signer tanpa menyimpan data:

```powershell
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\collect_signer_dataset.py --signer-id signer_001 --takes-per-label 10 --dry-run
```

Atau lewat helper PowerShell:

```powershell
cd D:\PKM\medsign-ai
.\backend\training\collect_signer_dataset.ps1 -SignerId signer_001 -TakesPerLabel 10 -DryRun
```

Dry run wajib memastikan:

- kamera terbaca;
- `labels.json` berisi 12 label MVP;
- output path mengarah ke `backend/data/landmarks`;
- tidak ada file dataset yang tersimpan.

## Workflow Rekam Satu Signer

Jalankan helper utama:

```powershell
cd D:\PKM\medsign-ai
.\backend\training\collect_signer_dataset.ps1 -SignerId signer_001 -TakesPerLabel 10
```

Alternatif langsung lewat Python:

```powershell
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\collect_signer_dataset.py --signer-id signer_001 --takes-per-label 10
```

Helper akan menjalankan urutan berikut:

1. Cek kamera.
2. Membaca label dari `backend/data/metadata/labels.json`.
3. Menampilkan panduan operator.
4. Merekam 10 take untuk setiap label.
5. Menyimpan setiap take sebagai `.npy` dengan shape `(30, 63)`.
6. Mengisi `backend/data/metadata/recordings.csv` setelah capture berhasil.
7. Menjalankan validasi cepat setelah satu label selesai direkam.
8. Memindahkan sample invalid ke `backend/data/invalid_samples`.
9. Membuat ringkasan jumlah sample per label dan signer.

Laporan ringkasan signer ditulis ke:

```text
backend/reports/DATA_COLLECTION_SUMMARY_<signer_id>.md
backend/reports/data_collection_summary_<signer_id>.json
```

## Validasi Dataset

Validasi penuh:

```powershell
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\validate_dataset.py --quarantine-invalid
```

Validasi cepat satu label dan satu signer:

```powershell
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\validate_dataset.py --label sakit --signer-id signer_001 --quarantine-invalid
```

Output utama:

```text
backend/reports/DATASET_HEALTH_REPORT.md
backend/reports/dataset_health_report.json
```

Validator mengecek:

- semua label dari `labels.json`;
- shape setiap sample harus `(30, 63)`;
- nilai NaN/Inf;
- empty frame ratio;
- jumlah sample per label;
- distribusi signer;
- daftar sample invalid.

## Training Setelah Data Cukup

Training hanya boleh dijalankan setelah setiap label memiliki minimal 30 valid sample.

```powershell
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\validate_dataset.py --quarantine-invalid
.\backend\venv\Scripts\python.exe .\backend\training\train_clinical_model.py --architecture gru
```

Helper collection juga bisa mencoba training otomatis setelah dataset siap:

```powershell
cd D:\PKM\medsign-ai
.\backend\training\collect_signer_dataset.ps1 -SignerId signer_003 -TakesPerLabel 10 -TrainWhenReady
```

Training menghasilkan:

```text
backend/models/medsign_mvp_v1.h5
backend/models/medsign_mvp_v1.tflite
backend/reports/classification_report_medsign_mvp_v1.json
backend/reports/confusion_matrix_medsign_mvp_v1.csv
backend/reports/DATASET_HEALTH_REPORT.md
```

## Catatan Kontrol Kualitas

- Jangan mengubah `labels.json` setelah model dilatih.
- Jangan memasukkan dataset legacy TA Migos ke `backend/data/landmarks`.
- Rekam ulang sample jika tangan tidak terdeteksi dalam banyak frame.
- Pastikan satu signer menggunakan `signer_id` yang sama di semua label.
- Gunakan nama signer anonim seperti `signer_001`, `signer_002`, dan seterusnya.
- Simpan video mentah hanya bila perlu audit dengan opsi `--save-video`.
