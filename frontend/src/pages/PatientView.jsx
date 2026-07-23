import React, { useContext, useState } from 'react';

import { AppContext } from '../context/AppContextObject';

import { CameraFeed } from '../components/CameraFeed';

import { TranslationDisplay } from '../components/TranslationDisplay';

import { VocabularyGuide } from '../components/VocabularyGuide';

import { SessionLog } from '../components/SessionLog';



import { ArrowLeft, Delete, Trash2, Volume2, Stethoscope } from 'lucide-react';



export const PatientView = ({ setView }) => {

  const {

    sessionLog,

    sentence,

    setSentence,

    addLogEntry,

    clearSentence,

    removeLastWord,

    speak,

    spellingMode,

    spelledText,

    addSpaceToSpelledText,

    backspaceSpelledText,

    clearSpelledText,

    appendLetter,

    t,

    speakingText,

    speakingProgress,

    availableVoices,

    selectedVoiceName,

    setSelectedVoiceName,

    getSentenceSuggestions,

    wordRecommendations,

    appendWordRecommendation,

    generatedSentence,

    isGenerating,

    isTtsPaused,

    pauseTts,

    resumeTts,

    stopTts

  } = useContext(AppContext);

  const [showGuideModal, setShowGuideModal] = useState(false);



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

        <div className="flex w-full flex-col gap-6 lg:col-span-8">

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



              {/* Keyboard & Numpad virtual buttons */}

              <div className="flex flex-col gap-2 border-t border-violet-100 pt-3 mt-1 select-none">

                <span className="block text-[9px] font-black uppercase text-violet-500 tracking-wider">

                  Papan Ketik Manual (A-Z & 1-9):

                </span>

                

                {/* Numpad Row */}

                <div className="flex flex-wrap gap-1">

                  {"123456789".split("").map((num) => (

                    <button

                      key={num}

                      type="button"

                      onClick={() => appendLetter(num)}

                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-violet-200 bg-violet-50 hover:bg-violet-100 text-xs font-black text-violet-700 transition-all active:scale-[0.92]"

                    >

                      {num}

                    </button>

                  ))}

                </div>

                

                {/* Letters Grid */}

                <div className="flex flex-wrap gap-1">

                  {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((char) => (

                    <button

                      key={char}

                      type="button"

                      onClick={() => appendLetter(char)}

                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-black text-slate-700 transition-all active:scale-[0.92]"

                    >

                      {char}

                    </button>

                  ))}

                </div>

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



              {/* AI Recommendation suggestions */}

              {sentence.length > 0 && (

                <div className="flex flex-col gap-2 bg-sky-500/5 border border-sky-100 rounded-2xl p-3 animate-slide-up">

                  <span className="text-[10px] font-black text-sky-800 uppercase tracking-wider block">

                    💡 Rekomendasi Kalimat AI (Klik untuk mengisi):

                  </span>

                  <div className="flex flex-col gap-1.5">

                    {getSentenceSuggestions(sentence).map((sugg, idx) => (

                      <button

                        key={idx}

                        onClick={() => {

                          setSentence([sugg]);

                          speak(sugg);

                          addLogEntry({

                            role: 'patient',

                            text: sugg,

                            confidence: 1.0

                          });

                        }}

                        className="rounded-xl border border-sky-200 bg-white hover:bg-sky-50/70 px-3 py-2 text-left text-xs font-bold text-sky-900 transition-all select-none"

                      >

                        {sugg}

                      </button>

                    ))}

                  </div>

                </div>

              )}



              {/* TTS Progress Animation & Playback Controls */}

              {speakingText && (

                <div className="flex flex-col gap-1.5 bg-emerald-500/10 border border-emerald-200/50 rounded-2xl p-3">

                  <div className="flex justify-between text-[10px] font-black text-emerald-800 uppercase">

                    <span>Melafalkan</span>

                    <span>{Math.round(speakingProgress)}%</span>

                  </div>

                  <div className="text-sm font-bold text-slate-800 bg-white/60 p-2.5 rounded-xl border border-emerald-100/80 my-1 leading-relaxed">

                    <span 

                      className="transition-all duration-75"

                      style={{

                        background: `linear-gradient(to right, #059669 0%, #059669 ${speakingProgress}%, #1e293b ${speakingProgress}%, #1e293b 100%)`,

                        WebkitBackgroundClip: 'text',

                        WebkitTextFillColor: 'transparent',

                        display: 'inline',

                      }}

                    >

                      {speakingText}

                    </span>

                  </div>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200/60 border border-white">

                    <div

                      className="h-full bg-emerald-600 transition-all duration-75 rounded-full"

                      style={{ width: `${speakingProgress}%` }}

                    />

                  </div>

                  <div className="flex gap-2 mt-1">

                    {isTtsPaused ? (

                      <button

                        onClick={resumeTts}

                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 text-[9px] font-black uppercase transition-all"

                      >

                        Lanjutkan

                      </button>

                    ) : (

                      <button

                        onClick={pauseTts}

                        className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 text-[9px] font-black uppercase transition-all"

                      >

                        Jeda

                      </button>

                    )}

                    <button

                      onClick={stopTts}

                      className="rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 text-[9px] font-black uppercase transition-all"

                    >

                      Hentikan

                    </button>

                  </div>

                </div>

              )}



              {/* Voice Selector Settings */}

              {availableVoices.length > 0 && (

                <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200/60 rounded-2xl p-3">

                  <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">

                    Pilih Suara TTS (Browser System & Open Source)

                  </label>

                  <select

                    value={selectedVoiceName}

                    onChange={(e) => setSelectedVoiceName(e.target.value)}

                    className="glass-input rounded-xl px-2.5 py-1.5 text-[10px] font-black bg-white text-slate-700 cursor-pointer w-full border border-slate-200"

                  >

                    <option value="">-- Suara Default Indonesia --</option>

                    {availableVoices.map((voice, idx) => (

                      <option key={idx} value={voice.name}>

                        {voice.name} ({voice.lang})

                      </option>

                    ))}

                  </select>

                </div>

              )}



              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

                <button

                  onClick={handleSpeakSentence}

                  disabled={sentence.length === 0}

                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${

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

                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${

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

                  className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${

                    sentence.length > 0

                      ? 'border-red-300/50 bg-red-500/10 text-red-600 hover:bg-red-500/20'

                      : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'

                  }`}

                >

                  <Trash2 size={13} />

                  {t('clear')}

                </button>

                <button

                  type="button"

                  onClick={() => setShowGuideModal(true)}

                  className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-300/50 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 py-2.5 text-xs font-bold transition-all"

                >

                  📖 Panduan Isyarat

                </button>

              </div>

            </div>

          )}

        </div>



        <div className="flex w-full flex-col gap-6 lg:col-span-4">

          {sessionLog.find(entry => entry.role === 'doctor') && (() => {

            const lastDoctorMessage = sessionLog.find(entry => entry.role === 'doctor');

            if (!lastDoctorMessage) return null;

            return (

              <div key={lastDoctorMessage.id} className="glass-panel border-emerald-400 bg-emerald-500/10 p-5 rounded-[28px] animate-slide-up flex items-start gap-4 shadow-md">

                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600">

                  <Stethoscope size={24} className="animate-pulse" />

                </div>

                <div className="flex-grow min-w-0">

                  <span className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">

                    Instruksi Dokter (Terbaru):

                  </span>

                  <p className="text-xl font-black text-slate-900 leading-relaxed mt-1.5 break-words">

                    {lastDoctorMessage.text}

                  </p>

                  <span className="text-[9px] font-bold text-slate-400 mt-1 block">

                    Diterima pada {lastDoctorMessage.timestamp}

                  </span>

                </div>

              </div>

            );

          })()}

          <SessionLog />

        </div>

      </div>



      {/* Modal Panduan Isyarat */}

      {showGuideModal && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">

          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 flex flex-col gap-4">

            <div className="flex justify-between items-center border-b border-slate-100 pb-3">

              <div>

                <h3 className="text-base font-black text-slate-950">Panduan & Pintasan Kosakata Isyarat</h3>

                <p className="text-xs text-slate-500 font-semibold mt-0.5">Klik kata untuk memasukkan langsung jika kamera terhalang</p>

              </div>

              <button

                onClick={() => setShowGuideModal(false)}

                className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 text-xs font-bold transition-all active:scale-[0.98]"

              >

                Tutup Panduan

              </button>

            </div>

            <div className="overflow-y-auto flex-1">

              <VocabularyGuide />

            </div>

          </div>

        </div>

      )}

    </div>

  );

};

