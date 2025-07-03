import { useEffect, useRef } from 'react';

interface NotificationOptions {
  title: string;
  body?: string;
  icon?: string;
  silent?: boolean;
}

export const useNotification = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Create audio element for sound notifications
    audioRef.current = new Audio();
    audioRef.current.preload = 'auto';
    
    // Create a simple notification sound using Web Audio API
    const createNotificationSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (error) {
        // Fallback to simple beep if Web Audio API is not available
        console.log('Sound notification not available');
      }
    };

    // Store the sound function
    (audioRef.current as any).playNotificationSound = createNotificationSound;

    return () => {
      if (audioRef.current) {
        audioRef.current = null;
      }
    };
  }, []);

  const showNotification = (options: NotificationOptions & { userId?: number }) => {
    // Play sound notification
    if (audioRef.current && (audioRef.current as any).playNotificationSound && !options.silent) {
      try {
        (audioRef.current as any).playNotificationSound();
      } catch (error) {
        console.log('Could not play notification sound');
      }
    }

    // Show browser notification if permission granted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const uniqueTag = `amigomontador-user-${options.userId || 'unknown'}-${Date.now()}`;
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon || '/favicon.ico',
          badge: '/favicon.ico',
          tag: uniqueTag,
          silent: options.silent || false,
          requireInteraction: false,
        } as NotificationOptions & { badge?: string; tag?: string; requireInteraction?: boolean });

        // Auto-close notification after 4 seconds
        setTimeout(() => {
          notification.close();
        }, 4000);

        return notification;
      } catch (error) {
        console.log('Could not show browser notification');
      }
    }

    return null;
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  const isSupported = 'Notification' in window;
  const isGranted = isSupported && Notification.permission === 'granted';
  const isDenied = isSupported && Notification.permission === 'denied';

  return {
    showNotification,
    requestPermission,
    isSupported,
    isGranted,
    isDenied,
  };
};