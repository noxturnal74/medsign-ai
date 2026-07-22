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
  
  // TTS Voice & Progress States
  const [speakingText, setSpeakingText] = useState("");
  const [speakingProgress, setSpeakingProgress] = useState(0);
  const [isTtsPaused, setIsTtsPaused] = useState(false);

  const pauseTts = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
      setIsTtsPaused(true);
    }
  }, []);

  const resumeTts = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.resume();
      setIsTtsPaused(false);
    }
  }, []);

  const stopTts = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsTtsPaused(false);
      setSpeakingText("");
      setSpeakingProgress(0);
    }
  }, []);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceNameState] = useState(() => {
    return localStorage.getItem('medsign_selected_voice') || '';
  });

  const setSelectedVoiceName = (voiceName) => {
    setSelectedVoiceNameState(voiceName);
    localStorage.setItem('medsign_selected_voice', voiceName);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter voices for Indonesian, English, or any available
        setAvailableVoices(voices);
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  // AI Recommendation automatic sentence builder
  const getSentenceSuggestions = useCallback((words) => {
    if (!words || words.length === 0) return [];
    const lowerWords = words.map(w => w.toLowerCase());
    const suggestions = [];

    if (lowerWords.includes('sakit') && lowerWords.includes('dada')) {
      suggestions.push("Saya mengalami nyeri dada.");
      suggestions.push("Dada saya sakit sekali.");
    }
    if (lowerWords.includes('sesak') || lowerWords.includes('napas')) {
      suggestions.push("Saya merasa sesak napas.");
      suggestions.push("Napas saya terasa berat.");
    }
    if (lowerWords.includes('pusing') || lowerWords.includes('kepala')) {
      suggestions.push("Kepala saya terasa sangat pusing.");
      suggestions.push("Saya pusing dan lemas.");
    }
    if (lowerWords.includes('mual') || lowerWords.includes('muntah')) {
      suggestions.push("Perut saya mual dan ingin muntah.");
    }
    if (lowerWords.includes('demam') || lowerWords.includes('tinggi')) {
      suggestions.push("Badan saya demam tinggi.");
    }
    if (lowerWords.includes('tensi') || lowerWords.includes('tinggi')) {
      suggestions.push("Tekanan darah saya tinggi.");
    }
    if (lowerWords.includes('tolong') || lowerWords.includes('bantuan segera')) {
      suggestions.push("Tolong, saya butuh bantuan medis segera!");
    }

    // Dynamic fallback matching any words
    if (suggestions.length === 0) {
      const joined = words.join(" dan ");
      suggestions.push(`Saya merasakan ${joined}.`);
      suggestions.push(`Keluhan saya adalah ${words.join(', ')}.`);
    }

    return Array.from(new Set(suggestions)).slice(0, 3);
  }, []);

  // Web Speech API for TTS with progress tracking and custom voice selection
  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    
    setSpeakingText(text);
    setSpeakingProgress(0);

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set custom voice if selected
    if (selectedVoiceName && availableVoices.length > 0) {
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
      }
    } else {
      utterance.lang = 'id-ID';
    }
    
    utterance.rate = 0.95;

    // Simulate progress in case browser doesn't trigger onboundary events properly
    const durationEst = Math.max(1000, text.length * 75); // 75ms per character, min 1s
    let elapsed = 0;
    setIsTtsPaused(false);
    
    const progressInterval = setInterval(() => {
      if (window.speechSynthesis.paused) return; // Pause the simulation too
      elapsed += 40;
      const pct = Math.min(100, (elapsed / durationEst) * 100);
      setSpeakingProgress(pct);
      if (pct >= 100) {
        clearInterval(progressInterval);
      }
    }, 40);

    utterance.onstart = () => {
      setSpeakingProgress(0);
    };

    utterance.onend = () => {
      clearInterval(progressInterval);
      setSpeakingProgress(100);
      setTimeout(() => {
        setSpeakingText("");
        setSpeakingProgress(0);
        setIsTtsPaused(false);
      }, 350);
    };

    utterance.onerror = () => {
      clearInterval(progressInterval);
      setSpeakingText("");
      setSpeakingProgress(0);
    };

    window.speechSynthesis.speak(utterance);
  }, [ttsEnabled, selectedVoiceName, availableVoices]);

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
        t,
        // TTS & AI Suggestions
        speakingText,
        speakingProgress,
        availableVoices,
        selectedVoiceName,
        setSelectedVoiceName,
        getSentenceSuggestions,
        isTtsPaused,
        pauseTts,
        resumeTts,
        stopTts
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
