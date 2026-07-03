# Doctor Input Removal & DataCollection Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hapus input textarea dokter (sisakan hanya Quick Phrases), hapus tab "Ambil Data" dari navbar, lalu push ke GitHub agar Vercel auto-deploy.

**Architecture:** Perubahan murni di frontend — tidak ada perubahan backend. Tiga file yang dimodifikasi: `DoctorPanel.jsx` (hapus textarea+tombol kirim), `Navbar.jsx` (hapus item `collect`), `App.jsx` (hapus route `collect`). Setelah selesai, commit dan push ke `origin main`.

**Tech Stack:** React 18, Vite, TailwindCSS, Git, GitHub, Vercel (auto-deploy dari GitHub push)

---

## File Map

| File | Aksi |
|------|------|
| `medsign-ai/frontend/src/components/DoctorPanel.jsx` | **Modify** — hapus state `doctorText`, textarea, tombol "Kirim & Ucapkan Tanggapan". Sisakan hanya section Quick Phrases. |
| `medsign-ai/frontend/src/components/Navbar.jsx` | **Modify** — hapus item `{ id: 'collect', label: 'Ambil Data', icon: Database }` dari `navItems`. Hapus import `Database` dari lucide-react. |
| `medsign-ai/frontend/src/App.jsx` | **Modify** — hapus `import { DataCollection }` dan baris `{view === 'collect' && <DataCollection setView={setView} />}`. |

---

## Task 1: Bersihkan DoctorPanel — hapus input textarea dokter

**Files:**
- Modify: `medsign-ai/frontend/src/components/DoctorPanel.jsx`

- [ ] **Step 1: Ganti seluruh isi `DoctorPanel.jsx` dengan versi yang sudah dihapus textarea-nya**

Ganti file dengan konten berikut (hanya Quick Phrases tersisa, `useState` dan `addLogEntry` tetap untuk quick phrase click):

```jsx
import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { MessageSquare, Zap } from 'lucide-react';

const DOCTOR_QUICKPHRASES = [
  'Tolong duduk dengan tenang.',
  "Buka mulut Anda, katakan 'aah'.",
  'Tarik napas dalam-dalam.',
  'Tahan napas Anda sebentar.',
  'Di mana tepatnya bagian yang sakit?',
  'Sudah berapa hari gejala ini dirasakan?',
  'Apakah Anda memiliki alergi obat?',
  'Saya akan memeriksa tekanan darah Anda.',
  'Hasil pemeriksaan laboratorium sudah siap.',
  'Anda harus beristirahat dan minum obat teratur.'
];

export const DoctorPanel = () => {
  const { addLogEntry } = useContext(AppContext);

  const handleQuickPhrase = (phrase) => {
    addLogEntry({
      role: 'doctor',
      text: phrase
    });
  };

  return (
    <div className="glass-panel flex w-full flex-col gap-5 rounded-3xl p-6">
      <div className="flex items-center gap-2 border-b border-white/60 pb-3">
        <MessageSquare className="text-emerald-600" size={18} />
        <span className="text-sm font-black text-slate-950">Respon Cepat ke Pasien</span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
          <Zap size={14} className="text-amber-500" />
          Frasa Cepat Medis
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          Klik salah satu frasa di bawah untuk mengirim dan membunyikan respon ke pasien.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {DOCTOR_QUICKPHRASES.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPhrase(phrase)}
              className="overflow-hidden text-ellipsis whitespace-nowrap rounded-2xl border border-white/60 bg-white/40 px-4 py-2.5 text-left text-xs font-bold text-slate-700 transition-all hover:bg-white/75 active:scale-[0.98]"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 2: Commit perubahan DoctorPanel**

```bash
cd D:/PKM/medsign-ai
git add frontend/src/components/DoctorPanel.jsx
git commit -m "feat(doctor): hapus input textarea dokter, sisakan quick phrases saja"
```

---

## Task 2: Hapus tab "Ambil Data" dari Navbar

**Files:**
- Modify: `medsign-ai/frontend/src/components/Navbar.jsx`

- [ ] **Step 1: Hapus item `collect` dari `navItems` dan import `Database`**

Ganti baris import lucide-react (baris 3):
```jsx
// SEBELUM:
import { ExternalLink, Home, Info, Stethoscope, User, Volume2, VolumeX, Database } from 'lucide-react';

// SESUDAH:
import { ExternalLink, Home, Info, Stethoscope, User, Volume2, VolumeX } from 'lucide-react';
```

Ganti array `navItems` (baris 9–15):
```jsx
// SEBELUM:
const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'patient', label: 'Pasien', icon: User },
  { id: 'doctor', label: 'Dokter', icon: Stethoscope },
  { id: 'collect', label: 'Ambil Data', icon: Database },
  { id: 'about', label: 'Tentang', icon: Info }
];

