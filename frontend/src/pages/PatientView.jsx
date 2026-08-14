import React, { useContext, useState, useEffect } from 'react';

import { AppContext } from '../context/AppContextObject';

import { CameraFeed } from '../components/CameraFeed';

import { TranslationDisplay } from '../components/TranslationDisplay';

import { VocabularyGuide } from '../components/VocabularyGuide';

import { SessionLog } from '../components/SessionLog';
import { TtsDashboardModal } from '../components/TtsDashboardModal';



import { ArrowLeft, Delete, Trash2, Volume2, Stethoscope, RefreshCw, GitCompare, User, History, X, FileText, MessageSquare } from 'lucide-react';



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

    setGeneratedSentence,

    nlgResult,

    setNlgResult,

    isGenerating,

    isTtsPaused,

    pauseTts,

    resumeTts,

    stopTts

  } = useContext(AppContext);

  const { currentUser, showToast } = useContext(AppContext);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState("");

  // Patient Dashboard states
  const [patientTab, setPatientTab] = useState("translate"); // "translate" | "history"
  const [patientSessions, setPatientSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [selectedPastSessionLogs, setSelectedPastSessionLogs] = useState([]);

  const fetchModels = async () => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/models`);
      if (response.ok) {
        const data = await response.json();
        setModels(data);
        const active = data.find(m => m.is_active);
        if (active) {
          setActiveModel(active.name);
        }
      }
    } catch (err) {
      console.error("Gagal memuat daftar model:", err);
    }
  };

  const fetchPatientSessions = async () => {
    if (!currentUser || currentUser.role !== 'patient') return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/patient/me/sessions`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        setPatientSessions(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPastSessionLogs = async (session) => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${session.id}/logs`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        setSelectedPastSession(session);
        setSelectedPastSessionLogs(await response.json());
      }
    } catch (err) {
      showToast("Gagal memuat histori chat", "error");
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === 'patient') {
      fetchPatientSessions();
    }
  }, [currentUser, patientTab]);

  const handleModelChange = async (modelName) => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/models/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model_name: modelName })
      });
      if (response.ok) {
        setActiveModel(modelName);
        alert(`Model berhasil diubah ke: ${modelName}`);
      } else {
        alert("Gagal mengubah model.");
      }
    } catch (err) {
      alert("Gagal menghubungi backend.");
    }
  };

  const handleSpeakSentence = () => {
    if (sentence.length === 0) return;
    speak(sentence.join(' '));
  };

  return (
    <>
      <div className="flex w-full flex-col gap-6 animate-slide-up">
        {/* Header */}
        <div className="glass-panel flex flex-col md:flex-row items-center justify-between rounded-3xl p-4 gap-4 shadow-sm border border-white/60">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setView('home')}
              className="glass-button rounded-2xl px-4 py-2 text-xs font-black transition-all hover:scale-[1.01]"
            >
              <ArrowLeft size={14} />
              Kembali
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600 shrink-0">
                <User size={17} />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase text-sky-700 leading-none">Portal Pasien</span>
                <h2 className="text-sm md:text-base font-black text-slate-950 mt-1 leading-none">
                  {currentUser ? `Pasien: ${currentUser.emailOrNik}` : "Penerjemah Bahasa Isyarat"}
                </h2>
              </div>
            </div>
          </div>

          {/* Tab Selector if logged in as patient */}
          {currentUser && (currentUser.role === 'patient' || currentUser.role === 'admin') && (
            <div className="flex items-center gap-1 rounded-2xl bg-slate-900/10 p-1.5 backdrop-blur-xl border border-white/50 shadow-sm select-none">
              <button
                onClick={() => setPatientTab("translate")}
                className={`rounded-xl px-4 py-1 text-xs font-black transition-all ${
                  patientTab === "translate" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                Mulai Terjemahan
              </button>
              <button
                onClick={() => setPatientTab("history")}
                className={`rounded-xl px-4 py-1 text-xs font-black transition-all ${
                  patientTab === "history" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                Histori Konsultasi
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Translation Workspace (Original View) */}
        {patientTab === "translate" && (
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Kolom kiri: Kamera feed & visualizer */}
            <div className="flex w-full flex-col gap-6 lg:col-span-8">
              <CameraFeed />
            </div>

            {/* Kolom kanan: hasil & tools */}
            <div className="flex w-full flex-col gap-6 lg:col-span-4">
              <TranslationDisplay />
              <VocabularyGuide />
            </div>
          </div>
        )}

        {/* Tab 2: Consultation History Dashboard */}
        {patientTab === "history" && (
          <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-5">
            <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block border-b border-slate-100 pb-2">
              Riwayat Konsultasi Medis Anda
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientSessions.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
                  Belum ada sesi konsultasi medis yang tersimpan di sistem.
                </div>
              ) : (
                patientSessions.map(session => (
                  <div 
                    key={session.id} 
                    className="glass-panel rounded-2xl p-5 border border-slate-150 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded">
                          Selesai
                        </span>
                        <History size={15} className="text-slate-400" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 mt-2">
                        Konsultasi Medis
                      </h3>
                      <div className="flex flex-col gap-1 mt-2 text-[10px] font-semibold text-slate-500 leading-relaxed">
                        <span>Tanggal: {session.started_at.split("T")[0]}</span>
                        <span>Model: {session.model_version}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => fetchPastSessionLogs(session)}
                      className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                    >
                      Buka Catatan & Transkrip
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drawer modal for viewing transcript and SOAP summary */}
      {selectedPastSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] text-slate-800 animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Ringkasan Sesi</h3>
                <span className="text-[9px] text-slate-400 font-bold uppercase">{selectedPastSession.started_at.split("T")[0]}</span>
              </div>
              <button onClick={() => setSelectedPastSession(null)} className="p-1 rounded bg-slate-50 text-slate-400 hover:text-slate-700">
                <X size={15} />
              </button>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1 flex flex-col gap-3">
              {/* SOAP Note view */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl flex flex-col gap-2">
                <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1">
                  <FileText size={12} /> Catatan Medis Dokter
                </span>
                <p className="text-[10px] font-semibold text-slate-700 leading-relaxed whitespace-pre-line">
                  {selectedPastSession.summary || "Tidak ada catatan medis SOAP disimpan untuk sesi ini."}
                </p>
              </div>

              {/* Chat log view */}
              <span className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-1 border-t border-slate-100 pt-2">
                <MessageSquare size={12} /> Transkrip Percakapan Sesi
              </span>
              
              <div className="flex flex-col gap-2 max-h-[200px] overflow-y-auto">
                {selectedPastSessionLogs.length === 0 ? (
                  <span className="text-[9px] text-slate-400 text-center py-4">Sesi ini tidak memiliki log percakapan.</span>
                ) : (
                  selectedPastSessionLogs.map(log => (
                    <div 
                      key={log.id} 
                      className={`p-2 rounded-xl text-[10px] font-semibold max-w-[85%] ${
                        log.role === 'doctor' 
                          ? 'bg-sky-500/10 text-sky-850 border border-sky-200/20 align-self-end ml-auto' 
                          : 'bg-emerald-500/10 text-emerald-850 border border-emerald-250/20 align-self-start mr-auto'
                      }`}
                    >
                      <span className="font-extrabold uppercase text-[8px] block opacity-60 mb-0.5">{log.role}</span>
                      {log.text}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
