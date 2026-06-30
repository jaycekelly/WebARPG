import { create } from 'zustand';

interface TooltipState {
  content: React.ReactNode | null;
  setContent: (content: React.ReactNode | null) => void;
}

export const useTooltipStore = create<TooltipState>((set) => ({
  content: null,
  setContent: (content) => set({ content }),
}));
