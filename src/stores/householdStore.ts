import { create } from 'zustand';
import { Household } from '../types';

interface HouseholdState {
  household: Household | null;
  setHousehold: (h: Household | null) => void;
}

export const useHouseholdStore = create<HouseholdState>((set) => ({
  household: null,
  setHousehold: (h) => set({ household: h }),
}));
