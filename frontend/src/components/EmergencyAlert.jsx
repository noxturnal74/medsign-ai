import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AlertOctagon } from 'lucide-react';

export const EmergencyAlert = () => {
  const { lastDetected } = useContext(AppContext);

  if (!lastDetected) return null;

  const { prediction } = lastDetected;
  const isEmergency = prediction.toLowerCase() === 'tolong' || 
                      prediction.toLowerCase() === 'tidak bisa bernapas' ||
                      prediction.toLowerCase() === 'nyeri dada' ||
                      prediction.toLowerCase() === 'pingsan' ||
                      prediction.toLowerCase() === 'bantuan segera' ||
                      prediction.toLowerCase() === 'sakit sekali' ||
                      prediction.toLowerCase() === 'lebih buruk' ||
                      prediction.toLowerCase() === 'dada' ||
                      prediction.toLowerCase() === 'sesak';

  if (!isEmergency) return null;

  return (
    <div className="w-full bg-red-950/40 border border-red-500/30 text-red-400 p-4 rounded-2xl flex items-center gap-3 shadow-lg glow-crimson pulse-glow-red select-none animate-slide-up">
      <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 flex items-center justify-center">
        <AlertOctagon size={20} className="animate-pulse" />
      </div>
      <div>
        <h4 className="text-xs font-bold font-mono tracking-widest uppercase text-red-500">TERDETEKSI GEJALA DARURAT!</h4>
        <p className="text-xs text-slate-300 font-semibold mt-0.5">
          Pasien mengisyaratkan keluhan darurat: <span className="font-extrabold text-red-400">"{prediction.toUpperCase()}"</span>. Harap tangani pasien dengan prioritas tinggi!
        </p>
      </div>
    </div>
  );
};
