import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { ThemePreference } from '../types';

export async function updateDisplayName(displayName: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  await updateProfile(user, { displayName });
  await updateDoc(doc(db, 'users', user.uid), { displayName });
}

export async function updateThemePreference(pref: ThemePreference): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  await updateDoc(doc(db, 'users', user.uid), { themePreference: pref });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const user = auth.currentUser;
  if (!user || !user.email) throw new Error('Not logged in.');
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

export async function updateNotificationPrefs(
  morningHour: number,
  morningMinute: number,
  preEventMinutes: number,
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');
  await updateDoc(doc(db, 'users', user.uid), {
    notificationMorningHour: morningHour,
    notificationMorningMinute: morningMinute,
    notificationPreEventMinutes: preEventMinutes,
  });
}
