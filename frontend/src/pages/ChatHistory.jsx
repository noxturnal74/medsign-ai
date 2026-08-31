import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContextObject';
import { MessageCircle, X, Send, ArrowLeft, Search, Loader2, History, FileText, Inbox } from 'lucide-react';

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
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const endRef = useRef(null);
  const [selectedSoap, setSelectedSoap] = useState('');

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
    if (selectedChatId) loadMessages(selectedChatId);
  }, [selectedChatId]);

  const prevCount = useRef(0);
  useEffect(() => {
    if (messages.length > prevCount.current && prevCount.current !== 0) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    } else if (messages.length > 0 && prevCount.current === 0) {
      // first load stays at top (user request)
    }
    prevCount.current = messages.length;
  }, [messages]);

  const fetchChatList = async () => {
    if (!patientIdStored) return;
    setListLoading(true);
    try {
      // coba chat threads
      let res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/patient/${patientIdStored}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : (data.data || []);
        if (arr.length > 0) {
          setChatList(arr);
          if (!selectedChatId) setSelectedChatId(arr[0].id || arr[0].chat_id || arr[0].session_id);
          setListLoading(false);
          return;
        }
      }
      // fallback ke session history lama
      res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/patients/${patientIdStored}/sessions`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        // map sessions to chatList shape
        setChatList(arr.map(s => ({ id: s.id, patient_id: patientIdStored, last_message: (s.summary || 'Sesi Konsultasi').slice(0,60), updated_at: s.started_at || s.created_at, _session: s })));
        if (arr.length > 0 && !selectedChatId) setSelectedChatId(arr[0].id);
      }
    } catch {}
    setListLoading(false);
  };

  const loadMessages = async (cid) => {
    if (!cid) return;
    setLoading(true);
    setSelectedSoap('');
    try {
      // coba load dari chat history
      let res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/history/${cid}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setMessages(data);
          setLoading(false);
          return;
        }
      }
      // fallback: load dari session logs (jika cid adalah session id lama)
      res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${cid}/logs`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const logs = await res.json();
        const mapped = (Array.isArray(logs) ? logs : []).map(l => ({ id: l.id || Math.random().toString(36).slice(2), chat_id: cid, role: l.role, content: l.text || l.content, created_at: l.timestamp || l.created_at }));
        setMessages(mapped);
        // coba ambil SOAP jika ada
        try {
          const sres = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/sessions/${cid}`, { headers: { Authorization: `Bearer ${token}` } });
          if (sres.ok) {
            const sess = await sres.json();
            if (sess.soap_note || sess.summary) setSelectedSoap(sess.soap_note || sess.summary);
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

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChatId) return;
    setSending(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chat_id: selectedChatId, role: 'doctor', content: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        setNewMessage('');
        fetchChatList();
      } else {
        const fallback = { id: Date.now().toString(), chat_id: selectedChatId, role: 'doctor', content: newMessage.trim(), created_at: new Date().toISOString() };
        setMessages((prev) => [...prev, fallback]);
        setNewMessage('');
        showToast('Chat disimpan lokal (backend belum sinkron)', 'info');
      }
    } catch {
      showToast('Koneksi gagal', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (setView) setView('doctor');
    else window.history.back();
  };

  const filteredMessages = searchQuery ? messages.filter(m => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase())) : messages;

  return (
    <div className="mx-auto w-full max-w-6xl flex flex-col gap-4 py-4 px-4 md:px-6 animate-slide-up">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-4 flex items-center justify-between border border-white/60 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleClose} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all" title="Kembali">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wide flex items-center gap-1.5"><Inbox size={13} /> Riwayat Chat — Outlook</span>
            <h2 className="text-sm font-black text-slate-900 truncate">{patientName} <span className="font-mono text-[10px] text-slate-400">· {patientIdStored ? patientIdStored.slice(0,8) : ''}</span></h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari pesan..." className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 w-40" />
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700" title="Tutup"><X size={16} /></button>
        </div>
      </div>

      {toast && <div className={`rounded-xl px-4 py-2 text-xs font-bold border ${toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>{toast.msg}</div>}

      {/* Outlook split: left inbox list, right reader */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Left: Daftar Sesi / Inbox */}
        <div className="md:col-span-4 flex flex-col gap-3">
          <div className="glass-panel rounded-3xl p-4 border border-white/60 shadow-sm flex flex-col min-h-[500px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
              <span className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-1.5"><History size={13} className="text-indigo-600" /> Daftar Sesi</span>
              <span className="text-[10px] font-bold text-slate-400">Total: {chatList.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1" style={{ maxHeight: '60vh' }}>
              {listLoading ? <div className="py-8 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
              : chatList.length === 0 ? <div className="py-10 text-center text-xs font-semibold text-slate-400">Belum ada sesi tersimpan.<br/><span className="text-[11px]">Gunakan tombol "Simpan Chat" di Konsultasi Aktif.</span></div>
              : chatList.map((c) => {
                const isActive = selectedChatId === c.id;
                const title = c.last_message || c.summary || `Sesi ${String(c.id).slice(0,8)}`;
                const dateStr = c.updated_at || c.started_at || c.created_at || '';
                return (
                  <button key={c.id} onClick={() => { setSelectedChatId(c.id); localStorage.setItem('medsign_chat_id', c.id); }} className={`w-full text-left rounded-2xl p-3 border transition-all ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'}`}>
                    <div className={`text-[9px] font-black uppercase tracking-wider ${isActive ? 'text-indigo-200' : 'text-slate-400'}`}>{dateStr ? new Date(dateStr).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'}) : '—'}</div>
                    <div className="text-xs font-bold leading-snug truncate mt-1">{title}</div>
                    <div className={`text-[10px] truncate mt-0.5 ${isActive ? 'text-indigo-100' : 'text-slate-400'}`}>{c.patient_id ? `ID: ${String(c.patient_id).slice(0,8)}` : ''}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Reader - Log Sesi Percakapan */}
        <div className="md:col-span-8 flex flex-col gap-4">
          <div className="glass-panel rounded-3xl border border-white/60 shadow-sm flex flex-col overflow-hidden" style={{ height: '60vh', minHeight: 420 }}>
            <div className="p-3 border-b border-slate-100 bg-white flex items-center justify-between">
              <span className="text-[11px] font-black uppercase text-slate-600 flex items-center gap-1.5"><FileText size={13} className="text-indigo-600" /> Log Sesi Percakapan</span>
              <span className="text-[10px] font-semibold text-slate-400">{filteredMessages.length} pesan · ID: {selectedChatId ? String(selectedChatId).slice(0,12) : '-'}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/40 to-white">
              {loading ? (
                <div className="py-10 flex flex-col items-center gap-2 text-slate-400"><Loader2 size={18} className="animate-spin" /><span className="text-xs font-semibold">Memuat...</span></div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-10 text-center">
                  <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-semibold text-slate-500">Pilih sesi di kiri untuk melihat log.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Atau mulai konsultasi baru — klik "Simpan Chat" agar masuk history.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isDoctor = msg.role === 'doctor';
                  return (
                    <div key={msg.id} className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm border text-xs leading-relaxed ${isDoctor ? 'bg-emerald-50 border-emerald-200 text-slate-800 rounded-br-sm' : 'bg-sky-50 border-sky-200 text-slate-800 rounded-bl-sm'}`}>
                        <div className={`text-[9px] font-black uppercase mb-1 ${isDoctor ? 'text-emerald-700' : 'text-sky-700'}`}>{isDoctor ? 'Dokter' : 'Pasien'}</div>
                        <p className="whitespace-pre-wrap break-words font-semibold">{msg.content}</p>
                        <div className="text-[9px] mt-1 text-right text-slate-400">{msg.created_at ? new Date(msg.created_at).toLocaleString('id-ID', { hour:'2-digit', minute:'2-digit', day:'2-digit', month:'short'}) : ''}</div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
            {/* SOAP optional show */}
            {selectedSoap && (
              <div className="p-3 border-t border-slate-100 bg-slate-50">
                <div className="text-[9px] font-black uppercase text-slate-500 mb-1 flex items-center gap-1"><FileText size={11} /> SOAP Note (opsional)</div>
                <div className="text-[11px] font-semibold text-slate-700 whitespace-pre-wrap bg-white rounded-xl p-3 border border-slate-200 max-h-32 overflow-y-auto">{selectedSoap}</div>
              </div>
            )}
            <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
              <input type="text" placeholder={selectedChatId ? 'Ketik pesan...' : 'Pilih sesi dulu'} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} maxLength={500} disabled={sending || !selectedChatId} className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 disabled:opacity-50" autoComplete="off" />
              <button type="submit" disabled={sending || !newMessage.trim() || !selectedChatId} className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 shrink-0" title="Kirim">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
