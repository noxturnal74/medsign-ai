import { useEffect, useRef, useState, useCallback, useContext } from 'react';
import { vocabulary } from '../data/vocabulary';
import { AppContext } from '../context/AppContext';

export const useWebSocket = (url, onPrediction, isHandDetected, landmarks) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('demo'); // 'connecting' | 'connected' | 'disconnected' | 'demo'
  const [lastPrediction, setLastPrediction] = useState(null);
  
  const wsRef = useRef(null);
  const frameBufferRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

  // Akses context untuk Mode Eja
  const { spellingMode, appendLetter } = useContext(AppContext);
  const letterHistoryRef = useRef([]);
  const lastTypedLetterRef = useRef(null);

  // Reset typed letter lock saat tangan diangkat/dihilangkan dari kamera
  useEffect(() => {
    if (!isHandDetected) {
      lastTypedLetterRef.current = null;
      letterHistoryRef.current = [];
    }
  }, [isHandDetected]);

  // Fallback simulated prediction generator
  const runLocalDemoPrediction = useCallback(() => {
    // Pick a random word from the vocabulary, prioritizing Keluhan & Darurat
    const pool = vocabulary.filter(v => v.word !== 'ya' && v.word !== 'tidak');
    const pick = pool[Math.floor(Math.random() * pool.length)];
    const confidence = parseFloat((0.68 + Math.random() * 0.28).toFixed(2));
    
    // Sort alternatives
    const alt1 = pool[Math.floor(Math.random() * pool.length)];
    const alt2 = pool[Math.floor(Math.random() * pool.length)];
    
    const result = {
      prediction: pick.word,
      confidence: confidence,
      top3: [
        { word: pick.word, confidence: confidence },
        { word: alt1.word, confidence: parseFloat((confidence * 0.8).toFixed(2)) },
        { word: alt2.word, confidence: parseFloat((confidence * 0.6).toFixed(2)) }
      ],
      mode: 'demo',
      processing_time_ms: Math.floor(25 + Math.random() * 40)
    };

    setLastPrediction(result);
    if (onPrediction) {
      onPrediction(result);
    }
  }, [onPrediction]);

  // Connect WebSocket function
  const connect = useCallback(() => {
    if (!url) {
      setConnectionState('demo');
      setIsConnected(false);
      return;
    }

    setConnectionState('connecting');
    console.log(`Connecting to WebSocket at ${url}...`);

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully.');
        setIsConnected(true);
        setConnectionState('connected');
        reconnectAttemptsRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setLastPrediction(data);
          
          // PILAH RESPON BERDASARKAN MODE AKTIF
          if (data.mode === 'spelling') {
            const letter = data.prediction;
            if (!letter) {
              letterHistoryRef.current = [];
              return;
            }
            
            // Masukkan ke history penyaringan temporal
            letterHistoryRef.current.push(letter);
            if (letterHistoryRef.current.length > 3) {
              letterHistoryRef.current.shift();
            }
            
            // Histeresis: Huruf harus konsisten terdeteksi 3 frame berturut-turut (~1.5 detik)
            const allEqual = letterHistoryRef.current.length === 3 && 
                             letterHistoryRef.current.every(val => val === letter);
                             
            if (allEqual && letter !== lastTypedLetterRef.current) {
              appendLetter(letter);
              lastTypedLetterRef.current = letter;
            }
          } else {
            // Mode Kosakata Klinis MVP
            if (onPrediction) {
              onPrediction(data);
            }
          }
        } catch (err) {
          console.error('Error parsing prediction message:', err);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket closed.');
        setIsConnected(false);
        setConnectionState('disconnected');
        
        // Retry connection with exponential backoff (max 30s)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        console.log(`Retrying connection in ${delay / 1000}s...`);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          connect();
        }, delay);
      };

      ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        ws.close();
      };

    } catch (e) {
      console.error('Failed to create WebSocket:', e);
      setIsConnected(false);
      setConnectionState('demo');
    }
  }, [url, onPrediction, appendLetter]);

  // Handle reconnect cleanups
  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  // 1. Akumulasi frames koordinat di latar belakang saat kamera aktif
  useEffect(() => {
    if (!isHandDetected || !landmarks) {
      frameBufferRef.current = [];
      return;
    }

    // Tambahkan frame koordinat flat (63 float) ke buffer
    const flatLandmarks = landmarks.flatMap(l => [l.x, l.y, l.z]);
    frameBufferRef.current.push(flatLandmarks);

    // Batasi sliding window maksimal 30 frame
    if (frameBufferRef.current.length > 30) {
      frameBufferRef.current.shift();
    }
  }, [isHandDetected, landmarks]);

  // 2. Scheduler Pengiriman Prediksi (Dinamis: 500ms untuk Eja, 1000ms untuk Kata)
  useEffect(() => {
    const interval = setInterval(() => {
      // Jika tangan tidak terdeteksi di kamera, batalkan pengiriman
      if (!isHandDetected) {
        return;
      }

      if (isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        try {
          if (spellingMode) {
            // MODE EJA: Kirim 1 frame koordinat landmarks teranyar
            if (!landmarks || landmarks.length === 0) return;
            const flatLandmarks = landmarks.flatMap(l => [l.x, l.y, l.z]);
            
            wsRef.current.send(JSON.stringify({
              mode: 'spelling',
              landmarks: flatLandmarks
            }));
          } else {
            // MODE KOSAKATA KLINIS: Kirim 30-frame sequence
            if (frameBufferRef.current.length === 0) return;
            
            let paddedFrames = [...frameBufferRef.current];
            while (paddedFrames.length < 30) {
              if (paddedFrames.length > 0) {
                paddedFrames.unshift(paddedFrames[0]);
              } else {
                paddedFrames.unshift(new Array(63).fill(0.0));
              }
            }
            
            wsRef.current.send(JSON.stringify({
              mode: 'clinical',
              frames: paddedFrames
            }));
          }
        } catch (err) {
          console.error('Error sending coordinate stream over WebSocket:', err);
        }
      } else {
        // Fallback Simulasi Lokal Demo Offline
        if (spellingMode) {
          const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
          const pick = letters[Math.floor(Math.random() * letters.length)];
          const demoResult = {
            prediction: pick,
            confidence: 0.88,
            top3: [{ word: pick, confidence: 0.88 }],
            mode: 'demo_spelling'
          };
          setLastPrediction(demoResult);
          
          letterHistoryRef.current.push(pick);
          if (letterHistoryRef.current.length > 3) letterHistoryRef.current.shift();
          
          const allEqual = letterHistoryRef.current.length === 3 && 
                           letterHistoryRef.current.every(v => v === pick);
                           
          if (allEqual && pick !== lastTypedLetterRef.current) {
            appendLetter(pick);
            lastTypedLetterRef.current = pick;
          }
        } else {
          runLocalDemoPrediction();
        }
      }
    }, spellingMode ? 500 : 1000); // 500ms untuk pengetikan abjad eja responsif, 1.0s untuk kata

    return () => clearInterval(interval);
  }, [isHandDetected, isConnected, runLocalDemoPrediction, spellingMode, landmarks, appendLetter]);

  return {
    isConnected,
    lastPrediction,
    connectionState
  };
};
