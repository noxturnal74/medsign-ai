import React, { useContext, useState, useEffect } from 'react';

import { AppContext } from '../context/AppContextObject';

import { CameraFeed } from '../components/CameraFeed';

import { TranslationDisplay } from '../components/TranslationDisplay';

import { VocabularyGuide } from '../components/VocabularyGuide';
import { AccessibilityPopup } from '../components/AccessibilityPopup';

import { SessionLog } from '../components/SessionLog';
import { TtsDashboardModal } from '../components/TtsDashboardModal';



import { ArrowLeft, Delete, Trash2, Volume2, Stethoscope, RefreshCw, GitCompare, User, History, X, FileText, MessageSquare, Shield, Download } from 'lucide-react';



export const PatientView = ({ setView, isSplit = false }) => {

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

  const { currentUser, showToast, activeSessionId, activePatient } = useContext(AppContext);
  const [patientMessage, setPatientMessage] = useState("");
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [showTtsModal, setShowTtsModal] = useState(false);
  const [showCompare, setShowCompare] = useState(false);
  const [models, setModels] = useState([]);
  const [activeModel, setActiveModel] = useState("");

  // Patient Dashboard states
  const [patientTab, setPatientTab] = useState("translate"); // "translate" | "history" | "consents" | "profile"
  const activeTabToRender = isSplit ? "translate" : patientTab;
  const [patientSessions, setPatientSessions] = useState([]);
  const [showAccessibilityPopup, setShowAccessibilityPopup] = useState(false);
  const [showAccessibilityCenter, setShowAccessibilityCenter] = useState(false);
  
  const [customTtsText, setCustomTtsText] = useState("");
  const [showVocabGuide, setShowVocabGuide] = useState(false);

  // Settings preferences states
  const [prefVisualTranslate, setPrefVisualTranslate] = useState(true);
  const [prefSoundEffects, setPrefSoundEffects] = useState(true);

  useEffect(() => {
    const checkAccessibilityPreference = async () => {
      if (!currentUser || currentUser.role !== 'patient') return;
      try {
        const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const res = await fetch(`${apiBase}/api/v1/patient/accessibility-preference`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.preference === "NOT_SEEN") {
            setShowAccessibilityPopup(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };

    const hasSeen = localStorage.getItem("medsign_accessibility_intro_seen");
    if (!currentUser || currentUser.role === 'guest') {
      if (!hasSeen) {
        const timer = setTimeout(() => {
          setShowAccessibilityPopup(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } else if (currentUser && currentUser.role === 'patient') {
      checkAccessibilityPreference();
    }
  }, [currentUser]);

  const handleCloseWelcomePopup = () => {
    setShowAccessibilityPopup(false);
  };

  const handleAcceptWelcomePopup = async () => {
    setShowAccessibilityPopup(false);
    localStorage.setItem("medsign_accessibility_intro_seen", "SEEN");
    if (!currentUser || currentUser.role !== 'patient') return;
    try {
      const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      await fetch(`${apiBase}/api/v1/patient/accessibility-preference`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ preference: "SEEN" })
      });
      await handleAcceptConsent("IDENTITY_VERIFICATION", "Verifikasi NIK & KTP");
      await handleAcceptConsent("BIOMETRIC_VERIFICATION", "Foto wajah & Biometrik");
      await handleAcceptConsent("ELECTRONIC_RECORD_PROCESSING", "Rekam Medis Elektronik");
    } catch (e) {
      console.error(e);
    }
  };

  const handleExportData = async () => {
    try {
      const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBase}/api/v1/patient/me/export`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const downloadRes = await fetch(`${apiBase}${data.download_url}`, {
          headers: { 'Authorization': `Bearer ${currentUser?.token}` }
        });
        if (downloadRes.ok) {
          const blob = await downloadRes.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `medical_export_${currentUser.user_id}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showToast("Data medis berhasil diunduh!", "success");
        }
      }
    } catch (e) {
      showToast("Gagal mengekspor data", "error");
    }
  };
  const [profileData, setProfileData] = useState(null);
  const [patientConsents, setPatientConsents] = useState([]);
  const [patientMedicalRecords, setPatientMedicalRecords] = useState([]);
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [selectedMedicalRecord, setSelectedMedicalRecord] = useState(null);
  const [submittingConsent, setSubmittingConsent] = useState(false);
  const [isBiometricConsented, setIsBiometricConsented] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("PENDING");
  const [faceVerificationStatus, setFaceVerificationStatus] = useState("PENDING");
  const [ktpVerificationStatus, setKtpVerificationStatus] = useState("PENDING");

  const [ktpNik, setKtpNik] = useState("");
  const [ktpName, setKtpName] = useState("");
  const [ktpDob, setKtpDob] = useState("");
  const [ktpAddress, setKtpAddress] = useState("");
  const [ktpGender, setKtpGender] = useState("Laki-laki");

  const fetchProfileAndConsents = async () => {
    if (!currentUser || currentUser.role !== 'patient') return;
    const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const profRes = await fetch(`${apiBase}/api/v1/patients/${currentUser.user_id}`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (profRes.ok) {
        const prof = await profRes.json();
        setProfileData(prof);
      }
      
      const consRes = await fetch(`${apiBase}/api/v1/patient/consent`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (consRes.ok) {
        const data = await consRes.json();
        setPatientConsents(data);
        const bio = data.some(c => c.consent_type === "BIOMETRIC_VERIFICATION" && c.status === "accepted");
        setIsBiometricConsented(bio);
      }

      const medRes = await fetch(`${apiBase}/api/v1/patients/${currentUser.user_id}/medical-records`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (medRes.ok) {
        setPatientMedicalRecords(await medRes.json());
      }
      
      const timeRes = await fetch(`${apiBase}/api/v1/patients/${currentUser.user_id}/timeline`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (timeRes.ok) {
        setTimelineEvents(await timeRes.json());
      }
    } catch (e) {
      console.error("Error fetching patient details:", e);
    }
  };

  useEffect(() => {
    fetchProfileAndConsents();
  }, [currentUser, patientTab]);

  const handleAcceptConsent = async (consentType, purpose) => {
    setSubmittingConsent(true);
    const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiBase}/api/v1/patient/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          consent_type: consentType,
          purpose: purpose,
          version: "1.0",
          consent_text_hash: "hash_clinical_consent_v1"
        })
      });
      if (res.ok) {
        showToast("Persetujuan berhasil disimpan!", "success");
        fetchProfileAndConsents();
      } else {
        showToast("Gagal menyimpan persetujuan", "error");
      }
    } catch (e) {
      showToast("Kesalahan jaringan", "error");
    } finally {
      setSubmittingConsent(false);
    }
  };

  const handleKtpSubmit = async (e) => {
    e.preventDefault();
    const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiBase}/api/v1/patient/verify/ktp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          nik: ktpNik,
          name: ktpName,
          date_of_birth: ktpDob,
          address: ktpAddress,
          gender: ktpGender
        })
      });
      if (res.ok) {
        showToast("NIK berhasil diserahkan untuk verifikasi", "success");
        setVerificationStatus("KTP_VERIFIED");
        setKtpVerificationStatus("KTP_VERIFIED");
        fetchProfileAndConsents();
      } else {
        const err = await res.json();
        showToast(err.detail || "Gagal verifikasi NIK", "error");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const handleFaceVerifySubmit = async () => {
    const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    try {
      const res = await fetch(`${apiBase}/api/v1/patient/verify/face`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({ photo_b64: "face_photo_b64_data" })
      });
      if (res.ok) {
        showToast("Verifikasi wajah berhasil diproses!", "success");
        setVerificationStatus("FACE_VERIFIED");
        setFaceVerificationStatus("FACE_VERIFIED");
        fetchProfileAndConsents();
      } else {
        const err = await res.json();
        showToast(err.detail || "Gagal verifikasi wajah", "error");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${currentUser?.token}` },
        body: JSON.stringify({ model_name: modelName })
      });
      if (response.ok) {
        setActiveModel(modelName);
        showToast(`Model berhasil diubah ke: ${modelName}`, "success");
      } else {
        showToast("Gagal mengubah model.", "error");
      }
    } catch (err) {
      showToast("Gagal menghubungi backend.", "error");
    }
  };

  const handleSpeakSentence = () => {
    if (sentence.length === 0) return;
    speak(sentence.join(' '));
  };

  const handleSendPatientMessage = async (e) => {
    e.preventDefault();
    if (!patientMessage.trim() || !activeSessionId) return;
    try {
      await addLogEntry({
        session_id: activeSessionId,
        role: "patient",
        text: patientMessage,
        timestamp: new Date().toISOString()
      }, activeSessionId);
      setPatientMessage("");
    } catch (err) {
      showToast("Gagal mengirim pesan", "error");
    }
  };

  return (
    <>
      <div className="flex w-full flex-col gap-6 animate-slide-up px-4 md:px-8 lg:px-12">
        {!isSplit && (
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
                  {activePatient ? <>Pasien: <span className="text-sky-700">{activePatient.name}</span> <span className="text-[10px] font-semibold text-slate-500">({activePatient.no_rm || activePatient.nik})</span></> : (currentUser ? `Pasien: ${currentUser.emailOrNik}` : "Penerjemah Bahasa Isyarat")}
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
                  activeTabToRender === "translate" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                Mulai Terjemahan
              </button>
              <button
                onClick={() => setPatientTab("history")}
                className={`rounded-xl px-4 py-1 text-xs font-black transition-all ${
                  activeTabToRender === "history" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                Histori Konsultasi
              </button>
              <button
                onClick={() => setPatientTab("consents")}
                className={`rounded-xl px-4 py-1 text-xs font-black transition-all ${
                  activeTabToRender === "consents" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                Persetujuan & Privasi
              </button>
              <button
                onClick={() => setPatientTab("profile")}
                className={`rounded-xl px-4 py-1 text-xs font-black transition-all ${
                  activeTabToRender === "profile" ? "bg-white text-sky-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
                }`}
              >
                Profil Saya
              </button>
            </div>
          )}
        </div>
        )}
        {/* Tab 1: Translation Workspace (Original View) */}
        {activeTabToRender === "translate" && (
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Kolom kiri: Kamera feed & visualizer */}
            <div className="flex w-full flex-col gap-6 lg:col-span-8">
              <CameraFeed />

              {spellingMode ? (
                <div className="glass-panel flex flex-col gap-4 rounded-3xl border border-violet-200/70 p-5 animate-slide-up bg-white/40">
                  <span className="block text-[10px] font-bold uppercase text-violet-700">
                    Hasil Ejaan Huruf
                  </span>

                  <div className="relative flex min-h-[70px] flex-wrap items-center justify-start gap-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-inner">
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
                        Posisikan tangan untuk mengeja abjad A-Z atau angka 1-9...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                    <button
                      onClick={() => speak(spelledText)}
                      disabled={spelledText.length === 0}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        spelledText.length > 0
                          ? 'border-violet-300/50 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20'
                          : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                      }`}
                    >
                      <Volume2 size={13} />
                      Ucapkan
                    </button>
                    <button
                      onClick={addSpaceToSpelledText}
                      className="glass-button rounded-xl py-2 text-xs font-bold"
                    >
                      Spasi
                    </button>
                    <button
                      onClick={backspaceSpelledText}
                      disabled={spelledText.length === 0}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        spelledText.length > 0
                          ? 'border-white/70 bg-white/60 text-slate-700 hover:bg-white/80'
                          : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                      }`}
                    >
                      <Delete size={13} />
                      Hapus
                    </button>
                    <button
                      onClick={clearSpelledText}
                      disabled={spelledText.length === 0}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-xs font-bold transition-all ${
                        spelledText.length > 0
                          ? 'border-red-300/50 bg-red-500/10 text-red-600 hover:bg-red-500/20'
                          : 'cursor-not-allowed border-white/50 bg-white/40 text-slate-400'
                      }`}
                    >
                      <Trash2 size={13} />
                      Bersih
                    </button>
                  </div>
                </div>
              ) : (
                <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 bg-white/40 border border-white/60 shadow-sm">
                  <span className="block text-[10px] font-bold uppercase text-slate-500">
                    Kalimat Pasien Saat Ini
                  </span>

                  <div className="flex min-h-[70px] flex-wrap items-center justify-start gap-1.5 rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-inner">
                    {sentence.length === 0 ? (
                      <span className="text-xs font-semibold text-slate-500">
                        Belum ada kata terakumulasi. Lakukan isyarat atau klik kosakata medis...
                      </span>
                    ) : (
                      sentence.map((word, idx) => (
                        <span
                          key={idx}
                          className="animate-slide-up rounded-lg border border-sky-300/30 bg-sky-400/20 px-2.5 py-1 text-xs font-bold uppercase text-sky-100 shadow-sm"
                        >
                          {t(word) || word}
                        </span>
                      ))
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
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
                      Ucapkan
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
                      Hapus
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
                      Bersih
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

              {/* Ketik untuk Suarakan (Text-to-Speech) - Core Feature */}
              <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 bg-white border border-slate-200 shadow-sm animate-slide-up">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  🗣️ Ketik untuk Suarakan (Text-to-Speech)
                </span>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik apa yang ingin Anda katakan kepada dokter..."
                    value={customTtsText}
                    onChange={(e) => setCustomTtsText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customTtsText.trim()) {
                          speak(customTtsText);
                          addLogEntry({ role: 'patient', text: customTtsText, confidence: 1.0 }, activeSessionId);
                        }
                      }
                    }}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    onClick={() => {
                      if (customTtsText.trim()) {
                        speak(customTtsText);
                        addLogEntry({ role: 'patient', text: customTtsText, confidence: 1.0 }, activeSessionId);
                      }
                    }}
                    className="px-5 py-2.5 bg-[#053D67] text-white rounded-xl font-bold text-xs uppercase hover:opacity-90 active:scale-95 transition-all shadow-md shrink-0"
                  >
                    Ucapkan
                  </button>
                </div>
              </div>

              {/* Toggle Button for Panduan & Pintasan Kosakata Medis */}
              <div className="flex flex-col gap-4">
                <button
                  type="button"
                  onClick={() => setShowVocabGuide(!showVocabGuide)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-4 py-3.5 text-xs font-black uppercase text-slate-800 transition-all shadow-sm"
                >
                  {showVocabGuide ? '🙈 Sembunyikan Panduan Kosakata' : '🙈 Tampilkan Panduan dan Pintasan Kosakata Medis'}
                </button>
                {showVocabGuide && (
                  <VocabularyGuide />
                )}
              </div>
            </div>

            {/* Kolom kanan: hasil & tools */}
            <div className="flex w-full flex-col gap-6 lg:col-span-4">
              <TranslationDisplay />
              
              {/* Doctor Instruction Card */}
              {sessionLog.some(entry => entry.role === 'doctor') && (() => {
                const lastDoctorMessage = [...sessionLog].reverse().find(entry => entry.role === 'doctor');
                if (!lastDoctorMessage) return null;
                return (
                  <div key={lastDoctorMessage.id} className="glass-panel border-emerald-400 bg-emerald-500/10 p-5 rounded-[28px] animate-slide-up flex items-start gap-4 shadow-md">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600">
                      <Stethoscope size={24} className="animate-pulse" />
                    </div>
                    <div className="flex-grow min-w-0 text-slate-800">
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

              {/* Active Chat Log with text input to type and chat */}
              <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60 shadow-sm bg-white animate-slide-up">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  Log Sesi Percakapan
                </span>
                
                <SessionLog />

                {activeSessionId && (
                  <form onSubmit={handleSendPatientMessage} className="flex gap-2 border-t border-slate-100 pt-3">
                    <input 
                      type="text" 
                      placeholder="Ketik pesan Anda di sini..." 
                      value={patientMessage} 
                      onChange={(e) => setPatientMessage(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 bg-white focus:outline-none"
                    />
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-[#053D67] text-white rounded-xl font-black text-[10px] uppercase hover:opacity-90 active:scale-95 transition-all shadow"
                    >
                      Kirim
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Consultation History Dashboard */}
        {activeTabToRender === "history" && (
          <div className="grid gap-6 md:grid-cols-[1.8fr_1.2fr]">
            <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-5 bg-white/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block">
                  Riwayat Konsultasi Medis Anda
                </span>
                <button
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white hover:bg-sky-700 rounded-xl font-black text-[9px] uppercase tracking-wider transition-all"
                >
                  <Download size={12} /> Unduh Data Medis (JSON)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {patientSessions.length === 0 ? (
                  <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
                    Belum ada sesi konsultasi medis yang tersimpan di sistem.
                  </div>
                ) : (
                  patientSessions.map(session => (
                    <div 
                      key={session.id} 
                      className="glass-panel rounded-2xl p-5 border border-slate-150 flex flex-col justify-between gap-4 shadow-sm bg-white"
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

            {/* Clinical Timeline Events */}
            <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-5 bg-white/40">
              <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block border-b border-slate-100 pb-2">
                Linimasa Klinis Pasien
              </span>
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[450px]">
                {timelineEvents.length === 0 ? (
                  <span className="text-xs text-slate-400 font-semibold py-8 text-center">Belum ada linimasa klinis yang tercatat.</span>
                ) : (
                  timelineEvents.map(evt => (
                    <div key={evt.id} className="relative pl-6 border-l-2 border-sky-400/30 flex flex-col gap-1">
                      <div className="absolute -left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-sky-500 border border-white" />
                      <span className="text-[9px] font-bold text-slate-400">{evt.event_date.split("T")[0]}</span>
                      <h4 className="text-xs font-black text-slate-900 leading-tight">{evt.event_title}</h4>
                      <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">{evt.event_description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTabToRender === "consents" && (
          <div className="flex flex-col gap-6 animate-slide-up text-slate-800">
            <div className="glass-panel rounded-[32px] p-6 border border-white/60 shadow-xl bg-white/40 flex flex-col gap-4">
              <div>
                <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">Persetujuan Pemrosesan Data</h3>
                <p className="text-[10px] font-semibold text-slate-400 mt-1">Undang-Undang Pelindungan Data Pribadi (UU PDP No. 27/2022) mewajibkan persetujuan eksplisit atas data kesehatan & biometrik Anda.</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="surface-panel p-5 rounded-2xl border border-slate-100 flex flex-col justify-between gap-4 bg-white/60">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">1. Verifikasi Identitas NIK & KTP</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Mengizinkan MedSign AI mencocokkan nama, NIK, dan tanggal lahir Anda dengan sistem administrasi kesehatan.</p>
                  </div>
                  {patientConsents.some(c => c.consent_type === "IDENTITY_VERIFICATION" && c.status === "accepted") ? (
                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-fit">Disetujui</span>
                  ) : (
                    <button 
                      onClick={() => handleAcceptConsent("IDENTITY_VERIFICATION", "Verifikasi NIK & KTP")}
                      className="px-4 py-2 bg-[#053D67] text-white rounded-xl font-black text-[10px] uppercase hover:opacity-90 active:scale-95 transition-all shadow w-fit"
                    >
                      Setujui Persetujuan
                    </button>
                  )}
                </div>

                <div className="surface-panel p-5 rounded-2xl border border-slate-100 flex flex-col justify-between gap-4 bg-white/60">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">2. Pemrosesan Data Biometrik (Wajah)</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Mengizinkan sistem memproses foto wajah Anda semata-mata untuk keperluan pencocokan identitas demi mencegah klaim palsu.</p>
                  </div>
                  {patientConsents.some(c => c.consent_type === "BIOMETRIC_VERIFICATION" && c.status === "accepted") ? (
                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-fit">Disetujui</span>
                  ) : (
                    <button 
                      onClick={() => handleAcceptConsent("BIOMETRIC_VERIFICATION", "Foto wajah & Biometrik")}
                      className="px-4 py-2 bg-[#053D67] text-white rounded-xl font-black text-[10px] uppercase hover:opacity-90 active:scale-95 transition-all shadow w-fit"
                    >
                      Setujui Persetujuan
                    </button>
                  )}
                </div>

                <div className="surface-panel p-5 rounded-2xl border border-slate-100 flex flex-col justify-between gap-4 bg-white/60">
                  <div>
                    <h4 className="text-xs font-black text-slate-900">3. Pemrosesan Rekam Medis Elektronik (RME)</h4>
                    <p className="text-[10px] text-slate-500 mt-1">Persetujuan pembuatan rekam medis secara elektronik dan pengarsipan diagnosis serta catatan klinis di sistem MedSign AI.</p>
                  </div>
                  {patientConsents.some(c => c.consent_type === "ELECTRONIC_RECORD_PROCESSING" && c.status === "accepted") ? (
                    <span className="text-[9px] font-black uppercase text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 w-fit">Disetujui</span>
                  ) : (
                    <button 
                      onClick={() => handleAcceptConsent("ELECTRONIC_RECORD_PROCESSING", "Rekam Medis Elektronik")}
                      className="px-4 py-2 bg-[#053D67] text-white rounded-xl font-black text-[10px] uppercase hover:opacity-90 active:scale-95 transition-all shadow w-fit"
                    >
                      Setujui Persetujuan
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTabToRender === "profile" && (
          <div className="flex flex-col gap-6 animate-slide-up text-slate-800">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="glass-panel rounded-[32px] p-6 border border-white/60 shadow-xl bg-white/40 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">Informasi Profil Pasien</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Seluruh data identitas dilindungi sesuai dengan pelindungan privasi RME.</p>
                </div>
                {profileData ? (
                  <div className="flex flex-col gap-3.5 text-xs font-semibold">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Nama Lengkap</span>
                      <span className="text-slate-800 font-bold">{profileData.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">NIK (Masked)</span>
                      <span className="text-slate-800 font-mono font-bold">{profileData.nik}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Nomor RM</span>
                      <span className="text-[#053D67] font-bold">{profileData.no_rm}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Tanggal Lahir</span>
                      <span className="text-slate-800 font-bold">{profileData.date_of_birth}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-400">Status Akun</span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                        profileData.verification_status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-amber-500/10 text-amber-700'
                      }`}>{profileData.verification_status || "PENDING"}</span>
                    </div>
                  </div>
                ) : (
                  <p>Memuat profil...</p>
                )}
              </div>

              <div className="glass-panel rounded-[32px] p-6 border border-white/60 shadow-xl bg-white/40 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">Penyelesaian Verifikasi Identitas</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Selesaikan langkah verifikasi berikut agar akun dapat diaktifkan oleh admin.</p>
                </div>

                <form onSubmit={handleKtpSubmit} className="flex flex-col gap-3 border border-slate-100 p-4 rounded-2xl bg-white/50">
                  <h4 className="text-[10px] font-black text-[#053D67] uppercase tracking-wide">1. Isi Data NIK KTP</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="text" 
                      placeholder="NIK (16 Digit)" 
                      value={ktpNik}
                      onChange={(e) => setKtpNik(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white" 
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Nama Sesuai KTP" 
                      value={ktpName}
                      onChange={(e) => setKtpName(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white" 
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input 
                      type="date" 
                      value={ktpDob}
                      onChange={(e) => setKtpDob(e.target.value)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-800 bg-white" 
                      required
                    />
                    <button 
                      type="submit"
                      className="px-3 py-1.5 bg-[#053D67] text-white text-[10px] font-black uppercase rounded-xl hover:opacity-90 active:scale-95 transition-all shadow"
                    >
                      Kirim NIK
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-3 border border-slate-100 p-4 rounded-2xl bg-white/50">
                  <h4 className="text-[10px] font-black text-[#053D67] uppercase tracking-wide">2. Verifikasi Wajah Biometrik</h4>
                  <p className="text-[10px] text-slate-500">Ambil foto selfie/wajah untuk pencocokan biometrik identitas (memerlukan persetujuan pemrosesan biometrik).</p>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <button 
                      type="button"
                      onClick={handleFaceVerifySubmit}
                      disabled={!isBiometricConsented}
                      className="px-4 py-2 bg-emerald-600 disabled:opacity-40 text-white text-[10px] font-black uppercase rounded-xl hover:bg-emerald-700 active:scale-95 transition-all shadow"
                    >
                      Ambil Foto Wajah
                    </button>
                    {!isBiometricConsented && (
                      <span className="text-[9px] text-rose-500 font-bold">Harap setujui Persetujuan Biometrik dulu</span>
                    )}
                  </div>
                </div>
              </div>
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
                  [...selectedPastSessionLogs].sort((a, b) => new Date(a.created_at || a.timestamp || 0) - new Date(b.created_at || b.timestamp || 0)).map(log => (
                    <div 
                      key={log.id} 
                      className={`p-2 rounded-xl text-[10px] font-semibold max-w-[85%] ${
                        log.role === 'doctor' 
                          ? 'bg-sky-500/10 text-sky-900 border border-sky-200/20 self-end ml-auto' 
                          : 'bg-emerald-500/10 text-emerald-900 border border-emerald-200/20 self-start mr-auto'
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

      {/* Welcome Accessibility Onboarding Popup */}
      <AccessibilityPopup 
        isOpen={showAccessibilityPopup}
        onClose={handleCloseWelcomePopup}
        onLearnMore={handleAcceptWelcomePopup}
      />

      {/* Accessibility Center Modal */}
      {showAccessibilityCenter && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 text-slate-800">
          <div className="bg-white rounded-[32px] max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl flex flex-col gap-5 animate-scale-up relative">
            <button 
              onClick={() => setShowAccessibilityCenter(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              aria-label="Tutup Pusat Aksesibilitas"
            >
              <X size={16} />
            </button>

            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="text-sky-600" size={18} />
              <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">Pusat Aksesibilitas MedSign</h3>
            </div>

            <div className="overflow-y-auto max-h-[60vh] flex flex-col gap-4">
              {/* Feature status list */}
              <div className="flex flex-col gap-2.5">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Status Fitur Layanan</span>
                <div className="grid gap-2 text-xs font-semibold">
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-100 text-emerald-800">
                    <span>Translasi Abjad & Kata Medis</span>
                    <span className="text-[8px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded">Tersedia</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-amber-50/50 border border-amber-100 text-amber-800">
                    <span>Menerjemahkan Bahasa Isyarat Klinis</span>
                    <span className="text-[8px] font-black uppercase bg-amber-600 text-white px-2 py-0.5 rounded">Dalam Pengembangan</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500">
                    <span>Verifikasi Identitas Biometrik</span>
                    <span className="text-[8px] font-black uppercase bg-slate-400 text-white px-2 py-0.5 rounded">Direncanakan</span>
                  </div>
                </div>
              </div>

              {/* Preferences Configuration */}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Konfigurasi Pengalaman</span>
                <div className="flex flex-col gap-3 text-xs font-semibold">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700">Utamakan Translasi Visual (MediaPipe Overlay)</span>
                    <input 
                      type="checkbox" 
                      checked={prefVisualTranslate}
                      onChange={(e) => setPrefVisualTranslate(e.target.checked)}
                      className="rounded border-slate-200 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-slate-700">Aktifkan Suara Efek Penerjemah</span>
                    <input 
                      type="checkbox" 
                      checked={prefSoundEffects}
                      onChange={(e) => setPrefSoundEffects(e.target.checked)}
                      className="rounded border-slate-200 text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Replay intro video */}
              <div className="flex flex-col gap-2.5 border-t border-slate-100 pt-3">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Bantuan & Informasi</span>
                <p className="text-[10px] text-slate-500 font-semibold leading-relaxed">Anda dapat menonton kembali video penjelasan aksesibilitas inklusif kesehatan MedSign kapan saja.</p>
                <button
                  onClick={() => { setShowAccessibilityCenter(false); setShowAccessibilityPopup(true); }}
                  className="w-full py-2.5 rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 font-black text-[10px] uppercase tracking-wide hover:bg-sky-100 transition-all text-center"
                >
                  Tonton Pengenalan Ulang
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end border-t border-slate-100 pt-4 mt-2">
              <button 
                onClick={() => setShowAccessibilityCenter(false)}
                className="px-5 py-2.5 rounded-2xl bg-slate-900/10 hover:bg-slate-900/20 font-black text-xs uppercase tracking-wide text-slate-700 transition-all shadow-sm"
              >
                Selesai
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
