import { useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useHouseholdStore } from '../stores/householdStore';
import { Household } from '../types';

export function useHouseholdListener(householdId: string | null) {
  const setHousehold = useHouseholdStore((s) => s.setHousehold);

  useEffect(() => {
    if (!householdId) {
      setHousehold(null);
      return;
    }

    const unsub = onSnapshot(doc(db, 'households', householdId), (snap) => {
      if (snap.exists()) {
        setHousehold({ id: snap.id, ...snap.data() } as Household);
      } else {
        setHousehold(null);
      }
    });

    return unsub;
  }, [householdId]);
}
