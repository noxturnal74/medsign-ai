import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { PatientView } from './pages/PatientView';
import { DoctorView } from './pages/DoctorView';
import { About } from './pages/About';

function AppContent() {
  const [view, setView] = useState('home'); // 'home' | 'patient' | 'doctor' | 'about'

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
