# README Training Model MedSign

## Kontrak Model

Model clinical MVP wajib mengikuti kontrak:

```text
Input  : (30, 63)
Frame  : 30 frame per gesture
Fitur  : 63 fitur = 21 landmark tangan x/y/z
Label  : backend/data/metadata/labels.json
Output : 12 kelas softmax
```

Preprocessing yang dipakai:

1. wrist-origin shift
2. scale normalization
3. padding/trimming ke 30 frame

## Validasi Dataset

Jalankan validasi sebelum training:

```powershell
cd D:\PKM\medsign-ai\backend
.\venv\Scripts\activate
python training/validate_dataset.py
```

Output:

```text
backend/reports/DATASET_HEALTH_REPORT.md
backend/reports/dataset_health_report.json
```

Perbaiki dataset jika:

- ada label dengan 0 sample
- sample per label masih sangat kecil
- shape bukan `(30, 63)`
- empty frame ratio lebih dari 10 persen
- distribusi signer terlalu timpang

## Training GRU Baseline

```powershell
python training/train_clinical_model.py --architecture gru --epochs 120 --batch-size 16
```

### Melatih Subset Kata Tertentu (Opsional)

Jika Anda hanya ingin melatih model pada beberapa kata tertentu (misalnya 12 kata MVP atau 30 kata prioritas), gunakan argumen `--labels` dengan nilai yang dipisahkan oleh tanda koma:

```powershell
python training/train_clinical_model.py --architecture gru --labels sakit,nyeri,sesak,batuk,demam,pusing,mual,muntah,ya,tidak,tolong,selesai --epochs 50
```

Output model:

```text
backend/models/medsign_mvp_v1.h5
backend/models/medsign_mvp_v1.tflite
```

Output evaluasi:

```text
backend/reports/classification_report.txt
backend/reports/confusion_matrix.csv
backend/reports/confusion_matrix.png
backend/reports/training_history.csv
backend/reports/training_metrics.json
```

## Training LSTM Alternatif

```powershell
python training/train_clinical_model.py --architecture lstm --epochs 120 --batch-size 16
```

Pakai LSTM jika GRU kurang stabil, tetapi GRU direkomendasikan sebagai baseline awal karena lebih ringan.

## Catatan Split Dataset

Script akan memakai split berbasis signer jika minimal ada 3 signer yang valid. Jika belum memungkinkan, script fallback ke stratified split berbasis label.

Training akan ditolak jika belum ada data untuk semua 12 label MVP.

