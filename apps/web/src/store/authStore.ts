import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  email: string | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  setAuth: (email: string, isAdmin: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      email: null,
      isAuthenticated: false,
      isAdmin: false,
      setAuth: (email, isAdmin) => set({ email, isAuthenticated: true, isAdmin }),
      logout: () => set({ email: null, isAuthenticated: false, isAdmin: false }),
    }),
    { name: 'photogal-auth', storage: createJSONStorage(() => sessionStorage) },
  ),
);
