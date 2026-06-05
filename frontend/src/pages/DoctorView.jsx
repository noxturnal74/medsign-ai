import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { CameraFeed } from '../components/CameraFeed';
import { TranslationDisplay } from '../components/TranslationDisplay';
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
        <div className="mx-auto flex w-full flex-col gap-6 lg:col-span-5 lg:max-w-[380px]">
          <CameraFeed />
          <TranslationDisplay />

          {sentence.length > 0 && (
            <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                Akumulasi Kalimat Pasien
              </span>

              <div className="flex min-h-[50px] flex-wrap items-center justify-start gap-1.5 rounded-2xl border border-white/10 bg-slate-950/90 p-3 shadow-inner">
                {sentence.map((word, idx) => (
                  <span
                    key={idx}
                    className="animate-slide-up rounded-lg border border-sky-300/30 bg-sky-400/20 px-2.5 py-1 text-xs font-bold uppercase text-sky-100"
                  >
                    {word}
                  </span>
                ))}
              </div>

              <button
                onClick={handleSpeakSentence}
                className="glass-button glass-button-primary w-full rounded-2xl py-2.5 text-xs font-bold"
              >
                <Volume2 size={13} />
                Lafalkan Kalimat Pasien
              </button>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-6 lg:col-span-7">
          <DoctorPanel />
          <SessionLog />
        </div>
      </div>
    </div>
  );
};
