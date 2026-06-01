import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { Sparkles, AlertTriangle } from 'lucide-react';

export const TranslationDisplay = () => {
  const { lastDetected, cameraActive } = useContext(AppContext);

  if (!cameraActive) {
    return (
      <div className="glass-panel border-dashed border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center min-h-[140px]">
        <p className="text-slate-500 text-sm font-semibold">Kamera Tidak Aktif</p>
        <p className="text-xs text-slate-600 mt-1 max-w-[200px]">Aktifkan kamera untuk menampilkan hasil terjemahan real-time.</p>
      </div>
    );
  }

  if (!lastDetected) {
    return (
      <div className="glass-panel p-6 rounded-2xl flex flex-col items-center justify-center text-center min-h-[140px] animate-pulse">
        <div className="flex items-center gap-2 text-sky-500 text-sm font-bold uppercase tracking-wider">
          <Sparkles size={14} className="animate-spin" />
          Menunggu Isyarat...
        </div>
        <p className="text-xs text-slate-500 mt-2 max-w-[220px] leading-relaxed">
          Posisikan tangan Anda di depan kamera dan lakukan gerakan isyarat medis.
        </p>
      </div>
    );
  }

  const { prediction, confidence, top3, mode, processing_time_ms } = lastDetected;

  // Determine colors based on confidence
  let colorClass = 'text-red-400';
  let barColor = 'bg-red-500';
  let confLabel = 'Rendah';

  if (confidence >= 0.85) {
    colorClass = 'text-emerald-400';
    barColor = 'bg-emerald-500';
    confLabel = 'Tinggi';
  } else if (confidence >= 0.65) {
    colorClass = 'text-amber-400';
    barColor = 'bg-amber-500';
    confLabel = 'Sedang';
  }

  // Check if prediction is an emergency word
  const isEmergency = prediction.toLowerCase() === 'tolong' || 
                      prediction.toLowerCase() === 'tidak bisa bernapas' ||
                      prediction.toLowerCase() === 'nyeri dada' ||
                      prediction.toLowerCase() === 'nyeri' ||
                      prediction.toLowerCase() === 'pingsan' ||
                      prediction.toLowerCase() === 'bantuan segera' ||
                      prediction.toLowerCase() === 'sakit sekali' ||
                      prediction.toLowerCase() === 'lebih buruk' ||
                      prediction.toLowerCase() === 'dada' ||
                      prediction.toLowerCase() === 'sesak';

  return (
    <div className={`glass-panel p-6 rounded-2xl flex flex-col gap-4 border transition-all ${
      isEmergency ? 'border-red-500/40 bg-red-950/10 shadow-lg glow-crimson' : 'border-slate-800'
    }`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase">
          Hasil Terjemahan Real-Time
        </span>
        {isEmergency && (
          <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 text-[10px] font-bold flex items-center gap-1 uppercase tracking-wider animate-pulse">
            <AlertTriangle size={10} />
            Darurat
          </span>
        )}
      </div>

      {/* Predicted Word Output */}
      <div className="flex flex-col items-center justify-center py-2 text-center">
        <span className={`font-display font-extrabold tracking-tight select-all leading-tight ${
          isEmergency ? 'text-4xl sm:text-5xl text-red-500' : 'text-3xl sm:text-4xl text-sky-400'
        }`}>
          {prediction.toUpperCase()}
        </span>
        <span className="text-[10px] text-slate-500 font-mono tracking-wide mt-1.5 uppercase">
          {mode === 'demo' ? 'Mode Demo' : 'Deep Learning Inference'} · {processing_time_ms}ms
        </span>
      </div>

      {/* Confidence Bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-wider">
          <span className="text-slate-400">Tingkat Keyakinan</span>
          <span className={colorClass}>{Math.round(confidence * 100)}% · {confLabel}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-950/80 rounded-full overflow-hidden border border-slate-800/80">
          <div 
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Top 3 Alternatives */}
      {top3 && top3.length > 1 && (
        <div className="border-t border-slate-900/60 pt-3 flex flex-col gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Alternatif Prediksi:
          </span>
          <div className="grid grid-cols-3 gap-2">
            {top3.slice(0, 3).map((alt, idx) => (
              <div 
                key={idx} 
                className="bg-slate-950/45 border border-slate-900 px-2.5 py-1.5 rounded-lg text-center font-mono flex flex-col gap-0.5 shadow-sm"
              >
                <span className="text-[11px] font-bold text-slate-200 truncate uppercase" title={alt.word}>
                  {alt.word}
                </span>
                <span className="text-[9px] text-slate-500">
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
