import { create } from 'zustand';

interface LightingState {
  ambientDarkness: number;
  playerLightRadiusDungeon: number;
  minBrightness: number;
  memoryFogOpacity: number;
}

export const useLightingStore = create<LightingState>(() => ({
  ambientDarkness: 0.75,
  playerLightRadiusDungeon: 6.5,
  minBrightness: 0.12,
  memoryFogOpacity: 0.75,
}));
