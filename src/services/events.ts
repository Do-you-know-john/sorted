import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp, Timestamp, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import { CalendarEvent, CalendarEventView, EventVisibility, Household } from '../types';

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

// All contacts of the author (members of all shared households) who are NOT already viewers.
// These people see the event only as an opaque blocker when they filter by an assignee.
export function computeBlockerIds(
  authorId: string,
  allAuthorHouseholds: Household[],
  viewerIds: string[],
): string[] {
  const viewerSet = new Set(viewerIds);
  const allContacts = new Set<string>();
  allAuthorHouseholds.forEach((h) =>
    Object.keys(h.members).forEach((id) => allContacts.add(id)),
  );
  return Array.from(allContacts).filter((id) => !viewerSet.has(id) && id !== authorId);
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
  blockerIds: string[],
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
    blockerIds,
    color: input.color,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateEvent(
  eventId: string,
  updates: Partial<CreateEventInput> & { viewerIds?: string[]; blockerIds?: string[] },
): Promise<void> {
  const data: Record<string, unknown> = { ...updates };
  if (updates.startDate) data.startDate = Timestamp.fromDate(updates.startDate);
  if (updates.endDate) data.endDate = Timestamp.fromDate(updates.endDate);
  await updateDoc(doc(db, 'events', eventId), data);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, 'events', eventId));
}

// Two parallel listeners: one for full-access events (viewerIds), one for blocker-only events
// (blockerIds). Results are merged; blocker events hidden behind viewer events if both match.
export function subscribeToEvents(
  uid: string,
  onData: (events: CalendarEventView[]) => void,
  onError?: (e: Error) => void,
): () => void {
  let fullMap = new Map<string, CalendarEvent>();
  let blockerMap = new Map<string, CalendarEvent>();

  function emit() {
    const result: CalendarEventView[] = [];
    fullMap.forEach((e) => result.push({ ...e, isBlocker: false }));
    blockerMap.forEach((e, id) => {
      if (!fullMap.has(id)) result.push({ ...e, isBlocker: true });
    });
    onData(result);
  }

  const unsub1 = onSnapshot(
    query(collection(db, 'events'), where('viewerIds', 'array-contains', uid)),
    (snap) => {
      fullMap = new Map(
        snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as CalendarEvent]),
      );
      emit();
    },
    onError,
  );

  const unsub2 = onSnapshot(
    query(collection(db, 'events'), where('blockerIds', 'array-contains', uid)),
    (snap) => {
      blockerMap = new Map(
        snap.docs.map((d) => [d.id, { id: d.id, ...d.data() } as CalendarEvent]),
      );
      emit();
    },
    onError,
  );

  return () => { unsub1(); unsub2(); };
}
