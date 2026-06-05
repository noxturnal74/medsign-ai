import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ExternalLink, Home, Info, Stethoscope, User, Volume2, VolumeX } from 'lucide-react';

const MARKETING_SITE_URL =
  import.meta.env.VITE_MARKETING_SITE_URL ||
  'https://albert-william-saputra-portfolio.vercel.app/#projects';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'patient', label: 'Pasien', icon: User },
  { id: 'doctor', label: 'Dokter', icon: Stethoscope },
  { id: 'about', label: 'Tentang', icon: Info }
];

export const Navbar = ({ currentView, setView }) => {
  const { ttsEnabled, setTtsEnabled } = useContext(AppContext);

  return (
    <nav className="sticky top-0 z-50 px-3 pt-3 md:px-6">
      <div className="glass-panel mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-3xl px-3 py-2.5 md:px-4">
        <button
          className="group flex min-w-0 items-center gap-3 rounded-2xl px-2 py-1 text-left transition-transform hover:-translate-y-0.5"
          onClick={() => setView('home')}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/75 p-1.5 shadow-lg shadow-sky-500/20 backdrop-blur-xl">
            <img
              src="/assets/medsign-mark.png"
              alt="Logo MedSign"
              className="h-full w-full object-contain"
            />
          </span>
          <span className="hidden min-w-0 sm:block">
            <span className="block text-base font-extrabold leading-tight text-slate-950">MedSign AI</span>
            <span className="block truncate text-[11px] font-semibold text-slate-500">BISINDO medical assistant</span>
          </span>
        </button>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-2xl bg-white/40 p-1 backdrop-blur-xl">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all md:px-4 ${
                    active
                      ? 'bg-white text-sky-700 shadow-sm shadow-sky-900/10'
                      : 'text-slate-600 hover:bg-white/60 hover:text-slate-950'
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden md:inline">{item.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`glass-button rounded-2xl px-3 py-2 text-xs font-bold ${
              ttsEnabled ? 'text-emerald-700' : 'text-rose-700'
            }`}
            title={ttsEnabled ? 'Matikan Suara (TTS)' : 'Aktifkan Suara (TTS)'}
          >
            {ttsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            <span className="hidden lg:inline">{ttsEnabled ? 'Suara aktif' : 'Suara mati'}</span>
          </button>

          <a
            href={MARKETING_SITE_URL}
            className="glass-button rounded-2xl px-3 py-2 text-xs font-bold text-sky-700"
            title="Buka landing page MedSign"
          >
            <ExternalLink size={16} />
            <span className="hidden xl:inline">Landing</span>
          </a>
        </div>
      </div>
    </nav>
  );
};
