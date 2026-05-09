import { create } from 'zustand';
import { CalendarEventView } from '../types';

interface EventsState {
  events: CalendarEventView[];
  setEvents: (events: CalendarEventView[]) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
}));
