import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState } from '@/types';

interface AuthStore extends AuthState {
  setToken: (token: string) => void;
  setTokenType: (tokenType: string) => void;
  clearToken: () => void;
  getAuthHeader: () => Record<string, string>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      token: '',
      tokenType: 'Bearer',
      
      setToken: (token) => set({ token }),
      setTokenType: (tokenType) => set({ tokenType }),
      clearToken: () => set({ token: '', tokenType: 'Bearer' }),
      getAuthHeader: () => {
        const { token, tokenType } = get();
        if (!token) return {} as Record<string, string>;
        return { Authorization: `${tokenType} ${token}` };
      },
    }),
    {
      name: 'api-explorer-auth',
    }
  )
);
