import React from 'react';
import { HeartPulse, Stethoscope, Database, ArrowLeft, Sparkles } from 'lucide-react';

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
          <h2 className="text-lg font-black text-slate-950 font-black tracking-tight">Informasi Layanan</h2>
        </div>
      </div>

      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-8">
        <div>
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Layanan Kami</span>
          <h2 className="text-3xl font-black text-slate-950 mt-1">Layanan Utama MedSign AI</h2>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-650">
            MedSign AI berfokus pada integrasi teknologi kecerdasan buatan untuk mempercepat komunikasi medis dan menjembatani konsultasi dokter dengan teman Tuli secara aman, andal, dan inklusif. Kami menyediakan alat bantu klinis lengkap untuk memfasilitasi faskes yang ramah disabilitas.
          </p>
        </div>

        {/* 3 Core Services in Card Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: 'Konsultasi Real-time',
              desc: 'Deteksi isyarat BISINDO klinis langsung melalui webcam dengan visualisasi skeletal 3D landmark tangan.',
              icon: HeartPulse,
              tone: 'text-sky-600 bg-sky-500/10'
            },
            {
              title: 'Portal Diagnosis Dokter',
              desc: 'Panel terpadu untuk dokter memantau respon, transkrip, memutar rekaman audio, dan respon cepat preset.',
              icon: Stethoscope,
              tone: 'text-emerald-600 bg-emerald-500/10'
            },
            {
              title: 'Manajemen Dataset',
              desc: 'Perekaman sampel klinis, augmentasi cerdas (NumPy Transformer Encoder), dan pelatihan model berkas TFLite.',
              icon: Database,
              tone: 'text-amber-600 bg-amber-500/10'
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="surface-panel rounded-3xl p-5 border border-white/40 shadow-sm bg-white/40 flex flex-col justify-between">
                <div>
                  <div className={`h-10 w-10 rounded-2xl flex items-center justify-center mb-4 ${item.tone}`}>
                    <Icon size={20} />
                  </div>
                  <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                  <p className="text-xs font-semibold text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed Service breakdown sections */}
        <div className="flex flex-col gap-6 border-t border-slate-100 pt-8">
          <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="text-sky-600" size={18} /> Detail Fitur & Integrasi Faskes
          </h3>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Section 1: AI Translation Pipeline */}
            <div className="surface-panel rounded-3xl p-6 border border-white/40 shadow-sm bg-white/50 flex flex-col gap-3">
              <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider">01. Pipeline Translasi Real-time</span>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Teknologi deteksi isyarat kami memproses umpan kamera webcam 100% di sisi klien menggunakan MediaPipe Hands untuk mendeteksi 21 landmark jari (63 koordinat 3D). Koordinat ini dikirim secara asinkron menggunakan WebSocket berlatensi rendah ke model GRU/LSTM di backend FastAPI untuk menghasilkan translasi kata verbal medis instan.
              </p>
            </div>

            {/* Section 2: Clinical SOAP Integration */}
            <div className="surface-panel rounded-3xl p-6 border border-white/40 shadow-sm bg-white/50 flex flex-col gap-3">
              <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">02. SOAP Clinical Notetaker</span>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                MedSign AI dilengkapi dengan modul AI Notetaker yang memantau alur percakapan selama sesi konsultasi. AI secara otomatis merangkum transkrip konsultasi medis ke dalam format SOAP (Subjective, Objective, Assessment, Plan) standar rekam medis rumah sakit untuk menghemat waktu penulisan laporan dokter.
              </p>
            </div>

            {/* Section 3: Smart Augmentation */}
            <div className="surface-panel rounded-3xl p-6 border border-white/40 shadow-sm bg-white/50 flex flex-col gap-3">
              <span className="text-[10px] font-black text-amber-700 uppercase tracking-wider">03. Augmentasi Data Spasial & AI Transformer</span>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Untuk mengatasi tantangan keterbatasan data sampel isyarat klinis, sistem kami menyediakan 9 teknik augmentasi (Translation, Scaling, Rotation, Mirroring, Jittering, Speed, Temporal Shift, dan model Multi-Head Self-Attention NumPy Transformer) untuk menghasilkan variasi isyarat baru berkualitas tinggi dari sampel rekaman yang ada.
              </p>
            </div>

            {/* Section 4: Privacy & Compliance */}
            <div className="surface-panel rounded-3xl p-6 border border-white/40 shadow-sm bg-white/50 flex flex-col gap-3">
              <span className="text-[10px] font-black text-rose-700 uppercase tracking-wider">04. Kepatuhan UU PDP & Privasi Pasien</span>
              <p className="text-xs font-semibold text-slate-600 leading-relaxed">
                Aplikasi kami dirancang sesuai dengan UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP) dan Permenkes No. 24 Tahun 2022. Seluruh video kamera diolah secara lokal dan tidak pernah disimpan atau dikirim ke cloud. Rekam medis elektronik (RME) diisolasi demi kerahasiaan pasien secara penuh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};