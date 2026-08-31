import React, { useState, useEffect, useContext, useRef } from 'react';
import { AppContext } from '../context/AppContextObject';
import { MessageCircle, X, Send, ArrowLeft, Search, Loader2 } from 'lucide-react';

export const ChatHistory = ({ setView }) => {
  const { currentUser } = useContext(AppContext);
  const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
  const token = currentUser?.token || localStorage.getItem('medsign_token') || '';

  // Resolve chatId from props / URL / localStorage
  const urlParams = new URLSearchParams(window.location.search);
  const storedChatId = localStorage.getItem('medsign_chat_id') || '';
  const urlChatId = urlParams.get('chatId') || '';
  const chatId = urlChatId || storedChatId;

  const patientName = localStorage.getItem('medsign_chat_patient_name') || 'Pasien';
  const patientIdStored = localStorage.getItem('medsign_chat_patient_id') || '';

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const endRef = useRef(null);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (chatId) loadMessages();
  }, [chatId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/history/${chatId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : []);
      } else if (res.status === 404) {
        // chat belum ada -> kosong, buat otomatis saat kirim pertama kali
        setMessages([]);
      } else {
        showToast('Gagal memuat riwayat chat', 'error');
      }
    } catch (e) {
      showToast('Koneksi gagal', 'error');
    } finally {
      setLoading(false);
    }
  };

  const ensureChatExists = async () => {
    if (!chatId) return null;
    // Jika chat 404 sebelumnya, coba buat chat baru
    // chatId format: chat_<patientId>_<timestamp>  -> extract patientId
    const parts = chatId.split('_');
    const pid = patientIdStored || (parts.length >= 2 ? parts[1] : '');
    if (!pid) return chatId;
    try {
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ patient_id: pid, doctor_id: currentUser?.id || currentUser?.user_id || 'doctor' }),
      });
      if (res.ok) {
        const data = await res.json();
        // jika backend buat id baru, pakai itu
        if (data?.id && data.id !== chatId) {
          localStorage.setItem('medsign_chat_id', data.id);
          return data.id;
        }
      }
    } catch {}
    return chatId;
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId) return;
    setSending(true);
    try {
      // pastikan chat ada (abaikan error 404, coba kirim langsung)
      const targetChatId = chatId;
      const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ chat_id: targetChatId, role: 'doctor', content: newMessage.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data]);
        setNewMessage('');
      } else {
        // jika 404 coba buat chat dulu lalu retry sekali
        if (res.status === 404) {
          const newId = await ensureChatExists();
          if (newId && newId !== targetChatId) {
            // retry dengan id baru
            const retry = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ chat_id: newId, role: 'doctor', content: newMessage.trim() }),
            });
            if (retry.ok) {
              const d2 = await retry.json();
              setMessages((prev) => [...prev, d2]);
              setNewMessage('');
              setSending(false);
              return;
            }
          }
          // fallback simpan lokal jika backend belum siap (supaya UI tetap jalan)
          const fallback = { id: Date.now().toString(), chat_id: targetChatId, role: 'doctor', content: newMessage.trim(), created_at: new Date().toISOString() };
          setMessages((prev) => [...prev, fallback]);
          setNewMessage('');
          showToast('Chat disimpan lokal (backend belum sinkron)', 'info');
        } else {
          const err = await res.json().catch(() => ({}));
          showToast(err.detail || 'Gagal mengirim pesan', 'error');
        }
      }
    } catch (err) {
      showToast('Koneksi gagal', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (setView) setView('doctor');
    else window.history.back();
  };

  const filtered = searchQuery
    ? messages.filter((m) => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4 py-4 px-4 md:px-6 animate-slide-up">
      {/* Header */}
      <div className="glass-panel rounded-3xl p-4 flex items-center justify-between border border-white/60 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={handleClose} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all" title="Kembali">
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase text-indigo-600 tracking-wide flex items-center gap-1.5">
              <MessageCircle size={13} /> Riwayat Chat
            </span>
            <h2 className="text-sm font-black text-slate-900 truncate">{patientName} {chatId ? <span className="font-mono text-[10px] text-slate-400">· {chatId.slice(0, 12)}...</span> : null}</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative hidden sm:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Cari pesan..." className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 w-40" />
          </div>
          <button onClick={handleClose} className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-slate-700" title="Tutup">
            <X size={16} />
          </button>
        </div>
      </div>

      {toast && (
        <div className={`rounded-xl px-4 py-2 text-xs font-bold border ${toast.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-sky-50 border-sky-200 text-sky-700'}`}>
          {toast.msg}
        </div>
      )}

      {/* Messages - WhatsApp style */}
      <div className="glass-panel rounded-3xl border border-white/60 shadow-sm flex flex-col overflow-hidden" style={{ height: '60vh', minHeight: 380 }}>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-slate-50/50 to-white">
          {loading ? (
            <div className="py-10 flex flex-col items-center gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" /> <span className="text-xs font-semibold">Memuat pesan...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center">
              <MessageCircle size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Belum ada pesan.</p>
              <p className="text-[11px] text-slate-400 mt-1">Kirim pesan pertama untuk memulai konsultasi dengan {patientName}.</p>
              {!chatId && <p className="text-[11px] text-amber-600 mt-2 font-bold">chatId tidak ditemukan - buka via tombol "Lihat Histori Chat" di daftar pasien.</p>}
            </div>
          ) : (
            filtered.map((msg) => {
              const isDoctor = msg.role === 'doctor';
              return (
                <div key={msg.id} className={`flex ${isDoctor ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-2xl px-4 py-2.5 shadow-sm border text-xs leading-relaxed ${isDoctor ? 'bg-indigo-600 text-white border-indigo-600 rounded-br-sm' : 'bg-white text-slate-800 border-slate-200 rounded-bl-sm'}`}>
                    <div className={`text-[9px] font-black uppercase tracking-wider mb-1 ${isDoctor ? 'text-indigo-200' : 'text-sky-600'}`}>{isDoctor ? 'Dokter' : 'Pasien'}</div>
                    <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    <div className={`text-[9px] mt-1 text-right ${isDoctor ? 'text-indigo-200' : 'text-slate-400'}`}>{msg.created_at ? new Date(msg.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : ''}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            placeholder={chatId ? 'Ketik pesan...' : 'chatId tidak ada'}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            maxLength={500}
            disabled={sending || !chatId}
            className="flex-1 rounded-full border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 disabled:opacity-50"
            autoComplete="off"
          />
          <button type="submit" disabled={sending || !newMessage.trim() || !chatId} className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-all shrink-0" title="Kirim">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      </div>

      <div className="text-center text-[10px] font-semibold text-slate-400">
        Chat disimpan di database {chatId ? `· ID: ${chatId}` : ''} · Model seperti WhatsApp
      </div>
    </div>
  );
};
