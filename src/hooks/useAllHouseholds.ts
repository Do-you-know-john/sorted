import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Household } from '../types';

export function useAllHouseholds(householdIds: string[]) {
  const [households, setHouseholds] = useState<Household[]>([]);

  useEffect(() => {
    if (householdIds.length === 0) { setHouseholds([]); return; }

    const results: Record<string, Household> = {};
    const unsubs = householdIds.map((id) =>
      onSnapshot(doc(db, 'households', id), (snap) => {
        if (snap.exists()) {
          results[id] = { id: snap.id, ...snap.data() } as Household;
        }
        setHouseholds(householdIds.map((hid) => results[hid]).filter(Boolean));
      })
    );

    return () => unsubs.forEach((u) => u());
  }, [householdIds.join(',')]);

  return households;
}
