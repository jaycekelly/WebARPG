import { create } from 'zustand';

export type AppLocation = 'town' | 'dungeon' | 'editor';

interface AppState {
  location: AppLocation;
  vendorOpen: boolean;
  skillTreeOpen: boolean;
  setLocation: (loc: AppLocation) => void;
  setVendorOpen: (isOpen: boolean) => void;
  setSkillTreeOpen: (isOpen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  location: 'town', // Start in town!
  vendorOpen: false,
  skillTreeOpen: false,
  setLocation: (location) => set({ location, vendorOpen: false, skillTreeOpen: false }), // Auto close on move
  setVendorOpen: (vendorOpen) => set({ vendorOpen }),
  setSkillTreeOpen: (skillTreeOpen) => set({ skillTreeOpen })
}));
