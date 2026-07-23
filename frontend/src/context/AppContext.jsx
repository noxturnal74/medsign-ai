import React, { useState, useEffect, useCallback, useRef } from 'react';
import { vocabulary } from '../data/vocabulary';
import { translations } from '../data/translations';
import { AppContext } from './AppContextObject';

export const AppProvider = ({ children }) => {
  // --- STATES ---
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [vocabList, setVocabList] = useState(vocabulary);
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('medsign_lang') || 'id';
  });
  const [sessionLog, setSessionLog] = useState([]);
  const [sentence, setSentence] = useState([]);
  const [lastDetected, setLastDetected] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isBackendConnected, setIsBackendConnected] = useState(false);
  const [serverState, setServerState] = useState('demo'); // 'demo' | 'connected' | 'disconnected'
  const [spellingMode, setSpellingMode] = useState(false);
  const [spelledText, setSpelledText] = useState("");
  const [speakingText, setSpeakingText] = useState("");
  const [speakingProgress, setSpeakingProgress] = useState(0);
  const [isTtsPaused, setIsTtsPaused] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceName, setSelectedVoiceNameState] = useState(() => {
    return localStorage.getItem('medsign_selected_voice') || '';
  });
  const [wordRecommendations, setWordRecommendations] = useState([]);
  const [generatedSentence, setGeneratedSentence] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // --- REFS ---
  const sentenceTimerRef = useRef(null);
  const lastSentenceLengthRef = useRef(0);

  // --- CALLBACKS & HELPERS ---
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
          const merged = [...vocabulary];
          data.words.forEach(w => {
            if (!merged.some(m => m.word.toLowerCase() === w.word.toLowerCase())) {
              merged.push({
                id: w.id,
                word: w.word,
                category: w.category,
                emergency: w.emergency
              });
            }
          });
          
          const uniqueMerged = [];
          const seen = new Set();
          merged.forEach(item => {
            const slug = item.word.toLowerCase().trim();
            if (!seen.has(slug)) {
              seen.add(slug);
              uniqueMerged.push(item);
            }
          });
          window.vocabList = uniqueMerged;
          setVocabList(uniqueMerged);
        }
      }
    } catch (err) {
      console.error("Gagal refresh vocabulary:", err);
    }
  }, []);

  const getSentenceSuggestions = useCallback((words) => {
    if (!words || words.length === 0) return [];
    const lowerWords = words.map(w => w.toLowerCase());
    const suggestions = [];

    if (lowerWords.includes('sakit') && lowerWords.includes('dada')) {
      suggestions.push("Saya mengalami nyeri dada.");
      suggestions.push("Dada saya sakit sekali.");
    }
    if (lowerWords.includes('sesak') || lowerWords.includes('napas')) {
      suggestions.push("Saya mengalami sesak napas.");
      suggestions.push("Saya tidak bisa bernapas.");
    }
    if (lowerWords.includes('demam') || lowerWords.includes('panas')) {
      suggestions.push("Saya mengalami demam tinggi.");
      suggestions.push("Badan saya terasa panas.");
    }
    if (lowerWords.includes('pusing') || lowerWords.includes('kepala')) {
      suggestions.push("Saya merasa pusing kepala.");
      suggestions.push("Kepala saya terasa pening.");
    }
    
    if (suggestions.length === 0 && words.length > 0) {
      const joined = words.join(' ');
      suggestions.push(`Saya merasakan ${joined}.`);
      suggestions.push(`Keluhan saya adalah ${words.join(', ')}.`);
    }

    return Array.from(new Set(suggestions)).slice(0, 3);
  }, []);

  const setSelectedVoiceName = (voiceName) => {
    setSelectedVoiceNameState(voiceName);
    localStorage.setItem('medsign_selected_voice', voiceName);
  };

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

  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); 
    
    setSpeakingText(text);
    setSpeakingProgress(0);

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoiceName && availableVoices.length > 0) {
      const voice = availableVoices.find(v => v.name === selectedVoiceName);
      if (voice) {
        utterance.voice = voice;
      }
    } else {
      utterance.lang = 'id-ID';
    }
    
    utterance.rate = 0.95;

    const durationEst = Math.max(1000, text.length * 75);
    let elapsed = 0;
    setIsTtsPaused(false);
    
    const progressInterval = setInterval(() => {
      if (window.speechSynthesis.paused) return;
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

  const appendWord = useCallback((word) => {
    setSentence((prev) => {
      if (prev.length >= 10) return prev;
      return [...prev, word];
    });
  }, []);

  const removeLastWord = useCallback(() => {
    setSentence((prev) => prev.slice(0, -1));
  }, []);

  const clearSentence = useCallback(() => {
    setSentence([]);
  }, []);

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

  const addLogEntry = useCallback((entry) => {
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      ...entry,
    };
    setSessionLog((prev) => [newEntry, ...prev]);

    if (entry.role === 'doctor') {
      speak(entry.text);
    } else if (entry.role === 'patient') {
      speak(entry.text);
    }
  }, [speak]);

  const clearLog = useCallback(() => {
    setSessionLog([]);
  }, []);

  const appendWordRecommendation = useCallback((word) => {
    setSentence(prev => {
      if (prev.length === 0) return [word];
      const last = prev[prev.length - 1].toLowerCase().trim();
      const rec = word.toLowerCase().trim();
      if (rec.includes(last)) {
        return [...prev.slice(0, -1), word];
      }
      return [...prev, word];
    });
  }, []);

  // --- EFFECTS ---
  useEffect(() => {
    refreshVocabulary();
  }, [refreshVocabulary]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
      };
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  useEffect(() => {
    if (sentence.length === 0) {
      setWordRecommendations([]);
      return;
    }
    const lastWord = sentence[sentence.length - 1];
    const fetchRecommendations = async () => {
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/nlg/recommend?word=${encodeURIComponent(lastWord)}`
        );
        if (response.ok) {
          const data = await response.json();
          setWordRecommendations(data.recommendations || []);
        }
      } catch (err) {
        console.error("Gagal mengambil rekomendasi kata:", err);
      }
    };
    fetchRecommendations();
  }, [sentence]);

  useEffect(() => {
    if (sentence.length === 0) {
      setGeneratedSentence("");
      lastSentenceLengthRef.current = 0;
      return;
    }

    if (sentenceTimerRef.current) {
      clearTimeout(sentenceTimerRef.current);
    }

    if (sentence.length <= lastSentenceLengthRef.current) {
      return;
    }
    lastSentenceLengthRef.current = sentence.length;

    sentenceTimerRef.current = setTimeout(async () => {
      setIsGenerating(true);
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(
          `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/nlg/generate-sentence`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words: sentence })
          }
        );
        if (response.ok) {
          const data = await response.json();
          const finalSentence = data.sentence;
          setGeneratedSentence(finalSentence);

          addLogEntry({
            role: 'patient',
            text: finalSentence,
            confidence: 1.0,
            isNlg: true
          });
        }
      } catch (err) {
        console.error("Gagal generate kalimat NLG:", err);
      } finally {
        setIsGenerating(false);
      }
    }, 2500);

    return () => {
      if (sentenceTimerRef.current) {
        clearTimeout(sentenceTimerRef.current);
      }
    };
  }, [sentence, addLogEntry]);

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
        speakingText,
        speakingProgress,
        availableVoices,
        selectedVoiceName,
        setSelectedVoiceName,
        getSentenceSuggestions,
        wordRecommendations,
        appendWordRecommendation,
        generatedSentence,
        isGenerating,
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
