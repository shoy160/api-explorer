import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppSettings } from '@/types';

interface SettingsStore extends AppSettings {
  updateTheme: (theme: 'light' | 'dark') => void;
  updateLanguage: (language: 'zh' | 'en') => void;
  updateFontSize: (fontSize: 'small' | 'medium' | 'large' | 'custom') => void;
  updateCustomFontSize: (customFontSize: number) => void;
  toggleTheme: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      language: 'zh',
      fontSize: 'medium',
      customFontSize: 14,
      
      updateTheme: (theme) => set({ theme }),
      updateLanguage: (language) => set({ language }),
      updateFontSize: (fontSize) => set({ fontSize }),
      updateCustomFontSize: (customFontSize) => set({ customFontSize }),
      toggleTheme: () => {
        const current = get().theme;
        set({ theme: current === 'light' ? 'dark' : 'light' });
      },
    }),
    {
      name: 'api-explorer-settings',
    }
  )
);
