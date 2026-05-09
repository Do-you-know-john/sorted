import { useEffect, useRef } from 'react';
import { useEventsStore } from '../stores/eventsStore';
import { useAuthStore } from '../stores/authStore';
import { scheduleAllNotifications } from '../services/notifications';
import i18n from '../i18n';

export function useNotificationScheduler() {
  const events = useEventsStore((s) => s.events);
  const appUser = useAuthStore((s) => s.appUser);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!appUser) return;

    // Debounce: events can fire rapidly from Firestore snapshots
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      scheduleAllNotifications(
        events,
        appUser.notificationMorningHour ?? 7,
        appUser.notificationMorningMinute ?? 30,
        appUser.notificationPreEventMinutes ?? 30,
        i18n.language,
      );
    }, 3000);

    return () => clearTimeout(timerRef.current);
  }, [events, appUser]);
}
