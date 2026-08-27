# -*- coding: utf-8 -*-
/*
 * Aplikasi Notifikasi & Session Timeout untuk MedSign AI
 * - Notifikasi toast auto menghilang
 - Tombol Clear All
 - Session timeout setelah 30 menit tidak aktif
 */
import React, { useContext, useEffect, useState, useCallback } from 'react';
import { AppContext } from './AppContextObject';

export const useNotification = () => {
  const { toast, setToast, sessionLog, setSessionLog, currentUser, activeSessionId } = useContext(AppContext);
  const [notifications, setNotifications] = useState([]);

  // Tambahkan notifikasi baru
  const addNotification = useCallback((message, type = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = {
      id,
      message,
      type, // 'success', 'error', 'info'
      createdAt: new Date().toLocaleTimeString('id-ID'),
    };
    setNotifications(prev => [newNotification, ...prev]);
    // Auto-dismiss setelah 5 detik
    const timer = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
    return id;
  };

  // Hapus notifikasi satu per satu
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  });

  // Hapus semua notifikasi
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  });

  return { notifications, addNotification, removeNotification, clearAllNotifications };
};

export const useSessionTimeout = () => {
  const { currentUser, setCurrentUser, activeSessionId, setActiveSessionId } = useContext(AppContext);
  const { addNotification } = useContext(AppContext); // butuh addNotification dari context

  useEffect(() => {
    let inactivityTimer;

    const handleActivity = () => {
      // Reset timer setiap ada aktivitas
      if (inactivityTimer) {
        clearTimeout(inactivityTimer);
      }
      // 30 menit tidak aktif -> logout
      inactivityTimer = setTimeout(() => {
        // Logout: clear token dan state
        setCurrentUser(null);
        setActiveSessionId(null);
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('medsign_token');
          localStorage.removeItem('medsign_user');
        }
        // Tunjukan notifikasi
        addNotification('Sesi telah berakhir karena ketidakaktifan', 'info');
      }, 1800000); // 30 menit = 1800000 ms

      // Reset timer ketika ada aktivitas
      document.addEventListener('mousemove', handleActivity);
      document.addEventListener('keydown', handleActivity);
      document.addEventListener('touchstart', handleActivity);
    };

    // Mulai timer saat component mount
    inactivityTimer = setTimeout(() => {
      handleActivity();
    }, 1800000);

    // Bersihkan timer saat component unmount
    return () => {
      clearTimeout(inactivityTimer);
      document.removeEventListener('mousemove', handleActivity);
      document.removeEventListener('keydown', handleActivity);
      document.removeEventListener('touchstart', handleActivity);
    };
  }, [currentUser, activeSessionId, addNotification]);
};