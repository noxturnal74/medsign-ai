import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContextObject';
import { DoctorPanel } from '../components/DoctorPanel';
import { SessionLog } from '../components/SessionLog';
import { TtsDashboardModal } from '../components/TtsDashboardModal';
import { AiNotetaker } from '../components/AiNotetaker';
import {
  ArrowLeft,
  Camera,
  Building2,
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
  MessageSquare,
  AlertCircle,
  UserCog,
  Loader2,
  KeyRound,
  Users
} from 'lucide-react';

export const DoctorView = ({ setView, isSplit = false }) => {
  const { 
    sentence, 
    setSentence,
    addLogEntry,
    speak,
    currentUser,
    showToast,
    sessionLog,
    clearLog,
    generatedSentence,
    availableVoices,
    selectedVoiceName,
    setSelectedVoiceName,
    activePatient,
    setActivePatient,
    activeSessionId,
    setActiveSessionId
  } = useContext(AppContext);

  const [showTtsModal, setShowTtsModal] = useState(false);
  
  // Doctor states
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [doctorTab, setDoctorTab] = useState("consultation"); // "consultation" | "history"

  // Profile / Preferences / Settings panel
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", specialty: "", department: "", medical_license: "", image: "", availability: "available" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const fetchDoctorProfile = async () => {
    setProfileLoading(true);
    try {
      const apiBase = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const res = await fetch(`${apiBase}/api/v1/doctor/me`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfileData(data);
        setProfileForm({
          name: data.name || "",
          phone: data.phone || "",
          specialty: data.specialty || data.specialization || "",
          department: data.department || "",
          medical_license: data.medical_license || "",
          image: data.image || "",
          availability: data.availability || "available"
        });
      } else if (res.status === 404) {
        showToast("Endpoint profil belum tersedia — restart server backend lalu coba lagi", "error");
      } else if (res.status === 401) {
        showToast("Sesi berakhir — silakan login ulang", "error");
      } else {
        showToast("Gagal memuat profil", "error");
      }
    } catch (e) {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenProfile = () => {
    setShowProfile(true);
    fetchDoctorProfile();
  };

  const handleSaveProfile = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      showToast("Konfirmasi password tidak cocok", "error");
      return;
    }
    if (newPassword && newPassword.length < 6) {
      showToast("Password minimal 6 karakter", "error");
      return;
    }
    setProfileSaving(true);
    try {
      const apiBase = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const body = { ...profileForm };
      if (newPassword) body.password = newPassword;
      const res = await fetch(`${apiBase}/api/v1/doctor/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", 'Authorization': `Bearer ${currentUser?.token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        const updated = await res.json();
        setProfileData(updated);
        setNewPassword("");
        setConfirmPassword("");
        showToast("Profil berhasil disimpan!", "success");
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.detail || "Gagal menyimpan profil", "error");
      }
    } catch (e) {
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setProfileSaving(false);
    }
  };

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setProfileForm(p => ({ ...p, image: reader.result }));
    reader.readAsDataURL(file);
  };

  // Buka panel profil saat diminta dari menu titik-3 di Navbar
  useEffect(() => {
    const handler = () => {
      if (currentUser && currentUser.role === 'doctor') handleOpenProfile();
    };
    window.addEventListener('medsign:open-profile', handler);
    return () => window.removeEventListener('medsign:open-profile', handler);
  }, [currentUser]);
    
  // History states
  const [patientSessions, setPatientSessions] = useState([]);
  const [selectedPastSession, setSelectedPastSession] = useState(null);
  const [selectedPastSessionLogs, setSelectedPastSessionLogs] = useState([]);
  const [soapSummary, setSoapSummary] = useState("");
  
  // Master features states
  const [activeMedicalRecord, setActiveMedicalRecord] = useState(null);
  const [medsList, setMedsList] = useState([]);
  const [newMedName, setNewMedName] = useState("");
  const [newMedDosage, setNewMedDosage] = useState("");
  const [newMedFreq, setNewMedFreq] = useState("");
  const [newMedDur, setNewMedDur] = useState("");
  const [newMedInst, setNewMedInst] = useState("");
  
  const [searchBgPatientId, setSearchBgPatientId] = useState("");
  const [searchBgNik, setSearchBgNik] = useState("");
  const [isBreakGlassActive, setIsBreakGlassActive] = useState(false);

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
        setDoctorTab("consultation");
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

  const handleActivateBreakGlass = async (patId) => {
    const reason = prompt("Masukkan alasan klinis darurat untuk mengaktifkan Akses Darurat (Break-Glass) ke data pasien ini:");
    if (!reason || !reason.trim()) {
      showToast("Alasan Break-Glass harus diisi!", "error");
      return;
    }
    try {
      const apiBaseUrl = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
      const response = await fetch(`${apiBaseUrl}/api/v1/patient/${patId}/break-glass`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        showToast("Akses darurat Break-Glass diaktifkan selama 2 jam!", "success");
        fetchAssignedPatients();
      } else {
        const err = await response.json();
        showToast(err.detail || "Gagal mengaktifkan Break-Glass", "error");
      }
    } catch (e) {
      showToast("Kesalahan koneksi", "error");
    }
  };

  const handleCreateRmeRecord = async () => {
    if (!soapSummary.trim()) {
      showToast("Catatan medis SOAP tidak boleh kosong!", "error");
      return;
    }
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/sessions/${activeSessionId}/medical-record`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          doctor_note: soapSummary,
          medical_assessment: "Evaluasi BISINDO klinis",
          diagnosis: "Diagnosis hasil sesi konsultasi",
          recommendation: "Istirahat dan obat sesuai resep",
          prescription: "",
          follow_up: "Kontrol kembali jika gejala memburuk",
          ai_drafted: 1,
          ai_provenance: '{"model": "medsign_clinical_nlg_v1", "prompt_tokens": 128, "completion_tokens": 256, "reviewed_by_doctor": true}'
        })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveMedicalRecord(data);
        showToast("Rekam Medis Elektronik (RME) berhasil dibuat!", "success");
        await handleEndSession(false);
      } else {
        const err = await response.json();
        showToast(err.detail || "Gagal membuat RME", "error");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const handleSignRecord = async () => {
    if (!activeMedicalRecord) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/medical-records/${activeMedicalRecord.id}/sign`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ signature_data: "cryptographic_hash_signature_data_doc_001" })
      });
      if (response.ok) {
        showToast("Dokumen RME berhasil ditandatangani secara digital!", "success");
        // Update local state
        setActiveMedicalRecord({ ...activeMedicalRecord, signature_state: "signed" });
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const handleCorrectRecord = async () => {
    if (!activeMedicalRecord) return;
    const correctionText = prompt("Masukkan Catatan Medis (Koreksi) baru Anda:");
    if (!correctionText || !correctionText.trim()) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/medical-records/${activeMedicalRecord.id}/correction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          doctor_note: correctionText,
          medical_assessment: "Koreksi catatan klinis",
          diagnosis: activeMedicalRecord.diagnosis,
          recommendation: activeMedicalRecord.recommendation,
          prescription: activeMedicalRecord.prescription,
          follow_up: activeMedicalRecord.follow_up,
          ai_drafted: 0,
          ai_provenance: "Manual correction by doctor"
        })
      });
      if (response.ok) {
        const data = await response.json();
        setActiveMedicalRecord(data);
        setSoapSummary(correctionText);
        showToast(`Koreksi berhasil disimpan! RME diperbarui ke Versi ${data.version}`, "success");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const handlePrescribeMeds = async (e) => {
    e.preventDefault();
    if (!activeMedicalRecord) {
      showToast("Buat rekam medis RME terlebih dahulu!", "error");
      return;
    }
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl}/api/v1/medical-records/${activeMedicalRecord.id}/medications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify([{
          drug_name: newMedName,
          dosage: newMedDosage,
          frequency: newMedFreq,
          duration: newMedDur,
          instructions: newMedInst
        }])
      });
      if (response.ok) {
        showToast(`Resep obat ${newMedName} ditambahkan!`, "success");
        setMedsList([...medsList, { drug_name: newMedName, dosage: newMedDosage, frequency: newMedFreq, duration: newMedDur, instructions: newMedInst }]);
        setNewMedName("");
        setNewMedDosage("");
        setNewMedFreq("");
        setNewMedDur("");
        setNewMedInst("");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const handleEndSession = async (confirm = true) => {
    if (confirm && !window.confirm("Apakah Anda yakin ingin mengakhiri sesi konsultasi ini?")) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${activeSessionId}/end`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      
      if (response.ok) {
        showToast("Sesi konsultasi telah diakhiri", "success");
        const pat = activePatient;
        setActivePatient(null);
        setActiveSessionId(null);
        setSelectedPastSession(null);
        setPatientSessions([]);
        
        if (pat) {
          await handleOpenPatientHistory(pat);
          setDoctorTab("history");
        } else {
          fetchAssignedPatients();
        }
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

  // ── Histori chat langsung dari kartu pasien (tanpa mulai sesi) ──
  const [viewingHistoryPatient, setViewingHistoryPatient] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  const handleOpenPatientHistory = async (pat) => {
    setViewingHistoryPatient(pat);
    setHistoryLoading(true);
    setSelectedPastSession(null);
    setSelectedPastSessionLogs([]);
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/patients/${pat.id}/sessions`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        setPatientSessions(await response.json());
      } else {
        setPatientSessions([]);
        showToast("Gagal memuat histori sesi", "error");
      }
    } catch (err) {
      setPatientSessions([]);
      showToast("Gagal terhubung ke server", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── PARTNER LOGOS FOOTER ──
  const PartnerFooter = () => (
    <div className="w-full flex flex-col items-center gap-3 mt-8 pb-4 animate-slide-up select-none">
      <div className="flex flex-wrap items-center justify-center gap-6 px-6 py-4 bg-white/60 backdrop-blur border border-slate-200/50 rounded-3xl shadow-sm max-w-4xl w-full">
        <img src="/assets/logo-kemdikbudristek.png" alt="Kemdikbudristek" className="h-7 object-contain" />
        <img src="/assets/logo-diktisaintek.png" alt="Diktisaintek" className="h-6 object-contain" />
        <img src="/assets/logo-simbelmawa.png" alt="Simbelmawa" className="h-6 object-contain" />
        <img src="/assets/logo-pkm-full.png" alt="PKM" className="h-7 object-contain" />
        <img src="/assets/logo-umc.png" alt="Universitas Ma Chung" className="h-7 object-contain" />
        <img src="/assets/logo-medsign-source.png" alt="MedSign" className="h-7 object-contain" />
      </div>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">
        MedSign AI / PKM-KC 2026 / BISINDO clinical communication assistant
      </span>
    </div>
  );

  // ── PROFILE / PREFERENCES / SETTINGS PANEL ──
  if (showProfile && currentUser && currentUser.role !== 'guest') {
    const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all placeholder:text-slate-300 disabled:bg-slate-50 disabled:text-slate-400";
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-2 animate-slide-up px-4 md:px-8">
        {/* Header */}
        <div className="glass-panel flex items-center justify-between rounded-3xl p-4 shadow-sm border border-white/60">
          <button onClick={() => setShowProfile(false)} className="glass-button rounded-2xl px-4 py-2 text-xs font-black">
            <ArrowLeft size={14} /> Kembali
          </button>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-sky-700">Akun Dokter</span>
            <h2 className="text-lg font-black text-slate-950">Profil & Pengaturan</h2>
          </div>
        </div>

        {profileLoading ? (
          <div className="glass-panel rounded-3xl p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 size={24} className="animate-spin text-sky-500" />
            <span className="text-xs font-bold">Memuat profil…</span>
          </div>
        ) : (
          <>
            {/* ── KARTU PROFIL ── */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/60">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                <div className="shrink-0 relative group">
                  {profileForm.image ? (
                    <img src={profileForm.image} alt={profileData?.name} className="h-24 w-24 rounded-3xl object-cover border-2 border-sky-500/30 shadow-md bg-white" />
                  ) : (
                    <div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-sky-500/15 to-emerald-500/10 border border-sky-200/60 flex items-center justify-center text-sky-600">
                      <Stethoscope size={36} />
                    </div>
                  )}
                  <label
                    className="absolute inset-0 rounded-3xl bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-all cursor-pointer flex flex-col items-center justify-center gap-1 text-white"
                    title="Upload foto profil"
                  >
                    <Camera size={18} />
                    <span className="text-[8px] font-black uppercase tracking-wider">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                  </label>
                </div>
                <div className="text-center sm:text-left flex-1 min-w-0">
                  <h3 className="text-base font-black text-slate-950 truncate">{profileData?.name || 'Memuat…'}</h3>
                  <p className="text-xs font-semibold text-slate-500 truncate">{profileData?.email}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200/50">
                      {profileForm.availability === 'available' ? 'Tersedia' : profileForm.availability === 'busy' ? 'Sibuk' : 'Off-duty'}
                    </span>
                    {profileData?.facility_name && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-700 border border-sky-200/50 flex items-center gap-1">
                        <Building2 size={10} /> {profileData.facility_name}
                      </span>
                    )}
                    <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-700 border border-indigo-200/50">
                      {profileForm.specialty || 'Dokter Umum'}
                    </span>
                    {profileForm.department && (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-700 border border-violet-200/50">
                        {profileForm.department}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* ── DATA DIRI ── */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/60 flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <User size={15} className="text-sky-600" /> Data Diri
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Nama Lengkap</label>
                  <input autoComplete="off" className={inputCls} value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} placeholder="Dr. Nama Lengkap" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Email (tidak dapat diubah)</label>
                  <input autoComplete="off" className={inputCls} value={profileData?.email || ''} disabled />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">No. Telepon</label>
                  <input autoComplete="off" className={inputCls} value={profileForm.phone} onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Spesialisasi</label>
                  <input autoComplete="off" className={inputCls} value={profileForm.specialty} onChange={e => setProfileForm(p => ({ ...p, specialty: e.target.value }))} placeholder="Umum / THT / Anak…" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Departemen / Poli</label>
                  <input autoComplete="off" className={inputCls} value={profileForm.department} onChange={e => setProfileForm(p => ({ ...p, department: e.target.value }))} placeholder="Poli Umum" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">No. STR / Izin Praktik</label>
                  <input autoComplete="off" className={inputCls} value={profileForm.medical_license} onChange={e => setProfileForm(p => ({ ...p, medical_license: e.target.value }))} placeholder="STR-xxxxxxx" />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Foto Profil</label>
                <div className="flex items-center gap-3">
                  <label className="cursor-pointer px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
                    Pilih Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handleProfileImageChange} />
                  </label>
                  {profileForm.image && (
                    <button onClick={() => setProfileForm(p => ({ ...p, image: "" }))} className="text-[10px] font-black uppercase text-rose-600 hover:text-rose-700 transition-all">
                      Hapus Foto
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── PREFERENSI ── */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/60 flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Volume2 size={15} className="text-emerald-600" /> Preferensi
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Status Ketersediaan</label>
                  <select
                    value={profileForm.availability}
                    onChange={e => setProfileForm(p => ({ ...p, availability: e.target.value }))}
                    className={inputCls + " cursor-pointer"}
                  >
                    <option value="available">Tersedia untuk konsultasi</option>
                    <option value="busy">Sibuk / Tidak tersedia</option>
                    <option value="off-duty">Luar jadwal (Off-duty)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Suara Text-to-Speech</label>
                  <select
                    value={selectedVoiceName || ""}
                    onChange={e => setSelectedVoiceName(e.target.value)}
                    className={inputCls + " cursor-pointer"}
                  >
                    <option value="">Suara bawaan sistem</option>
                    {availableVoices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* ── PENGATURAN KEAMANAN ── */}
            <div className="glass-panel rounded-3xl p-6 shadow-sm border border-white/60 flex flex-col gap-4">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <KeyRound size={15} className="text-amber-600" /> Pengaturan Keamanan
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Password Baru (opsional)</label>
                  <input type="password" autoComplete="new-password" className={inputCls} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-black uppercase text-slate-400 tracking-wide">Konfirmasi Password</label>
                  <input type="password" autoComplete="new-password" className={inputCls} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Ulangi password baru" />
                </div>
              </div>
            </div>

            {/* ── SIMPAN ── */}
            <div className="flex justify-end gap-2 pb-4">
              <button
                onClick={() => { setShowProfile(false); setNewPassword(""); setConfirmPassword(""); }}
                className="px-5 py-3 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#053D67] text-white text-xs font-black uppercase tracking-wider hover:opacity-90 transition-all active:scale-95 shadow-md disabled:opacity-50"
              >
                {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Simpan Perubahan
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── MODAL LOG HISTORI SESI (dipakai VIEW B & VIEW C) ──
  const fmtSessionDate = (d) => {
    try {
      const dt = new Date(d);
      return dt.toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return (d || '').split('T')[0];
    }
  };

  const historyTitleName = viewingHistoryPatient?.name || activePatient?.name || 'Pasien';

  const pastSessionModal = selectedPastSession ? (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] text-slate-800 animate-slide-up">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Histori Chat — {historyTitleName}</h3>
            <span className="text-[9px] text-slate-400 font-bold uppercase">{fmtSessionDate(selectedPastSession.started_at)}</span>
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

          <div className="flex flex-col gap-2 max-h-[250px] overflow-y-auto">
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
  ) : null;

  // ── VIEW A: GUEST MODE (NO PATIENT SELECT) ──
  if (!currentUser || currentUser.role === 'guest') {
    return (
      <div className={`mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up ${isSplit ? 'px-2' : 'px-4 md:px-8 lg:px-12'}`}>
        {/* Guest Header */}
        {!isSplit && (
          <div className="glass-panel flex items-center justify-between rounded-3xl p-4 shadow-sm border border-white/60">
            <button
              onClick={() => setView('home')}
              className="glass-button rounded-2xl px-4 py-2 text-xs font-black transition-all"
            >
              <ArrowLeft size={14} />
              Kembali
            </button>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 shrink-0">
                <Stethoscope size={17} />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase text-indigo-700 leading-none">KONSULTASI AKTIF</span>
                <h2 className="text-sm md:text-base font-black text-slate-900 mt-1 leading-none">Layar Diagnosis Dokter</h2>
              </div>
            </div>
          </div>
        )}

        {/* Guest Columns */}
        <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Kalimat Isyarat & Cara Kerja */}
          <div className="flex w-full flex-col gap-6 lg:col-span-5">
            
            {/* Kalimat Isyarat Pasien Card */}
            <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60 shadow-sm">
              <span className="block text-[10px] font-bold uppercase text-slate-500">
                Kalimat Isyarat Pasien
              </span>
              <div className="bg-[#0f172a] text-[#38bdf8] p-5 rounded-2xl min-h-[100px] flex items-center justify-center text-center font-black text-sm md:text-base border border-slate-800 leading-relaxed">
                {generatedSentence || (sentence && sentence.length > 0 ? sentence.join(' ') : "Menunggu isyarat pasien dari kamera di mode Pasien...")}
              </div>
              
              {/* Dropdown voice selector */}
              <div className="flex flex-col gap-1.5 mt-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                  Pilih Suara TTS (Browser System &amp; Open Source)
                </span>
                <select
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                >
                  <option value="">-- Suara Default Indonesia --</option>
                  {availableVoices && availableVoices.map(v => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cara Kerja Card */}
            <div className="glass-panel flex flex-col gap-3 rounded-3xl p-5 border border-white/60 shadow-sm">
              <span className="block text-[10px] font-black uppercase text-indigo-700 tracking-wider">
                Cara Kerja
              </span>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-500 m-0">
                Pasien melakukan isyarat BISINDO di <strong>Mode Pasien</strong> (halaman terpisah). Kalimat hasil deteksi Al akan muncul otomatis di panel atas.
              </p>
            </div>
          </div>

          {/* Right Column: Respon Dokter & Session Log */}
          <div className="flex w-full flex-col gap-6 lg:col-span-7">
            {/* Custom Input & Presets */}
            <DoctorPanel activeSessionId={null} />

            {/* Chat Logs */}
            <SessionLog />
          </div>
        </div>

        {/* Partner Logos Footer */}
        <PartnerFooter />
      </div>
    );
  }

  // ── VIEW B: PATIENT SELECTOR (FOR LOGGED IN DOCTOR) ──
  if (!activePatient) {
    return (
      <div className={`mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up ${isSplit ? 'px-2' : 'px-4 md:px-8 lg:px-12'}`}>
        {/* Header */}
        {!isSplit && (
          <div className="glass-panel flex items-center justify-between rounded-3xl p-4 shadow-sm border border-white/60">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setView('home')}
                className="glass-button rounded-2xl px-4 py-2 text-xs font-black transition-all"
              >
                <ArrowLeft size={14} />
                Menu Utama
              </button>
              <button
                onClick={handleOpenProfile}
                className="flex items-center gap-1.5 rounded-2xl px-4 py-2 text-xs font-black bg-slate-900/5 text-slate-600 hover:bg-slate-900/10 transition-all active:scale-95"
                title="Profil, preferensi & pengaturan"
              >
                <UserCog size={14} /> Profil Saya
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-600 shrink-0">
                <Stethoscope size={17} />
              </div>
              <div className="text-left">
                <span className="block text-[10px] font-black uppercase text-indigo-700 leading-none">Dashboard Dokter</span>
                <h2 className="text-sm md:text-base font-black text-slate-900 mt-1 leading-none">Pilih Pasien Terdaftar</h2>
              </div>
            </div>
          </div>
        )}

        {/* Doctor Dashboard Metrics Grid */}
        {!isSplit && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-[24px] border border-slate-200/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer">
              <div className="h-11 w-11 rounded-[16px] flex items-center justify-center shrink-0 bg-sky-500/10 text-sky-600 shadow-inner">
                <Users size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider truncate">Pasien Saya</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{assignedPatients.length}</p>
                <p className="text-[8px] font-semibold text-slate-450 truncate">Pasien aktif terdaftar</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[24px] border border-slate-200/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer">
              <div className="h-11 w-11 rounded-[16px] flex items-center justify-center shrink-0 bg-emerald-500/10 text-emerald-600 shadow-inner">
                <Stethoscope size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider truncate">Fasilitas Medis</p>
                <p className="text-xl font-black text-slate-900 leading-tight mt-0.5">{currentUser?.facility_name || "BISINDO Medical"}</p>
                <p className="text-[8px] font-semibold text-slate-450 truncate">Lokasi pelayanan faskes</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-[24px] border border-slate-200/60 shadow-sm flex items-center gap-3.5 hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-200 cursor-pointer">
              <div className="h-11 w-11 rounded-[16px] flex items-center justify-center shrink-0 bg-amber-500/10 text-amber-600 shadow-inner">
                <Activity size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider truncate">Status Sesi</p>
                <p className="text-xl font-black text-[#053D67] leading-tight mt-0.5">Siap</p>
                <p className="text-[8px] font-semibold text-slate-450 truncate">AI Notetaker (Gemini 3.6)</p>
              </div>
            </div>
          </div>
        )}

        {/* Break-Glass Emergency Request Panel */}
        <div className="glass-panel rounded-3xl p-5 border border-amber-200 bg-amber-50/40 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-xs font-black text-amber-850 uppercase tracking-wide flex items-center gap-1.5">
              <AlertCircle size={14} className="text-amber-700 animate-pulse" /> Akses Darurat Faskes (Break-Glass)
            </h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-1 leading-relaxed">
              Jika pasien dalam kondisi gawat darurat dan tidak terdaftar di faskes atau relasi Anda, gunakan NIK KTP untuk membuka akses darurat sementara.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="NIK KTP (16 Digit)"
              value={searchBgNik}
              onChange={(e) => setSearchBgNik(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs bg-white focus:outline-none"
            />
            <button
              onClick={async () => {
                // Cari ID pasien berdasarkan NIK via endpoint khusus break-glass (tanpa syarat relasi)
                if (!searchBgNik || searchBgNik.trim().length < 6) {
                  showToast("Masukkan NIK KTP yang valid!", "error");
                  return;
                }
                try {
                  const apiBase = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
                  const res = await fetch(`${apiBase}/api/v1/doctor/patients/find-by-nik?nik=${encodeURIComponent(searchBgNik.trim())}`, {
                    headers: { 'Authorization': `Bearer ${currentUser?.token}` }
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                      handleActivateBreakGlass(data[0].id);
                      setSearchBgNik("");
                    } else {
                      showToast("Pasien dengan NIK tersebut tidak ditemukan di faskes Anda", "error");
                    }
                  } else {
                    const err = await res.json().catch(() => ({}));
                    showToast(err.detail || "Gagal mencari pasien", "error");
                  }
                } catch (e) {
                  showToast("Gagal mencari pasien", "error");
                }
              }}
              className="px-4 py-1.5 bg-rose-600 text-white rounded-xl font-black text-[10px] uppercase tracking-wide hover:bg-rose-700 active:scale-95 transition-all shadow"
            >
              Aktifkan
            </button>
          </div>
        </div>

        {/* Patient List */}
        <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider">
              Daftar Pasien Terdaftar
            </span>
            <span className="text-[10px] font-semibold text-slate-400">{assignedPatients.length} pasien</span>
          </div>

          {/* Patient Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedPatients.length === 0 ? (
              <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
                Tidak ada pasien terdaftar di relasi Anda.
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
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleSelectPatient(pat)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                    >
                      Mulai Sesi Konsultasi
                    </button>
                    <button
                      onClick={() => handleOpenPatientHistory(pat)}
                      className="w-full py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-black text-[10px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                    >
                      <History size={12} /> Lihat Histori Chat
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ── PANEL HISTORI CHAT PASIEN (dari kartu pasien) ── */}
          {viewingHistoryPatient && (
            <div className="glass-panel rounded-3xl p-6 border border-indigo-100 bg-indigo-50/20 shadow-sm flex flex-col gap-4 animate-slide-up">
              <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
                <div>
                  <span className="block text-xs font-black uppercase text-indigo-700 tracking-wide flex items-center gap-1.5">
                    <History size={14} /> Histori Chat — {viewingHistoryPatient.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
                    {viewingHistoryPatient.no_rm} · Pilih sesi untuk melihat transkrip percakapan
                  </span>
                </div>
                <button
                  onClick={() => { setViewingHistoryPatient(null); setPatientSessions([]); }}
                  className="p-1.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 transition-all"
                  title="Tutup histori"
                >
                  <X size={14} />
                </button>
              </div>

              {historyLoading ? (
                <div className="py-10 text-center text-xs font-semibold text-slate-400">Memuat histori sesi…</div>
              ) : patientSessions.length === 0 ? (
                <div className="py-10 text-center text-xs font-semibold text-slate-400">
                  Belum ada riwayat chat tersimpan untuk {viewingHistoryPatient.name}. Mulai sesi konsultasi — setiap percakapan akan otomatis tersimpan di sini.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {patientSessions.map(s => (
                    <div key={s.id} className="bg-white rounded-2xl p-4 border border-slate-150 flex flex-col justify-between gap-3 shadow-sm hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-200/50">
                            {s.status === 'active' ? 'Berlangsung' : 'Selesai'}
                          </span>
                          <History size={13} className="text-slate-300" />
                        </div>
                        <h4 className="text-xs font-black text-slate-900 mt-2 leading-snug">
                          {s.summary ? s.summary.split("\n")[0].slice(0, 48) : `Konsultasi ${viewingHistoryPatient?.name?.split(" ")[0] || ""}`}
                        </h4>
                        <div className="flex flex-col gap-0.5 mt-1.5 text-[10px] font-semibold text-slate-500">
                          <span>Tanggal konsul: {fmtSessionDate(s.started_at)}</span>
                          <span className="text-slate-400">Model: {s.model_version}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewPastSessionLogs(s)}
                        className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[9px] uppercase tracking-wider transition-all active:scale-95"
                      >
                        View Detail
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── VIEW C: ACTIVE CONSULTATION MODE (FOR LOGGED IN DOCTOR) ──
  return (
    <>
      <div className={`mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up ${isSplit ? 'px-2' : 'px-4 md:px-8 lg:px-12'}`}>
        {/* Active Session Header */}
        {!isSplit && (
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

            <div className="flex items-center gap-2">
              <button
                onClick={handleOpenProfile}
                className="rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 text-slate-600 px-4 py-2 text-xs font-black transition-all shadow-sm uppercase active:scale-95"
                title="Profil, preferensi & pengaturan"
              >
                <UserCog size={14} className="inline mr-1 -mt-0.5" /> Profil
              </button>
              <button
                onClick={handleEndSession}
                className="rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 px-4 py-2 text-xs font-black transition-all shadow-sm border border-rose-200/20 uppercase"
              >
                Akhiri Sesi
              </button>
            </div>
          </div>
        )}

        {/* Tab Selector */}
        {!isSplit && (
          <div className="flex items-center gap-1 rounded-2xl bg-slate-900/10 p-1.5 backdrop-blur-xl border border-white/50 shadow-sm w-fit select-none">
            <button
              type="button"
              onClick={() => setDoctorTab("consultation")}
              className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                doctorTab === "consultation" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
              }`}
            >
              Konsultasi Aktif
            </button>
            <button
              type="button"
              onClick={() => setDoctorTab("history")}
              className={`rounded-xl px-4 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all ${
                doctorTab === "history" ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-950"
              }`}
            >
              Lihat Histori Chat
            </button>
          </div>
        )}

        {doctorTab === "consultation" ? (
          /* Live consultation workspace layout */
          <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-12 animate-slide-up">
            
            {/* Left Column: Kalimat Isyarat & Active chat logs */}
            <div className="flex w-full flex-col gap-6 lg:col-span-5">
              
              {/* Kalimat Isyarat Pasien Card */}
              <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60 shadow-sm">
                <span className="block text-[10px] font-bold uppercase text-slate-500">
                  Kalimat Isyarat Pasien
                </span>
                <div className="bg-[#0f172a] text-[#38bdf8] p-5 rounded-2xl min-h-[100px] flex items-center justify-center text-center font-black text-sm md:text-base border border-slate-800 leading-relaxed">
                  {generatedSentence || (sentence && sentence.length > 0 ? sentence.join(' ') : "Menunggu isyarat pasien dari kamera di mode Pasien...")}
                </div>
                
                {/* Dropdown voice selector */}
                <div className="flex flex-col gap-1.5 mt-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                    Pilih Suara TTS (Browser System &amp; Open Source)
                  </span>
                  <select
                    value={selectedVoiceName}
                    onChange={(e) => setSelectedVoiceName(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-850 focus:outline-none focus:ring-2 focus:ring-sky-500 font-semibold"
                  >
                    <option value="">-- Suara Default Indonesia --</option>
                    {availableVoices && availableVoices.map(v => (
                      <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Live Chat Session Log */}
              <SessionLog />
            </div>

            {/* Right Column: Presets, Custom Input & SOAP summary */}
            <div className="flex w-full flex-col gap-6 lg:col-span-7">
              {/* Presets & Doctor Text Input */}
              <DoctorPanel activeSessionId={activeSessionId} />
              
              {/* AI SOAP Notetaker */}
              <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-white/60 shadow-sm">
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
        ) : (
          /* Past Session History List View */
          <div className="glass-panel rounded-3xl p-6 border border-white/60 shadow-sm flex flex-col gap-5 animate-slide-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="block text-xs font-bold uppercase text-slate-500 flex items-center gap-1">
                <History size={15} className="text-indigo-600" /> Histori Log Chat Sesi Sebelumnya
              </span>
              <span className="text-[10px] font-semibold text-slate-400">Total: {patientSessions.length} sesi</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {patientSessions.length === 0 ? (
                <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
                  Belum ada riwayat sesi konsultasi medis tersimpan untuk pasien ini.
                </div>
              ) : (
                patientSessions.map(s => (
                  <div 
                    key={s.id} 
                    className="glass-panel rounded-2xl p-5 border border-slate-150 flex flex-col justify-between gap-4 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-indigo-700 tracking-wider bg-indigo-500/10 px-2.5 py-0.5 rounded">
                          {s.status === 'active' ? 'Berlangsung' : 'Selesai'}
                        </span>
                        <History size={15} className="text-slate-400" />
                      </div>
                      <h3 className="text-sm font-black text-slate-900 mt-2">
                        Konsultasi Medis
                      </h3>
                      <div className="flex flex-col gap-1 mt-2 text-[10px] font-semibold text-slate-500 leading-relaxed">
                        <span>Tanggal: {fmtSessionDate(s.started_at)}</span>
                        <span>Model: {s.model_version}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewPastSessionLogs(s)}
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider transition-all"
                    >
                      Show History Chat
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Partner Logos Footer */}
        <PartnerFooter />
      </div>

      {/* TTS voice modal */}
      {showTtsModal && (
        <TtsDashboardModal onClose={() => setShowTtsModal(false)} />
      )}

      {/* Modal log histori — dipakai VIEW B & VIEW C */}
      {pastSessionModal}
    </>
  );
};
