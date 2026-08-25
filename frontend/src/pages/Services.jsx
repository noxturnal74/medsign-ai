import React from 'react';
import {
  HeartPulse, Stethoscope, Database, ArrowLeft, Sparkles, ScanLine, Volume2,
  ShieldCheck, Bell, FileText, Hand, Languages, Activity, ArrowRight, Users
} from 'lucide-react';

const STATS = [
  { val: '12', label: 'Kosakata klinis MVP' },
  { val: '21', label: 'Landmark per tangan' },
  { val: '30', label: 'Frame per isyarat' },
  { val: '63', label: 'Fitur numerik per frame' },
];

const CORE_SERVICES = [
  {
    title: 'Konsultasi Real-time',
    desc: 'Deteksi isyarat BISINDO klinis langsung melalui webcam dengan visualisasi skeletal 3D landmark tangan. Translasi muncul dalam hitungan milidetik tanpa menekan tombol apa pun.',
    points: ['MediaPipe Hands 21 landmark', 'Model GRU/LSTM TFLite', 'Mode ejaan A–Z & angka 1–9'],
    icon: HeartPulse,
    tone: 'text-sky-600 bg-sky-500/10'
  },
  {
    title: 'Portal Diagnosis Dokter',
    desc: 'Panel terpadu untuk dokter: memantau transkrip dua arah, memberi respon cepat preset medis, memutar jawaban dengan suara (TTS), hingga menutup sesi dengan catatan SOAP.',
    points: ['Respon cepat preset klinis', 'Text-to-Speech dua bahasa', 'Histori chat per pasien'],
    icon: Stethoscope,
    tone: 'text-emerald-600 bg-emerald-500/10'
  },
  {
    title: 'Manajemen Dataset & Training',
    desc: 'Perekaman sampel landmark per label/peraga, balance checker antar-signer, 9 teknik augmentasi spasial-temporal, dan pelatihan ulang model TFLite langsung dari dashboard.',
    points: ['Rekam & unggah sampel .npy', 'AI augmentation + mirror', 'Training & finalisasi model'],
    icon: Database,
    tone: 'text-amber-600 bg-amber-500/10'
  }
];

const DETAILS = [
  {
    no: '01',
    title: 'Pipeline Translasi Real-time',
    tone: 'text-sky-700',
    desc: 'Video kamera diproses 100% di sisi klien menggunakan MediaPipe Hands untuk mengekstrak 21 landmark jari (63 koordinat 3D per frame). Deretan 30 frame dikirim via WebSocket berlatensi rendah ke model GRU/LSTM di backend FastAPI, lalu hasil prediksi dikembalikan sebagai kata medis beserta skor confidence — semua dalam satu tarikan napas.'
  },
  {
    no: '02',
    title: 'SOAP Clinical Notetaker',
    tone: 'text-emerald-700',
    desc: 'Modul AI Notetaker memantau alur percakapan dokter–pasien selama sesi dan secara otomatis merangkumnya ke format SOAP (Subjective, Objective, Assessment, Plan) — standar rekam medis rumah sakit. Dokter tinggal meninjau, mengedit, dan menandatangani secara digital.'
  },
  {
    no: '03',
    title: 'Augmentasi Data Spasial & AI Transformer',
    tone: 'text-amber-700',
    desc: 'Keterbatasan sampel isyarat klinis diatasi dengan 9 teknik augmentasi: translation, scaling, rotation, mirroring, jittering, speed perturbation, temporal shift, hingga Multi-Head Self-Attention NumPy Transformer — menghasilkan variasi isyarat baru berkualitas tinggi tanpa merekam ulang.'
  },
  {
    no: '04',
    title: 'Kepatuhan UU PDP & Privasi Pasien',
    tone: 'text-rose-700',
    desc: 'Dirancang mengacu UU No. 27/2022 (PDP) dan Permenkes No. 24/2022. Video kamera diolah lokal dan tidak pernah disimpan; NIK pasien dienkripsi sebelum masuk database; akses rekam medis dijaga relasi dokter–pasien dengan mekanisme Break-Glass yang terekam audit.'
  },
  {
    no: '05',
    title: 'Rekam Medis Elektronik & Audit Trail',
    tone: 'text-violet-700',
    desc: 'Setiap sesi konsultasi menghasilkan RME yang bisa ditandatangani dokter, lengkap dengan resep obat dan rekomendasi tindak lanjut. Semua aksi sensitif (login, akses darurat, perubahan data) tercatat pada sistem audit log yang bisa diekspor ke CSV oleh Super Admin.'
  },
  {
    no: '06',
    title: 'Akses Darurat (Break-Glass) & Alert Klinis',
    tone: 'text-indigo-700',
    desc: 'Pasien gawat darurat yang belum terdaftar tetap bisa dilayani: dokter membuka akses sementara 2 jam hanya dengan NIK KTP, dan setiap aktivasi otomatis memicu insiden keamanan untuk ditinjau. Isyarat kritis seperti "nyeri dada" atau "tolong" memicu alert darurat di layar dokter.'
  }
];

