import { useState, useRef, useCallback, useEffect } from 'react';

export const useWebcam = () => {
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  
  const [videoElement, setVideoElement] = useState(null);
  const videoNodeRef = useRef(null);
  const videoRef = useCallback((node) => {
    videoNodeRef.current = node;
    setVideoElement(node);
  }, []);
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
      
      // If we don't have a selected device yet, or the previously selected device is unplugged, fallback to first available
      const isSelectedDeviceStillAvailable = videoInputs.some(device => device.deviceId === selectedDeviceId);
      if (videoInputs.length > 0 && (!selectedDeviceId || !isSelectedDeviceStillAvailable)) {
        let activeId = '';
        if (streamRef.current) {
          const videoTrack = streamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            activeId = videoTrack.getSettings().deviceId || '';
          }
        }
        const fallbackId = videoInputs.some(device => device.deviceId === activeId) ? activeId : videoInputs[0].deviceId;
        setSelectedDeviceId(fallbackId);
      }
    } catch (err) {
      console.error('Failed to list video inputs:', err);
    }
  }, [selectedDeviceId]);

  const startCamera = useCallback(async (deviceIdToUse = null) => {
    setError(null);
    try {
      const targetDeviceId = deviceIdToUse || selectedDeviceId;

      // Check if we already have an active stream with the requested deviceId
      if (streamRef.current && streamRef.current.active) {
        const activeTrack = streamRef.current.getVideoTracks()[0];
        if (activeTrack) {
          const currentId = activeTrack.getSettings().deviceId;
          if (!targetDeviceId || (currentId && currentId === targetDeviceId)) {
            console.log('Kamera sudah aktif pada perangkat yang diminta, melewati proses restart.');
            setIsActive(true);
            return;
          }
        }
      }

      // If we are currently active on a different device, stop first to release lock
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      
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

      if (videoNodeRef.current) {
        videoNodeRef.current.srcObject = stream;
        await videoNodeRef.current.play();
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
    if (videoNodeRef.current) {
      videoNodeRef.current.srcObject = null;
    }
    setIsActive(false);
  }, []);

    // Ensure video element plays the active stream if the video element ref changes
  useEffect(() => {
    if (isActive && streamRef.current && videoElement) {
      if (videoElement.srcObject !== streamRef.current) {
        videoElement.srcObject = streamRef.current;
        videoElement.play().catch(err => console.error('Failed to auto-play video on ref change:', err));
      }
    }
  }, [isActive, videoElement]);

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
    videoElement,
    isActive,
    startCamera,
    stopCamera,
    error,
    devices,
    selectedDeviceId,
    setSelectedDeviceId
  };
};
