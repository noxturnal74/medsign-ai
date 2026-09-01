import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContextObject';
import {
  MessageCircle,
  X,
  ArrowLeft,
  Search,
  Loader2,
  History,
  FileText,
  Inbox,
  Edit2,
  Trash2,
  Check,
  Download,
  PlusCircle,
  ClipboardList,
  ChevronLeft
} from 'lucide-react';

export const ChatHistory = ({ setView }) => {
  const { currentUser } = useContext(AppContext);
  const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const token = currentUser?.token || localStorage.getItem('medsign_token') || '';

  const urlParams = new URLSearchParams(window.location.search);
  const initialChatId = urlParams.get('chatId') || localStorage.getItem('medsign_chat_id') || '';
  const patientName = localStorage.getItem('medsign_chat_patient_name') || 'Pasien';
  const patientIdStored = localStorage.getItem('medsign_chat_patient_id') || '';

  const [messages, setMessages] = useState([]);
  const [chatList, setChatList] = useState([]);
  const [selectedChatId, setSelectedChatId] = useState(initialChatId);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const endRef = useRef(null);

  // Mobile active view toggle (true = show reader on mobile screen, false = show list)
  const [mobileShowDetail, setMobileShowDetail] = useState(Boolean(initialChatId));

  // SOAP State
  const [selectedSoap, setSelectedSoap] = useState('');
  const [editingSoap, setEditingSoap] = useState(false);
  const [tempSoapText, setTempSoapText] = useState('');
  const [savingSoap, setSavingSoap] = useState(false);

  // Title Editing State
  const [editingTitleId, setEditingTitleId] = useState(null);
  const [tempTitleText, setTempTitleText] = useState('');

  // Doctor Notes State
  const [doctorNote, setDoctorNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
    fetchChatList();
    if (selectedChatId) loadMessages(selectedChatId);
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      loadMessages(selectedChatId);
    }
  }, [selectedChatId]);

  const fetchChatList = async () => {
    if (!patientIdStored) return;
    setListLoading(true);
    try {
      let res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/patient/${patientIdStored}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.data || []);
        if (arr.length > 0) {
          setChatList(arr.map(c => ({
            id: c.id || c.chat_id,
            patient_id: patientIdStored,
            title: c.title || c.last_message || `Konsultasi ${new Date(c.updated_at || Date.now()).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`,
            last_message: c.last_message,
            summary: c.summary,
            updated_at: c.updated_at,
            _raw: c
          })));
          if (!selectedChatId) setSelectedChatId(arr[0].id || arr[0].chat_id || arr[0].session_id);
          setListLoading(false);
          return;
        }
      }
      // fallback ke sessions
      res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/patients/${patientIdStored}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        setChatList(arr.map(s => {
          const dateStr = s.started_at || s.created_at || '';
          const dObj = dateStr ? new Date(dateStr) : null;
          const formattedDate = dObj ? dObj.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sesi Konsultasi';
          const title = s.summary ? s.summary.split('\n')[0].slice(0, 50) : `Konsultasi ${formattedDate}`;
          return {
            id: s.id,
            patient_id: patientIdStored,
            title: title,
            last_message: title,
            summary: s.summary,
            updated_at: s.started_at || s.created_at,
            _session: s
          };
        }));
        if (arr.length > 0 && !selectedChatId) setSelectedChatId(arr[0].id);
      }
    } catch {}
    setListLoading(false);
  };

  const loadMessages = async (cid) => {
    if (!cid) return;
    setLoading(true);
    setSelectedSoap('');
    setEditingSoap(false);
    setEditingTitleId(null);
    try {
      let res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/history/${cid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
          setLoading(false);
          try {
            const sres = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${cid}`, { headers: { Authorization: `Bearer ${token}` } });
            if (sres.ok) {
              const sess = await sres.json();
              if (sess.summary) setSelectedSoap(sess.summary);
            }
          } catch {}
          return;
        }
      }
      // fallback ke session logs
      res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${cid}/logs`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const logs = await res.json();
        const mapped = (Array.isArray(logs) ? logs : []).map(l => ({
          id: l.id || Math.random().toString(36).slice(2),
          chat_id: cid,
          role: l.role,
          content: l.text || l.content,
          created_at: l.timestamp || l.created_at
        }));
        setMessages(mapped);
        try {
          const sres = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${cid}`, { headers: { Authorization: `Bearer ${token}` } });
          if (sres.ok) {
            const sess = await sres.json();
            if (sess.summary) setSelectedSoap(sess.summary);
          }
        } catch {}
      } else {
        setMessages([]);
      }
    } catch {
      showToast('Koneksi gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChat = async (cid, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Hapus riwayat sesi / percakapan ini secara permanen?')) return;
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/${cid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Sesi chat berhasil dihapus', 'success');
        const remaining = chatList.filter(c => c.id !== cid);
        setChatList(remaining);
        if (selectedChatId === cid) {
          if (remaining.length > 0) {
            setSelectedChatId(remaining[0].id);
          } else {
            setSelectedChatId('');
            setMessages([]);
            setSelectedSoap('');
            setMobileShowDetail(false);
          }
        }
      } else {
        showToast('Gagal menghapus sesi', 'error');
      }
    } catch {
      showToast('Koneksi gagal', 'error');
    }
  };

  const handleUpdateTitle = async (cid) => {
    if (!tempTitleText.trim()) {
      setEditingTitleId(null);
      return;
    }
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/${cid}/title`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: tempTitleText.trim() })
      });
      if (res.ok) {
        showToast('Judul percakapan berhasil diperbarui', 'success');
        setChatList(prev => prev.map(c => c.id === cid ? { ...c, title: tempTitleText.trim(), last_message: tempTitleText.trim() } : c));
        setEditingTitleId(null);
      } else {
        showToast('Gagal memperbarui judul', 'error');
      }
    } catch {
      showToast('Koneksi gagal', 'error');
    }
  };

  const handleSaveSoap = async () => {
    if (!selectedChatId) return;
    setSavingSoap(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${selectedChatId}/soap`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ summary: tempSoapText })
      });
      if (res.ok) {
        showToast('Catatan medis SOAP berhasil disimpan', 'success');
        setSelectedSoap(tempSoapText);
        setEditingSoap(false);
      } else {
        const fbRes = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${selectedChatId}/summary`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ summary: tempSoapText })
        });
        if (fbRes.ok) {
          showToast('Catatan medis SOAP tersimpan', 'success');
          setSelectedSoap(tempSoapText);
          setEditingSoap(false);
        } else {
          showToast('Gagal menyimpan SOAP', 'error');
        }
      }
    } catch {
      showToast('Koneksi gagal', 'error');
    } finally {
      setSavingSoap(false);
    }
  };

  const handleAddDoctorNote = async (e) => {
    e.preventDefault();
    if (!doctorNote.trim() || !selectedChatId) return;
    setSavingNote(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chat_id: selectedChatId, role: 'doctor', content: `[Catatan Dokter] ${doctorNote.trim()}` }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        setDoctorNote('');
        showToast('Catatan dokter berhasil ditambahkan', 'success');
      } else {
        const fallback = { id: Date.now().toString(), chat_id: selectedChatId, role: 'doctor', content: `[Catatan Dokter] ${doctorNote.trim()}`, created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, fallback]);
        setDoctorNote('');
        showToast('Catatan disimpan lokal', 'info');
      }
    } catch {
      showToast('Koneksi gagal', 'error');
    } finally {
      setSavingNote(false);
    }
  };

  const handleExportEvidence = () => {
    if (!selectedChatId) return;
    const text = `=== MEDSIGN EVIDENCE REPORT ===\n` +
      `Sesi ID: ${selectedChatId}\n` +
      `Pasien: ${patientName} (${patientIdStored})\n` +
      `Tanggal Unduh: ${new Date().toISOString()}\n\n` +
      `--- CATATAN MEDIS (SOAP) ---\n` +
      `${selectedSoap || 'Tidak ada catatan SOAP tersimpan.'}\n\n` +
      `--- TRANSKRIP PERCAKAPAN LENGKAP ---\n` +
      messages.map(l => `[${l.created_at || ''}] ${l.role.toUpperCase()}: ${l.content}`).join('\n');

    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `MedSign-Chat-Evidence-${String(selectedChatId).slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    showToast('Evidence report berhasil diunduh', 'success');
  };

  const handleClose = () => {
    if (setView) setView('doctor');
    else window.history.back();
  };

  const filteredMessages = searchQuery ? messages.filter(m => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())) : messages;

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-3.5 py-2 md:py-4 px-3 sm:px-4 md:px-6 animate-slide-up select-none">
      {/* Clean Minimal Header */}
      <div className="glass-panel rounded-2xl md:rounded-3xl p-3 md:p-4 flex items-center justify-between border border-white/60 shadow-sm bg-white/70 backdrop-blur-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            onClick={() => {
              if (mobileShowDetail) {
                setMobileShowDetail(false);
              } else {
                handleClose();
              }
            }}
            className="p-2 rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 transition-all shrink-0 active:scale-95"
            title="Kembali"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
              <Inbox size={12} /> Riwayat Chat
            </span>
            <h2 className="text-xs md:text-sm font-black text-slate-900 truncate">
              {patientName} <span className="font-mono text-[9px] md:text-[10px] text-slate-400 font-normal">· {patientIdStored ? patientIdStored.slice(0,8) : ''}</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {selectedChatId && (
            <button
              onClick={handleExportEvidence}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-100/90 hover:bg-slate-200 text-slate-700 text-[10px] md:text-xs font-bold transition-all shadow-xs"
              title="Unduh Evidence Report"
            >
              <Download size={12} /> <span className="hidden sm:inline">Unduh</span> Evidence
            </button>
          )}
          <div className="relative hidden lg:block">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari pesan..."
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 w-36"
            />
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700 transition-all shrink-0"
            title="Tutup"
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {toast && (
        <div className={`rounded-xl px-3.5 py-2 text-xs font-bold border transition-all ${
          toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-sky-50 border-sky-200 text-sky-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Adaptive Responsive Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
        {/* Left Column: Daftar Sesi (Hidden on mobile if detail view is active) */}
        <div className={`md:col-span-4 flex flex-col gap-3 ${mobileShowDetail ? 'hidden md:flex' : 'flex'}`}>
          <div className="glass-panel rounded-2xl md:rounded-3xl p-3.5 md:p-4 border border-white/60 shadow-sm flex flex-col bg-white/70 backdrop-blur-md min-h-[460px] md:min-h-[520px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5 tracking-wider">
                <History size={13} className="text-indigo-600" /> Daftar Sesi
              </span>
              <span className="text-[9.5px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {chatList.length} Sesi
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-0.5 max-h-[62vh]">
              {listLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 size={20} className="animate-spin text-indigo-600" />
                  <span className="text-[11px] font-bold">Memuat sesi...</span>
                </div>
              ) : chatList.length === 0 ? (
                <div className="py-12 text-center text-xs font-medium text-slate-400 flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <History size={18} />
                  </div>
                  <p>Belum ada sesi tersimpan.</p>
                </div>
              ) : (
                chatList.map((c) => {
                  const isActive = selectedChatId === c.id;
                  const dateStr = c.updated_at || c.started_at || c.created_at || '';
                  const isEditingThisTitle = editingTitleId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (!isEditingThisTitle) {
                          setSelectedChatId(c.id);
                          localStorage.setItem('medsign_chat_id', c.id);
                          setMobileShowDetail(true);
                        }
                      }}
                      className={`group relative w-full text-left rounded-xl md:rounded-2xl p-3 border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                          : 'bg-white/90 border-slate-200/70 hover:bg-slate-50/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`text-[8.5px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>
                          {dateStr ? new Date(dateStr).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '—'}
                        </div>
                        
                        {/* Action buttons: Edit Title & Delete */}
                        <div className="flex items-center gap-1 opacity-90 sm:opacity-70 group-hover:opacity-100 transition-opacity">
                          {!isEditingThisTitle ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTitleId(c.id);
                                  setTempTitleText(c.title || '');
                                }}
                                className={`p-1 rounded-md transition-all ${isActive ? 'text-indigo-100 hover:bg-white/20' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'}`}
                                title="Edit Judul Sesi"
                              >
                                <Edit2 size={11} />
                              </button>
                              <button
                                onClick={(e) => handleDeleteChat(c.id, e)}
                                className={`p-1 rounded-md transition-all ${isActive ? 'text-rose-200 hover:bg-white/20' : 'text-slate-400 hover:text-rose-600 hover:bg-slate-100'}`}
                                title="Hapus Riwayat Sesi"
                              >
                                <Trash2 size={11} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleUpdateTitle(c.id); }}
                                className="p-1 rounded-md bg-white text-indigo-700 hover:bg-slate-100 shadow-xs"
                                title="Simpan"
                              >
                                <Check size={11} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingTitleId(null); }}
                                className="p-1 rounded-md bg-black/20 text-white hover:bg-black/30"
                                title="Batal"
                              >
                                <X size={11} />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {isEditingThisTitle ? (
                        <input
                          type="text"
                          value={tempTitleText}
                          onChange={(e) => setTempTitleText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') handleUpdateTitle(c.id); }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-xs font-bold text-slate-900 bg-white rounded-lg px-2 py-1 mt-1 border border-indigo-300 focus:outline-none shadow-inner"
                          autoFocus
                        />
                      ) : (
                        <div className="text-xs font-bold leading-snug truncate mt-1">{c.title}</div>
                      )}

                      <div className={`text-[9.5px] truncate mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>
                        {c.patient_id ? `ID: ${String(c.patient_id).slice(0,8)}` : ''}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Reader - Log Sesi & SOAP Evidence (Hidden on mobile when list is active) */}
        <div className={`md:col-span-8 flex flex-col gap-3 ${!mobileShowDetail ? 'hidden md:flex' : 'flex'}`}>
          <div className="glass-panel rounded-2xl md:rounded-3xl border border-white/60 shadow-sm flex flex-col overflow-hidden bg-white" style={{ minHeight: 460 }}>
            
            {/* Header Reader */}
            <div className="p-3 border-b border-slate-150 bg-slate-50/70 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMobileShowDetail(false)}
                  className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 md:hidden active:scale-95"
                  title="Lihat Daftar Sesi"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] md:text-[11px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                  <FileText size={13} className="text-indigo-600" /> Log Percakapan & Evidence
                </span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-slate-400">
                {filteredMessages.length} Pesan
              </span>
            </div>

            {/* SOAP Note Evidence Section (Zero noise, clear collapsible feel) */}
            <div className="p-3.5 border-b border-slate-150 bg-indigo-50/30 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[9.5px] font-black uppercase text-indigo-900 flex items-center gap-1.5 tracking-wider">
                  <ClipboardList size={12} className="text-indigo-600" /> Catatan Medis (SOAP)
                </span>
                {!editingSoap ? (
                  <button
                    onClick={() => { setEditingSoap(true); setTempSoapText(selectedSoap || ''); }}
                    className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 transition-colors"
                  >
                    <Edit2 size={10} /> {selectedSoap ? 'Edit SOAP' : 'Buat SOAP'}
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleSaveSoap}
                      disabled={savingSoap}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 text-white text-[9px] font-black uppercase hover:bg-indigo-700 disabled:opacity-50 shadow-xs"
                    >
                      {savingSoap ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Simpan
                    </button>
                    <button
                      onClick={() => setEditingSoap(false)}
                      className="text-[9px] font-bold text-slate-400 hover:text-slate-600 px-1"
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
                  rows={3}
                  placeholder="Subjective:\nObjective:\nAssessment:\nPlan:"
                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-indigo-200 rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 shadow-xs"
                />
              ) : selectedSoap ? (
                <p className="text-xs font-medium text-slate-750 leading-relaxed whitespace-pre-line bg-white p-2.5 rounded-xl border border-indigo-100 shadow-xs">
                  {selectedSoap}
                </p>
              ) : (
                <div className="py-2 px-3 text-center text-[11px] font-medium text-slate-400 bg-white/60 rounded-xl border border-dashed border-slate-200">
                  Tidak ada catatan SOAP. Klik "Buat SOAP" di atas bila ingin menambahkan resume klinis.
                </div>
              )}
            </div>

            {/* Conversation Log Messages Stream */}
            <div className="flex-1 overflow-y-auto p-3.5 space-y-2.5 bg-gradient-to-b from-slate-50/20 to-white max-h-[340px]">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 size={18} className="animate-spin text-indigo-600" />
                  <span className="text-xs font-semibold">Memuat log percakapan...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <MessageCircle size={28} className="text-slate-300" />
                  <p className="text-xs font-medium">Pilih salah satu sesi di daftar untuk melihat log transkrip.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isDoctor = msg.role === 'doctor';
                  return (
                    <div key={msg.id} className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[78%] rounded-2xl px-3.5 py-2 shadow-xs border text-xs leading-relaxed ${
                        isDoctor
                          ? 'bg-emerald-50 border-emerald-200/80 text-slate-800 rounded-br-none'
                          : 'bg-sky-50 border-sky-200/80 text-slate-800 rounded-bl-none'
                      }`}>
                        <div className={`text-[8.5px] font-black uppercase mb-0.5 ${isDoctor ? 'text-emerald-700' : 'text-sky-700'}`}>
                          {isDoctor ? 'Dokter' : 'Pasien'}
                        </div>
                        <p className="whitespace-pre-wrap break-words font-semibold text-[11.5px] leading-snug">{msg.content}</p>
                        <div className="text-[8px] mt-1 text-right text-slate-400 font-mono">
                          {msg.created_at ? new Date(msg.created_at).toLocaleString('id-ID', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'}) : ''}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>

            {/* Bottom Bar: Input Notes Dokter */}
            <form onSubmit={handleAddDoctorNote} className="p-2.5 border-t border-slate-150 bg-white flex items-center gap-2">
              <input
                type="text"
                placeholder={selectedChatId ? 'Tulis catatan dokter tambahan...' : 'Pilih sesi dulu'}
                value={doctorNote}
                onChange={(e) => setDoctorNote(e.target.value)}
                maxLength={500}
                disabled={savingNote || !selectedChatId}
                className="flex-1 rounded-full border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-50/80 focus:outline-none focus:ring-2 focus:ring-indigo-400/30 disabled:opacity-50"
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={savingNote || !doctorNote.trim() || !selectedChatId}
                className="px-3.5 py-2 rounded-full bg-indigo-600 text-white text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-40 shrink-0 inline-flex items-center gap-1 transition-all shadow-xs"
                title="Simpan Catatan Dokter"
              >
                {savingNote ? <Loader2 size={13} className="animate-spin" /> : <PlusCircle size={13} />} <span className="hidden sm:inline">Tambah</span> Note
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
