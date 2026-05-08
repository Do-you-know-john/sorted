import { useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { useAuthStore } from '../stores/authStore';
import { AppUser } from '../types';

export function useAuthListener() {
  const { setFirebaseUser, setAppUser, setLoading } = useAuthStore();

  useEffect(() => {
    let userUnsub: (() => void) | null = null;

    const authUnsub = onAuthStateChanged(auth, (firebaseUser) => {
      setFirebaseUser(firebaseUser);

      if (userUnsub) {
        userUnsub();
        userUnsub = null;
      }

      if (firebaseUser) {
        userUnsub = onSnapshot(doc(db, 'users', firebaseUser.uid), async (snap) => {
          if (snap.exists()) {
            const data = snap.data() as AppUser;
            setAppUser({ id: snap.id, ...data } as unknown as AppUser);

            // Auto-repair: if user has households but activeHouseholdId is null,
            // set the first available household as active. Skip setLoading until
            // the repaired snapshot arrives to prevent a flash of the setup screen.
            if (!data.activeHouseholdId && data.householdIds?.length > 0) {
              try {
                await updateDoc(doc(db, 'users', firebaseUser.uid), {
                  activeHouseholdId: data.householdIds[0],
                });
                return;
              } catch {
                // Repair failed — fall through and let routing handle it
              }
            }
          }
          setLoading(false);
        });
      } else {
        setAppUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsub();
      if (userUnsub) userUnsub();
    };
  }, []);
}
