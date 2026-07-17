# MODEL_DECISION

## Keputusan

Model lama dari audit TA Migos tidak dipakai langsung sebagai model produksi MedSign.

MedSign MVP memakai model baru khusus 12 label:

```text
sakit, nyeri, sesak, batuk, demam, pusing, mual, muntah, ya, tidak, tolong, selesai
```

## Alasan

| Pertimbangan | Keputusan |
|---|---|
| Label TA Migos adalah kosakata umum, bukan kosakata medis MVP | Tidak dipakai langsung |
| Model dinamis TA Migos memakai shape `(20, 126)` | Tidak kompatibel dengan kontrak MedSign |
| MedSign wajib memakai `(30, 63)` | Pipeline baru dibuat khusus |
| Training dan inference harus memakai preprocessing yang sama | Semua jalur memakai `app/ml/preprocess.py` |
| Label harus satu sumber | Semua jalur membaca `backend/data/metadata/labels.json` |

## Kontrak Baru

| Item | Nilai |
|---|---|
| Frame per gesture | 30 |
| Fitur per frame | 63 |
| Landmark | 21 titik tangan x/y/z |
| Preprocessing | wrist-origin shift + scale normalization |
| Threshold awal | 0.50 |
| Model baseline | GRU ringan |
| Output model | `backend/models/medsign_mvp_v1.tflite` |

## Legacy Reference

Aset TA Migos dan dataset/model lama tidak dihapus. Perannya hanya sebagai:

- referensi struktur pipeline,
- referensi cara capture,
- pembanding eksperimen,
- bukan model produksi.

Dataset lama di `backend/data/<label lama>` juga tidak ikut training MVP karena training baru hanya membaca:

```text
backend/data/landmarks
```

## Kriteria Siap Demo

Model dianggap siap demo awal jika:

- semua 12 label punya data,
- minimal 30 sample valid per label,
- empty frame ratio rata-rata di bawah 10 persen,
- test accuracy baseline minimal 85 persen,
- tidak ada kelas penting dengan recall di bawah 70 persen,
- backend `/health` melaporkan `mode: production`.

