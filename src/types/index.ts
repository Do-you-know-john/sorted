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
}

export type TodoStatus = 'pending' | 'completed';

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
  dueDate: Timestamp | null;
  status: TodoStatus;
  completedAt: Timestamp | null;
  completedBy: string | null;
  createdAt: Timestamp;
}

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
}