const HOW_IT_WORKS = [
  { icon: Hand, title: '1. Isyarat Direkam', desc: 'Pasien mengisyaratkan keluhan medis dalam BISINDO di depan kamera.' },
  { icon: ScanLine, title: '2. AI Menerjemahkan', desc: 'Landmark tangan diproses model sequence menjadi kata medis + confidence.' },
  { icon: Languages, title: '3. Teks & Suara', desc: 'Hasil terjemahan tampil di layar dokter dan dilafalkan text-to-speech.' },
  { icon: Stethoscope, title: '4. Dokter Merespons', desc: 'Dokter menjawab via preset/teks — dibalas suara & teks besar ke pasien.' },
];

export const Services = ({ setView }) => {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up text-slate-800">
      {/* Page Header */}
      <div className="glass-panel flex items-center justify-between rounded-3xl p-4">
        <button
          onClick={() => setView('home')}
          className="glass-button rounded-2xl px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-sky-700 font-black tracking-widest">Layanan MedSign AI</span>
          <h2 className="text-lg font-black text-slate-950 tracking-tight">Informasi Layanan</h2>
        </div>
      </div>

      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-8">
        {/* Intro */}
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight">Layanan Utama MedSign AI</h2>
            <p className="mt-4 text-sm font-semibold leading-7 text-slate-600 max-w-[70ch]">
              MedSign AI berfokus pada integrasi kecerdasan buatan untuk mempercepat komunikasi medis dan
              menjembatani konsultasi dokter dengan teman Tuli secara aman, andal, dan inklusif. Kami menyediakan
              alat bantu klinis lengkap — dari penerjemahan isyarat real-time, notetaker SOAP otomatis, hingga
              manajemen dataset dan pelatihan model — untuk memfasilitasi faskes yang ramah disabilitas.
            </p>
          </div>

          {/* Stats strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {STATS.map(s => (
              <div key={s.label} className="rounded-3xl border border-slate-100 bg-white/70 px-5 py-4">
                <span className="block text-2xl font-black tracking-tight text-slate-950">{s.val}</span>
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5 leading-snug">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3 Core Services */}
        <div className="grid gap-6 md:grid-cols-3">
          {CORE_SERVICES.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="surface-panel rounded-3xl p-5 border border-white/40 shadow-sm bg-white/40 flex flex-col gap-3">
                <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${item.tone}`}>
                  <Icon size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">{item.desc}</p>
                <ul className="flex flex-col gap-1.5 mt-auto pt-2 border-t border-slate-100">
                  {item.points.map(p => (
                    <li key={p} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
                      <Activity size={11} className="text-sky-500 shrink-0" /> {p}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Detail sections */}
        <div className="flex flex-col gap-6 border-t border-slate-100 pt-8">
          <h3 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
            <Sparkles className="text-sky-600" size={18} /> Detail Fitur & Integrasi Faskes
          </h3>

          <div className="grid gap-5 md:grid-cols-2">
            {DETAILS.map(d => (
              <div key={d.no} className="surface-panel rounded-3xl p-6 border border-white/40 shadow-sm bg-white/50 flex flex-col gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${d.tone}`}>{d.no}. {d.title}</span>
                <p className="text-xs font-semibold text-slate-600 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="flex flex-col gap-5 border-t border-slate-100 pt-8">
          <h3 className="text-lg font-black text-slate-950 tracking-tight flex items-center gap-2">
            <Users className="text-emerald-600" size={18} /> Bagaimana Konsultasi Berlangsung
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map(s => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="rounded-3xl border border-slate-100 bg-white/70 p-5 flex flex-col gap-2.5">
                  <div className="h-9 w-9 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                    <Icon size={17} />
                  </div>
                  <h4 className="text-xs font-black text-slate-900">{s.title}</h4>
                  <p className="text-[11px] font-semibold text-slate-500 leading-relaxed">{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* CTA */}
        <div className="rounded-[28px] bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 border border-sky-100 p-6 md:p-7 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h4 className="text-base font-black text-slate-950 tracking-tight">Siap mencoba konsultasi inklusif?</h4>
            <p className="text-xs font-semibold text-slate-500 mt-1">Jalankan mode pasien & dokter sekarang, atau baca panduan lengkapnya dulu.</p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              onClick={() => setView('patient')}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-white bg-[#053D67] hover:opacity-90 transition-all active:scale-95 shadow-md"
            >
              <ScanLine size={14} /> Coba Mode Pasien <ArrowRight size={12} />
            </button>
            <button
              onClick={() => setView('manual')}
              className="inline-flex items-center gap-2 rounded-2xl px-5 py-3 text-xs font-black text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
            >
              <FileText size={14} /> Baca Panduan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
