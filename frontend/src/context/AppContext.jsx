import React, { createContext, useState, useEffect, useCallback } from 'react';
import { vocabulary } from '../data/vocabulary';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [sessionLog, setSessionLog] = useState([]);
  const [sentence, setSentence] = useState([]);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [serverState, setServerState] = useState('demo'); // 'demo' | 'connected' | 'disconnected'
  
  // State baru untuk abjad BISINDO Spelling Mode (A-Z)
  const [spellingMode, setSpellingMode] = useState(false);
  const [spelledText, setSpelledText] = useState("");

  // Web Speech API for TTS
  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Cancel any current utterances
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.95;
    
    // Fallback if Indonesian voice is not preloaded/supported
    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled]);

  // Sentence functions
  const appendWord = useCallback((word) => {
    setSentence((prev) => {
      if (prev.length >= 10) return prev; // Limit to 10 words
      return [...prev, word];
    });
  }, []);

  const removeLastWord = useCallback(() => {
    setSentence((prev) => prev.slice(0, -1));
  }, []);

  const clearSentence = useCallback(() => {
    setSentence([]);
  }, []);

  // Utility mutator untuk teks ejaan abjad (Mode Eja)
  const appendLetter = useCallback((letter) => {
    setSpelledText((prev) => {
      if (prev.length >= 100) return prev;
      return prev + letter;
    });
  }, []);

  const addSpaceToSpelledText = useCallback(() => {
    setSpelledText((prev) => {
      if (prev.length === 0 || prev.endsWith(" ")) return prev;
      return prev + " ";
    });
  }, []);

  const backspaceSpelledText = useCallback(() => {
    setSpelledText((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  }, []);

  const clearSpelledText = useCallback(() => {
    setSpelledText("");
  }, []);

  // Session Log functions
  const addLogEntry = useCallback((entry) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...entry,
    };
    setSessionLog((prev) => [newEntry, ...prev]);

    // Speak automatically if spoken word is added
    if (entry.role === 'doctor') {
      speak(entry.text);
    } else if (entry.role === 'patient') {
      // Find item in vocab to get correct pronunciation if word has space
      speak(entry.text);
    }
  }, [speak]);

  const clearLog = useCallback(() => {
    setSessionLog([]);
  }, []);

  return (
    <AppContext.Provider
      value={{
        ttsEnabled,
        setTtsEnabled,
        sessionLog,
        setSessionLog,
        addLogEntry,
        clearLog,
        sentence,
        setSentence,
        appendWord,
        removeLastWord,
        clearSentence,
        lastDetected,
        setLastDetected,
        cameraActive,
        setCameraActive,
        isBackendConnected,
        setIsBackendConnected,
        serverState,
        setServerState,
        speak,
        vocabulary,
        // Ekspos state & mutator untuk Mode Eja
        spellingMode,
        setSpellingMode,
        spelledText,
        setSpelledText,
        appendLetter,
        addSpaceToSpelledText,
        backspaceSpelledText,
        clearSpelledText
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
