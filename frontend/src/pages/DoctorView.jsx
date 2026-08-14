import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContextObject';
import { DoctorPanel } from '../components/DoctorPanel';
import { SessionLog } from '../components/SessionLog';
import { TtsDashboardModal } from '../components/TtsDashboardModal';
import { AiNotetaker } from '../components/AiNotetaker';
import { 
  ArrowLeft, 
  Stethoscope, 
  Volume2, 
  Search, 
  User, 
  Activity, 
  History, 
  ClipboardList, 
  Save, 
  CheckCircle, 
  X,
  FileText,
  MessageSquare
} from 'lucide-react';

export const DoctorView = ({ setView }) => {
  const { 
    sentence, 
    setSentence,
    addLogEntry,
    speak,
    currentUser,
    showToast,
    sessionLog,
    clearLog
  } = useContext(AppContext);

  const [showTtsModal, setShowTtsModal] = useState(false);
  
  // Doctor states
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activePatient, setActivePatient] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  
  // History states
  const [patientSessions, setPatientSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [selectedPastSessionLogs, setSelectedPastSessionLogs] = useState([]);
  const [soapSummary, setSoapSummary] = useState("");

  const fetchAssignedPatients = async () => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const url = currentUser?.role === 'admin'
        ? `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/admin/patients`
        : `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/doctor/patients`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        setAssignedPatients(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchPatients = async (e) => {
    e.preventDefault();
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/doctor/patients/search?q=${searchQuery}`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        setAssignedPatients(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPatientSessions = async (patientId) => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/patients/${patientId}/sessions`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        setPatientSessions(await response.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (currentUser && (currentUser.role === 'doctor' || currentUser.role === 'admin')) {
      fetchAssignedPatients();
    } else if (!currentUser) {
      // Seed with mock patient for guest demo
      setAssignedPatients([
        { id: "mock_glenn", name: "Glenn Perkasa (Guest Demo)", no_rm: "RM390572816403" }
      ]);
    }
  }, [currentUser]);

  const handleSelectPatient = async (patient) => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ patient_id: patient.id })
      });
      
      if (response.ok) {
        const data = await response.json();
        setActivePatient(patient);
        setActiveSessionId(data.session_id);
        clearLog(); // Clear active chat log
        setSoapSummary("");
        fetchPatientSessions(patient.id);
        showToast(`Sesi konsultasi dengan ${patient.name} dimulai!`, "success");
      } else {
        const err = await response.json();
        showToast(err.detail || "Gagal memulai sesi", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    }
  };

  const handleEndSession = async () => {
    if (!window.confirm("Apakah Anda yakin ingin mengakhiri sesi konsultasi ini?")) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${activeSessionId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      
      if (response.ok) {
        showToast("Sesi konsultasi telah diakhiri", "success");
        setActivePatient(null);
        setActiveSessionId(null);
        setSelectedPastSession(null);
        setPatientSessions([]);
        fetchAssignedPatients();
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    }
  };

  const handleSaveSummary = async (summaryText) => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${activeSessionId}/summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ summary: summaryText })
      });
      
      if (response.ok) {
        setSoapSummary(summaryText);
        showToast("Catatan medis SOAP berhasil disimpan ke database!", "success");
        fetchPatientSessions(activePatient.id);
      } else {
        showToast("Gagal menyimpan ringkasan", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    }
  };

  const handleViewPastSessionLogs = async (session) => {
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
      showToast("Gagal mengambil histori chat", "error");
    }
  };

  // ── VIEW 1: PATIENT SELECTOR ──
  if (!activePatient) {
    return (
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up">
        {/* Header */}
        <div className="glass-panel flex items-center justify-between rounded-3xl p-4 shadow-sm border border-white/60">
          <button
            onClick={() => setView('home')}
            className="glass-button rounded-2xl px-4 py-2 text-xs font-black transition-all"
          >
            <ArrowLeft size={14} />
            Menu Utama
          </button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-650 shrink-0">
              <Stethoscope size={17} />
            </div>
            <div className="text-left">
              <span className="block text-[10px] font-black uppercase text-indigo-700 leading-none">Dashboard Dokter</span>
              <h2 className="text-sm md:text-base font-black text-slate-900 mt-1 leading-none">Pilih Pasien Terdaftar</h2>
            </div>
          </div>
        </div>

        {/* Search and List */}
        <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-6">
          <form onSubmit={handleSearchPatients} className="flex gap-2 max-w-lg w-full">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari pasien berdasarkan NIK, No. RM, atau nama..."
                className="w-full rounded-2xl border border-slate-200 bg-white/60 pl-11 pr-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-black text-[11px] uppercase tracking-wider shadow-sm transition-all"
            >
              Cari
            </button>
          </form>

          {/* Patient Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedPatients.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
                Tidak ada pasien terdaftar di relasi Anda yang cocok dengan pencarian.
              </div>
            ) : (
              assignedPatients.map(pat => (
                <div 
                  key={pat.id} 
                  className="glass-panel rounded-2xl p-5 border border-slate-150 hover:-translate-y-0.5 hover:shadow-md transition-all flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider bg-sky-500/10 px-2 py-0.5 rounded">
                        {pat.no_rm}
                      </span>
                      <User size={16} className="text-slate-400" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mt-2">{pat.name}</h3>
                    <div className="flex flex-col gap-1 mt-2 text-[10px] font-semibold text-slate-500">
                      <span>NIK: {pat.nik}</span>
                      <span>Tanggal Lahir: {pat.date_of_birth}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleSelectPatient(pat)}
                    className="w-full py-2 rounded-xl bg-indigo-650 hover:bg-indigo-750 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                  >
                    Mulai Konsultasi
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── VIEW 2: ACTIVE CONSULTATION MODE ──
  return (
    <>
      <div className="flex w-full flex-col gap-6 animate-slide-up">
        {/* Active Session Header */}
        <div className="glass-panel flex items-center justify-between rounded-3xl p-4 shadow-sm border border-white/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600 shrink-0">
              <Activity size={17} className="animate-pulse" />
            </div>
            <div className="text-left">
              <span className="block text-[9px] font-black uppercase text-slate-400">Pasien Terhubung</span>
              <h2 className="text-sm md:text-base font-black text-slate-900 mt-0.5">
                {activePatient.name} <span className="font-semibold text-slate-500">({activePatient.no_rm})</span>
              </h2>
            </div>
          </div>

          <button
            onClick={handleEndSession}
            className="rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 px-4 py-2 text-xs font-black transition-all shadow-sm border border-rose-200/20 uppercase"
          >
            Akhiri Sesi
          </button>
        </div>

        {/* Live consultation workspace layout */}
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
          
          {/* Left Column: Webcam translator logs */}
          <div className="flex w-full flex-col gap-6 lg:col-span-5">
            {/* Live Chat Session Log */}
            <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                Log Percakapan Tunarungu (BISINDO)
              </span>
              <div className="h-[250px] overflow-y-auto">
                <SessionLog activeSessionId={activeSessionId} />
              </div>
            </div>

            {/* Past Session History Drawer */}
            <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60">
              <span className="block text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                <History size={13} /> Histori Konsultasi Pasien
              </span>
              
              <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto">
                {patientSessions.length <= 1 ? (
                  <span className="text-[10px] font-semibold text-slate-400 text-center py-4">Belum ada riwayat konsultasi sebelumnya.</span>
                ) : (
                  patientSessions.filter(s => s.id !== activeSessionId).map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => handleViewPastSessionLogs(s)}
                      className="border border-slate-100 bg-white/40 hover:bg-white/90 p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between text-[10px]"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-extrabold text-slate-700">Sesi: {s.started_at.split("T")[0]}</span>
                        <span className="text-slate-400 text-[9px]">Model: {s.model_version}</span>
                      </div>
                      <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-500/10 px-1.5 py-0.5 rounded">
                        Lihat Log
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Prescription & AI Notetaker */}
          <div className="flex w-full flex-col gap-6 lg:col-span-7">
            {/* Presets & Doctor Text Input */}
            <DoctorPanel activeSessionId={activeSessionId} />
            
            {/* AI SOAP Notetaker */}
            <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="block text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                  <ClipboardList size={13} /> AI Clinical Notetaker (SOAP)
                </span>
                
                <button
                  onClick={() => setShowTtsModal(true)}
                  className="text-sky-600 hover:text-sky-700 font-bold text-[10px] uppercase flex items-center gap-1"
                >
                  <Volume2 size={12} />
                  TTS Voices
                </button>
              </div>

              {/* Integrasi Komponen AiNotetaker */}
              <AiNotetaker onSaveSummary={handleSaveSummary} savedSummary={soapSummary} />
            </div>
          </div>

        </div>
      </div>

      {/* TTS voice modal */}
      {showTtsModal && (
        <TtsDashboardModal onClose={() => setShowTtsModal(false)} />
      )}

      {/* Past Session Logs Drawer Modal */}
      {selectedPastSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] text-slate-800 animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Log Histori Sesi</h3>
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
                      {log.confidence && <span className="block text-[8px] text-slate-400 text-right mt-0.5">Conf: {log.confidence}%</span>}
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
