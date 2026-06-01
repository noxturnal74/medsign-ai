import { useEffect, useRef, useState, useCallback } from 'react';
import { vocabulary } from '../data/vocabulary';

export const useWebSocket = (url, onPrediction, isHandDetected, landmarks) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState('demo'); // 'connecting' | 'connected' | 'disconnected' | 'demo'
  const [lastPrediction, setLastPrediction] = useState(null);
  
  const wsRef = useRef(null);
  const frameBufferRef = useRef([]);
  const reconnectTimeoutRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);

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
          if (onPrediction) {
            onPrediction(data);
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
  }, [url, onPrediction]);

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

  // Accumulate frames and send them every 1 second
  useEffect(() => {
    if (!isHandDetected || !landmarks) {
      frameBufferRef.current = [];
      return;
    }

    // Add current frame to buffer
    const flatLandmarks = landmarks.flatMap(l => [l.x, l.y, l.z]);
    frameBufferRef.current.push(flatLandmarks);

    // Maintain 30 frames
    if (frameBufferRef.current.length > 30) {
      frameBufferRef.current.shift();
    }

    // Interval send logic (1 second)
    const interval = setInterval(() => {
      if (frameBufferRef.current.length === 0) return;

      // Pad sequence if less than 30 frames
      let paddedFrames = [...frameBufferRef.current];
      while (paddedFrames.length < 30) {
        paddedFrames.unshift(new Array(63).fill(0.0));
      }

      if (isConnected && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Send to FastAPI WebSocket
        wsRef.current.send(JSON.stringify({ frames: paddedFrames }));
      } else {
        // Fallback to local simulation prediction
        runLocalDemoPrediction();
      }
    }, 1200); // 1.2s to match natural hand movement pacing

    return () => clearInterval(interval);
  }, [isHandDetected, landmarks, isConnected, runLocalDemoPrediction]);

  return {
    isConnected,
    lastPrediction,
    connectionState
  };
};
