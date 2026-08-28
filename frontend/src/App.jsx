import { Services } from './pages/Services';
import { Contact } from './pages/Contact';
import { ArticlesPage } from './pages/ArticlesPage';
import { ReviewsPage } from './pages/ReviewsPage';
import React, { useEffect, useState, useContext } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
import { AppProvider } from './context/AppContext';
import { AppContext } from './context/AppContextObject';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PatientView } from './pages/PatientView';
import { DoctorView } from './pages/DoctorView';
import { SuperAdminView } from './pages/SuperAdminView';
import { About } from './pages/About';
import { DataCollection } from './pages/DataCollection';
import { UserManual } from './pages/UserManual';
import { MotionVisualizer } from './pages/MotionVisualizer';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { currentUser, hasGrant } = useContext(AppContext);
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/login') {
      return 'login';
    }
    if (path === '/data-collection' || path.startsWith('/data-collection/')) {
      return 'data-collection';
    }
    if (path === '/motion') {
      return 'motion';
    }
    if (path === '/patient' || path === '/translate') {
      return 'patient';
    }
    if (path === '/doctor' || path === '/consultation') {
      return 'doctor';
    }
    if (path === '/super_admin' || path === '/superadmin') {
      return 'super_admin';
    }
    if (path === '/split') {
      return 'split';
    }
    if (path === '/history' || path === '/settings') {
      return 'data-collection';
    }
    if (path === '/services') {
      return 'services';
    }
    if (path === '/contact') {
      return 'contact';
    }
    if (path === '/articles_page') {
      return 'articles_page';
    }
    if (path === '/reviews_page' || path === '/reviews') {
      return 'reviews_page';
    }
    if (path === '/about') {
      return 'about';
    }
    if (path === '/manual') {
      return 'manual';
    }
    return 'home';
  };

  const [view, setView] = useState(getInitialView);
  const [loading, setLoading] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Initialize Lenis smooth scrolling
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.09,              // makin kecil = makin butter/halus
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      smoothWheel: true,
      syncTouch: false,        // biarkan native di layar sentuh (lebih responsif)
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    });

    window.lenis = lenis;

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }

    requestAnimationFrame(raf);

    lenis.on('scroll', ScrollTrigger.update);

    return () => {
      lenis.destroy();
      window.lenis = null;
    };
  }, []);

  useEffect(() => {
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
    }, 2800);

    const unmountTimer = setTimeout(() => {
      setLoading(false);
    }, 3400);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(unmountTimer);
    };
  }, []);

  // Sync state view with URL
  const handleSetView = (newView) => {
    // data-collection dan motion butuh login; doctor & patient bisa guest
    if ((newView === 'data-collection' || newView === 'motion') && !currentUser) {
      localStorage.setItem('medsign_redirect_view', newView);
      setView('login');
      window.history.pushState({}, '', '/login');
      return;
    }
    setView(newView);
    // Reset scroll halus ke atas saat pindah halaman
    if (window.lenis) {
      window.lenis.scrollTo(0, { immediate: true });
    } else {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }
    if (newView === 'data-collection') {
      window.history.pushState({}, '', '/data-collection');
    } else {
      window.history.pushState({}, '', newView === 'home' ? '/' : '/' + newView);
    }
  };

  // Sync back button
  useEffect(() => {
    const handlePopState = () => {
      setView(getInitialView());
    };
    const handleExpired = () => {
      handleSetView('login');
    };
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('medsign:logout-expired', handleExpired);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('medsign:logout-expired', handleExpired);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
    const timer = setTimeout(() => {
      if (window.lenis) {
        window.lenis.resize();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [view]);

  if (loading) {
    return (
      <div className={`app-splash-screen fixed inset-0 bg-[#F7F5F0] flex flex-col items-center justify-center text-[#0f172a] z-[99999] select-none p-4 overflow-hidden ${isExiting ? 'animate-screen-exit' : ''}`}>
        {/* Concentric Water Ripples */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
          <div className="absolute w-[200px] h-[200px] rounded-full border border-sky-400/30 opacity-0 animate-ripple" style={{ animationDelay: '0.3s' }} />
          <div className="absolute w-[200px] h-[200px] rounded-full border border-sky-300/20 opacity-0 animate-ripple" style={{ animationDelay: '0.8s' }} />
          <div className="absolute w-[200px] h-[200px] rounded-full border border-violet-400/10 opacity-0 animate-ripple" style={{ animationDelay: '1.3s' }} />
        </div>

        <style>{`
          @keyframes waterRipple {
            0% {
              transform: scale(0.6);
              opacity: 0.8;
              filter: blur(1px);
            }
            100% {
              transform: scale(3.5);
              opacity: 0;
              filter: blur(12px);
            }
          }
          @keyframes dropHit {
            0% {
              transform: scale(0) translateY(-70px);
              opacity: 0;
              filter: blur(4px);
            }
            25% {
              transform: scale(1.08) translateY(0);
              opacity: 1;
              filter: blur(0);
            }
            40% {
              transform: scale(0.97);
            }
            55% {
              transform: scale(1.01);
            }
            85% {
              transform: scale(1);
              opacity: 1;
              filter: blur(0);
            }
            100% {
              opacity: 1;
              transform: scale(1);
              filter: blur(0);
            }
          }
          .animate-ripple {
            animation: waterRipple 2.2s cubic-bezier(0.1, 0.8, 0.25, 1) forwards;
          }
          
          @keyframes screenExit {
            0% { opacity: 1; }
            100% { opacity: 0; }
          }
          .animate-screen-exit {
            animation: screenExit 0.6s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
          .animate-drop-hit {
            animation: dropHit 2.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
          }
        `}</style>

        {/* Unified brand mark container (pulsing zoom-in to zoom-out scale) */}
        <div className="flex flex-col items-center gap-6 max-w-sm w-full text-center relative z-10 animate-drop-hit">
          <img 
            src="/assets/mascot.png" 
            alt="Mascot Logo" 
            className="w-24 h-24 object-contain rounded-full border border-slate-200/60 shadow-md bg-white p-0.5"
          />
          <div>
            <h1 className="font-black text-3xl md:text-4xl tracking-widest text-slate-900">
              MEDSIGN AI
            </h1>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.25em] mt-2.5">
              Penerjemah Bahasa Isyarat Medis
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout currentView={view} setView={handleSetView}>
      {view === 'home' && <Home setView={handleSetView} />}
      {view === 'login' && <Login setView={handleSetView} />}
      {view === 'patient' && <PatientView setView={handleSetView} />}
      {view === 'doctor' && <DoctorView setView={handleSetView} />}
      {view === 'super_admin' && <SuperAdminView setView={handleSetView} />}
      {view === 'split' && (
        <div className="flex flex-col lg:flex-row w-full min-h-[calc(100vh-57px)] gap-4 p-4 bg-slate-100/50">
          <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-90px)] overflow-y-auto pr-2 scrollbar-thin">
            <PatientView setView={handleSetView} isSplit={true} />
          </div>
          <div className="flex-1 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm overflow-hidden h-[calc(100vh-90px)] overflow-y-auto pr-2 scrollbar-thin">
            <DoctorView setView={handleSetView} isSplit={true} />
          </div>
        </div>
      )}
      {view === 'about' && <About setView={handleSetView} />}
      {view === 'services' && <Services setView={handleSetView} />}
      {view === 'contact' && <Contact setView={handleSetView} />}
      {view === 'articles_page' && <ArticlesPage setView={handleSetView} />}
      {view === 'reviews_page' && <ReviewsPage setView={handleSetView} />}

      {view === 'data-collection' && (() => {
        const allowed = !currentUser || ['super_admin', 'admin'].includes(currentUser.role) || hasGrant('record_dataset') || hasGrant('balance_checker') || hasGrant('ai_augmentation') || hasGrant('train_model');
        return allowed ? <DataCollection setView={handleSetView} /> : <Home setView={handleSetView} />;
      })()}
      {view === 'manual' && <UserManual setView={handleSetView} />}
      {view === 'motion' && <MotionVisualizer setView={handleSetView} />}
    </Layout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}