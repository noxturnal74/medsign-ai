import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { CameraFeed } from '../components/CameraFeed';
import { TranslationDisplay } from '../components/TranslationDisplay';
import { VocabularyGuide } from '../components/VocabularyGuide';
import { SessionLog } from '../components/SessionLog';
import { EmergencyAlert } from '../components/EmergencyAlert';
import { ArrowLeft, Volume2, Delete, Trash2 } from 'lucide-react';

export const PatientView = ({ setView }) => {
  const { sentence, clearSentence, removeLastWord, speak } = useContext(AppContext);

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
        <div className="text-right">
          <span className="text-[10px] font-bold font-mono tracking-widest text-sky-400 uppercase">
            Mode Konsultasi
          </span>
          <h2 className="text-lg font-bold text-slate-200">Layar Komunikasi Pasien</h2>
        </div>
      </div>

      {/* Emergency Notification Banner */}
      <EmergencyAlert />

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        
        {/* LEFT COLUMN: Camera, Prediction Display, and Sentence Builder (lg:col-span-5 - fixed 340px equivalent) */}
        <div className="lg:col-span-5 flex flex-col gap-6 w-full lg:max-w-[360px] mx-auto">
          {/* Camera Feed card */}
          <CameraFeed />

          {/* Translation Output card */}
          <TranslationDisplay />

          {/* Sentence Builder Accumulator Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col gap-4">
            <span className="text-[10px] font-bold font-mono tracking-widest text-slate-500 uppercase block">
              Kalimat Pasien Saat Ini
            </span>
            
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 min-h-[70px] flex items-center justify-start flex-wrap gap-1.5 shadow-inner">
              {sentence.length === 0 ? (
                <span className="text-xs text-slate-600 font-mono tracking-wide">Belum ada kata terakumulasi. Lakukan isyarat atau klik kosakata medis...</span>
              ) : (
                sentence.map((word, idx) => (
                  <span 
                    key={idx} 
                    className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20 text-xs font-bold uppercase tracking-wide animate-slide-up shadow-sm"
                  >
                    {word}
                  </span>
                ))
              )}
            </div>

            {/* Sentence Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={handleSpeakSentence}
                disabled={sentence.length === 0}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  sentence.length > 0
                    ? 'bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border-sky-500/30'
                    : 'bg-slate-900 text-slate-600 border-slate-850 cursor-not-allowed'
                }`}
              >
                <Volume2 size={13} />
                Ucapkan
              </button>
              <button
                onClick={removeLastWord}
                disabled={sentence.length === 0}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  sentence.length > 0
                    ? 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    : 'bg-slate-900 text-slate-600 border-slate-850 cursor-not-allowed'
                }`}
              >
                <Delete size={13} />
                Hapus
              </button>
              <button
                onClick={clearSentence}
                disabled={sentence.length === 0}
                className={`py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                  sentence.length > 0
                    ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                    : 'bg-slate-900 text-slate-600 border-slate-850 cursor-not-allowed'
                }`}
              >
                <Trash2 size={13} />
                Bersih
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Vocabulary Guide & Session Log (lg:col-span-7) */}
        <div className="lg:col-span-7 flex flex-col gap-6 w-full">
          {/* Vocabulary Guide searchable grid */}
          <VocabularyGuide />

          {/* Session Chat Timeline Log */}
          <SessionLog />
        </div>

      </div>
    </div>
  );
};
