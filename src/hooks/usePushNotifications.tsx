import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export function usePushNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if ('Notification' in window && 'serviceWorker' in navigator) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) {
      toast.error('Push notifications are not supported in this browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifications enabled! You\'ll receive match reminders.');
        return true;
      } else if (result === 'denied') {
        toast.error('Notifications blocked. Enable them in your browser settings.');
        return false;
      }
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Failed to enable notifications');
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          icon: '/favicon.png',
          badge: '/favicon.png',
          ...options,
        });
      });
    } else {
      new Notification(title, {
        icon: '/favicon.png',
        ...options,
      });
    }
  }, [permission]);

  // Schedule a local notification for match reminders
  const scheduleMatchReminder = useCallback((
    matchId: string,
    homeTeam: string,
    awayTeam: string,
    matchDate: Date,
    reminderMinutesBefore: number = 60
  ) => {
    if (permission !== 'granted') return;

    const reminderTime = new Date(matchDate.getTime() - reminderMinutesBefore * 60 * 1000);
    const now = new Date();

    if (reminderTime <= now) return; // Already passed

    const timeUntilReminder = reminderTime.getTime() - now.getTime();

    // Only schedule if within 24 hours
    if (timeUntilReminder > 24 * 60 * 60 * 1000) return;

    setTimeout(() => {
      showNotification(`⚽ ${homeTeam} vs ${awayTeam}`, {
        body: `Match starts in ${reminderMinutesBefore} minutes! Don't forget to update your prediction.`,
        tag: `match-reminder-${matchId}`,
        requireInteraction: true,
        data: { matchId, url: '/matches' }
      });
    }, timeUntilReminder);

    console.log(`Scheduled reminder for ${homeTeam} vs ${awayTeam} in ${Math.round(timeUntilReminder / 60000)} minutes`);
  }, [permission, showNotification]);

  return {
    isSupported,
    permission,
    isEnabled: permission === 'granted',
    requestPermission,
    showNotification,
    scheduleMatchReminder,
  };
}
