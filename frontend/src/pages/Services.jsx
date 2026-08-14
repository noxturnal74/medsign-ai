import React from 'react';
import { HeartPulse, Stethoscope, Video, ShieldCheck, Database, MessageSquare } from 'lucide-react';

export const Services = ({ setView }) => {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up text-slate-800">
      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Layanan Kami</span>
          <h2 className="text-3xl font-black text-slate-950 mt-1">Layanan MedSign AI</h2>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-650">
            MedSign AI berfokus pada integrasi teknologi kecerdasan buatan untuk mempercepat komunikasi medis dan menjembatani konsultasi dokter dengan teman Tuli secara aman, andal, dan inklusif.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {[
            {
              title: "Konsultasi Real-time",
              desc: "Deteksi isyarat BISINDO klinis langsung melalui webcam dengan visualisasi skeletal 3D.",
              icon: HeartPulse
            },
            {
              title: "Portal Diagnosis Dokter",
              desc: "Panel terpadu untuk dokter memantau respon, transkrip, dan memutar rekaman audio verbal.",
              icon: Stethoscope
            },
            {
              title: "Manajemen Dataset",
              desc: "Sarana penambahan sample latih model (data collection) dan augmentation data isyarat medis.",
              icon: Database
            }
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="surface-panel rounded-3xl p-5 border border-white/40 shadow-sm">
                <div className="h-10 w-10 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center mb-4">
                  <Icon size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900">{item.title}</h4>
                <p className="text-xs font-semibold text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
