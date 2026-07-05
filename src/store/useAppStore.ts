import { create } from 'zustand';
import { useMessageStore } from './useMessageStore';

export type AppLocation = 'town' | 'dungeon' | 'editor';

interface AppState {
  location: AppLocation;
  vendorOpen: boolean;
  characterWindowOpen: boolean;
  characterWindowTab: 'inventory' | 'stats' | 'skills';
  isPaused: boolean;
  pauseTimeOffset: number;
  pauseStartTime: number | null;
  pixiFloorVisible: boolean;
  selectedLootDropId: string | null;
  setLocation: (loc: AppLocation) => void;
  setVendorOpen: (isOpen: boolean) => void;
  setCharacterWindowOpen: (isOpen: boolean) => void;
  setCharacterWindowTab: (tab: 'inventory' | 'stats' | 'skills') => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  togglePixiFloor: () => void;
  setSelectedLootDropId: (id: string | null) => void;
  getGameTime: () => number;
}

export const useAppStore = create<AppState>((set, get) => ({
  location: 'town', // Start in town!
  vendorOpen: false,
  characterWindowOpen: false,
  characterWindowTab: 'inventory',
  isPaused: false,
  pauseTimeOffset: 0,
  pauseStartTime: null,
  pixiFloorVisible: false,
  selectedLootDropId: null,
  setLocation: (location) => set({ location, vendorOpen: false, characterWindowOpen: false }), // Auto close on move
  setVendorOpen: (vendorOpen) => set({ vendorOpen }),
  setCharacterWindowOpen: (characterWindowOpen) => set({ characterWindowOpen }),
  setCharacterWindowTab: (characterWindowTab) => set({ characterWindowTab }),
  setPaused: (isPaused) => set((state) => {
    if (isPaused === state.isPaused) return {};
    if (isPaused) {
      useMessageStore.getState().addScreenMessage('below', 'TACTICAL PAUSE', 0);
      return { isPaused, pauseStartTime: Date.now() };
    } else {
      useMessageStore.getState().removeMessageByType('below');
      const now = Date.now();
      const elapsed = state.pauseStartTime ? now - state.pauseStartTime : 0;
      return { isPaused, pauseStartTime: null, pauseTimeOffset: state.pauseTimeOffset + elapsed };
    }
  }),
  togglePause: () => set((state) => {
    const nextPaused = !state.isPaused;
    if (nextPaused) {
      useMessageStore.getState().addScreenMessage('below', 'TACTICAL PAUSE', 0);
      return { isPaused: nextPaused, pauseStartTime: Date.now() };
    } else {
      useMessageStore.getState().removeMessageByType('below');
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
  }
}));
