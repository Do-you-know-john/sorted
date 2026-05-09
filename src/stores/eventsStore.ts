import { create } from 'zustand';
import { CalendarEvent } from '../types';

interface EventsState {
  events: CalendarEvent[];
  setEvents: (events: CalendarEvent[]) => void;
}

export const useEventsStore = create<EventsState>((set) => ({
  events: [],
  setEvents: (events) => set({ events }),
}));