// SESUDAH:
const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'patient', label: 'Pasien', icon: User },
  { id: 'doctor', label: 'Dokter', icon: Stethoscope },
  { id: 'about', label: 'Tentang', icon: Info }
];
```

- [ ] **Step 2: Commit perubahan Navbar**

```bash
git add frontend/src/components/Navbar.jsx
git commit -m "feat(navbar): hapus tab 'Ambil Data' dari navigasi publik"
```

---

## Task 3: Hapus route DataCollection dari App.jsx

**Files:**
- Modify: `medsign-ai/frontend/src/App.jsx`

- [ ] **Step 1: Hapus import DataCollection dan route-nya**

Ganti file `App.jsx` dengan:
```jsx
import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PatientView } from './pages/PatientView';
import { DoctorView } from './pages/DoctorView';
import { About } from './pages/About';

function AppContent() {
  const [view, setView] = useState('home'); // 'home' | 'patient' | 'doctor' | 'about'

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [view]);

  return (
    <Layout currentView={view} setView={setView}>
      {view === 'home' && <Home setView={setView} />}
      {view === 'patient' && <PatientView setView={setView} />}
      {view === 'doctor' && <DoctorView setView={setView} />}
      {view === 'about' && <About setView={setView} />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
```

- [ ] **Step 2: Commit perubahan App.jsx**

```bash
git add frontend/src/App.jsx
git commit -m "feat(app): hapus route collect/DataCollection dari App"
```

---

## Task 4: Build frontend dan verifikasi lokal

**Files:** (tidak ada file baru)

- [ ] **Step 1: Install dependencies jika belum**

```bash
cd D:/PKM/medsign-ai/frontend
npm install
```

Expected: selesai tanpa error

- [ ] **Step 2: Jalankan dev server dan cek manual**

```bash
npm run dev
```

Buka `http://localhost:5173` (atau port yang tertera).  
Verifikasi:
- Navbar hanya menampilkan: Home, Pasien, Dokter, Tentang (tidak ada "Ambil Data")
- Halaman Dokter → tidak ada textarea input, hanya tombol Quick Phrases
- Klik Quick Phrase → muncul di Session Log dan berbunyi TTS

- [ ] **Step 3: Build production**

```bash
npm run build
```

Expected: `✓ built in X.XXs` tanpa error. Folder `dist/` terupdate.

- [ ] **Step 4: Commit hasil build**

```bash
cd D:/PKM/medsign-ai
git add frontend/dist
git commit -m "build: update dist untuk deployment Vercel"
```

---

## Task 5: Push ke GitHub → Vercel auto-deploy

- [ ] **Step 1: Push semua commit ke GitHub**

```bash
cd D:/PKM/medsign-ai
git push origin main
```

Expected output:
```
Enumerating objects: ...
To https://github.com/noxturnal74/medsign-ai.git
   xxxxxxx..xxxxxxx  main -> main
```

- [ ] **Step 2: Cek Vercel deployment**

Buka https://vercel.com/albertwilliamsaputra-6336s-projects/medsign-ai  
Tunggu status berubah dari "Building" → "Ready" (biasanya 1–3 menit).

- [ ] **Step 3: Verifikasi di production**

Buka https://medsign-ai.vercel.app/  
Pastikan:
- Tab "Ambil Data" tidak ada di navbar
- Halaman Dokter hanya menampilkan Quick Phrases (tidak ada textarea)

---

## Panduan Collect Data untuk Tim Non-IT

> Setelah perubahan ini selesai, berikut cara teman-teman yang bukan IT dapat merekam dataset BISINDO tanpa perlu masuk ke website publik.

### Cara Collect Data (via script lokal — tidak perlu coding):

**Prasyarat (sekali saja, diinstall oleh tim IT):**
1. Python 3.10+ sudah terinstall
2. Jalankan: `cd D:/PKM/medsign-ai/backend && pip install -r requirements.txt`

**Langkah collect data (setiap sesi rekaman):**

1. Buka terminal/PowerShell di folder `D:/PKM/medsign-ai/backend`
2. Jalankan script PowerShell yang sudah ada:
   ```powershell
   .\training\collect_signer_dataset.ps1
   ```
   Script akan otomatis membuka kamera dan memandu dengan hitungan mundur.

3. Atau jalankan Python langsung:
   ```bash
   python training/collect_signer_dataset.py --signer signer_002 --word sakit
   ```
   - Ganti `signer_002` dengan nama/ID teman yang merekam
   - Ganti `sakit` dengan kata yang ingin direkam
   - Layar akan menampilkan kamera + hitungan mundur otomatis

**Kata-kata yang perlu direkam:** Lihat file `backend/data/metadata/labels.json`

**Hasil rekaman** tersimpan otomatis di `backend/data/` sebagai file `.npy`.
