import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Volume2, VolumeX, Stethoscope, User, Info, Activity } from 'lucide-react';

export const Navbar = ({ currentView, setView }) => {
  const { ttsEnabled, setTtsEnabled } = useContext(AppContext);

  return (
    <nav className="glass-panel border-b border-slate-800/80 sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('home')}>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white glow-cyan font-bold text-xl">
          MS
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-2xl text-sky-400 tracking-tight">Med</span>
            <span className="font-display font-semibold text-2xl text-slate-100 tracking-tight">Sign</span>
            <span className="bg-sky-500/20 text-sky-400 text-[10px] font-mono px-2 py-0.5 rounded-full border border-sky-500/30 uppercase">AI</span>
          </div>
          <p className="text-[10px] text-slate-400 tracking-wide font-medium">Sistem Komunikasi Medis Tunarungu</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Navigation Tabs */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/65 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setView('home')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              currentView === 'home'
                ? 'bg-slate-900 text-sky-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => setView('patient')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              currentView === 'patient'
                ? 'bg-slate-900 text-sky-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <User size={15} />
            Pasien
          </button>
          <button
            onClick={() => setView('doctor')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              currentView === 'doctor'
                ? 'bg-slate-900 text-sky-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope size={15} />
            Dokter
          </button>
          <button
            onClick={() => setView('about')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              currentView === 'about'
                ? 'bg-slate-900 text-sky-400 shadow-sm border border-slate-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Info size={15} />
            Tentang
          </button>
        </div>

        {/* TTS Toggle Button */}
        <button
          onClick={() => setTtsEnabled(!ttsEnabled)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all cursor-pointer ${
            ttsEnabled
              ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 hover:bg-sky-500/20'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
          }`}
          title={ttsEnabled ? 'Matikan Suara (TTS)' : 'Aktifkan Suara (TTS)'}
        >
          {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          <span className="hidden sm:inline">{ttsEnabled ? 'Suara Aktif' : 'Suara Mati'}</span>
        </button>
      </div>
    </nav>
  );
};
