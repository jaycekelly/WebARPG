import { create } from 'zustand';

export type AppLocation = 'town' | 'dungeon' | 'editor';

interface AppState {
  location: AppLocation;
  vendorOpen: boolean;
  skillTreeOpen: boolean;
  scaleFactor: number;
  setLocation: (loc: AppLocation) => void;
  setVendorOpen: (isOpen: boolean) => void;
  setSkillTreeOpen: (isOpen: boolean) => void;
  setScaleFactor: (scale: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  location: 'town', // Start in town!
  vendorOpen: false,
  skillTreeOpen: false,
  scaleFactor: 1.0,
  setLocation: (location) => set({ location, vendorOpen: false, skillTreeOpen: false }), // Auto close on move
  setVendorOpen: (vendorOpen) => set({ vendorOpen }),
  setSkillTreeOpen: (skillTreeOpen) => set({ skillTreeOpen }),
  setScaleFactor: (scaleFactor) => set({ scaleFactor })
}));
