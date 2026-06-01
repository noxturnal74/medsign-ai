import React from 'react';
import { Navbar } from './Navbar';

export const Layout = ({ children, currentView, setView }) => {
  return (
    <div className="flex flex-col min-h-screen bg-[#020b14] text-slate-100 selection:bg-sky-500/20 selection:text-sky-300">
      <Navbar currentView={currentView} setView={setView} />
      <main className="flex-grow flex flex-col p-4 md:p-6 max-w-7xl w-full mx-auto animate-slide-up">
        {children}
      </main>
      <footer className="py-4 border-t border-slate-900/60 bg-slate-950/20 text-center text-xs text-slate-500 font-mono tracking-wider">
        MEDSIGN AI · SPRINT 0-3 MVP · UNIVERSITAS MA CHUNG · PKM-KC 2026
      </footer>
    </div>
  );
};
