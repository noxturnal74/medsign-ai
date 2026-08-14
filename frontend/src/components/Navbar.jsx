import React, { useContext, useState, useEffect } from 'react';
import { AppContext } from '../context/AppContextObject';
import {
  Home, Info, Stethoscope, User, Volume2, VolumeX,
  Database, BookOpen, Video, FileText, MessageSquare,
  Menu as MenuIcon, X, ExternalLink,
} from 'lucide-react';

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
];

export const Navbar = ({ currentView, setView }) => {
  const { ttsEnabled, setTtsEnabled, t, setShowFeatureModal, currentUser, logout } =
    useContext(AppContext);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

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

  const filteredNavItems = navItems.filter(item => {
    if (currentUser?.role === 'admin')
      return ['home','about','manual','services','articles_page','data-collection','motion','patient','doctor','contact'].includes(item.id);
    if (currentUser?.role === 'doctor')
      return ['home','about','manual','services','articles_page','patient','doctor','contact'].includes(item.id);
    if (currentUser?.role === 'patient')
      return ['home','about','manual','services','articles_page','patient','contact'].includes(item.id);
    // Guest or other roles
    return ['home','about','manual','services','articles_page','patient','doctor','contact'].includes(item.id);
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
            flex: 1, justifyContent: 'center',
            maxWidth: 700, margin: '0 auto',
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
        @media (min-width: 1024px) {
          .desktop-nav { display: flex !important; }
          .hide-mobile { display: inline-flex !important; }
          .show-mobile { display: none !important; }
          .nav-label   { display: inline !important; }
        }
      `}</style>
    </>
  );
};
