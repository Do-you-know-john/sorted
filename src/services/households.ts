import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
  getDocs,
  writeBatch,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { Household } from '../types';
import { INVITE_CODE_LENGTH, INVITE_CODE_TTL_HOURS } from '../constants';

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0,O,1,I)
  return Array.from({ length: INVITE_CODE_LENGTH }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

export async function createHousehold(
  name: string, uid: string, displayName: string, email: string, avatarId?: string,
): Promise<string> {
  const ref = doc(collection(db, 'households'));
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + INVITE_CODE_TTL_HOURS * 60 * 60 * 1000)
  );

  await setDoc(ref, {
    name,
    createdBy: uid,
    avatarId: avatarId ?? null,
    members: {
      [uid]: { uid, displayName, email, role: 'admin', joinedAt: serverTimestamp() },
    },
    inviteCode: generateInviteCode(),
    inviteCodeExpiresAt: expiresAt,
    createdAt: serverTimestamp(),
  });

  await updateDoc(doc(db, 'users', uid), {
    householdIds: arrayUnion(ref.id),
    activeHouseholdId: ref.id,
  });

  return ref.id;
}

export async function joinHousehold(code: string, uid: string, displayName: string, email: string): Promise<string> {
  const q = query(collection(db, 'households'), where('inviteCode', '==', code.toUpperCase()));
  const snap = await getDocs(q);

  if (snap.empty) throw new Error('Invalid invite code.');

  const householdDoc = snap.docs[0];
  const household = householdDoc.data() as Household;

  if (household.inviteCodeExpiresAt.toDate() < new Date()) {
    throw new Error('Invite code has expired. Ask the household admin to generate a new one.');
  }

  if (household.members[uid]) {
    throw new Error('You are already a member of this household.');
  }

  await updateDoc(doc(db, 'households', householdDoc.id), {
    [`members.${uid}`]: { uid, displayName, email, role: 'member', joinedAt: serverTimestamp() },
  });

  await updateDoc(doc(db, 'users', uid), {
    householdIds: arrayUnion(householdDoc.id),
    activeHouseholdId: householdDoc.id,
  });

  return householdDoc.id;
}

export async function refreshInviteCode(householdId: string): Promise<string> {
  const newCode = generateInviteCode();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + INVITE_CODE_TTL_HOURS * 60 * 60 * 1000)
  );
  await updateDoc(doc(db, 'households', householdId), {
    inviteCode: newCode,
    inviteCodeExpiresAt: expiresAt,
  });
  return newCode;
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const snap = await getDoc(doc(db, 'households', householdId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Household;
}

export async function updateHouseholdAvatar(householdId: string, avatarId: string): Promise<void> {
  await updateDoc(doc(db, 'households', householdId), { avatarId });
}

export async function getTodoCount(householdId: string): Promise<number> {
  const snap = await getDocs(
    query(collection(db, 'todos'), where('householdId', '==', householdId))
  );
  return snap.size;
}

export async function deleteHousehold(
  householdId: string,
  uid: string,
  remainingHouseholdIds: string[]
): Promise<void> {
  // Delete all todos belonging to this household in batches of 500
  const todosSnap = await getDocs(
    query(collection(db, 'todos'), where('householdId', '==', householdId))
  );
  const batches: ReturnType<typeof writeBatch>[] = [];
  let batch = writeBatch(db);
  let count = 0;
  for (const todoDoc of todosSnap.docs) {
    batch.delete(todoDoc.ref);
    count++;
    if (count === 499) {
      batches.push(batch);
      batch = writeBatch(db);
      count = 0;
    }
  }
  batches.push(batch);
  await Promise.all(batches.map((b) => b.commit()));

  // Update the deleting user's own document
  const nextHouseholdId = remainingHouseholdIds.find((id) => id !== householdId) ?? null;
  await updateDoc(doc(db, 'users', uid), {
    householdIds: arrayRemove(householdId),
    activeHouseholdId: nextHouseholdId,
  });

  // Delete the household document (Cloud Function handles other members' cleanup)
  await deleteDoc(doc(db, 'households', householdId));
}
