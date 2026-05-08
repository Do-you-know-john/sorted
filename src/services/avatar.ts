import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, writeBatch } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from './firebase';

export async function updatePresetAvatar(avatarId: string, householdIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), { avatarId, photoURL: null });
  for (const hId of householdIds) {
    batch.update(doc(db, 'households', hId), {
      [`members.${user.uid}.avatarId`]: avatarId,
      [`members.${user.uid}.photoURL`]: null,
    });
  }
  await batch.commit();
}

export async function pickAndUploadAvatarPhoto(householdIds: string[]): Promise<string | null> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');

  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (permission.status !== 'granted') return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });

  if (result.canceled || !result.assets[0]) return null;

  const response = await fetch(result.assets[0].uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `avatars/${user.uid}`);
  await uploadBytes(storageRef, blob);
  const photoURL = await getDownloadURL(storageRef);

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), { photoURL, avatarId: null });
  for (const hId of householdIds) {
    batch.update(doc(db, 'households', hId), {
      [`members.${user.uid}.photoURL`]: photoURL,
      [`members.${user.uid}.avatarId`]: null,
    });
  }
  await batch.commit();

  return photoURL;
}

export async function removeAvatar(householdIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in.');

  try {
    await deleteObject(ref(storage, `avatars/${user.uid}`));
  } catch { /* file may not exist */ }

  const batch = writeBatch(db);
  batch.update(doc(db, 'users', user.uid), { avatarId: null, photoURL: null });
  for (const hId of householdIds) {
    batch.update(doc(db, 'households', hId), {
      [`members.${user.uid}.avatarId`]: null,
      [`members.${user.uid}.photoURL`]: null,
    });
  }
  await batch.commit();
}
