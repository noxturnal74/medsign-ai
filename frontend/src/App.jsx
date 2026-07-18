import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PatientView } from './pages/PatientView';
import { DoctorView } from './pages/DoctorView';
import { About } from './pages/About';
import { DataCollection } from './pages/DataCollection';
import { UserManual } from './pages/UserManual';

function AppContent() {
  const getInitialView = () => {
    const path = window.location.pathname;
    if (path === '/data-collection' || path.startsWith('/data-collection/')) {
      return 'data-collection';
    }
    return 'home';
  };

  const [view, setView] = useState(getInitialView);

  // Sync state view with URL
  const handleSetView = (newView) => {
    setView(newView);
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
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [view]);

  return (
    <Layout currentView={view} setView={handleSetView}>
      {view === 'home' && <Home setView={handleSetView} />}
      {view === 'patient' && <PatientView setView={handleSetView} />}
      {view === 'doctor' && <DoctorView setView={handleSetView} />}
      {view === 'about' && <About setView={handleSetView} />}
      {view === 'data-collection' && <DataCollection setView={handleSetView} />}
      {view === 'manual' && <UserManual setView={handleSetView} />}
    </Layout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}