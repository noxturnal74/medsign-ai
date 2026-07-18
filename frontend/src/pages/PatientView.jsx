import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { CameraFeed } from '../components/CameraFeed';
import { TranslationDisplay } from '../components/TranslationDisplay';
import { VocabularyGuide } from '../components/VocabularyGuide';
import { SessionLog } from '../components/SessionLog';

import { ArrowLeft, Delete, Trash2, Volume2 } from 'lucide-react';

export const PatientView = ({ setView }) => {
  const {
    sentence,
    clearSentence,
    removeLastWord,
    speak,
    spellingMode,
    spelledText,
    addSpaceToSpelledText,
    backspaceSpelledText,
    clearSpelledText,
    t
  } = useContext(AppContext);

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
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-sky-700">{t('consultationMode')}</span>
          <h2 className="text-lg font-black text-slate-950">{t('patientScreen')}</h2>
        </div>
      </div>



      <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="flex w-full flex-col gap-6 lg:col-span-6">
          <CameraFeed />
          <TranslationDisplay />

          {spellingMode ? (
            <div className="glass-panel flex flex-col gap-4 rounded-3xl border border-violet-200/70 p-5 animate-slide-up">
              <span className="block text-[10px] font-bold uppercase text-violet-700">
                {t('spellingTextResult')}
              </span>

              <div className="relative flex min-h-[70px] flex-wrap items-center justify-start gap-1 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-inner">
                <div className="flex items-center gap-0.5 font-mono text-sm font-bold uppercase text-slate-100">
                  {spelledText.split('').map((char, index) => (
                    <span key={index} className={char === ' ' ? 'w-2.5' : 'font-bold text-violet-300'}>
                      {char}
                    </span>
                  ))}
                  <span className="ml-0.5 h-4 w-1.5 animate-pulse bg-violet-300" />
                </div>

                {spelledText.length === 0 && (
                  <span className="absolute left-4 text-xs font-semibold text-slate-500">
                    {t('spellingPlaceholder')}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button
                  onClick={() => speak(spelledText)}
                  disabled={spelledText.length === 0}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    spelledText.length > 0
                      ? 'border-violet-300/50 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20'
                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                  }`}
                >
                  <Volume2 size={13} />
                  {t('speak')}
                </button>
                <button
                  onClick={addSpaceToSpelledText}
                  className="glass-button rounded-xl py-2 text-xs font-bold"
                >
                  {t('space')}
                </button>
                <button
                  onClick={backspaceSpelledText}
                  disabled={spelledText.length === 0}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    spelledText.length > 0
                      ? 'border-white/70 bg-white/60 text-slate-700 hover:bg-white/80'
                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                  }`}
                >
                  <Delete size={13} />
                  {t('delete')}
                </button>
                <button
                  onClick={clearSpelledText}
                  disabled={spelledText.length === 0}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    spelledText.length > 0
                      ? 'border-red-300/50 bg-red-500/10 text-red-600 hover:bg-red-500/20'
                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                  }`}
                >
                  <Trash2 size={13} />
                  {t('clear')}
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                {t('currentSentence')}
              </span>

              <div className="flex min-h-[70px] flex-wrap items-center justify-start gap-1.5 rounded-2xl border border-white/10 bg-slate-950/90 p-4 shadow-inner">
                {sentence.length === 0 ? (
                  <span className="text-xs font-semibold text-slate-500">
                    {t('noWordsAccumulated')}
                  </span>
                ) : (
                  sentence.map((word, idx) => (
                    <span
                      key={idx}
                      className="animate-slide-up rounded-lg border border-sky-300/30 bg-sky-400/20 px-2.5 py-1 text-xs font-bold uppercase text-sky-100 shadow-sm"
                    >
                      {t(word)}
                    </span>
                  ))
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={handleSpeakSentence}
                  disabled={sentence.length === 0}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    sentence.length > 0
                      ? 'border-sky-300/50 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20'
                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                  }`}
                >
                  <Volume2 size={13} />
                  {t('speak')}
                </button>
                <button
                  onClick={removeLastWord}
                  disabled={sentence.length === 0}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    sentence.length > 0
                      ? 'border-white/70 bg-white/60 text-slate-700 hover:bg-white/80'
                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                  }`}
                >
                  <Delete size={13} />
                  {t('delete')}
                </button>
                <button
                  onClick={clearSentence}
                  disabled={sentence.length === 0}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold transition-all ${
                    sentence.length > 0
                      ? 'border-red-300/50 bg-red-500/10 text-red-600 hover:bg-red-500/20'
                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                  }`}
                >
                  <Trash2 size={13} />
                  {t('clear')}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex w-full flex-col gap-6 lg:col-span-6">
          <VocabularyGuide />
          <SessionLog />
        </div>
      </div>
    </div>
  );
};
