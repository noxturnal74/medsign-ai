import React, { useContext, useState, useEffect, useRef } from 'react';
import { AppContext } from '../context/AppContextObject';
import {
  Home, Info, Stethoscope, User, Volume2, VolumeX,
  Database, BookOpen, Video, FileText, MessageSquare,
  Menu as MenuIcon, X, ExternalLink, Shield, Columns,
  MoreVertical, UserCog, Moon, Sun, Loader2, Camera, KeyRound, Check,
} from 'lucide-react';

const API_BASE = () => (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const menuItemStyle = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '9px 10px', borderRadius: 12, border: 'none',
  background: 'transparent', color: '#334155', fontWeight: 700, fontSize: 11.5,
  cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
};

const navItems = [
  { id: 'home',          label: 'Beranda',           icon: Home },
  { id: 'about',         label: 'Tentang',           icon: Info },
  { id: 'manual',        label: 'Panduan',           icon: BookOpen },
  { id: 'services',      label: 'Layanan',            icon: Stethoscope },
  { id: 'articles_page', label: 'Artikel',            icon: FileText },
  { id: 'contact',       label: 'Kontak',             icon: MessageSquare },
  { id: 'patient',       label: 'Pasien',             icon: User },
  { id: 'doctor',        label: 'Dokter',             icon: Stethoscope },
  { id: 'data-collection', label: 'Dashboard',        icon: Database },
  { id: 'motion',        label: 'Motion',             icon: Video },
  { id: 'super_admin',   label: 'Super Admin',        icon: Shield },
  { id: 'split',         label: 'Split View',         icon: Columns },
];

