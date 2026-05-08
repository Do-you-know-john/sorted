import { create } from 'zustand';
import { User } from 'firebase/auth';
import { AppUser } from '../types';

interface AuthState {
  firebaseUser: User | null;
  appUser: AppUser | null;
  isLoading: boolean;
  setFirebaseUser: (user: User | null) => void;
  setAppUser: (user: AppUser | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  firebaseUser: null,
  appUser: null,
  isLoading: true,
  setFirebaseUser: (user) => set({ firebaseUser: user }),
  setAppUser: (user) => set({ appUser: user }),
  setLoading: (loading) => set({ isLoading: loading }),
}));
