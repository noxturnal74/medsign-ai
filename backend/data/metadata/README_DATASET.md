# MedSign Dataset Metadata

Folder ini menyimpan metadata kecil yang boleh ikut source control.

- `labels.json`: satu sumber label untuk capture, training, backend, dan vocabulary API.
- `recordings.csv`: log lokal hasil capture webcam. File ini dibuat otomatis saat perekaman dan boleh disimpan lokal.

Dataset besar tetap berada di:

- `backend/data/landmarks`
- `backend/data/raw_videos`

Kedua folder tersebut sengaja tidak dimasukkan ke Git karena ukurannya bisa besar.

