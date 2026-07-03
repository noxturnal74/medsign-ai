import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { DoctorPanel } from '../components/DoctorPanel';
import { SessionLog } from '../components/SessionLog';
import { ArrowLeft, Stethoscope, Volume2 } from 'lucide-react';

export const DoctorView = ({ setView }) => {
  const { sentence, speak } = useContext(AppContext);

  const handleSpeakSentence = () => {
    if (sentence.length === 0) return;
    speak(sentence.join(' '));
  };

  return (
    <div className="flex w-full flex-col gap-6 animate-slide-up">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between rounded-3xl p-4">
        <button
          onClick={() => setView('home')}
          className="glass-button rounded-2xl px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="flex items-center gap-2.5 text-right">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Stethoscope size={17} />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-emerald-700">Konsultasi Aktif</span>
            <h2 className="text-lg font-black text-slate-950">Layar Diagnosis Dokter</h2>
          </div>
        </div>
      </div>

      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom kiri: kalimat pasien masuk */}
        <div className="flex w-full flex-col gap-6 lg:col-span-5">
          {/* Panel kalimat pasien */}
          <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5">
            <span className="block text-[10px] font-bold uppercase text-slate-500">
              Kalimat Isyarat Pasien
            </span>

            <div className="flex min-h-[90px] flex-wrap items-center justify-start gap-1.5 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-inner">
              {sentence.length === 0 ? (
                <span className="text-xs font-semibold text-slate-500">
                  Menunggu isyarat pasien dari kamera di mode Pasien...
                </span>
              ) : (
                sentence.map((word, idx) => (
                  <span
                    key={idx}
                    className="animate-slide-up rounded-lg border border-sky-300/30 bg-sky-400/20 px-2.5 py-1 text-xs font-bold uppercase text-sky-100 shadow-sm"
                  >
                    {word}
                  </span>
                ))
              )}
            </div>

            {sentence.length > 0 && (
              <button
                onClick={handleSpeakSentence}
                className="glass-button glass-button-primary w-full rounded-2xl py-2.5 text-xs font-bold"
              >
                <Volume2 size={13} />
                Lafalkan Kalimat Pasien
              </button>
            )}
          </div>

          {/* Info cara kerja */}
          <div className="glass-panel rounded-3xl p-5 border border-sky-200/50">
            <p className="text-[10px] font-bold uppercase text-sky-700 mb-2">Cara Kerja</p>
            <p className="text-xs font-semibold leading-6 text-slate-600">
              Pasien melakukan isyarat BISINDO di <strong>Mode Pasien</strong> (halaman terpisah).
              Kalimat hasil deteksi AI akan muncul otomatis di panel atas.
            </p>
          </div>
        </div>

        {/* Kolom kanan: quick phrases + log */}
        <div className="flex w-full flex-col gap-6 lg:col-span-7">
          <DoctorPanel />
          <SessionLog />
        </div>
      </div>
    </div>
  );
};
