import { Timestamp } from 'firebase/firestore';

export type UserRole = 'admin' | 'member';

export interface HouseholdMember {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  joinedAt: Timestamp;
  avatarId?: string | null;
  photoURL?: string | null;
  avatarColor?: string | null;
}

export interface Household {
  id: string;
  name: string;
  createdBy: string;
  members: Record<string, HouseholdMember>;
  inviteCode: string;
  inviteCodeExpiresAt: Timestamp;
  createdAt: Timestamp;
  avatarId?: string | null;
}

export type RecurrenceType = 'daily' | 'weekly' | 'monthly';

export interface RecurrenceRule {
  type: RecurrenceType;
  days?: number[];      // weekly: 0=Sun 1=Mon … 6=Sat
  dayOfMonth?: number;  // monthly: 1–31
}

export type TodoStatus = 'pending' | 'completed';
export type TodoPriority = 'normal' | 'urgent';

export interface Todo {
  id: string;
  householdId: string;
  title: string;
  description?: string;
  createdBy: string;
  assignedTo: string[]; // user uids
  visibleTo: string[]; // user uids, empty = visible to all members
  notifyOnComplete: string[]; // user uids
  notifyOnOverdue: string[]; // user uids
  dueFrom: Timestamp | null;
  dueDate: Timestamp | null;
  status: TodoStatus;
  priority?: TodoPriority;
  completedAt: Timestamp | null;
  completedBy: string | null;
  createdAt: Timestamp;
  recurrence?: RecurrenceRule | null;
}

export interface ShoppingCategory {
  id: string;
  householdId: string;
  name: string;
  sortOrder: number;
  createdAt: Timestamp;
}

export interface ShoppingItem {
  id: string;
  householdId: string;
  name: string;
  quantity: number;
  categoryId: string | null;
  bought: boolean;
  boughtAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
}

export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  fcmToken?: string;
  householdIds: string[];
  activeHouseholdId: string | null;
  createdAt: Timestamp;
  avatarId?: string | null;
  photoURL?: string | null;
  avatarColor?: string | null;
  themePreference?: ThemePreference;
  notificationMorningHour?: number;
  notificationMorningMinute?: number;
  notificationPreEventMinutes?: number;
}

export type EventVisibility = 'private' | 'household' | 'contacts' | 'custom';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Timestamp;
  endDate: Timestamp;
  allDay: boolean;
  authorId: string;
  householdId: string;
  assignedTo: string[];
  visibility: EventVisibility;
  visibleToHouseholds: string[];
  visibleToUsers: string[];
  viewerIds: string[];
  blockerIds: string[];
  color?: string;
  createdAt: Timestamp;
}

// Client-side view model: adds isBlocker flag computed from which query matched
export interface CalendarEventView extends CalendarEvent {
  isBlocker: boolean;
}
