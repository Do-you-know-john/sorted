import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp, Timestamp, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { CalendarEvent, EventVisibility, Household } from '../types';

export interface CreateEventInput {
  title: string;
  description: string;
  location: string;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  householdId: string;
  assignedTo: string[];
  visibility: EventVisibility;
  visibleToHouseholds: string[];
  visibleToUsers: string[];
  color: string;
}

export function computeViewerIds(
  authorId: string,
  visibility: EventVisibility,
  primaryHousehold: Household | null,
  allHouseholds: Household[],
  visibleToHouseholds: string[],
  visibleToUsers: string[],
): string[] {
  if (visibility === 'private') return [authorId];

  if (visibility === 'household') {
    if (!primaryHousehold) return [authorId];
    return Object.keys(primaryHousehold.members);
  }

  if (visibility === 'contacts') {
    const ids = new Set<string>();
    allHouseholds.forEach((h) => Object.keys(h.members).forEach((id) => ids.add(id)));
    return Array.from(ids);
  }

  // custom
  const ids = new Set<string>([authorId]);
  visibleToHouseholds.forEach((hId) => {
    const h = allHouseholds.find((hh) => hh.id === hId);
    if (h) Object.keys(h.members).forEach((id) => ids.add(id));
  });
  visibleToUsers.forEach((id) => ids.add(id));
  return Array.from(ids);
}

export async function fetchHouseholdsByIds(ids: string[]): Promise<Household[]> {
  if (ids.length === 0) return [];
  const results: Household[] = [];
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const snap = await getDocs(
      query(collection(db, 'households'), where('__name__', 'in', batch)),
    );
    snap.docs.forEach((d) => results.push({ id: d.id, ...d.data() } as Household));
  }
  return results;
}

export async function createEvent(
  input: CreateEventInput,
  authorId: string,
  viewerIds: string[],
): Promise<string> {
  const ref = await addDoc(collection(db, 'events'), {
    title: input.title,
    ...(input.description ? { description: input.description } : {}),
    ...(input.location ? { location: input.location } : {}),
    startDate: Timestamp.fromDate(input.startDate),
    endDate: Timestamp.fromDate(input.endDate),
    allDay: input.allDay,
    authorId,
    householdId: input.householdId,
    assignedTo: input.assignedTo,
    visibility: input.visibility,
    visibleToHouseholds: input.visibleToHouseholds,
    visibleToUsers: input.visibleToUsers,
    viewerIds,
    color: input.color,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(
  eventId: string,
  updates: Partial<CreateEventInput> & { viewerIds?: string[] },
): Promise<void> {
  const data: Record<string, unknown> = { ...updates };
  if (updates.startDate) data.startDate = Timestamp.fromDate(updates.startDate);
  if (updates.endDate) data.endDate = Timestamp.fromDate(updates.endDate);
  await updateDoc(doc(db, 'events', eventId), data);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

export function subscribeToEvents(
  uid: string,
  onData: (events: CalendarEvent[]) => void,
  onError?: (e: Error) => void,
): () => void {
  const q = query(
    collection(db, 'events'),
    where('viewerIds', 'array-contains', uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const events = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CalendarEvent));
      onData(events);
    },
    onError,
  );
}
