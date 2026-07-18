import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { AlertTriangle, Sparkles } from 'lucide-react';

const emergencyWords = new Set([
  'tolong',
  'tidak bisa bernapas',
  'nyeri dada',
  'nyeri',
  'pingsan',
  'bantuan segera',
  'sakit sekali',
  'lebih buruk',
  'dada',
  'sesak'
]);

export const TranslationDisplay = () => {
  const { lastDetected, cameraActive } = useContext(AppContext);

  if (!cameraActive) {
    return (
      <div className="glass-panel flex min-h-[140px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/70 p-6 text-center">
        <p className="text-sm font-black text-slate-600">Kamera Tidak Aktif</p>
        <p className="mt-1 max-w-[230px] text-xs font-semibold leading-5 text-slate-500">
          Aktifkan kamera untuk menampilkan hasil terjemahan real-time.
        </p>
      </div>
    );
  }

  if (!lastDetected) {
    return (
      <div className="glass-panel flex min-h-[140px] flex-col items-center justify-center rounded-3xl p-6 text-center">
        <div className="flex items-center gap-2 text-sm font-black uppercase text-sky-700">
          <Sparkles size={14} className="animate-spin" />
          Menunggu Isyarat
        </div>
        <p className="mt-2 max-w-[240px] text-xs font-semibold leading-5 text-slate-500">
          Posisikan tangan di depan kamera dan lakukan gerakan isyarat medis.
        </p>
      </div>
    );
  }

  const { prediction, raw_prediction, confidence = 0, top3, mode, processing_time_ms } = lastDetected;
  const activeWord = prediction || raw_prediction || (top3 && top3[0]?.word) || '';
  const isEmergency = activeWord ? emergencyWords.has(activeWord.toLowerCase()) : false;
  const isConfirmed = !!prediction;

  let colorClass = 'text-red-600';
  let barColor = 'bg-red-500';
  let confLabel = 'Rendah';

  if (confidence >= 0.85) {
    colorClass = 'text-emerald-600';
    barColor = 'bg-emerald-500';
    confLabel = 'Tinggi';
  } else if (confidence >= 0.65) {
    colorClass = 'text-amber-600';
    barColor = 'bg-amber-500';
    confLabel = 'Sedang';
  }

  return (
    <div className={`glass-panel flex flex-col gap-4 rounded-3xl p-6 transition-all ${
      isConfirmed && isEmergency ? 'border-red-300/60 bg-red-50/60 pulse-glow-red' : ''
    }`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase text-slate-500">
          Hasil Terjemahan Real-Time
        </span>
        {isConfirmed && isEmergency && (
          <span className="inline-flex items-center gap-1 rounded-full border border-red-300/60 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-red-600">
            <AlertTriangle size={10} />
            Darurat
          </span>
        )}
      </div>

      <div className="flex flex-col items-center justify-center py-2 text-center">
        <span className={`select-all text-4xl font-black leading-tight sm:text-5xl ${
          !isConfirmed ? 'text-slate-400' : isEmergency ? 'text-red-600' : 'text-sky-700'
        }`}>
          {activeWord.toUpperCase()}
        </span>
        {!isConfirmed && activeWord && (
          <span className="mt-1.5 inline-block text-[9px] font-black uppercase text-amber-600 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
            Di Bawah Ambang Batas (Belum Terkonfirmasi)
          </span>
        )}
        <span className="mt-2 text-[10px] font-semibold uppercase text-slate-500">
          {mode === 'demo' ? 'Mode Demo' : 'Deep Learning Inference'} - {processing_time_ms}ms
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold">
          <span className="text-slate-500">Tingkat Keyakinan</span>
          <span className={colorClass}>{Math.round(confidence * 100)}% - {confLabel}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full border border-white/60 bg-slate-200/70">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {top3 && top3.length > 1 && (
        <div className="flex flex-col gap-2 border-t border-white/60 pt-3">
          <span className="text-[10px] font-bold uppercase text-slate-500">Alternatif Prediksi</span>
          <div className="grid grid-cols-3 gap-2">
            {top3.slice(0, 3).map((alt, idx) => (
              <div
                key={idx}
                className="surface-panel rounded-2xl px-2.5 py-2 text-center font-mono shadow-sm"
              >
                <span className="block truncate text-[11px] font-black uppercase text-slate-800" title={alt.word}>
                  {alt.word}
                </span>
                <span className="text-[9px] font-semibold text-slate-500">
                  {Math.round(alt.confidence * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
