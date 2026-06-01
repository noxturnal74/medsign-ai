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
    <div className="flex flex-col gap-6 w-full animate-slide-up">
      
      {/* Header View */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="text-right flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Stethoscope size={16} />
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold font-mono tracking-widest text-emerald-400 uppercase">
              Konsultasi Aktif
            </span>
            <h2 className="text-lg font-bold text-slate-200">Layar Diagnosis Dokter</h2>
          </div>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* LEFT COLUMN: Camera Feed & Real-time Translation output card (lg:col-span-5 - fixed 360px equivalent) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full lg:max-w-[360px] mx-auto">
          {/* Patient Camera Stream */}
          <CameraFeed />

          {/* Translation big card display */}
          <TranslationDisplay />

          {/* Patient Sentence accumulator display card for physician to track progress */}
          {sentence.length > 0 && (
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
              <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase block">
                Akumulasi Kalimat Pasien
              </span>
              
              <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 min-h-[50px] flex items-center justify-start flex-wrap gap-1.5 shadow-inner">
                {sentence.map((word, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold uppercase tracking-wide animate-slide-up"
                  >
                    {word}
                  </span>
                ))}
              </div>

              <button
                onClick={handleSpeakSentence}
                className="w-full py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Volume2 size={13} />
                Lafalkan Kalimat Pasien (TTS)
              </button>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Doctor Typing Panel & shared SessionLog timeline (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          {/* Doctor message sending and Preset list */}
          <DoctorPanel />

          {/* Session Log Chat Timeline */}
          <SessionLog />
        </div>

      </div>
    </div>
  );
};
