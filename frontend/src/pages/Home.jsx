import React from 'react';
import { User, Stethoscope, Heart, Info, Code, Shield } from 'lucide-react';

export const Home = ({ setView }) => {
  return (
    <div className="flex flex-col gap-12 py-8 max-w-4xl mx-auto w-full items-center justify-center min-h-[75vh]">
      
      {/* Title Hero */}
      <div className="text-center flex flex-col gap-4 max-w-2xl">
        <div className="inline-flex self-center items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 text-sky-400 text-xs font-mono tracking-wider uppercase">
          <Heart size={12} className="animate-pulse" />
          Aksesibilitas Kesehatan Setara
        </div>
        <h1 className="font-display font-bold text-4xl sm:text-5xl text-slate-100 tracking-tight leading-tight">
          Menjembatani Hambatan Komunikasi dengan <span className="text-sky-400 font-extrabold bg-clip-text">MedSign AI</span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed max-w-xl mx-auto font-semibold">
          Platform asisten komunikasi medis dua arah untuk memudahkan pemeriksaan klinis penyandang tunarungu menggunakan deteksi gerak isyarat BISINDO secara real-time.
        </p>
      </div>

      {/* Role Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl">
        {/* Patient Card */}
        <button
          onClick={() => setView('patient')}
          className="group text-left glass-panel glass-panel-hover p-8 rounded-3xl border border-slate-800 flex flex-col gap-6 items-start transition-all cursor-pointer bg-gradient-to-br from-slate-900/60 to-sky-950/10"
        >
          <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-sky-500 group-hover:text-white transition-all duration-300">
            <span className="text-2xl group-hover:scale-110">🤟</span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-200 group-hover:text-sky-400 transition-all flex items-center gap-1">
              Mode Pasien
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
              Tunjukkan isyarat BISINDO klinis Anda ke arah kamera. Sistem akan menerjemahkannya ke teks dan suara untuk dipahami oleh tenaga medis.
            </p>
          </div>
          <span className="text-xs font-mono font-bold tracking-widest text-sky-400/70 group-hover:text-sky-400 uppercase mt-auto flex items-center gap-1.5 transition-all">
            Mulai Konsultasi →
          </span>
        </button>

        {/* Doctor Card */}
        <button
          onClick={() => setView('doctor')}
          className="group text-left glass-panel glass-panel-hover p-8 rounded-3xl border border-slate-800 flex flex-col gap-6 items-start transition-all cursor-pointer bg-gradient-to-br from-slate-900/60 to-emerald-950/10"
        >
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-300">
            <Stethoscope size={24} className="group-hover:rotate-12 transition-all duration-300" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-slate-200 group-hover:text-emerald-400 transition-all flex items-center gap-1">
              Mode Dokter / Tenaga Medis
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed font-semibold">
              Lihat terjemahan isyarat pasien tunarungu secara real-time dan kirimkan instruksi klinis atau resep balik dalam bentuk teks besar serta suara (TTS).
            </p>
          </div>
          <span className="text-xs font-mono font-bold tracking-widest text-emerald-400/70 group-hover:text-emerald-400 uppercase mt-auto flex items-center gap-1.5 transition-all">
            Periksa Pasien →
          </span>
        </button>
      </div>

      {/* Quick Specs Badges */}
      <div className="flex flex-wrap items-center justify-center gap-4 bg-slate-950/65 border border-slate-900 px-6 py-3 rounded-2xl max-w-xl text-[10px] font-bold font-mono tracking-wider text-slate-500 shadow-sm uppercase select-none">
        <div className="flex items-center gap-1.5 border-r border-slate-800/80 pr-4">
          <Code size={12} className="text-sky-400" />
          Vite + React 18
        </div>
        <div className="flex items-center gap-1.5 border-r border-slate-800/80 px-4">
          <Shield size={12} className="text-emerald-400" />
          MediaPipe Hands JS
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-red-400 text-xs">●</span>
          FastAPI LSTM Model
        </div>
      </div>
    </div>
  );
};
