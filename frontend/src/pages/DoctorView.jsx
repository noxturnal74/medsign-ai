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
  Users,
  Edit2,
  Trash2,
  Check,
  Download
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
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  
  // Doctor states
  const [assignedPatients, setAssignedPatients] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [patientSortBy, setPatientSortBy] = useState("name"); // "name" | "rm" | "dob"
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
  
  // CRUD editing states for past session
  const [editingSoap, setEditingSoap] = useState(false);
  const [tempSoapText, setTempSoapText] = useState("");
  const [editingLogId, setEditingLogId] = useState(null);
  const [tempLogText, setTempLogText] = useState("");
  const [savingSoapEdit, setSavingSoapEdit] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState(null);
  
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
    if (confirm) { setShowEndSessionConfirm(true); return; }
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
          await fetchPatientSessions(pat.id);
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

  const handleDeleteSession = async (sessionId) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus seluruh riwayat sesi ini beserta log percakapannya? Tindakan ini tidak dapat dibatalkan.")) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        showToast("Riwayat sesi berhasil dihapus", "success");
        if (selectedPastSession?.id === sessionId) {
          setSelectedPastSession(null);
          setSelectedPastSessionLogs([]);
        }
        if (activePatient?.id) {
          fetchPatientSessions(activePatient.id);
        } else if (viewingHistoryPatient?.id) {
          fetchPatientSessions(viewingHistoryPatient.id);
        }
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.detail || "Gagal menghapus sesi", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    }
  };

  const handleUpdateSoap = async () => {
    if (!selectedPastSession) return;
    setSavingSoapEdit(true);
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${selectedPastSession.id}/soap`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ summary: tempSoapText })
      });
      if (response.ok) {
        showToast("Catatan medis SOAP berhasil diperbarui", "success");
        setSelectedPastSession(prev => ({ ...prev, summary: tempSoapText }));
        setPatientSessions(prev => prev.map(s => s.id === selectedPastSession.id ? { ...s, summary: tempSoapText } : s));
        setEditingSoap(false);
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.detail || "Gagal memperbarui SOAP", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    } finally {
      setSavingSoapEdit(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm("Hapus bubble pesan ini dari riwayat log?")) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (response.ok) {
        showToast("Pesan berhasil dihapus", "success");
        setSelectedPastSessionLogs(prev => prev.filter(l => l.id !== logId));
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.detail || "Gagal menghapus pesan", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    }
  };

  const handleUpdateLog = async (logId) => {
    if (!tempLogText.trim()) return;
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/logs/${logId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({ text: tempLogText })
      });
      if (response.ok) {
        showToast("Pesan berhasil diperbarui", "success");
        setSelectedPastSessionLogs(prev => prev.map(l => l.id === logId ? { ...l, text: tempLogText } : l));
        setEditingLogId(null);
        setTempLogText("");
      } else {
        const err = await response.json().catch(() => ({}));
        showToast(err.detail || "Gagal memperbarui pesan", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
    }
  };

  const handleExportEvidence = (session, logs) => {
    const text = `=== MEDSIGN EVIDENCE REPORT ===\n` +
      `Sesi ID: ${session.id}\n` +
      `Waktu Mulai: ${session.started_at}\n` +
      `Model Versi: ${session.model_version}\n` +
      `Status: ${session.status}\n\n` +
      `--- CATATAN MEDIS (SOAP) ---\n` +
      `${session.summary || "Tidak ada catatan SOAP"}\n\n` +
      `--- TRANSKRIP PERCAKAPAN LENGKAP ---\n` +
      logs.map(l => `[${l.timestamp || l.created_at}] ${l.role.toUpperCase()}: ${l.text}`).join('\n');

    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `MedSign-Evidence-${session.id.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
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
    // WhatsApp-style: satu thread per pasien. Coba ambil chat yg sudah ada, kalau belum ada buat baru.
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const headers = { Authorization: `Bearer ${currentUser?.token}` };
      // coba ambil daftar chat pasien
      let chatId = null;
      try {
        const listRes = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/patient/${pat.id}`, { headers });
        if (listRes.ok) {
          const chats = await listRes.json();
          if (Array.isArray(chats) && chats.length > 0) chatId = chats[0].id;
          else if (chats?.data && chats.data.length > 0) chatId = chats.data[0].id;
        }
      } catch {}
      if (!chatId) {
        // buat chat baru
        try {
          const createRes = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser?.token}` },
            body: JSON.stringify({ patient_id: pat.id, doctor_id: currentUser?.id || currentUser?.user_id || pat.id }),
          });
          if (createRes.ok) {
            const c = await createRes.json();
            chatId = c.id || c.chat_id || pat.id;
          }
        } catch {}
      }
      if (!chatId) chatId = pat.id; // fallback pakai patient id supaya halaman tetap buka
      localStorage.setItem('medsign_chat_id', chatId);
      localStorage.setItem('medsign_chat_patient_id', pat.id);
      localStorage.setItem('medsign_chat_patient_name', pat.name || 'Pasien');
      setView('chat_history', chatId);
      return;
    } catch (e) {
      const chatId = pat.id;
      try {
        localStorage.setItem('medsign_chat_id', chatId);
        localStorage.setItem('medsign_chat_patient_id', pat.id);
        localStorage.setItem('medsign_chat_patient_name', pat.name || 'Pasien');
      } catch {}
      setView('chat_history', chatId);
      return;
    }
  };

  const _loadChatMessages_UNUSED = async (chatId) => {
    setHistoryLoading(true);
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(
        `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/chat/history/${chatId}`,
        {
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        }
      );
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        setHistoryLoading(false);
      } else {
        showToast("Gagal memuat riwayat chat", "error");
        setHistoryLoading(false);
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
      setHistoryLoading(false);
    }
  };

  // ── PARTNER LOGOS FOOTER ──
  const PartnerFooter = () => (
    <div className="w-full flex flex-col items-center gap-3 mt-8 pb-4 animate-slide-up select-none">
      <div className="flex flex-wrap items-center justify-center gap-6 px-6 py-4 bg-white/60 dark:bg-white/10 backdrop-blur border border-slate-200/50 rounded-3xl shadow-sm max-w-4xl w-full">
        <img src="/assets/logo-kemdikbudristek.png" alt="Kemdikbudristek" className="h-7 object-contain" />
        <img src="/assets/logo-diktisaintek.png" alt="Diktisaintek" className="h-6 object-contain" />
        <img src="/assets/logo-simbelmawa.png" alt="Simbelmawa" className="h-6 object-contain" />
        <img src="/assets/logo-pkm-full.png" alt="PKM" className="h-7 object-contain" />
        <img src="/assets/logo-umc.png" alt="Universitas Ma Chung" className="h-7 object-contain" />
        <img src="/assets/logo-medsign-source.png" alt="MedSign" className="h-7 object-contain" />
      </div>
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] text-center dark:text-slate-200">
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

  const pastSessionModal = null;

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
            <span className="text-[10px] font-semibold text-slate-400">
              {assignedPatients.filter(p => {
                const q = searchQuery.toLowerCase();
                return !q || p.name?.toLowerCase().includes(q) || p.nik?.toLowerCase().includes(q) || p.no_rm?.toLowerCase().includes(q);
              }).length} / {assignedPatients.length} pasien
            </span>
          </div>

          {/* Search + Sort Bar */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama, NIK, atau No. RM..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-300 transition-all"
              />
            </div>
            <select
              value={patientSortBy}
              onChange={e => setPatientSortBy(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 transition-all cursor-pointer"
            >
              <option value="name">Urutkan: Nama</option>
              <option value="rm">Urutkan: No. RM</option>
              <option value="dob">Urutkan: Tgl Lahir</option>
            </select>
          </div>

          {/* Patient Card Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(() => {
              const q = searchQuery.toLowerCase();
              const filtered = assignedPatients.filter(p =>
                !q || p.name?.toLowerCase().includes(q) || p.nik?.toLowerCase().includes(q) || p.no_rm?.toLowerCase().includes(q)
              ).sort((a, b) => {
                if (patientSortBy === 'rm') return (a.no_rm || '').localeCompare(b.no_rm || '');
                if (patientSortBy === 'dob') return (a.date_of_birth || '').localeCompare(b.date_of_birth || '');
                return (a.name || '').localeCompare(b.name || '');
              });
              if (filtered.length === 0) return (
                <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
                  {searchQuery ? `Tidak ada pasien dengan kata kunci "${searchQuery}".` : 'Tidak ada pasien terdaftar di relasi Anda.'}
                </div>
              );
              return filtered.map(pat => (
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
                      className="w-full py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-wider transition-all dark:bg-indigo-500 dark:text-white dark:hover:bg-indigo-600"
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
            })()}
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
          /* Past Session History List View (Email split view style) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 animate-slide-up">
            
            {/* Left side: Sessions List (Inbox style) */}
            <div className="md:col-span-4 flex flex-col gap-4">
              <div className="glass-panel rounded-3xl p-5 border border-white/60 shadow-sm flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                  <span className="block text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                    <History size={14} className="text-indigo-600" /> Daftar Sesi
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">Total: {patientSessions.length}</span>
                </div>
                
                <div className="flex flex-col gap-2.5 max-h-[550px] overflow-y-auto pr-1">
                  {patientSessions.length === 0 ? (
                    <div className="text-center text-[10px] font-semibold text-slate-400 py-8">
                      Belum ada riwayat sesi.
                    </div>
                  ) : (
                    patientSessions.map(s => {
                      const isActiveSession = selectedPastSession?.id === s.id;
                      return (
                        <div 
                          key={s.id} 
                          onClick={() => handleViewPastSessionLogs(s)}
                          className={`rounded-2xl p-4 border transition-all cursor-pointer flex flex-col gap-2 ${
                            isActiveSession
                              ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-950 font-black shadow-inner scale-[1.01]'
                              : 'bg-white border-slate-200/60 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                              s.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-slate-500/10 text-slate-400'
                            }`}>
                              {s.status === 'active' ? 'Berlangsung' : 'Selesai'}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400">{fmtSessionDate(s.started_at).split(',')[0]}</span>
                          </div>
                          <h4 className="text-xs font-black text-slate-900 leading-snug">
                            {s.summary ? s.summary.split("\n")[0].slice(0, 32) : "Sesi Konsultasi"}
                          </h4>
                          <span className="text-[8.5px] font-bold text-slate-450 block">Model: {s.model_version}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right side: Session Details (Email content reader style) */}
            <div className="md:col-span-8">
              {!selectedPastSession ? (
                <div className="glass-panel rounded-[32px] p-12 border border-slate-200/60 bg-white/40 shadow-sm flex flex-col items-center justify-center text-center gap-3 min-h-[400px]">
                  <div className="h-14 w-14 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center shadow-inner">
                    <History size={26} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide">Pilih Sesi Konsultasi</h3>
                    <p className="text-[10px] font-semibold text-slate-455 mt-1 max-w-xs leading-relaxed">
                      Pilih salah satu riwayat sesi di sebelah kiri untuk melihat rangkuman catatan medis SOAP dan transkrip percakapan lengkap.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-[32px] p-6 border border-white/60 bg-white shadow-sm flex flex-col gap-4 animate-slide-up min-h-[400px]">
                  {/* Detail Header & Action Buttons */}
                  <div className="flex items-center justify-between border-b border-slate-150 pb-3">
                    <div>
                      <h3 className="text-xs font-black text-slate-950 uppercase tracking-wide flex items-center gap-2">
                        <span>Detail Sesi Konsultasi</span>
                        <span className="text-[8.5px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/40">Evidence Log</span>
                      </h3>
                      <span className="text-[9px] text-slate-455 font-bold uppercase">{fmtSessionDate(selectedPastSession.started_at)} · ID: {selectedPastSession.id.slice(0, 8)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleExportEvidence(selectedPastSession, selectedPastSessionLogs)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold transition-all shadow-sm"
                        title="Unduh Bukti Medis (TXT)"
                      >
                        <Download size={12} /> Unduh Evidence
                      </button>
                      <button
                        onClick={() => handleDeleteSession(selectedPastSession.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/40 text-[10px] font-bold transition-all shadow-sm"
                        title="Hapus Seluruh Riwayat Sesi"
                      >
                        <Trash2 size={12} /> Hapus Sesi
                      </button>
                      <button 
                        onClick={() => { setSelectedPastSession(null); setEditingSoap(false); setEditingLogId(null); }} 
                        className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"
                        title="Tutup Detail"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>

                  {/* SOAP Note view & Update */}
                  <div className="bg-slate-50 border border-slate-150/70 p-4 rounded-2xl flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <FileText size={12} className="text-indigo-600" /> Log Catatan Medis (SOAP)
                      </span>
                      {!editingSoap ? (
                        <button
                          onClick={() => { setEditingSoap(true); setTempSoapText(selectedPastSession.summary || ""); }}
                          className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <Edit2 size={11} /> Edit SOAP
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleUpdateSoap}
                            disabled={savingSoapEdit}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase hover:bg-indigo-700 disabled:opacity-50"
                          >
                            {savingSoapEdit ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Simpan
                          </button>
                          <button
                            onClick={() => setEditingSoap(false)}
                            className="text-[9px] font-bold text-slate-400 hover:text-slate-600"
                          >
                            Batal
                          </button>
                        </div>
                      )}
                    </div>

                    {editingSoap ? (
                      <textarea
                        value={tempSoapText}
                        onChange={(e) => setTempSoapText(e.target.value)}
                        rows={4}
                        placeholder="Edit catatan SOAP..."
                        className="w-full text-[11px] font-semibold text-slate-800 bg-white border border-indigo-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                      />
                    ) : (
                      <p className="text-[10px] font-semibold text-slate-750 leading-relaxed whitespace-pre-line bg-white/70 p-2.5 rounded-xl border border-slate-100">
                        {selectedPastSession.summary || "Tidak ada catatan medis SOAP disimpan untuk sesi ini."}
                      </p>
                    )}
                  </div>

                  {/* Chat log view with Edit & Delete per bubble */}
                  <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <div className="flex items-center justify-between border-t border-slate-150/70 pt-3">
                      <span className="text-[9px] font-black text-slate-500 uppercase flex items-center gap-1">
                        <MessageSquare size={12} className="text-sky-600" /> Log Transkrip Percakapan Sesi ({selectedPastSessionLogs.length} Pesan)
                      </span>
                      <span className="text-[8px] font-bold text-slate-400">Klik icon edit/hapus di tiap pesan untuk koreksi data</span>
                    </div>

                    <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                      {selectedPastSessionLogs.length === 0 ? (
                        <span className="text-[9px] text-slate-400 text-center py-4">Sesi ini tidak memiliki log percakapan.</span>
                      ) : (
                        [...selectedPastSessionLogs].sort((a, b) => new Date(a.created_at || a.timestamp || 0) - new Date(b.created_at || b.timestamp || 0)).map(log => {
                          const isDoc = log.role === 'doctor';
                          const isEditingThis = editingLogId === log.id;

                          return (
                            <div
                              key={log.id}
                              className={`group relative p-2.5 rounded-2xl text-[10px] font-semibold max-w-[88%] border transition-all ${
                                isDoc
                                  ? 'bg-sky-500/10 text-sky-900 border-sky-200/30 self-end ml-auto'
                                  : 'bg-emerald-500/10 text-emerald-900 border-emerald-200/30 self-start mr-auto'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3 mb-1">
                                <span className="font-extrabold uppercase text-[7.5px] opacity-60">{isDoc ? 'DOKTER' : 'PASIEN'}</span>
                                
                                {/* Bubble Actions */}
                                <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                                  {log.timestamp && <span className="text-[7px] text-slate-400">{log.timestamp.slice(11, 16) || log.timestamp}</span>}
                                  {!isEditingThis ? (
                                    <>
                                      <button
                                        onClick={() => { setEditingLogId(log.id); setTempLogText(log.text); }}
                                        className="p-1 rounded-md hover:bg-white/80 text-slate-500 hover:text-indigo-600 transition-all"
                                        title="Koreksi teks pesan"
                                      >
                                        <Edit2 size={10} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLog(log.id)}
                                        className="p-1 rounded-md hover:bg-white/80 text-slate-500 hover:text-rose-600 transition-all"
                                        title="Hapus bubble pesan"
                                      >
                                        <Trash2 size={10} />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleUpdateLog(log.id)}
                                        className="p-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                                        title="Simpan koreksi"
                                      >
                                        <Check size={10} />
                                      </button>
                                      <button
                                        onClick={() => { setEditingLogId(null); setTempLogText(""); }}
                                        className="p-1 rounded-md bg-slate-200 text-slate-600 hover:bg-slate-300 transition-all"
                                        title="Batal"
                                      >
                                        <X size={10} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {isEditingThis ? (
                                <input
                                  type="text"
                                  value={tempLogText}
                                  onChange={(e) => setTempLogText(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateLog(log.id); }}
                                  className="w-full text-xs font-semibold bg-white border border-indigo-300 rounded-lg px-2 py-1 focus:outline-none text-slate-800 mt-1"
                                  autoFocus
                                />
                              ) : (
                                <p className="leading-relaxed whitespace-pre-wrap break-words">{log.text}</p>
                              )}

                              {log.confidence && log.confidence < 1.0 && (
                                <span className="block text-[7.5px] text-slate-400 text-right mt-1">Akurasi: {Math.round(log.confidence * 100)}%</span>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
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

      {/* Konfirmasi Akhiri Sesi */}
      {showEndSessionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-sm w-full p-6">
            <h3 className="font-black text-base text-slate-800 mb-1">Akhiri Sesi Konsultasi?</h3>
            <p className="text-sm text-slate-500 mb-6">Sesi akan ditutup dan tidak dapat dilanjutkan. Riwayat percakapan tetap tersimpan.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndSessionConfirm(false)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => { setShowEndSessionConfirm(false); handleEndSession(false); }}
                className="flex-1 py-2.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black text-sm transition-all shadow-sm"
              >
                Ya, Akhiri
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal log histori — dipakai VIEW B & VIEW C */}
      {pastSessionModal}
    </>
  );
};
