import React from 'react';
import { Navbar } from './Navbar';

const footerLogos = [
  { name: 'Kemdikbudristek', src: '/assets/logo-kemdikbudristek.png', className: 'h-7' },
  { name: 'Diktisaintek Berdampak', src: '/assets/logo-diktisaintek.png', className: 'h-6' },
  { name: 'Simbelmawa', src: '/assets/logo-simbelmawa.png', className: 'h-6' },
  { name: 'PKM', src: '/assets/logo-pkm-full.png', className: 'h-7' },
  { name: 'Universitas Ma Chung', src: '/assets/logo-umc.png', className: 'h-7' },
  { name: 'MedSign', src: '/assets/medsign-logo.png', className: 'h-6' }
];

export const Layout = ({ children, currentView, setView }) => {
  const isHome = currentView === 'home';

  return (
    <div className="app-shell flex min-h-screen flex-col text-slate-900">
      <Navbar currentView={currentView} setView={setView} />
      <main className={`${isHome ? 'w-full max-w-none px-4 py-5 md:px-6' : 'mx-auto flex w-full max-w-7xl flex-grow flex-col px-4 py-6 md:px-6'} animate-slide-up`}>
        {children}
      </main>
      <footer className="mx-auto mb-4 mt-8 flex w-[min(92rem,calc(100%-2rem))] flex-col items-center justify-center gap-3 rounded-2xl border border-white/60 bg-white/40 px-4 py-3 text-center text-xs font-semibold text-slate-600 shadow-sm backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-center gap-4">
          {footerLogos.map(logo => (
            <img
              key={logo.name}
              src={logo.src}
              alt={`Logo ${logo.name}`}
              className={`${logo.className} w-auto max-w-[110px] object-contain`}
            />
          ))}
        </div>
        <span>MedSign AI / PKM-KC 2026 / BISINDO clinical communication assistant</span>
      </footer>
    </div>
  );
};
