import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryItem } from '@/types';

interface HistoryStore {
  history: HistoryItem[];
  maxItems: number;
  
  addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  removeHistory: (id: string) => void;
  clearHistory: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      history: [],
      maxItems: 50,
      
      addHistory: (item) => {
        const newItem: HistoryItem = {
          ...item,
          id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
        };
        set((state) => {
          let updated = [newItem, ...state.history];
          if (updated.length > state.maxItems) {
            updated = updated.slice(0, state.maxItems);
          }
          return { history: updated };
        });
      },
      
      removeHistory: (id) => {
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        }));
      },
      
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'api-explorer-history',
    }
  )
);
