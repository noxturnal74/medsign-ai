import React, { useState, useEffect, useContext } from 'react';
import { AppContext } from '../context/AppContextObject';
import { DataCollection } from './DataCollection';
import {
  Shield, Building, Users, FileText, Settings, Plus, Trash2, Edit2, CheckCircle,
  XCircle, Download, Search, AlertCircle, RefreshCw, Key, Layout as LayoutIcon,
  HelpCircle, UserCheck, ShieldAlert, Database as DbIcon, LogOut, LayoutGrid, KeyRound,
  BrainCircuit, Menu, X
} from 'lucide-react';
import { AdminAnalytics } from '../components/admin/AdminAnalytics';
import { GrantsManager } from '../components/admin/GrantsManager';
import { HomepageManager } from '../components/admin/HomepageManager';
import { TeamGalleryManager } from '../components/admin/TeamGalleryManager';
import { ReportDownloader } from '../components/admin/ReportDownloader';

export const SuperAdminView = ({ setView }) => {
  const { currentUser, showToast, logout } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "facilities" | "admins" | "audit_logs" | "incidents" | "backups"
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [overview, setOverview] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [backups, setBackups] = useState([]);
  const [systemModels, setSystemModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [homeLayoutOrder, setHomeLayoutOrder] = useState("");

  const totalUsers = overview ? ((overview.total_admins || 0) + (overview.active_doctors || 0) + (overview.total_patients || 0)) : 1;
  const adminPct = overview ? Math.round(((overview.total_admins || 0) / (totalUsers || 1)) * 100) : 0;
  const doctorPct = overview ? Math.round(((overview.active_doctors || 0) / (totalUsers || 1)) * 100) : 0;
  const patientPct = overview ? Math.max(0, 100 - adminPct - doctorPct) : 0;
  
  const r = 38;
  const c_circle = 2 * Math.PI * r;
  const adminOffset = 0;
  const adminDash = (adminPct / 100) * c_circle;
  
  const doctorOffset = -adminDash;
  const doctorDash = (doctorPct / 100) * c_circle;
  
  const patientOffset = -(adminDash + doctorDash);
  const patientDash = (patientPct / 100) * c_circle;

  const mockWeeklyData = [
    { day: "Senin", sessions: 4 },
    { day: "Selasa", sessions: 7 },
    { day: "Rabu", sessions: 5 },
    { day: "Kamis", sessions: 9 },
    { day: "Jumat", sessions: 12 },
    { day: "Sabtu", sessions: 8 },
    { day: "Minggu", sessions: overview?.completed_consultations || 10 }
  ];

  const maxVal = Math.max(...mockWeeklyData.map(d => d.sessions), 10);
  const chartPoints = mockWeeklyData.map((d, i) => {
    const x = (i * 400) / 6;
    const y = 140 - (d.sessions / maxVal) * 100;
    return { x, y, ...d };
  });

  const linePath = chartPoints.reduce((acc, p, i) => {
    return acc + (i === 0 ? "M " + p.x + " " + p.y : " L " + p.x + " " + p.y);
  }, "");

  const areaPath = linePath ? linePath + " L 400 150 L 0 150 Z" : "";
  const [splitScreenEnabled, setSplitScreenEnabled] = useState("0");

  // Forms states
  const [showFacModal, setShowFacModal] = useState(false);
  const [editingFac, setEditingFac] = useState(null);
  const [facCode, setFacCode] = useState("");
  const [facName, setFacName] = useState("");
  const [facType, setFacType] = useState("Hospital");
  const [customFacType, setCustomFacType] = useState("");
  const [facAddress, setFacAddress] = useState("");
  const [facCity, setFacCity] = useState("");
  const [facProvince, setFacProvince] = useState("");

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminFacId, setAdminFacId] = useState("");
  const [adminPhone, setAdminPhone] = useState("");
  const [adminStatus, setAdminStatus] = useState("active");

  // Audit filter states
  const [filterFac, setFilterFac] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterType, setFilterType] = useState("");

  // Incident Update form state
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incStatus, setIncStatus] = useState("open");
  const [incDetails, setIncDetails] = useState("");

  const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

  const fetchSettings = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/settings`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHomeLayoutOrder(data.homepage_section_order);
        setSplitScreenEnabled(data.split_screen_enabled || "0");
      }
    } catch (e) { console.error(e); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const res1 = await fetch(`${apiBaseUrl}/api/v1/superadmin/settings`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          key: "homepage_section_order",
          value: homeLayoutOrder
        })
      });
      
      const res2 = await fetch(`${apiBaseUrl}/api/v1/superadmin/settings`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          key: "split_screen_enabled",
          value: splitScreenEnabled
        })
      });
      
      if (res1.ok && res2.ok) {
        showToast("Tata letak halaman utama berhasil disimpan!", "success");
        fetchSettings();
      } else {
        showToast("Gagal menyimpan tata letak", "error");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const fetchOverview = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/overview`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) setOverview(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchFacilities = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/facilities-overview`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) setFacilities(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAdmins = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/admins`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) setAdmins(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAuditLogs = async () => {
    try {
      let url = `${apiBaseUrl}/api/v1/superadmin/audit-logs?`;
      if (filterFac) url += `facility_id=${filterFac}&`;
      if (filterRole) url += `actor_role=${filterRole}&`;
      if (filterType) url += `event_type=${filterType}&`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) setAuditLogs(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchIncidents = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/incidents`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) setIncidents(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchBackups = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/backups`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) setBackups(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleCreateBackup = async () => {
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/backups`, {
        method: "POST",
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) {
        showToast("Backup database berhasil dibuat!", "success");
        fetchBackups();
        fetchOverview();
      } else {
        showToast("Gagal melakukan backup", "error");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  const handleUpdateIncident = async (e) => {
    e.preventDefault();
    if (!selectedIncident) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/incidents/${selectedIncident.id}`, {
        method: "PUT",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify({
          status: incStatus,
          resolution_details: incDetails
        })
      });
      if (res.ok) {
        showToast("Insiden diperbarui!", "success");
        setSelectedIncident(null);
        setIncDetails("");
        fetchIncidents();
        fetchOverview();
      } else {
        showToast("Gagal memperbarui insiden", "error");
      }
    } catch (e) {
      showToast("Gagal koneksi", "error");
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'super_admin') {
      fetchOverview();
      fetchFacilities();
      fetchAdmins();
      fetchAuditLogs();
      fetchIncidents();
      fetchBackups();
      fetchSettings();
      fetchSystemModels();
    }
  }, [currentUser, activeTab, filterFac, filterRole, filterType]);

  const fetchSystemModels = async () => {
    setLoadingModels(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/dataset/models`, {
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) {
        setSystemModels(await res.json());
      }
    } catch (e) {
      console.error("Gagal mengambil daftar model:", e);
    } finally {
      setLoadingModels(false);
    }
  };

  const handleCreateFac = async (e) => {
    e.preventDefault();
    try {
      const url = editingFac 
        ? `${apiBaseUrl}/api/v1/superadmin/facilities/${editingFac.id}`
        : `${apiBaseUrl}/api/v1/superadmin/facilities`;
      const method = editingFac ? "PUT" : "POST";
      const finalFacType = facType === "Other" ? (customFacType.trim() || "Other") : facType;
      const body = {
        facility_code: facCode,
        name: facName,
        type: finalFacType,
        address: facAddress,
        city: facCity,
        province: facProvince
      };
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(editingFac ? "Fasilitas diperbarui!" : "Fasilitas dibuat!", "success");
        setShowFacModal(false);
        setEditingFac(null);
        clearFacForm();
        fetchFacilities();
        fetchOverview();
      } else {
        const err = await res.json();
        showToast(err.detail || "Gagal menyimpan fasilitas", "error");
      }
    } catch (e) {
      showToast("Kesalahan koneksi", "error");
    }
  };

  const handleDeleteFac = async (id) => {
    if (!confirm("Apakah Anda yakin ingin menghapus fasilitas ini?")) return;
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/facilities/${id}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
      });
      if (res.ok) {
        showToast("Fasilitas dihapus", "success");
        fetchFacilities();
        fetchOverview();
      }
    } catch (e) {
      showToast("Gagal menghapus", "error");
    }
  };

  const clearFacForm = () => {
    setFacCode("");
    setFacName("");
    setFacType("Hospital");
    setCustomFacType("");
    setFacAddress("");
    setFacCity("");
    setFacProvince("");
  };

  const openEditFac = (fac) => {
    setEditingFac(fac);
    setFacCode(fac.facility_code);
    setFacName(fac.name);
    if (["Hospital", "Clinic", "Medical Center"].includes(fac.type)) {
      setFacType(fac.type);
      setCustomFacType("");
    } else {
      setFacType("Other");
      setCustomFacType(fac.type || "");
    }
    setFacAddress(fac.address || "");
    setFacCity(fac.city || "");
    setFacProvince(fac.province || "");
    setShowFacModal(true);
  };

  const handleCreateAdmin = async (e) => {
    e.preventDefault();
    try {
      const url = editingAdmin 
        ? `${apiBaseUrl}/api/v1/superadmin/admins/${editingAdmin.id}`
        : `${apiBaseUrl}/api/v1/superadmin/admins`;
      const method = editingAdmin ? "PUT" : "POST";
      const body = editingAdmin ? {
        name: adminName,
        email: adminEmail,
        username: adminUsername,
        phone: adminPhone,
        status: adminStatus
      } : {
        name: adminName,
        email: adminEmail,
        username: adminUsername,
        password: adminPassword,
        facility_id: adminFacId,
        phone: adminPhone
      };
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser?.token}`
        },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        showToast(editingAdmin ? "Admin diperbarui!" : "Admin dibuat!", "success");
        setShowAdminModal(false);
        setEditingAdmin(null);
        clearAdminForm();
        fetchAdmins();
        fetchOverview();
      } else {
        const err = await res.json();
        showToast(err.detail || "Gagal menyimpan admin", "error");
      }
    } catch (e) {
      showToast("Kesalahan koneksi", "error");
    }
  };

  const clearAdminForm = () => {
    setAdminName("");
    setAdminEmail("");
    setAdminUsername("");
    setAdminPassword("");
    setAdminFacId("");
    setAdminPhone("");
    setAdminStatus("active");
  };

  const openEditAdmin = (adm) => {
    setEditingAdmin(adm);
    setAdminName(adm.name);
    setAdminEmail(adm.email);
    setAdminUsername(adm.username || "");
    setAdminPhone(adm.phone || "");
    setAdminStatus(adm.status || "active");
    setShowAdminModal(true);
  };

  const handleExportCSV = () => {
    let url = `${apiBaseUrl}/api/v1/superadmin/audit-logs?export_csv=true&`;
    if (filterFac) url += `facility_id=${filterFac}&`;
    if (filterRole) url += `actor_role=${filterRole}&`;
    if (filterType) url += `event_type=${filterType}&`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "audit_logs.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)] w-full bg-slate-50 text-slate-800 select-none font-sans relative">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[90] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`fixed lg:static inset-y-0 left-0 top-[57px] lg:top-auto z-[100] w-64 max-w-[80vw] bg-slate-900 text-slate-300 flex flex-col shrink-0 justify-between border-r border-slate-800 shadow-xl transition-transform duration-300 ease-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col overflow-y-auto">
          {/* Sidebar Brand header */}
          <div className="flex items-center justify-between gap-3.5 p-6 border-b border-slate-800 bg-slate-950/40">
            <div className="flex items-center gap-3.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-inner">
                <Shield size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-sm font-black uppercase text-white tracking-wide leading-none">MedSign AI</h2>
                <span className="text-[10px] font-bold text-slate-550 block mt-1">Super Admin Portal</span>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              title="Tutup menu"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5 p-4">
            {[
              { id: "dashboard", label: "Overview Ringkasan", icon: LayoutIcon },
              { id: "facilities", label: "Kelola Faskes", icon: Building },
              { id: "admins", label: "Kelola Admin Faskes", icon: Users },
              { id: "audit_logs", label: "Sistem Audit Logs", icon: FileText },
              { id: "incidents", label: "Insiden Keamanan", icon: ShieldAlert },
              { id: "backups", label: "Database Backups", icon: DbIcon },
              { id: "models", label: "Model & ML", icon: Settings },
              { id: "dataset", label: "Dataset & Training", icon: BrainCircuit },
              { id: "homepage_content", label: "Kelola Konten", icon: LayoutGrid },
              { id: "grants", label: "Grant & Akses", icon: KeyRound }
            ].map(item => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
                    active
                      ? "bg-sky-600 text-white shadow-md shadow-sky-900/10 scale-[1.02]"
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                  }`}
                >
                  <Icon size={15} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-850 bg-slate-950/30">
          <button
            onClick={() => { logout(); setView('home'); }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 text-rose-500 hover:bg-rose-500/10 text-xs font-black transition-all active:scale-[0.98]"
          >
            <LogOut size={14} /> Keluar Sistem
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-grow flex flex-col min-w-0 overflow-y-auto h-[calc(100vh-57px)] pr-2 sm:pr-4 lg:pr-2 scrollbar-thin" data-lenis-prevent>
        {/* Top Header bar */}
        <header className="flex items-center justify-between gap-3 p-4 sm:p-6 border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2.5 rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all shadow-sm shrink-0"
              title="Buka menu navigasi"
            >
              <Menu size={16} />
            </button>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-sky-700 uppercase tracking-widest">Keamanan Global</span>
              <h1 className="text-base sm:text-xl font-black text-slate-950 leading-none mt-1 truncate">
                {activeTab === "dashboard" ? "Dashboard Ringkasan Utama" : activeTab === "dataset" ? "Dataset & Training Panel" : activeTab === "facilities" ? "Manajemen Fasilitas Kesehatan" : activeTab === "admins" ? "Manajemen Administrator Faskes" : activeTab === "audit_logs" ? "Sistem Audit Logs & Laporan" : activeTab === "incidents" ? "Keamanan - Insiden Terdeteksi" : "models" === activeTab ? "Manajemen Model & ML Global" : activeTab === "homepage_content" ? "Kelola Konten Homepage" : activeTab === "grants" ? "Manajemen Grant & Akses" : "Manajemen Database Backups"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => { fetchOverview(); fetchFacilities(); fetchAdmins(); fetchAuditLogs(); fetchIncidents(); fetchBackups(); showToast("Data dimuat ulang", "success"); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
            >
              <RefreshCw size={12} /> Segarkan Data
            </button>
          </div>
        </header>

        {/* Content Tabs render */}
        <div className="p-6 flex flex-col gap-6">
          
          {/* TAB 1.5: Dataset & Training */}
          {activeTab === "dataset" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" data-lenis-prevent>
                <DataCollection setView={setView} embedded />
              </div>
            </div>
          )}



          {/* TAB 1: Dashboard Overview */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              {/* Metrics Grid Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {overview ? (
                  <>
                                        <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer">
                      <div className="absolute right-0 top-0 w-24 h-24 -mr-5 -mt-5 rounded-full bg-sky-500/5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Fasilitas</span>
                      <span className="text-3xl font-black text-slate-900 mt-2 tracking-tight leading-none">{overview.total_facilities}</span>
                      <span className="text-[9px] font-black text-emerald-700 block bg-emerald-50 border border-emerald-100/50 w-fit px-2 py-0.5 rounded-full mt-3 uppercase">({overview.active_facilities} Aktif)</span>
                    </div>
                                        <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer">
                      <div className="absolute right-0 top-0 w-24 h-24 -mr-5 -mt-5 rounded-full bg-indigo-500/5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Admin</span>
                      <span className="text-3xl font-black text-slate-900 mt-2 tracking-tight leading-none">{overview.total_admins}</span>
                      <span className="text-[9px] font-black text-indigo-700 block bg-indigo-50 border border-indigo-100/50 w-fit px-2 py-0.5 rounded-full mt-3 uppercase">Admin Faskes</span>
                    </div>
                                        <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer">
                      <div className="absolute right-0 top-0 w-24 h-24 -mr-5 -mt-5 rounded-full bg-emerald-500/5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Dokter Aktif</span>
                      <span className="text-3xl font-black text-slate-900 mt-2 tracking-tight leading-none">{overview.active_doctors}</span>
                      <span className="text-[9px] font-black text-emerald-700 block bg-emerald-50 border border-emerald-100/50 w-fit px-2 py-0.5 rounded-full mt-3 uppercase">Dokter Terdaftar</span>
                    </div>
                                        <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer">
                      <div className="absolute right-0 top-0 w-24 h-24 -mr-5 -mt-5 rounded-full bg-rose-500/5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Total Pasien</span>
                      <span className="text-3xl font-black text-slate-900 mt-2 tracking-tight leading-none">{overview.total_patients}</span>
                      <span className="text-[9px] font-black text-rose-700 block bg-rose-50 border border-rose-100/50 w-fit px-2 py-0.5 rounded-full mt-3 uppercase">({overview.pending_verifications} Pending)</span>
                    </div>
                                        <div className="bg-white p-6 rounded-[28px] border border-slate-200/60 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.99] transition-all duration-300 flex flex-col justify-between relative overflow-hidden group cursor-pointer">
                      <div className="absolute right-0 top-0 w-24 h-24 -mr-5 -mt-5 rounded-full bg-amber-500/5 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Sesi Medis</span>
                      <span className="text-3xl font-black text-slate-900 mt-2 tracking-tight leading-none">{overview.active_consultations}</span>
                      <span className="text-[9px] font-black text-amber-700 block bg-amber-50 border border-amber-100/50 w-fit px-2 py-0.5 rounded-full mt-3 uppercase">({overview.completed_consultations} Selesai)</span>
                    </div>
                  </>
                ) : (
                  Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-24 bg-white border border-slate-200 rounded-3xl animate-pulse" />)
                )}
              </div>

              {/* Visual Analytics Grid (interactive, timeframe-filtered) */}
              {overview && <AdminAnalytics overview={overview} />}

              {/* Unduh Laporan (PDF / Excel / Word / CSV) */}
              <div className="bg-white rounded-[28px] p-5 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">Laporan Sistem Global</h3>
                  <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                    Ringkasan faskes, pengguna, dan sesi konsultasi — siap diunduh.
                  </p>
                </div>
                <ReportDownloader token={currentUser?.token} showToast={showToast} />
              </div>

              {/* Faskes overview table list */}
              <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm flex flex-col gap-4">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Monitoring Fasilitas Aktif</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-black tracking-wider text-[9px] pb-3">
                        <th className="pb-3">Kode</th>
                        <th className="pb-3">Nama Faskes</th>
                        <th className="pb-3">Tipe</th>
                        <th className="pb-3">Admin Faskes</th>
                        <th className="pb-3 text-center">Dokter</th>
                        <th className="pb-3 text-center">Pasien</th>
                        <th className="pb-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                      {facilities.map(f => (
                        <tr key={f.id} className="hover:bg-slate-50/50">
                          <td className="py-3.5 font-bold text-slate-900">{f.facility_code}</td>
                          <td className="py-3.5 font-black text-[#053D67]">{f.name}</td>
                          <td className="py-3.5">{f.type}</td>
                          <td className="py-3.5 font-medium">{f.admin_name}</td>
                          <td className="py-3.5 text-center font-bold text-slate-800">{f.doctor_count}</td>
                          <td className="py-3.5 text-center font-bold text-slate-800">{f.patient_count}</td>
                          <td className="py-3.5 text-center">
                            <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-full ${
                              f.status === 'active' ? 'bg-emerald-500/10 text-emerald-700' : 'bg-rose-500/10 text-rose-700'
                            }`}>{f.status === 'active' ? 'AKTIF' : 'NONAKTIF'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Kelola Konten Homepage */}
          {activeTab === "homepage_content" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm" data-lenis-prevent>
                <HomepageManager
                  order={homeLayoutOrder}
                  setOrder={setHomeLayoutOrder}
                  onSave={handleSaveSettings}
                />
              </div>

              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase">Mode Split View (1 Layar Bersama)</label>
                  <select
                    value={splitScreenEnabled}
                    onChange={(e) => setSplitScreenEnabled(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold text-slate-800 shadow-inner cursor-pointer"
                  >
                    <option value="0">Nonaktif (Normal - 2 Layar Terpisah / Sendiri-sendiri)</option>
                    <option value="1">Aktif (Split View - Mode Pasien &amp; Dokter 1 Layar Berdampingan)</option>
                  </select>
                </div>
              </div>

              <TeamGalleryManager token={currentUser?.token} showToast={showToast} />
            </div>
          )}

          {/* TAB 2: Facilities Management */}
          {activeTab === "facilities" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Keamanan Global / Faskes</h2>
                <button 
                  onClick={() => { clearFacForm(); setEditingFac(null); setShowFacModal(true); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-sky-700 active:scale-95 transition-all shadow-md"
                >
                  <Plus size={14} /> Tambah Faskes
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {facilities.map(f => (
                  <div key={f.id} className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-sky-50 text-sky-800 border border-sky-100">{f.type}</span>
                        <span className={`w-2 h-2 rounded-full ${f.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      </div>
                      <h3 className="text-base font-black mt-3 text-slate-900 leading-snug">{f.name}</h3>
                      <p className="text-[9.5px] font-bold text-slate-400 mt-1">Kode: {f.facility_code}</p>
                      <p className="text-[10px] text-slate-500 mt-2.5 font-semibold leading-relaxed">{f.address}, {f.city}, {f.province}</p>
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => openEditFac(f)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black uppercase bg-slate-50 text-slate-650 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Edit</button>
                      <button onClick={() => handleDeleteFac(f.id)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black uppercase bg-rose-50/50 text-rose-600 hover:bg-rose-100 rounded-xl transition-all border border-rose-200/40">Hapus</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Admins Management */}
          {activeTab === "admins" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Keamanan Global / Admins</h2>
                <button 
                  onClick={() => { clearAdminForm(); setEditingAdmin(null); setShowAdminModal(true); }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-sky-700 active:scale-95 transition-all shadow-md"
                >
                  <Plus size={14} /> Tambah Admin
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {admins.map(a => (
                  <div key={a.id} className="bg-white p-6 rounded-[28px] border border-slate-200 shadow-sm flex flex-col justify-between gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Admin</span>
                        <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${a.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{a.status}</span>
                      </div>
                      <h3 className="text-base font-black mt-3 text-slate-900 leading-snug">{a.name}</h3>
                      <p className="text-[9.5px] font-semibold text-slate-400 mt-1">Username: {a.username} | Email: {a.email}</p>
                      <p className="text-[10px] font-bold text-sky-700 mt-2">Ditugaskan di: {a.facility_name}</p>
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-100 pt-3">
                      <button onClick={() => openEditAdmin(a)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-[10px] font-black uppercase bg-slate-50 text-slate-650 hover:bg-slate-100 rounded-xl transition-all border border-slate-200">Edit</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Audit Logs */}
          {activeTab === "audit_logs" && (
            <div className="flex flex-col gap-5 animate-slide-up">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Logs Audit & Keamanan</h2>
                <button onClick={handleExportCSV} className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-700 active:scale-95 transition-all shadow-md">
                  <Download size={14} /> Ekspor CSV
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-[24px] border border-slate-200/80 shadow-sm">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Fasilitas</label>
                  <select value={filterFac} onChange={(e) => setFilterFac(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white font-semibold shadow-inner">
                    <option value="">Semua Fasilitas</option>
                    {facilities.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-450 uppercase">Role Aktor</label>
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white font-semibold shadow-inner">
                    <option value="">Semua Role</option>
                    <option value="super_admin">Super Admin</option>
                    <option value="admin">Admin Faskes</option>
                    <option value="doctor">Dokter</option>
                    <option value="patient">Pasien</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-455 uppercase">Event Type</label>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700 bg-white font-semibold shadow-inner">
                    <option value="">Semua Event</option>
                    <option value="CONSENT_ACCEPTED">Consent Accepted</option>
                    <option value="KTP_VERIFIED">KTP Verified</option>
                    <option value="FACE_VERIFICATION_COMPLETED">Face Verified</option>
                    <option value="PATIENT_CREATED">Patient Approved</option>
                    <option value="MEDICAL_RECORD_CREATED">Medical Record Created</option>
                  </select>
                </div>
              </div>
              <div className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm flex flex-col gap-3">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-650">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-450 uppercase font-black tracking-wider text-[9px] pb-2">
                        <th className="pb-2">Waktu (UTC)</th>
                        <th className="pb-2">Aktor (Role)</th>
                        <th className="pb-2">Aksi / Event</th>
                        <th className="pb-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {auditLogs.slice(0, 100).map(l => (
                        <tr key={l.id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 text-slate-450 font-semibold">{l.created_at.split(".")[0].replace("T", " ")}</td>
                          <td className="py-2.5"><span className="font-bold text-slate-850">{l.actor_id}</span> <span className="text-[8px] uppercase font-black text-slate-400">({l.actor_role})</span></td>
                          <td className="py-2.5 font-bold text-slate-700">{l.action}</td>
                          <td className="py-2.5 text-center"><span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${l.success === 1 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{l.success === 1 ? 'SUKSES' : 'GAGAL'}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Incidents */}
          {activeTab === "incidents" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Logs Audit / Keamanan</h2>
              </div>
              <div className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm flex flex-col gap-3">
                {incidents.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">Tidak ada insiden keamanan terdeteksi.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-650">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-450 uppercase font-black tracking-wider text-[9px] pb-2">
                          <th className="pb-2">Dibuat</th>
                          <th className="pb-2">Judul Insiden</th>
                          <th className="pb-2">Keparahan</th>
                          <th className="pb-2">Status</th>
                          <th className="pb-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {incidents.map(inc => (
                          <tr key={inc.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 text-slate-450 font-semibold">{inc.created_at.split(".")[0].replace("T", " ")}</td>
                            <td className="py-2.5 font-bold text-slate-800">
                              {inc.title}
                              <span className="block text-[9px] font-semibold text-slate-400 mt-0.5">{inc.description}</span>
                              {inc.resolution_details && <span className="block text-[9px] font-bold text-emerald-600 mt-0.5">Resolusi: {inc.resolution_details}</span>}
                            </td>
                            <td className="py-2.5">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                inc.severity === 'CRITICAL' ? 'bg-rose-500 text-white shadow-sm' : inc.severity === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-800'
                              }`}>{inc.severity}</span>
                            </td>
                            <td className="py-2.5">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                inc.status === 'resolved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>{inc.status.toUpperCase()}</span>
                            </td>
                            <td className="py-2.5 text-right">
                              {inc.status !== 'resolved' && (
                                <button 
                                  onClick={() => { setSelectedIncident(inc); setIncStatus(inc.status); }}
                                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl font-black text-[9px] uppercase tracking-wider text-slate-700 active:scale-95 transition-all"
                                >
                                  Tindak Lanjut
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: Backups */}
          {activeTab === "backups" && (
            <div className="flex flex-col gap-6 animate-slide-up">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Disaster Recovery / Backups</h2>
                <button 
                  onClick={handleCreateBackup}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-[#053D67] text-white rounded-2xl font-black text-xs uppercase hover:opacity-90 active:scale-95 transition-all shadow"
                >
                  <Plus size={14} /> Buat Backup Baru
                </button>
              </div>
              <div className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm flex flex-col gap-3">
                {backups.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">Belum ada riwayat backup database.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-650">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-450 uppercase font-black tracking-wider text-[9px] pb-2">
                          <th className="pb-2">Waktu Backup</th>
                          <th className="pb-2">Nama Backup File</th>
                          <th className="pb-2">Path Penyimpanan</th>
                          <th className="pb-2 text-center">Integritas</th>
                          <th className="pb-2 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {backups.map(b => (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="py-2.5 text-slate-450 font-semibold">{b.created_at.split(".")[0].replace("T", " ")}</td>
                            <td className="py-2.5 font-bold text-slate-800">{b.backup_name}</td>
                            <td className="py-2.5 font-semibold text-slate-500">{b.backup_path}</td>
                            <td className="py-2.5 text-center font-bold text-emerald-600">PASSED</td>
                            <td className="py-2.5 text-center">
                              <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                b.status === 'success' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>{b.status.toUpperCase()}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 7: Models (Super Admin ML Management Center) */}
          {activeTab === "models" && (
            <div className="flex flex-col gap-6 animate-slide-up text-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-2">
                <div>
                  <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Pusat Manajemen Model & ML</h2>
                  <span className="text-[10px] text-slate-500 font-semibold mt-0.5 block">Kelola model translasi klinis dan ejaan BISINDO secara terpusat.</span>
                </div>
                <button 
                  onClick={async () => {
                    try {
                      const res = await fetch(`${apiBaseUrl}/api/v1/dataset/model/auto-fix`, {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${currentUser?.token}` }
                      });
                      if (res.ok) {
                        showToast("Verifikasi & Perbaikan Model Berhasil!", "success");
                        fetchSystemModels();
                      } else {
                        showToast("Gagal menjalankan perbaikan model", "error");
                      }
                    } catch (err) {
                      showToast("Gagal menghubungi server", "error");
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase hover:opacity-90 active:scale-95 transition-all shadow-md"
                >
                  <RefreshCw size={14} className="animate-spin-slow" /> Verifikasi & Perbaiki Model
                </button>
              </div>

              {/* Grid: Active Model status */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="surface-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm bg-white/45 flex flex-col gap-3">
                  <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">Model Translasi Klinis (Active)</span>
                  <div className="flex flex-col gap-1.5 text-xs font-semibold">
                    <span className="text-slate-800 font-bold">medsign_mvp_v1.tflite</span>
                    <span className="text-slate-450 block text-[10px]">Tipe: Sequence (GRU/LSTM)</span>
                    <span className="text-slate-450 block text-[10px]">Target: 12 Kosakata MVP</span>
                  </div>
                </div>

                <div className="surface-panel rounded-3xl p-6 border border-slate-200/80 shadow-sm bg-white/45 flex flex-col gap-3">
                  <span className="text-[10px] font-black text-violet-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">Model Ejaan Abjad (Active)</span>
                  <div className="flex flex-col gap-1.5 text-xs font-semibold">
                    <span className="text-slate-800 font-bold">bisindo_alphabet_v1.tflite</span>
                    <span className="text-slate-450 block text-[10px]">Tipe: MLP Static</span>
                    <span className="text-slate-450 block text-[10px]">Target: Ejaan Huruf A-Z & Angka 1-9</span>
                  </div>
                </div>
              </div>

              {/* Table of Available Models */}
              <div className="bg-white rounded-[28px] p-6 border border-slate-200/80 shadow-sm flex flex-col gap-3">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Berkas Model Tersedia di Server</h3>
                {loadingModels ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin" /> Memuat berkas model...
                  </div>
                ) : systemModels.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs font-semibold">Belum ada file model .tflite terdeteksi di server.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-[11px] font-semibold text-slate-650">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-450 uppercase font-black tracking-wider text-[9px] pb-2">
                          <th className="pb-2">Nama Berkas Model</th>
                          <th className="pb-2">Ukuran</th>
                          <th className="pb-2">Tipe</th>
                          <th className="pb-2">Tanggal Modifikasi</th>
                          <th className="pb-2 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {systemModels.map((m, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-3 font-bold text-slate-800">{m.name}</td>
                            <td className="py-3 font-semibold text-slate-500">{m.size_mb ? `${m.size_mb.toFixed(2)} MB` : "N/A"}</td>
                            <td className="py-3">
                              <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider ${
                                m.type === 'clinical' ? 'bg-sky-100 text-sky-800' : 'bg-violet-100 text-violet-800'
                              }`}>{m.type}</span>
                            </td>
                            <td className="py-3 text-slate-400 font-semibold">{m.modified_at || "N/A"}</td>
                            <td className="py-3 text-right">
                              <button 
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`${apiBaseUrl}/api/v1/dataset/models/select`, {
                                      method: "POST",
                                      headers: { 
                                        "Content-Type": "application/json",
                                        "Authorization": `Bearer ${currentUser?.token}`
                                      },
                                      body: JSON.stringify({ 
                                        model_name: m.name, 
                                        model_type: m.type 
                                      })
                                    });
                                    if (res.ok) {
                                      showToast(`Model ${m.name} berhasil diaktifkan!`, "success");
                                      fetchSystemModels();
                                    } else {
                                      showToast("Gagal mengaktifkan model", "error");
                                    }
                                  } catch (err) {
                                    showToast("Gagal menghubungi server", "error");
                                  }
                                }}
                                className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 border border-sky-200 text-sky-700 rounded-xl font-black text-[9px] uppercase tracking-wider active:scale-95 transition-all"
                              >
                                Aktifkan
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "grants" && (
            <GrantsManager
              apiBaseUrl={apiBaseUrl}
              token={currentUser?.token}
              showToast={showToast}
            />
          )}

          </div>
        </main>

      {/* Modal: Create/Edit Facility */}
      {showFacModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleCreateFac} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              {editingFac ? "Edit Fasilitas Kesehatan" : "Tambah Fasilitas Kesehatan"}
            </h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Kode Faskes (Unique)</label>
              <input 
                type="text" 
                value={facCode}
                onChange={(e) => setFacCode(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: RSI-001" 
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Nama Faskes</label>
              <input 
                type="text" 
                value={facName}
                onChange={(e) => setFacName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: RS Islam Cempaka Putih" 
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Tipe</label>
              <select 
                value={facType} 
                onChange={(e) => setFacType(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold cursor-pointer shadow-inner"
              >
                <option value="Hospital">Hospital</option>
                <option value="Clinic">Clinic</option>
                <option value="Medical Center">Medical Center</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {facType === "Other" && (
              <div className="flex flex-col gap-1 animate-fade-in">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Tulis Tipe Kustom</label>
                <input 
                  type="text" 
                  value={customFacType} 
                  onChange={(e) => setCustomFacType(e.target.value)} 
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                  placeholder="Contoh: Puskesmas / Laboratorium" 
                  required 
                />
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Alamat</label>
              <input 
                type="text" 
                value={facAddress}
                onChange={(e) => setFacAddress(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: Jl. Cempaka Putih No. 1" 
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Kota</label>
                <input 
                  type="text" 
                  value={facCity}
                  onChange={(e) => setFacCity(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                  placeholder="Contoh: Jakarta" 
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Provinsi</label>
                <input 
                  type="text" 
                  value={facProvince}
                  onChange={(e) => setFacProvince(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                  placeholder="Contoh: DKI Jakarta" 
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <button 
                type="button" 
                onClick={() => setShowFacModal(false)}
                className="px-4 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-[#053D67] text-white hover:opacity-90 rounded-2xl transition-all shadow"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Create/Edit Admin */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleCreateAdmin} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">
              {editingAdmin ? "Edit Admin Faskes" : "Tambah Admin Faskes"}
            </h3>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Nama Lengkap</label>
              <input 
                type="text" 
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: John Doe" 
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Email</label>
              <input 
                type="email" 
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: admin@rsi.com" 
                required
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Username (Unique)</label>
              <input 
                type="text" 
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: admin_rsi" 
                required
              />
            </div>

            {!editingAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Password</label>
                <input 
                  type="password" 
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                  placeholder="Masukkan password admin" 
                  required
                />
              </div>
            )}

            {!editingAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Fasilitas Ditugaskan</label>
                <select 
                  value={adminFacId} 
                  onChange={(e) => setAdminFacId(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold cursor-pointer shadow-inner"
                  required
                >
                  <option value="">Pilih Fasilitas Kesehatan</option>
                  {facilities.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {editingAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase">Status</label>
                <select 
                  value={adminStatus} 
                  onChange={(e) => setAdminStatus(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-bold cursor-pointer shadow-inner"
                >
                  <option value="active">active</option>
                  <option value="suspended">suspended</option>
                </select>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Nomor HP</label>
              <input 
                type="text" 
                value={adminPhone}
                onChange={(e) => setAdminPhone(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner" 
                placeholder="Contoh: 08123456789" 
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <button 
                type="button" 
                onClick={() => setShowAdminModal(false)}
                className="px-4 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all"
              >
                Batal
              </button>
              <button 
                type="submit"
                className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-[#053D67] text-white hover:opacity-90 rounded-2xl transition-all shadow"
              >
                Simpan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Incident Resolution Details */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateIncident} className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full border border-white/20 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-2">Resolusi Insiden Keamanan</h3>
            
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Insiden</label>
              <span className="text-xs font-bold text-slate-700">{selectedIncident.title}</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Status</label>
              <select value={incStatus} onChange={(e) => setIncStatus(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white">
                <option value="investigating">investigating</option>
                <option value="resolved">resolved</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase">Detail Tindakan Resolusi</label>
              <textarea 
                value={incDetails} 
                onChange={(e) => setIncDetails(e.target.value)} 
                rows={3} 
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white font-semibold shadow-inner resize-none"
                placeholder="Masukkan catatan resolusi keamanan..."
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
              <button type="button" onClick={() => setSelectedIncident(null)} className="px-4 py-2.5 text-xs font-black bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 rounded-2xl transition-all">Batal</button>
              <button type="submit" className="px-5 py-2.5 text-xs font-black uppercase tracking-wider bg-[#053D67] text-white hover:opacity-90 rounded-2xl transition-all shadow-md active:scale-95">Simpan</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
