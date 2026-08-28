import React, { useState, useEffect, useCallback, useRef } from 'react';
import { vocabulary } from '../data/vocabulary';
import { translations } from '../data/translations';
import { AppContext } from './AppContextObject';

export const AppProvider = ({ children }) => {
  // --- STATES ---
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [vocabList, setVocabList] = useState(vocabulary);
  const [language, setLanguageState] = useState('id');
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
  const [nlgResult, setNlgResult] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showFeatureModal, setShowFeatureModal] = useState(false);
  const [toast, setToast] = useState(null);

  const [notifications, setNotifications] = useState(() => {
    const saved = localStorage.getItem('medsign_notifications');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('medsign_notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((message, type = 'info') => {
    const timestampStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const newNotif = {
      id: Math.random().toString(36).substring(2, 9),
      message,
      type,
      timestamp: timestampStr,
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAsRead = useCallback((id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const showToast = useCallback((message, type = "info") => {
    setToast({ message, type });
    addNotification(message, type);
  }, [addNotification]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.alert = (msg) => {
        let type = "info";
        const lower = msg.toLowerCase();
        if (lower.includes("gagal") || lower.includes("error") || lower.includes("kesalahan")) {
          type = "error";
        } else if (lower.includes("berhasil") || lower.includes("sukses") || lower.includes("selesai") || lower.includes("aktif")) {
          type = "success";
        }
        showToast(msg, type);
      };
    }
  }, [showToast]);

  // Auto-clear toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3200);
    return () => clearTimeout(timer);
  }, [toast]);
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('medsign_user');
    return saved ? JSON.parse(saved) : null;
  });

  // Permission grants for ML/dataset features (rekam dataset, balance checker,
  // AI augmentation, training model). Super admin always has everything.
  const [grants, setGrants] = useState(() => {
    const saved = localStorage.getItem('medsign_grants');
    return saved ? JSON.parse(saved) : null;
  });

  const loadGrants = useCallback(async () => {
    if (!currentUser) {
      setGrants(null);
      localStorage.removeItem('medsign_grants');
      return;
    }
    const role = currentUser.role;
    if (role !== 'super_admin' && role !== 'admin' && role !== 'doctor') {
      setGrants(null);
      localStorage.removeItem('medsign_grants');
      return;
    }
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const base = apiBaseUrl.replace(/\/$/, '');
      const res = await fetch(`${base}/api/v1/user/grants`, {
        headers: { 'Authorization': `Bearer ${currentUser.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGrants(data.grants);
        localStorage.setItem('medsign_grants', JSON.stringify(data.grants));
      }
    } catch (err) {
      console.error("Gagal memuat grant fitur:", err);
    }
  }, [currentUser]);

  // Reload grants whenever the logged-in user changes
  useEffect(() => {
    loadGrants();
  }, [loadGrants]);

  const hasGrant = useCallback((feature) => {
    if (!currentUser) return false;
    if (currentUser.role === 'super_admin') return true;
    if (!grants) return false;
    return !!grants[feature];
  }, [currentUser, grants]);

  const [activePatient, setActivePatient] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);



  // Poll active session for logged-in patients
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'patient') return;
    
    const checkActiveSession = async () => {
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/patient/me/sessions`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        if (response.ok) {
          const sessions = await response.json();
          const active = sessions.find(s => !s.ended_at);
          if (active && active.id !== activeSessionId) {
            setActiveSessionId(active.id);
          } else if (!active && activeSessionId) {
            setActiveSessionId(null);
          }
        }
      } catch (err) {
        console.error("Gagal memeriksa sesi aktif pasien:", err);
      }
    };
    
    checkActiveSession();
    const interval = setInterval(checkActiveSession, 4000);
    return () => clearInterval(interval);
  }, [currentUser, activeSessionId]);

  // Poll chat logs for active sessions (both doctor and patient)
  useEffect(() => {
    if (!currentUser || !activeSessionId) return;
    
    const pollLogs = async () => {
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/sessions/${activeSessionId}/logs`, {
          headers: { 'Authorization': `Bearer ${currentUser.token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSessionLog(data);
        }
      } catch (err) {
        console.error("Gagal sinkronisasi log:", err);
      }
    };
    
    pollLogs();
    const interval = setInterval(pollLogs, 2500);
    return () => clearInterval(interval);
  }, [currentUser, activeSessionId]);

  const [layoutMode, setLayoutModeState] = useState(() => {
    return localStorage.getItem('medsign_layout_mode') || 'desktop';
  });

  const setLayoutMode = (mode) => {
    setLayoutModeState(mode);
    localStorage.setItem('medsign_layout_mode', mode);
    document.documentElement.classList.toggle('phone-mode', mode === 'phone');
  };

  useEffect(() => {
    document.documentElement.classList.toggle('phone-mode', layoutMode === 'phone');
  }, [layoutMode]);

  const [viewMode, setViewModeState] = useState(() => {
    return localStorage.getItem('medsign_view_mode') || 'normal';
  });

  const setViewMode = (mode) => {
    setViewModeState(mode);
    localStorage.setItem('medsign_view_mode', mode);
  };

  const syncChannelRef = useRef(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.BroadcastChannel) {
      const channel = new BroadcastChannel('medsign_sync_channel');
      syncChannelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, data } = event.data;
        isSyncingRef.current = true;
        
        if (type === 'SYNC_SESSION_LOG') {
          setSessionLog(data);
        } else if (type === 'SYNC_SENTENCE') {
          setSentence(data);
        } else if (type === 'SYNC_GENERATED_SENTENCE') {
          setGeneratedSentence(data);
        } else if (type === 'SYNC_ACTIVE_PATIENT') {
          setActivePatient(data);
        } else if (type === 'SYNC_SESSION_ID') {
          setActiveSessionId(data);
        }

        setTimeout(() => {
          isSyncingRef.current = false;
        }, 50);
      };

      return () => {
        channel.close();
      };
    }
  }, []);

  useEffect(() => {
    if (!isSyncingRef.current && syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SYNC_SESSION_LOG', data: sessionLog });
    }
  }, [sessionLog]);

  useEffect(() => {
    if (!isSyncingRef.current && syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SYNC_SENTENCE', data: sentence });
    }
  }, [sentence]);

  useEffect(() => {
    if (!isSyncingRef.current && syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SYNC_GENERATED_SENTENCE', data: generatedSentence });
    }
  }, [generatedSentence]);

  useEffect(() => {
    if (!isSyncingRef.current && syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SYNC_ACTIVE_PATIENT', data: activePatient });
    }
  }, [activePatient]);

  useEffect(() => {
    if (!isSyncingRef.current && syncChannelRef.current) {
      syncChannelRef.current.postMessage({ type: 'SYNC_SESSION_ID', data: activeSessionId });
    }
  }, [activeSessionId]);

  // --- REFS ---
  const sentenceTimerRef = useRef(null);
  const lastSentenceLengthRef = useRef(0);

  // --- CALLBACKS & HELPERS ---
  const login = async (emailOrNik, password, role) => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const endpoint = role === 'admin' ? '/auth/admin/login' : role === 'doctor' ? '/auth/doctor/login' : '/auth/patient/login';
      
      const body = role === 'patient' 
        ? { nik: emailOrNik, password } 
        : { email: emailOrNik, password };
        
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (response.ok) {
        const data = await response.json();
        const userObj = {
          user_id: data.user_id,
          emailOrNik,
          role: data.role || role,
          token: data.token,
          must_change_password: data.must_change_password,
          loginTime: Date.now()
        };
        setCurrentUser(userObj);
        localStorage.setItem('medsign_user', JSON.stringify(userObj));
        showToast("Login berhasil!", "success");
        return { success: true, user: userObj };
      } else {
        const err = await response.json();
        showToast(err.detail || "Login gagal", "error");
        return { success: false, error: err.detail };
      }
    } catch (err) {
      showToast("Koneksi gagal", "error");
      return { success: false, error: "Koneksi gagal" };
    }
  };

  const logout = useCallback((reason = "") => {
    setCurrentUser(null);
    localStorage.removeItem('medsign_user');
    localStorage.removeItem('medsign_grants');
    if (reason === "expired") {
      showToast("Sesi login Anda telah berakhir. Silakan login kembali.", "warning");
      window.dispatchEvent(new CustomEvent('medsign:logout-expired'));
    } else {
      showToast("Berhasil logout", "success");
    }
  }, [showToast]);

  useEffect(() => {
    if (!currentUser) return;
    const SESSION_TIMEOUT = 2 * 60 * 60 * 1000; // 2 jam
    
    // ponytail: default 2 hours timeout, upgrade to sliding session if needed
    if (!currentUser.loginTime) {
      const updatedUser = { ...currentUser, loginTime: Date.now() };
      setCurrentUser(updatedUser);
      localStorage.setItem('medsign_user', JSON.stringify(updatedUser));
      return;
    }
    
    const checkExpiry = () => {
      if (Date.now() - currentUser.loginTime > SESSION_TIMEOUT) {
        logout("expired");
      }
    };
    
    checkExpiry();
    const interval = setInterval(checkExpiry, 15000);
    return () => clearInterval(interval);
  }, [currentUser, logout]);

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
                display: w.display || w.word.replace(/_/g, ' ').replace(/-/g, ' '),
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
    // Guard: kata tunggal saja, bukan kalimat yang sudah masuk dari refine
    if (!words || words.length === 0) return [];
    const shortWords = words.filter(w => w.split(' ').length <= 2); // tolak kata yg sudah frasa panjang
    if (shortWords.length === 0) return [];
    const lowerWords = shortWords.map(w => w.toLowerCase());
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

    // fallback hanya jika tidak ada kata kalimat — dan hanya dari kata pendek
    if (suggestions.length === 0 && shortWords.length <= 4) {
      suggestions.push(`Keluhan saya: ${shortWords.join(', ')}.`);
    }

    return Array.from(new Set(suggestions)).slice(0, 3);
  }, []);

  const setSelectedVoiceName = (voiceName) => {
    setSelectedVoiceNameState(voiceName);
    localStorage.setItem('medsign_selected_voice', voiceName);
  };

  const getVoiceLabel = (voice) => {
    const name = voice.name;
    const n = name.toLowerCase();
    let gender = "Umum";
    if (n.includes('gadis') || n.includes('gisella') || n.includes('damayanti') || n.includes('gita') || n.includes('siti') || n.includes('female') || n.includes('perempuan') || n.includes('wanita') || n.includes('google') || n.includes('zira') || n.includes('hazel')) {
      gender = "Perempuan";
    } else if (n.includes('ardi') || n.includes('andika') || n.includes('dave') || n.includes('male') || n.includes('laki') || n.includes('pria') || n.includes('david') || n.includes('george')) {
      gender = "Laki-laki";
    }
    return `${name} (Suara ${gender}) [${voice.lang}]`;
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

    // Replace underscores and hyphens with spaces for natural SpeechSynthesis speech
    const cleanText = text.replace(/[_-]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
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

  const addLogEntry = useCallback(async (entry, activeSessionId = null) => {
    const timestampStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const newEntry = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: timestampStr,
      ...entry,
    };
    
    setSessionLog((prev) => [newEntry, ...prev]);

    if (currentUser && activeSessionId) {
      // Save to database for logged in user session
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/session/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`
          },
          body: JSON.stringify({
            session_id: activeSessionId,
            role: entry.role,
            text: entry.text,
            confidence: entry.confidence || 1.0,
            timestamp: timestampStr
          })
        });
      } catch (e) {
        console.error("Gagal menyimpan log ke database:", e);
      }
    }

    if (entry.role === 'doctor' || entry.role === 'patient') {
      speak(entry.text);
    }
  }, [speak, currentUser]);

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
        // Filter hanya suara Indonesia; fallback ke semua suara jika tidak ada
        const idVoices = voices.filter(v => v.lang.toLowerCase().startsWith('id'));
        const pool = idVoices.length > 0 ? idVoices : voices;
        const sorted = [...pool].sort((a, b) => {
          const aGM = a.name.toLowerCase().includes('google') || a.name.toLowerCase().includes('microsoft');
          const bGM = b.name.toLowerCase().includes('google') || b.name.toLowerCase().includes('microsoft');
          if (aGM && !bGM) return -1;
          if (!aGM && bGM) return 1;
          return a.name.localeCompare(b.name);
        });
        setAvailableVoices(sorted);

        // Auto-select Andika/Ardi (Microsoft Male) as default if available
        const savedVoice = localStorage.getItem('medsign_selected_voice');
        if (!savedVoice && sorted.length > 0) {
          const maleVoice = sorted.find(v => {
            const name = v.name.toLowerCase();
            return name.includes('andika') || name.includes('ardi') || name.includes('male') || name.includes('laki');
          });
          if (maleVoice) {
            setSelectedVoiceNameState(maleVoice.name);
          } else {
            const defaultVoice = sorted.find(v => v.default);
            if (defaultVoice) {
              setSelectedVoiceNameState(defaultVoice.name);
            }
          }
        }
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
      setNlgResult(null);
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
        const base = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        const rawText = sentence.join(' ');

        // Coba /nlg/refine-sentence (LLM) dulu
        const response = await fetch(`${base}/api/v1/nlg/refine-sentence`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: rawText }),
        });
        if (response.ok) {
          const data = await response.json();
          // ponytail: tidak auto-log — pasien harus review/edit dulu sebelum kirim
          setNlgResult(data);
          setGeneratedSentence(data.refined_sentence);
        } else {
          // fallback ke generate-sentence jika refine gagal
          const fb = await fetch(`${base}/api/v1/nlg/generate-sentence`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ words: sentence }),
          });
          if (fb.ok) {
            const fbData = await fb.json();
            setGeneratedSentence(fbData.sentence);
            setNlgResult({ refined_sentence: fbData.sentence, confidence: 'medium', follow_up: [], llm_used: false, original: rawText });
          }
        }
      } catch (err) {
        console.error("Gagal generate kalimat NLG:", err);
        setNlgResult({ error: true });
      } finally {
        setIsGenerating(false);
      }
    }, 1200);

    return () => {
      if (sentenceTimerRef.current) {
        clearTimeout(sentenceTimerRef.current);
      }
    };
  }, [sentence]);

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
        getVoiceLabel,
        getSentenceSuggestions,
        wordRecommendations,
        showFeatureModal,
        setShowFeatureModal,
        layoutMode,
        setLayoutMode,
        viewMode,
        setViewMode,
        toast,
        setToast,
        showToast,
        currentUser,
        grants,
        hasGrant,
        activePatient,
        setActivePatient,
        activeSessionId,
        setActiveSessionId,
        setCurrentUser,
        login,
        logout,
        appendWordRecommendation,
        generatedSentence,
        setGeneratedSentence,
        nlgResult,
        setNlgResult,
        isGenerating,
        notifications,
        clearNotification,
        clearAllNotifications,
        markAsRead,
        markAllAsRead,
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
