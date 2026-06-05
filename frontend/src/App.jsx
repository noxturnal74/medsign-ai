import React, { useEffect, useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PatientView } from './pages/PatientView';
import { DoctorView } from './pages/DoctorView';
import { About } from './pages/About';

function AppContent() {
  const [view, setView] = useState('home'); // 'home' | 'patient' | 'doctor' | 'about'

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [view]);

  return (
    <Layout currentView={view} setView={setView}>
      {view === 'home' && <Home setView={setView} />}
      {view === 'patient' && <PatientView setView={setView} />}
      {view === 'doctor' && <DoctorView setView={setView} />}
      {view === 'about' && <About setView={setView} />}
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
