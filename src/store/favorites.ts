import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FavoriteItem } from '@/types';

interface FavoritesStore {
  favorites: FavoriteItem[];
  
  addFavorite: (item: Omit<FavoriteItem, 'id'>) => void;
  removeFavorite: (endpointId: string) => void;
  toggleFavorite: (item: Omit<FavoriteItem, 'id'>) => void;
  isFavorite: (endpointId: string) => boolean;
  clearFavorites: () => void;
  reorderFavorites: (startIndex: number, endIndex: number) => void;
}

export const useFavoritesStore = create<FavoritesStore>()(
  persist(
    (set, get) => ({
      favorites: [],
      
      addFavorite: (item) => {
        const newItem: FavoriteItem = { ...item, id: `${item.endpointId}-${Date.now()}` };
        set((state) => ({ favorites: [...state.favorites, newItem] }));
      },
      
      removeFavorite: (endpointId) => {
        set((state) => ({
          favorites: state.favorites.filter((f) => f.endpointId !== endpointId),
        }));
      },
      
      toggleFavorite: (item) => {
        const { isFavorite, addFavorite, removeFavorite } = get();
        if (isFavorite(item.endpointId)) {
          removeFavorite(item.endpointId);
        } else {
          addFavorite(item);
        }
      },
      
      isFavorite: (endpointId) => {
        return get().favorites.some((f) => f.endpointId === endpointId);
      },
      
      clearFavorites: () => set({ favorites: [] }),
      
      reorderFavorites: (startIndex: number, endIndex: number) => {
        set((state) => {
          const newFavorites = [...state.favorites];
          const [removed] = newFavorites.splice(startIndex, 1);
          newFavorites.splice(endIndex, 0, removed);
          return { favorites: newFavorites };
        });
      },
    }),
    {
      name: 'api-explorer-favorites',
    }
  )
);
