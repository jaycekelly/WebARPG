import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface CharacterMeta {
  id: string;
  name: string;
  level: number;
  playerClass: string;
  lastPlayed: number;
}

interface MetaState {
  characters: CharacterMeta[];
  activeCharacterId: string | null;
  addCharacter: (char: CharacterMeta) => void;
  updateCharacter: (id: string, updates: Partial<CharacterMeta>) => void;
  setActiveCharacter: (id: string | null) => void;
  deleteCharacter: (id: string) => void;
}

export const useMetaStore = create<MetaState>()(
  persist(
    (set) => ({
      characters: [],
      activeCharacterId: null,
      addCharacter: (char) => set((state) => ({ characters: [...state.characters, char] })),
      updateCharacter: (id, updates) => set((state) => ({
        characters: state.characters.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      setActiveCharacter: (id) => set({ activeCharacterId: id }),
      deleteCharacter: (id) => set((state) => ({ characters: state.characters.filter(c => c.id !== id) }))
    }),
    {
      name: 'webarpg-meta',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
