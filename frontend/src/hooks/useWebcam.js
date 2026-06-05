import { useState, useRef, useCallback, useEffect } from 'react';

export const useWebcam = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Function to query available video inputs
  const updateDevicesList = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
        console.warn('enumerateDevices is not supported in this browser.');
        return;
      }
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoInputs);
      
      // If we don't have a selected device yet, default to the first one
      if (videoInputs.length > 0 && !selectedDeviceId) {
        let activeId = '';
        if (streamRef.current) {
          const videoTrack = streamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            activeId = videoTrack.getSettings().deviceId || '';
          }
        }
        setSelectedDeviceId(activeId || videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Failed to list video inputs:', err);
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(async (deviceIdToUse = null) => {
    setError(null);
    try {
      // If we are currently active, stop first to release lock
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const targetDeviceId = deviceIdToUse || selectedDeviceId;
      
      const constraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(targetDeviceId ? { deviceId: { exact: targetDeviceId } } : { facingMode: 'user' })
        },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsActive(true);
      
      // Update device list to get labels (only available after permission granted)
      await updateDevicesList();
      
      // Save deviceId that was actually chosen by getUserMedia
      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        const actualId = activeTrack.getSettings().deviceId;
        if (actualId) {
          setSelectedDeviceId(actualId);
        }
      }
    } catch (err) {
      console.error('Camera access error:', err);
      let errMsg = 'Kamera diblokir atau tidak tersedia. Harap izinkan akses kamera di pengaturan browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errMsg = 'Akses kamera ditolak. Klik ikon gembok di sebelah alamat web (address bar) untuk memberikan izin.';
      }
      setError(errMsg);
      setIsActive(false);
    }
  }, [selectedDeviceId, updateDevicesList]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

  // Watch for device change and automatically enumerate again
  useEffect(() => {
    const handleDeviceChange = () => {
      updateDevicesList();
    };
    
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    
    // Initial fetch of devices
    updateDevicesList();
    
    return () => {
      if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, [updateDevicesList]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return {
    videoRef,
    isActive,
    startCamera,
    stopCamera,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId
  };
};
