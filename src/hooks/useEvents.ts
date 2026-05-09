import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useEventsStore } from '../stores/eventsStore';
import { subscribeToEvents } from '../services/events';

export function useEvents() {
  const uid = useAuthStore((s) => s.firebaseUser?.uid);
  const { events, setEvents } = useEventsStore();

  useEffect(() => {
    if (!uid) return;
    return subscribeToEvents(uid, setEvents);
  }, [uid]);

  return events;
}
