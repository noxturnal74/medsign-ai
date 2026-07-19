import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { ExternalLink, Home, Info, Stethoscope, User, Volume2, VolumeX, Database, BookOpen, ChevronDown, Video, Menu as MenuIcon, X } from 'lucide-react';

const MARKETING_SITE_URL =
  import.meta.env.VITE_MARKETING_SITE_URL ||
  'https://albert-william-saputra-portfolio.vercel.app/#projects';

const navItems = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'patient', label: 'Pasien', icon: User },
  { id: 'doctor', label: 'Dokter', icon: Stethoscope },
  { id: 'data-collection', label: 'Dataset', icon: Database },
  { id: 'motion', label: 'Motion', icon: Video },
  { id: 'manual', label: 'Panduan', icon: BookOpen },
  { id: 'about', label: 'Tentang', icon: Info }
];

export const Navbar = ({ currentView, setView }) => {
  const { ttsEnabled, setTtsEnabled, language, setLanguage, t } = useContext(AppContext);
  const [mobileOpen, setMobileOpen] = useState(false);

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

        {/* Hamburger Menu for Mobile */}
        <button
          className="lg:hidden p-2.5 rounded-xl border border-white/60 bg-white/45 text-slate-700 hover:bg-white hover:text-slate-950 transition-all shadow-sm active:scale-[0.97]"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X size={18} /> : <MenuIcon size={18} />}
        </button>

        <div className="hidden lg:flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="flex min-w-0 items-center gap-1 rounded-2xl bg-white/40 p-1 backdrop-blur-xl">
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
                  <span className="hidden md:inline">{t(item.id)}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setTtsEnabled(!ttsEnabled)}
            className={`glass-button rounded-2xl px-3 py-2 text-xs font-bold ${
              ttsEnabled ? 'text-emerald-700' : 'text-rose-700'
            }`}
            title={ttsEnabled ? t('voiceInactive') : t('voiceActive')}
          >
            {ttsEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
            <span className="hidden lg:inline">{ttsEnabled ? t('voiceActive') : t('voiceInactive')}</span>
          </button>

          <div className="relative shrink-0 select-none">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="glass-button rounded-2xl px-3 py-2 text-xs font-bold appearance-none pr-8 cursor-pointer text-slate-700 bg-white/40 border-white/70 shadow-sm"
            >
              <option value="id" className="bg-white text-slate-800">🇮🇩 ID</option>
              <option value="en" className="bg-white text-slate-800">🇬🇧 EN</option>
              <option value="ms" className="bg-white text-slate-800">🇲🇾 MS</option>
              <option value="th" className="bg-white text-slate-800">🇹🇭 TH</option>
              <option value="vi" className="bg-white text-slate-800">🇻🇳 VI</option>
              <option value="tl" className="bg-white text-slate-800">🇵🇭 TL</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
              <ChevronDown size={10} />
            </div>
          </div>

          <a
            href={MARKETING_SITE_URL}
            className="glass-button rounded-2xl px-3 py-2 text-xs font-bold text-sky-700"
            title="Buka landing page MedSign"
          >
            <ExternalLink size={16} />
            <span className="hidden xl:inline">{t('landing')}</span>
          </a>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileOpen && (
        <div className="lg:hidden absolute top-[72px] left-3 right-3 z-50 rounded-3xl border border-white/60 bg-white/95 p-4 flex flex-col gap-2 shadow-xl animate-slide-up backdrop-blur-xl text-slate-800">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setView(item.id);
                  setMobileOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-xs font-bold transition-all ${
                  active
                    ? 'bg-sky-500/10 text-sky-700 shadow-sm border border-sky-300/30'
                    : 'text-slate-600 hover:bg-white/60 hover:text-slate-950'
                }`}
              >
                <Icon size={15} />
                <span>{t(item.id)}</span>
              </button>
            );
          })}
          
          <hr className="border-slate-100 my-1" />

          {/* Voice active & Language switch on mobile */}
          <div className="flex items-center justify-between gap-3 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase text-slate-400">Settings</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`flex h-9 w-9 items-center justify-center rounded-xl border border-white/60 bg-white/40 text-xs font-bold ${
                  ttsEnabled ? 'text-emerald-700' : 'text-rose-700'
                }`}
                title={ttsEnabled ? t('voiceInactive') : t('voiceActive')}
              >
                {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="appearance-none pr-8 pl-3 py-1.5 text-xs font-bold rounded-xl bg-white/40 border border-white/70 text-slate-700 cursor-pointer shadow-sm w-[110px]"
              >
                <option value="id">🇮🇩 ID</option>
                <option value="en">🇬🇧 EN</option>
                <option value="ms">🇲🇾 MS</option>
                <option value="th">🇹🇭 TH</option>
                <option value="vi">🇻🇳 VI</option>
                <option value="tl">🇵🇭 TL</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
