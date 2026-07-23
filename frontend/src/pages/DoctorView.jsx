import React, { useContext } from 'react';
import { AppContext } from '../context/AppContextObject';
import { DoctorPanel } from '../components/DoctorPanel';
import { SessionLog } from '../components/SessionLog';
import { ArrowLeft, Stethoscope, Volume2 } from 'lucide-react';

export const DoctorView = ({ setView }) => {
  const { 
    sentence, 
    setSentence,
    addLogEntry,
    speak,
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

            {/* AI Recommendations */}
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
                      }}
                      className="rounded-xl border border-sky-200 bg-white hover:bg-sky-50/70 px-3 py-2 text-left text-xs font-bold text-sky-900 transition-all select-none"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TTS Speaking Progress & Playback Controls */}
            {speakingText && (
              <div className="flex flex-col gap-1.5 bg-emerald-500/10 border border-emerald-200/50 rounded-2xl p-3">
                <div className="flex justify-between text-[10px] font-black text-emerald-800 uppercase">
                  <span className="truncate">Melafalkan: "{speakingText}"</span>
                  <span>{Math.round(speakingProgress)}%</span>
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

            {/* Voice Settings */}
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
