import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './use-auth';

interface PushNotificationHook {
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  testNotification: () => Promise<boolean>;
  error: string | null;
}

export function usePushNotifications(): PushNotificationHook {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported && user) {
      checkSubscriptionStatus();
    }
  }, [user]);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Erro ao verificar status da subscription:', err);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      setError('Push notifications não suportadas ou usuário não logado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get VAPID public key from server
      const vapidResponse = await fetch('/api/push/vapid-key');
      const { publicKey } = await vapidResponse.json();

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      // Send subscription to server
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (response.ok) {
        setIsSubscribed(true);
        return true;
      } else {
        throw new Error('Falha ao registrar subscription no servidor');
      }
    } catch (err: any) {
      console.error('Erro ao subscrever push notifications:', err);
      setError(err.message || 'Erro ao ativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !user) {
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from browser
        await subscription.unsubscribe();

        // Notify server
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }

      setIsSubscribed(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao desativar push notifications:', err);
      setError(err.message || 'Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, user]);

  const testNotification = useCallback(async (): Promise<boolean> => {
    if (!isSubscribed || !user) {
      setError('Não subscrito ou usuário não logado');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();
      
      if (result.success) {
        return true;
      } else {
        throw new Error(result.message || 'Falha ao enviar notificação de teste');
      }
    } catch (err: any) {
      console.error('Erro ao testar notificação:', err);
      setError(err.message || 'Erro ao enviar notificação de teste');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSubscribed, user]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    subscribe,
    unsubscribe,
    testNotification,
    error
  };
}