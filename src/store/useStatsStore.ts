import { create } from 'zustand';
import type { StatModifier, StatType } from '../engine/stats/types';
import { StatCalculator } from '../engine/stats/StatCalculator';
import { useBuffStore } from './useBuffStore';

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
    let mods = get().modifiers.filter(m => m.stat === stat);
    
    // Add active buffs
    const playerBuffs = useBuffStore.getState().entityBuffs['player'] || [];
    playerBuffs.forEach(buff => {
      buff.statModifiers.forEach(mod => {
        if (mod.stat === stat) {
           mods.push({
             id: `${buff.id}_${mod.stat}`,
             sourceId: buff.buffId,
             stat: mod.stat,
             type: mod.type,
             value: mod.value * buff.stacks
           });
        }
      });
    });
    
    // Shorthand logic for getStat
    if (stat === 'FireResist' || stat === 'ColdResist' || stat === 'LightningResist') {
       const allEleMods = get().modifiers.filter(m => m.stat === 'AllElementalResist');
       playerBuffs.forEach(buff => {
         buff.statModifiers.forEach(mod => {
           if (mod.stat === 'AllElementalResist') {
             allEleMods.push({
               id: `${buff.id}_AllElementalResist`,
               sourceId: buff.buffId,
               stat: 'AllElementalResist',
               type: mod.type,
               value: mod.value * buff.stacks
             });
           }
         });
       });
       mods = mods.concat(allEleMods.map(m => ({ ...m, id: m.id + '_derived', stat: stat as StatType })));
    }
    
    if (stat === 'StrikeResist' || stat === 'PierceResist') {
       const physMods = get().modifiers.filter(m => m.stat === 'PhysicalResist');
       playerBuffs.forEach(buff => {
         buff.statModifiers.forEach(mod => {
           if (mod.stat === 'PhysicalResist') {
             physMods.push({
               id: `${buff.id}_PhysicalResist`,
               sourceId: buff.buffId,
               stat: 'PhysicalResist',
               type: mod.type,
               value: mod.value * buff.stacks
             });
           }
         });
       });
       mods = mods.concat(physMods.map(m => ({ ...m, id: m.id + '_derived', stat: stat as StatType })));
    }

    return StatCalculator.calculateFinalStat(mods);
  },

  getAllStats: () => {
    const mods = [...get().modifiers];
    
    // Add active buffs
    const playerBuffs = useBuffStore.getState().entityBuffs['player'] || [];
    playerBuffs.forEach(buff => {
      buff.statModifiers.forEach(mod => {
         mods.push({
           id: `${buff.id}_${mod.stat}`,
           sourceId: buff.buffId,
           stat: mod.stat,
           type: mod.type,
           value: mod.value * buff.stacks
         });
      });
    });

    const stats = StatCalculator.computeAllStats(mods);
    
    // Shorthand derived stats
    const allEle = stats['AllElementalResist'] || 0;
    if (allEle) {
      stats['FireResist'] = (stats['FireResist'] || 0) + allEle;
      stats['ColdResist'] = (stats['ColdResist'] || 0) + allEle;
      stats['LightningResist'] = (stats['LightningResist'] || 0) + allEle;
    }
    
    const physRes = stats['PhysicalResist'] || 0;
    if (physRes) {
      stats['StrikeResist'] = (stats['StrikeResist'] || 0) + physRes;
      stats['PierceResist'] = (stats['PierceResist'] || 0) + physRes;
    }

    return stats;
  }
}));
