import { create } from 'zustand';
import { useMessageStore } from './useMessageStore';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dualStorage } from './storage';

export type AppLocation = 'town' | 'dungeon' | 'editor';

interface AppState {
  location: AppLocation;
  vendorOpen: boolean;
  characterWindowOpen: boolean;
  characterWindowTab: 'inventory' | 'skills' | 'active_skills';
  statsPopoutOpen: boolean;
  isPaused: boolean;
  dungeonSelectOpen: boolean;
  escapeMenuOpen: boolean;
  pauseTimeOffset: number;
  pauseStartTime: number | null;
  pixiFloorVisible: boolean;
  selectedLootDropId: string | null;
  setLocation: (loc: AppLocation) => void;
  setVendorOpen: (isOpen: boolean) => void;
  setCharacterWindowOpen: (isOpen: boolean) => void;
  setCharacterWindowTab: (tab: 'inventory' | 'skills' | 'active_skills') => void;
  setStatsPopoutOpen: (isOpen: boolean) => void;
  setDungeonSelectOpen: (isOpen: boolean) => void;
  setEscapeMenuOpen: (isOpen: boolean) => void;
  setPaused: (paused: boolean, silent?: boolean) => void;
  togglePause: () => void;
  togglePixiFloor: () => void;
  setSelectedLootDropId: (id: string | null) => void;
  getGameTime: () => number;
  
  // Anti-save scumming / Offline time freeze
  lastActiveTime: number | null;
  updateLastActiveTime: () => void;
  resumeFromBackground: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      location: 'town', // Start in town!
  vendorOpen: false,
  characterWindowOpen: false,
  characterWindowTab: 'inventory',
  statsPopoutOpen: false,
  dungeonSelectOpen: false,
  escapeMenuOpen: false,
  isPaused: false,
  pauseTimeOffset: 0,
  pauseStartTime: null,
  pixiFloorVisible: false,
  selectedLootDropId: null,
  setLocation: (location) => set({ location, vendorOpen: false, characterWindowOpen: false }), // Auto close on move
  setVendorOpen: (vendorOpen) => set({ vendorOpen }),
  setCharacterWindowOpen: (isOpen) => set(() => ({ 
    characterWindowOpen: isOpen,
    ...(isOpen ? {} : { statsPopoutOpen: false })
  })),
  setCharacterWindowTab: (characterWindowTab) => set({ characterWindowTab }),
  setStatsPopoutOpen: (statsPopoutOpen) => set({ statsPopoutOpen }),
  setDungeonSelectOpen: (dungeonSelectOpen) => set({ dungeonSelectOpen }),
  setEscapeMenuOpen: (escapeMenuOpen) => set({ escapeMenuOpen }),
  setPaused: (isPaused, silent = false) => set((state) => {
    if (isPaused === state.isPaused) return {};
    if (isPaused) {
      if (!silent) useMessageStore.getState().addScreenMessage('top', 'TACTICAL PAUSE', 0);
      return { isPaused, pauseStartTime: Date.now() };
    } else {
      useMessageStore.getState().removeMessageByType('top');
      const now = Date.now();
      const elapsed = state.pauseStartTime ? now - state.pauseStartTime : 0;
      return { isPaused, pauseStartTime: null, pauseTimeOffset: state.pauseTimeOffset + elapsed };
    }
  }),
  togglePause: () => set((state) => {
    const nextPaused = !state.isPaused;
    if (nextPaused) {
      useMessageStore.getState().addScreenMessage('top', 'TACTICAL PAUSE', 0);
      return { isPaused: nextPaused, pauseStartTime: Date.now() };
    } else {
      useMessageStore.getState().removeMessageByType('top');
      const now = Date.now();
      const elapsed = state.pauseStartTime ? now - state.pauseStartTime : 0;
      return { isPaused: nextPaused, pauseStartTime: null, pauseTimeOffset: state.pauseTimeOffset + elapsed };
    }
  }),
  togglePixiFloor: () => set((state) => ({ pixiFloorVisible: !state.pixiFloorVisible })),
  setSelectedLootDropId: (id) => set({ selectedLootDropId: id }),
  getGameTime: () => {
    const state = get();
    const now = Date.now();
    if (state.isPaused && state.pauseStartTime) {
      return now - state.pauseTimeOffset - (now - state.pauseStartTime);
    }
    return now - state.pauseTimeOffset;
  },
  
  lastActiveTime: null,
  updateLastActiveTime: () => set({ lastActiveTime: Date.now() }),
  resumeFromBackground: () => set((state) => {
    if (state.lastActiveTime) {
      const elapsed = Date.now() - state.lastActiveTime;
      if (elapsed > 0) {
        return { 
          pauseTimeOffset: state.pauseTimeOffset + elapsed,
          lastActiveTime: null 
        };
      }
    }
    return { lastActiveTime: null };
  })
    }),
    {
      name: 'webarpg-app',
      storage: createJSONStorage(() => dualStorage),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.resumeFromBackground();
        }
      }
    }
  )
);