export const Navbar = ({ currentView, setView }) => {
  const { ttsEnabled, setTtsEnabled, t, setShowFeatureModal, currentUser, logout, hasGrant } =
    useContext(AppContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);
  const [splitEnabled, setSplitEnabled] = useState(false);

  // ── Menu titik-3 (akun) + dark mode ──
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('medsign_dark') === '1');
  const [accountModal, setAccountModal] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('medsign_dark', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    const onClickAway = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  const openMyProfile = () => {
    setMenuOpen(false);
    if (currentUser?.role === 'doctor') {
      window.dispatchEvent(new CustomEvent('medsign:open-profile'));
    } else {
      setAccountModal(true);
    }
  };

  useEffect(() => {
    const fetchLayout = async () => {
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const cleanUrl = apiBaseUrl.replace(/\/$/, '');
        const res = await fetch(`${cleanUrl}/api/v1/homepage/layout`);
        if (res.ok) {
          const data = await res.json();
          setSplitEnabled(data.split_screen_enabled === "1");
        }
      } catch (e) {}
    };
    fetchLayout();
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (currentView === 'home') {
        const heading = document.getElementById('pilih-modul-heading');
        if (heading) {
          const rect = heading.getBoundingClientRect();
          // Navbar height is around 60px; make opaque when heading reaches the top
          setScrolled(rect.top <= 64);
        } else {
          setScrolled(window.scrollY > 8);
        }
      } else {
        // Always opaque on non-home pages
        setScrolled(true);
      }
    };
    
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [currentView]);

  useEffect(() => { setMobileOpen(false); }, [currentView]);

  const mlGrantKeys = ['record_dataset', 'balance_checker', 'ai_augmentation', 'train_model'];
  const hasMlAccess = currentUser?.role === 'super_admin' || mlGrantKeys.some(k => hasGrant(k));

  const filteredNavItems = navItems.filter(item => {
    if (currentUser?.role === 'super_admin') {
      const base = ['home', 'about', 'manual', 'super_admin'];
      if (splitEnabled) base.push('split');
      return base.includes(item.id);
    }
    if (currentUser?.role === 'admin')
      return ['home','about','manual','services','articles_page','data-collection','motion','patient','doctor','contact'].includes(item.id);
    if (currentUser?.role === 'doctor') {
      const base = ['home','about','manual','services','articles_page','patient','doctor','contact', ...(hasMlAccess ? ['data-collection'] : [])];
      if (splitEnabled) base.push('split');
      return base.includes(item.id);
    }
    if (currentUser?.role === 'patient')
      return ['home','about','manual','services','articles_page','patient','contact'].includes(item.id);
    // Guest or other roles
    const base = ['home','about','manual','services','articles_page','patient','doctor','contact'];
    if (splitEnabled) base.push('split');
    return base.includes(item.id);
  });

  return (
    <>
      <nav style={{
        position: 'fixed',
        top: 0,
        zIndex: 100,
        width: '100%',
        padding: '10px 16px',
        background: scrolled
          ? 'rgba(255,255,255,0.96)'
          : 'rgba(255,255,255,0.88)',
        borderBottom: `1px solid ${scrolled ? 'rgba(15,23,42,0.09)' : 'rgba(15,23,42,0.06)'}`,
        boxShadow: scrolled
          ? '0 4px 24px rgba(15,23,42,0.08)'
          : '0 1px 0 rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        transition: 'background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}>

          {/* ── Brand ── */}
          <button
            onClick={() => setView('home')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              flexShrink: 0,
            }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 36, height: 36, borderRadius: 10, overflow: 'hidden',
              background: 'rgba(255,255,255,0.95)',
              border: '1px solid rgba(14,165,233,0.2)',
              boxShadow: '0 2px 8px rgba(14,165,233,0.12)',
            }}>
              <img
                src="/assets/medsign-mark.png"
                alt="Logo MedSign AI"
                style={{ width: 26, height: 26, objectFit: 'contain' }}
                onError={e => { e.currentTarget.style.display = 'none'; }}
              />
            </span>
            <div className="brand-text">
              <span style={{ display: 'block', fontSize: 14, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                MedSign AI
              </span>
              <span style={{ display: 'block', fontSize: 9, fontWeight: 700, color: '#64748b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                BISINDO Medical
              </span>
            </div>
          </button>

          {/* ── Desktop nav pill ── */}
          <div className="desktop-nav" style={{
            display: 'flex', alignItems: 'center', gap: 2,
            background: scrolled ? 'rgba(15,23,42,0.04)' : 'rgba(255,255,255,0.5)',
            padding: '4px 5px', borderRadius: 14,
            border: scrolled ? '1px solid rgba(15,23,42,0.06)' : '1px solid rgba(255,255,255,0.3)',
            justifyContent: 'center',
            margin: '0 auto',
            backdropFilter: scrolled ? 'none' : 'blur(8px)',
            transition: 'background 0.3s ease, border-color 0.3s ease',
          }}>
            {filteredNavItems.map(item => {
              const Icon  = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setView(item.id)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 11px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontSize: 11.5,
                    fontWeight: active ? 700 : 600,
                    background: active ? 'rgba(14,165,233,0.1)' : 'transparent',
                    color: active ? '#0284c7' : '#475569',
                    boxShadow: active ? 'inset 0 0 0 1px rgba(14,165,233,0.22)' : 'none',
                    transition: 'background 0.15s, color 0.15s',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(15,23,42,0.05)';
                      e.currentTarget.style.color = '#0f172a';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = '#475569';
                    }
                  }}
                >
                  <Icon size={13} strokeWidth={1.8} />
                  <span className="nav-label">
                    {item.id === 'data-collection' ? 'Dashboard' : t(item.id) || item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Right controls ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

            {/* TTS toggle */}
            <button
              onClick={() => setTtsEnabled(!ttsEnabled)}
              title={ttsEnabled ? 'Matikan suara' : 'Aktifkan suara'}
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                border: `1px solid ${ttsEnabled ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}`,
                background: ttsEnabled ? 'rgba(16,185,129,0.07)' : 'rgba(239,68,68,0.06)',
                color: ttsEnabled ? '#059669' : '#dc2626',
                transition: 'all 0.2s',
              }}
            >
              {ttsEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            </button>

            {/* Layout modal */}
            <button
              onClick={() => setShowFeatureModal(true)}
              title="Pilih tampilan"
              className="hide-mobile"
              style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                padding: '7px 10px', borderRadius: 10, cursor: 'pointer',
                border: '1px solid rgba(15,23,42,0.1)',
                background: 'rgba(15,23,42,0.04)',
                color: '#64748b',
                transition: 'all 0.2s',
              }}
            >
              <ExternalLink size={14} />
            </button>

            {/* Auth CTA */}
            {!currentUser ? (
              <button
                onClick={() => setView('login')}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#0ea5e9,#0d9488)',
                  color: '#fff', fontWeight: 800, fontSize: 11,
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(14,165,233,0.35)',
                  transition: 'box-shadow 0.2s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(14,165,233,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 14px rgba(14,165,233,0.35)'; e.currentTarget.style.transform = ''; }}
              >
                <User size={14} />
                <span className="hide-mobile">Masuk</span>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#64748b',
                  background: 'rgba(15,23,42,0.05)',
                  padding: '4px 9px', borderRadius: 8,
                  border: '1px solid rgba(15,23,42,0.08)',
                }} className="hide-mobile">
                  {currentUser.role?.toUpperCase()}
                </span>

                {/* Titik-3: Profil / Setting / Preferensi / Dark mode */}
                {['admin', 'doctor', 'super_admin'].includes(currentUser.role) && (
                  <div ref={menuRef} style={{ position: 'relative' }}>
                    <button
                      onClick={() => setMenuOpen(v => !v)}
                      title="Menu akun"
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        padding: '7px 8px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${menuOpen ? 'rgba(14,165,233,0.35)' : 'rgba(15,23,42,0.1)'}`,
                        background: menuOpen ? 'rgba(14,165,233,0.08)' : 'rgba(15,23,42,0.04)',
                        color: menuOpen ? '#0284c7' : '#64748b',
                        transition: 'all 0.2s',
                      }}
                    >
                      <MoreVertical size={15} />
                    </button>

                    {menuOpen && (
                      <div
                        style={{
                          position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 200,
                          width: 240, background: '#fff', borderRadius: 18,
                          border: '1px solid rgba(15,23,42,0.08)',
                          boxShadow: '0 18px 50px rgba(15,23,42,0.18)',
                          overflow: 'hidden', padding: 6,
                        }}
                      >
                        <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid rgba(15,23,42,0.06)' }}>
                          <span style={{ display: 'block', fontSize: 11, fontWeight: 800, color: '#0f172a', wordBreak: 'break-all' }}>
                            {currentUser.emailOrNik || currentUser.role}
                          </span>
                          <span style={{ display: 'inline-block', marginTop: 5, fontSize: 8, fontWeight: 800, letterSpacing: '0.08em', color: '#0369a1', background: 'rgba(14,165,233,0.1)', padding: '3px 7px', borderRadius: 99, textTransform: 'uppercase' }}>
                            {currentUser.role}
                          </span>
                        </div>

                        <button
                          onClick={openMyProfile}
                          style={menuItemStyle}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <UserCog size={14} /> Profil Saya
                        </button>

                        <button
                          onClick={() => { setMenuOpen(false); setShowFeatureModal(true); }}
                          style={menuItemStyle}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(15,23,42,0.05)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <ExternalLink size={14} /> Pengaturan Tampilan
                        </button>

                        <div
                          style={{ ...menuItemStyle, cursor: 'default', justifyContent: 'space-between' }}
                        >
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                            {darkMode ? <Moon size={14} /> : <Sun size={14} />} Mode Gelap
                          </span>
                          <button
                            onClick={() => setDarkMode(v => !v)}
                            aria-label="Toggle dark mode"
                            style={{
                              width: 36, height: 20, borderRadius: 99, border: 'none', cursor: 'pointer',
                              background: darkMode ? '#0284c7' : '#cbd5e1',
                              position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                            }}
                          >
                            <span style={{
                              position: 'absolute', top: 2, left: darkMode ? 18 : 2,
                              width: 16, height: 16, borderRadius: 99, background: '#fff',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.25)', transition: 'left 0.2s',
                            }} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => { logout(); setView('home'); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '7px 12px', borderRadius: 10,
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.05)',
                    color: '#dc2626', fontWeight: 700, fontSize: 11,
                    cursor: 'pointer', transition: 'all 0.2s',
                  }}
                >
                  <X size={13} />
                  <span className="hide-mobile">Keluar</span>
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="show-mobile"
              aria-label="Toggle menu"
              style={{
                display: 'none', alignItems: 'center', justifyContent: 'center',
                padding: '7px 10px', borderRadius: 10,
                border: '1px solid rgba(15,23,42,0.1)',
                background: 'rgba(15,23,42,0.04)',
                color: '#334155', cursor: 'pointer',
              }}
            >
              {mobileOpen ? <X size={16} /> : <MenuIcon size={16} />}
            </button>
          </div>
        </div>
      </nav>

      {/* ── Mobile dropdown ── */}
      {mobileOpen && (
        <>
          <div
            className="mobile-menu-overlay"
            style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(15,23,42,0.2)', backdropFilter: 'blur(3px)' }}
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="mobile-menu-dropdown"
            style={{
            position: 'fixed', top: 64, left: 12, right: 12,
            zIndex: 95, borderRadius: 20, overflow: 'hidden',
            background: 'rgba(255,255,255,0.98)',
            backdropFilter: 'blur(24px)',
            border: '1px solid rgba(15,23,42,0.08)',
            boxShadow: '0 20px 60px rgba(15,23,42,0.16)',
            padding: '8px',
          }}>
            {filteredNavItems.map(item => {
              const Icon   = item.icon;
              const active = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => { setView(item.id); setMobileOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '11px 14px', borderRadius: 12,
                    border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                    background: active ? 'rgba(14,165,233,0.09)' : 'transparent',
                    color: active ? '#0284c7' : '#334155',
                    textAlign: 'left', transition: 'background 0.15s',
                  }}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {item.id === 'data-collection' ? 'Dashboard' : t(item.id) || item.label}
                </button>
              );
            })}

            <hr style={{ margin: '6px 4px', border: 'none', borderTop: '1px solid rgba(15,23,42,0.06)' }} />

            <div style={{ display: 'flex', gap: 6, padding: '4px 4px 2px' }}>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '9px', borderRadius: 12, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid rgba(15,23,42,0.08)',
                  background: 'rgba(15,23,42,0.03)',
                  color: ttsEnabled ? '#059669' : '#dc2626',
                }}
              >
                {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                {ttsEnabled ? 'Suara Aktif' : 'Suara Mati'}
              </button>
              {!currentUser ? (
                <button
                  onClick={() => { setView('login'); setMobileOpen(false); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px', borderRadius: 12, border: 'none',
                    background: 'linear-gradient(135deg,#0ea5e9,#0d9488)',
                    color: '#fff', fontSize: 11, fontWeight: 800, cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(14,165,233,0.3)',
                  }}
                >
                  <User size={14} /> Masuk
                </button>
              ) : (
                <button
                  onClick={() => { logout(); setView('home'); setMobileOpen(false); }}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    padding: '9px', borderRadius: 12,
                    border: '1px solid rgba(239,68,68,0.2)',
                    background: 'rgba(239,68,68,0.05)',
                    color: '#dc2626', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                  }}
                >
                  <X size={14} /> Keluar
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── Modal Profil Admin/Super Admin ── */}
      {accountModal && (
        <AccountModal
          currentUser={currentUser}
          onClose={() => setAccountModal(false)}
        />
      )}

      {/* ── Responsive CSS ── */}
      <style>{`
        .desktop-nav  { display: none !important; }
        .hide-mobile  { display: none !important; }
        .show-mobile  { display: inline-flex !important; }
        .brand-text   { display: none; }
        .nav-label    { display: none; }

        @media (min-width: 640px) {
          .brand-text { display: block; }
        }
        @media (min-width: 1340px) {
          .desktop-nav { display: flex !important; }
          .hide-mobile { display: inline-flex !important; }
          .show-mobile { display: none !important; }
          .nav-label   { display: inline !important; }
        }
      `}      </style>
    </>
  );
};

