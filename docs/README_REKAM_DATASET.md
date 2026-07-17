# README Rekam Dataset MedSign

## Tujuan

Merekam dataset landmark untuk 12 label MVP:

```text
sakit, nyeri, sesak, batuk, demam, pusing, mual, muntah, ya, tidak, tolong, selesai
```

Setiap file hasil rekam wajib memiliki shape `(30, 63)`, yaitu 30 frame dan 63 fitur dari 21 landmark tangan x/y/z.

## Struktur Output

```text
backend/data/
  raw_videos/
  landmarks/
    sakit/
      signer_001/
        sakit_signer_001_take_001.npy
  metadata/
    labels.json
    recordings.csv
```

## Persiapan

```powershell
cd D:\PKM\medsign-ai\backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

## Rekam Satu Take

```powershell
python training/capture_landmarks.py --label sakit --signer-id signer_001 --take-id take_001
```

## Rekam Beberapa Take

```powershell
python training/capture_landmarks.py --label sakit --signer-id signer_001 --take-id sesi_001 --num-takes 10
```

Script akan menyimpan:

- landmark `.npy` di `backend/data/landmarks/<label>/<signer_id>/`
- metadata rekaman di `backend/data/metadata/recordings.csv`

Tambahkan `--save-video` jika ingin menyimpan video mentah untuk audit:

```powershell
python training/capture_landmarks.py --label sesak --signer-id signer_001 --take-id take_001 --save-video
```

## Workflow Melalui Antarmuka Web (Rekomendasi)

Kini Anda dapat merekam data dataset dan melakukan uji coba prediksi model secara langsung dan interaktif dari browser tanpa harus menggunakan terminal CLI:

1. Jalankan backend FastAPI dan frontend React seperti biasa.
2. Buka aplikasi web di browser Anda (`http://localhost:5173`).
3. Klik tab **"Ambil Data"** di bilah navigasi utama.
4. Masukkan **Signer ID** (misalnya `signer_001` atau `Mas Fathur`).
5. Pilih kata target dari daftar kosakata (192 kata klinis baru tersedia).
6. Nyalakan kamera input, lalu klik tombol **"Mulai Ambil Data"**.
7. Sistem akan menampilkan hitung mundur (3, 2, 1) lalu secara otomatis merekam data landmark sepanjang 30 frame (1 detik).
8. Setelah pengambilan data selesai, Anda dapat:
   - Mengklik **"Uji Prediksi"** untuk mengetes hasil rekaman langsung ke model ML backend.
   - Mengklik **"Kirim ke Backend"** untuk menyimpannya sebagai file `.npy` pada folder dataset di backend secara otomatis.
   - Mengklik **"Unduh JSON"** untuk menyimpannya di komputer lokal Anda.

## Workflow Aman Satu Signer (CLI)

Gunakan helper ini untuk merekam 12 label MVP secara berurutan, 10 take per label, lalu validasi cepat setelah setiap label selesai:

```powershell
cd D:\PKM\medsign-ai
.\backend\training\collect_signer_dataset.ps1 -SignerId signer_001 -TakesPerLabel 10
```

Cek kamera, label, signer, dan output path tanpa menyimpan data:

```powershell
cd D:\PKM\medsign-ai
.\backend\training\collect_signer_dataset.ps1 -SignerId signer_001 -TakesPerLabel 10 -DryRun
```

Jika ada sample invalid saat validasi, sample dipindahkan ke `backend/data/invalid_samples` dan tidak dipakai training.

## Target Data MVP

Minimal untuk baseline awal:

| Item | Target |
|---|---:|
| Label | 12 |
| Signer | 5 orang |
| Take per label per signer | 10 |
| Total per label | 50 sequence |
| Empty frame ratio | < 10 persen |

## Tips Perekaman

- Gunakan latar polos.
- Pastikan tangan tidak keluar frame.
- Jaga pencahayaan stabil.
- Mulai dan akhiri gerakan dari posisi siap.
- Ulang take jika tangan sering tidak terdeteksi.
