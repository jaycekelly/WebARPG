import { create } from 'zustand';
import type { StatModifier, StatType } from '../engine/stats/types';
import { StatCalculator } from '../engine/stats/StatCalculator';

interface StatsState {
  modifiers: StatModifier[];
  
  // Actions
  addModifier: (mod: StatModifier) => void;
  removeModifier: (id: string) => void;
  removeModifiersBySource: (sourceId: string) => void;
  
  // Derived / Getters
  getStat: (stat: StatType) => number;
  getAllStats: () => Record<StatType, number>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  modifiers: [
    { id: 'base_health', sourceId: 'base_character', stat: 'Health', type: 'flat', value: 40 },
    { id: 'base_mana', sourceId: 'base_character', stat: 'Mana', type: 'flat', value: 40 },
    { id: 'base_attack', sourceId: 'base_character', stat: 'AttackSpeed', type: 'flat', value: 0.33 },
    { id: 'base_damage', sourceId: 'base_character', stat: 'Damage', type: 'flat', value: 10 },
    { id: 'base_move', sourceId: 'base_character', stat: 'MoveSpeed', type: 'flat', value: 1.33 },
  ],

  addModifier: (mod) => set((state) => ({
    modifiers: [...state.modifiers, mod]
  })),

  removeModifier: (id) => set((state) => ({
    modifiers: state.modifiers.filter(m => m.id !== id)
  })),

  removeModifiersBySource: (sourceId) => set((state) => ({
    modifiers: state.modifiers.filter(m => m.sourceId !== sourceId)
  })),

  getStat: (stat) => {
    const mods = get().modifiers.filter(m => m.stat === stat);
    return StatCalculator.calculateFinalStat(mods);
  },

  getAllStats: () => {
    return StatCalculator.computeAllStats(get().modifiers);
  }
}));
