import React, { createContext, useState, useEffect, useCallback } from 'react';
import { vocabulary } from '../data/vocabulary';
import { translations } from '../data/translations';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [vocabList, setVocabList] = useState(vocabulary);
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('medsign_lang') || 'id';
  });

  const setLanguage = (lang) => {
    setLanguageState(lang);
    localStorage.setItem('medsign_lang', lang);
  };

  const t = useCallback((key) => {
    if (!key) return "";
    const dict = translations[language] || translations.id;
    if (dict[key]) return dict[key];
    const cleanKey = key.toLowerCase().trim();
    if (dict[cleanKey]) return dict[cleanKey];
    for (const k in dict) {
      if (k.toLowerCase() === cleanKey) {
        return dict[k];
      }
    }
    return key;
  }, [language]);

  const refreshVocabulary = useCallback(async () => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${(apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl)}/api/v1/vocabulary`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.words) {
          // Merge static and backend vocabularies
          const merged = [...vocabulary];
          data.words.forEach(w => {
            if (!merged.some(m => m.word === w.word)) {
              // Map category back to user-friendly name if needed
              merged.push({
                id: w.id,
                word: w.word,
                category: w.category,
                emergency: w.emergency
              });
            }
          });
          setVocabList(merged);
        }
      }
    } catch (err) {
      console.error("Gagal refresh vocabulary:", err);
    }
  }, []);

  useEffect(() => {
    refreshVocabulary();
  }, [refreshVocabulary]);
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
        vocabulary: vocabList,
        refreshVocabulary,
        // Ekspos state & mutator untuk Mode Eja
        spellingMode,
        setSpellingMode,
        spelledText,
        setSpelledText,
        appendLetter,
        addSpaceToSpelledText,
        backspaceSpelledText,
        clearSpelledText,
        language,
        setLanguage,
        t
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
