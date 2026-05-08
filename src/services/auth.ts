import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

export async function register(email: string, password: string, displayName: string) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName });

  await setDoc(doc(db, 'users', credential.user.uid), {
    uid: credential.user.uid,
    email,
    displayName,
    householdIds: [],
    activeHouseholdId: null,
    createdAt: serverTimestamp(),
  });

  return credential.user;
}

export async function login(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
}

export async function logout() {
  await signOut(auth);
}
