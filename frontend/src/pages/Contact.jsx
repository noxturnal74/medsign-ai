import React, { useState } from 'react';
import { Mail, Phone, MapPin, Send, Globe } from 'lucide-react';

export const Contact = ({ setView }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const subject = `Kontak MedSign AI - ${name}`;
    const body = `Nama: ${name}\nEmail: ${email}\n\nPesan:\n${message}`;
    const mailtoUrl = `mailto:aimedsign@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up text-slate-800">
      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Hubungi Kami</span>
          <h2 className="text-3xl font-black text-slate-950 mt-1">Informasi Kontak</h2>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-650">
            Kami siap berkolaborasi untuk meningkatkan inklusivitas layanan rumah sakit di Indonesia.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 mt-4">
          <div className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Mail size={16} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">Email</span>
                <a 
                  href="mailto:aimedsign@gmail.com" 
                  className="text-xs font-bold text-slate-700 hover:text-sky-600 transition-colors"
                >
                  aimedsign@gmail.com
                </a>
              </div>
            </div>

            {/* Telepon / WA */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Phone size={16} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">Telepon</span>
                <a 
                  href="https://wa.me/6289506753131" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-bold text-slate-700 hover:text-emerald-600 transition-colors"
                >
                  089506753131
                </a>
              </div>
            </div>

            {/* Website */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <Globe size={16} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">Website</span>
                <a 
                  href="https://medsign-ai.vercel.app/" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-bold text-slate-700 hover:text-sky-600 transition-colors"
                >
                  medsign-ai.vercel.app
                </a>
              </div>
            </div>

            {/* Alamat */}
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center">
                <MapPin size={16} />
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-400">Alamat</span>
                <span className="text-xs font-bold text-slate-700">Universitas Ma Chung, Malang, Jawa Timur</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input 
              type="text" 
              required 
              placeholder="Nama Lengkap" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs font-black shadow-inner" 
            />
            <input 
              type="email" 
              required 
              placeholder="Email Anda" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass-input rounded-xl px-3 py-2 text-xs font-black shadow-inner" 
            />
            <textarea 
              required 
              rows={4} 
              placeholder="Pesan Anda..." 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="glass-input rounded-2xl px-3 py-2 text-xs font-semibold shadow-inner resize-none leading-relaxed" 
            />
            <button type="submit" className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all shadow-md">
              <Send size={12} /> Kirim Pesan
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};