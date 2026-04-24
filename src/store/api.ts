import { create } from 'zustand';
import type { ParsedOpenApi, ApiEndpoint } from '@/types';

interface ApiState {
  documents: ParsedOpenApi[];
  currentDocIndex: number;
  selectedEndpoint: ApiEndpoint | null;
  searchQuery: string;
  loading: boolean;
  error: string | null;
  activeTab: 'parameters' | 'test' | 'response';
  
  setDocuments: (docs: ParsedOpenApi[]) => void;
  selectDocument: (index: number) => void;
  selectEndpoint: (endpoint: ApiEndpoint | null) => void;
  setSearchQuery: (query: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveTab: (tab: 'parameters' | 'test' | 'response') => void;
}

export const useApiStore = create<ApiState>((set) => ({
  documents: [],
  currentDocIndex: 0,
  selectedEndpoint: null,
  searchQuery: '',
  loading: false,
  error: null,
  activeTab: 'parameters',
  
  setDocuments: (docs) => set({ documents: docs }),
  selectDocument: (index) => set({ currentDocIndex: index, selectedEndpoint: null }),
  selectEndpoint: (endpoint) => set({ selectedEndpoint: endpoint }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
