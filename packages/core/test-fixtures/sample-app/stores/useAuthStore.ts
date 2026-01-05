// Zustand store example
import { create } from 'zustand';

interface AuthState {
  user: { id: string; name: string } | null;
  isAuthenticated: boolean;
  login: (user: { id: string; name: string }) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
