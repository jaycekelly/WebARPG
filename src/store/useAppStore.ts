import { create } from 'zustand';

export type AppLocation = 'town' | 'dungeon' | 'editor';

interface AppState {
  location: AppLocation;
  vendorOpen: boolean;
  skillTreeOpen: boolean;
  scaleFactor: number;
  isPaused: boolean;
  pauseTimeOffset: number;
  pauseStartTime: number | null;
  setLocation: (loc: AppLocation) => void;
  setVendorOpen: (isOpen: boolean) => void;
  setSkillTreeOpen: (isOpen: boolean) => void;
  setScaleFactor: (scale: number) => void;
  setPaused: (paused: boolean) => void;
  togglePause: () => void;
  getGameTime: () => number;
}

export const useAppStore = create<AppState>((set, get) => ({
  location: 'town', // Start in town!
  vendorOpen: false,
  skillTreeOpen: false,
  scaleFactor: 1.0,
  isPaused: false,
  pauseTimeOffset: 0,
  pauseStartTime: null,
  setLocation: (location) => set({ location, vendorOpen: false, skillTreeOpen: false }), // Auto close on move
  setVendorOpen: (vendorOpen) => set({ vendorOpen }),
  setSkillTreeOpen: (skillTreeOpen) => set({ skillTreeOpen }),
  setScaleFactor: (scaleFactor) => set({ scaleFactor }),
  setPaused: (isPaused) => set((state) => {
    if (isPaused === state.isPaused) return {};
    if (isPaused) {
      return { isPaused, pauseStartTime: Date.now() };
    } else {
      const now = Date.now();
      const elapsed = state.pauseStartTime ? now - state.pauseStartTime : 0;
      return { isPaused, pauseStartTime: null, pauseTimeOffset: state.pauseTimeOffset + elapsed };
    }
  }),
  togglePause: () => set((state) => {
    const nextPaused = !state.isPaused;
    if (nextPaused) {
      return { isPaused: nextPaused, pauseStartTime: Date.now() };
    } else {
      const now = Date.now();
      const elapsed = state.pauseStartTime ? now - state.pauseStartTime : 0;
      return { isPaused: nextPaused, pauseStartTime: null, pauseTimeOffset: state.pauseTimeOffset + elapsed };
    }
  }),
  getGameTime: () => {
    const state = get();
    const now = Date.now();
    if (state.isPaused && state.pauseStartTime) {
      return now - state.pauseTimeOffset - (now - state.pauseStartTime);
    }
    return now - state.pauseTimeOffset;
  }
}));