/* ── Modal Profil Admin / Super Admin ── */
const AccountModal = ({ currentUser, onClose }) => {
  const [data, setData] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', profile_photo: '' });
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchMe = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE()}/api/v1/admin/me`, {
          headers: { Authorization: `Bearer ${currentUser?.token}` }
        });
        if (res.ok) {
          const d = await res.json();
          setData(d);
          setForm({ name: d.name || '', phone: d.phone || '', profile_photo: d.profile_photo || '' });
        }
      } catch (e) {}
      setLoading(false);
    };
    fetchMe();
  }, []);

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setForm(p => ({ ...p, profile_photo: reader.result }));
    reader.readAsDataURL(file);
  };

  const save = async () => {
    if (password && password !== confirm) return;
    setSaving(true);
    try {
      const body = { ...form };
      if (password) body.password = password;
      const res = await fetch(`${API_BASE()}/api/v1/admin/me`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${currentUser?.token}` },
        body: JSON.stringify(body)
      });
      if (res.ok) onClose();
    } catch (e) {}
    setSaving(false);
  };

  const inputCls = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 disabled:bg-slate-50 disabled:text-slate-400';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-[28px] shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-6 flex flex-col gap-4 text-slate-800 animate-scale-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide">Profil Saya</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="py-10 text-center text-xs text-slate-400"><Loader2 size={20} className="animate-spin mx-auto mb-2" />Memuat profil…</div>
        ) : !data ? (
          <div className="py-10 text-center text-xs font-semibold text-slate-400">
            Gagal memuat profil — restart server backend lalu coba lagi.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <label className="relative group cursor-pointer shrink-0" title="Upload foto">
                {form.profile_photo ? (
                  <img src={form.profile_photo} alt="" className="h-16 w-16 rounded-2xl object-cover border-2 border-sky-500/30 bg-white" />
                ) : (
                  <div className="h-16 w-16 rounded-2xl bg-sky-500/10 border border-sky-200/50 flex items-center justify-center text-sky-600"><Shield size={26} /></div>
                )}
                <span className="absolute inset-0 rounded-2xl bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center text-white">
                  <Camera size={16} />
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{form.name || data.username || '—'}</p>
                <p className="text-[11px] font-semibold text-slate-500 truncate">{data.email}</p>
                {data.facility_name && (
                  <span className="inline-block mt-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 border border-sky-200/50">
                    {data.facility_name}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Nama Lengkap</label>
              <input autoComplete="off" className={inputCls} value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">No. Telepon</label>
              <input autoComplete="off" className={inputCls} value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="08xxxxxxxxxx" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">Password Baru</label>
                <input type="password" autoComplete="new-password" className={inputCls} value={password} onChange={e => setPassword(e.target.value)} placeholder="Opsional" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-bold uppercase text-slate-400">Konfirmasi</label>
                <input type="password" autoComplete="new-password" className={inputCls} value={confirm} onChange={e => setConfirm(e.target.value)} />
              </div>
            </div>
            {password && password !== confirm && (
              <p className="text-[10px] font-bold text-rose-600">Konfirmasi password tidak cocok.</p>
            )}

            <button
              onClick={save}
              disabled={saving || (password && password !== confirm)}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-wider text-white bg-[#053D67] hover:opacity-90 active:scale-95 transition-all shadow-md disabled:opacity-40"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Simpan Perubahan
            </button>
          </>
        )}
      </div>
    </div>
  );
};
