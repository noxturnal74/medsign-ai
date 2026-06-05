import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AlertOctagon } from 'lucide-react';

const emergencyWords = new Set([
  'tolong',
  'tidak bisa bernapas',
  'nyeri dada',
  'pingsan',
  'bantuan segera',
  'sakit sekali',
  'lebih buruk',
  'dada',
  'sesak'
]);

export const EmergencyAlert = () => {
  const { lastDetected } = useContext(AppContext);

  if (!lastDetected) return null;

  const { prediction } = lastDetected;
  const isEmergency = emergencyWords.has(prediction.toLowerCase());

  if (!isEmergency) return null;

  return (
    <div className="glass-panel flex w-full items-center gap-3 rounded-3xl border-red-300/60 bg-red-50/60 p-4 text-red-700 pulse-glow-red animate-slide-up select-none">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-300/50 bg-red-500/10 text-red-600">
        <AlertOctagon size={21} className="animate-pulse" />
      </div>
      <div>
        <h4 className="text-xs font-black uppercase text-red-700">Terdeteksi Gejala Darurat</h4>
        <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-700">
          Pasien mengisyaratkan keluhan darurat: <span className="font-black text-red-700">"{prediction.toUpperCase()}"</span>. Harap tangani dengan prioritas tinggi.
        </p>
      </div>
    </div>
  );
};
