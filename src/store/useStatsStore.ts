import { create } from 'zustand';
import type { StatModifier, StatType } from '../engine/stats/types';
import { StatCalculator } from '../engine/stats/StatCalculator';
import { useBuffStore } from './useBuffStore';
import { usePlayerStore } from './usePlayerStore';
import { useSkillStore } from './useSkillStore';
import { SKILL_TREE } from '../data/skillTrees';
import type { ClassType } from '../engine/player/types';

const getTreeModifiers = (): StatModifier[] => {
    const treeMods: StatModifier[] = [];
    // Only safe to call inside the function body so we don't trigger errors before stores are init
    const skillState = useSkillStore.getState();
    const { playerClass, secondaryClass } = usePlayerStore.getState();

    const processClass = (cls: ClassType) => {
       const mPts = skillState.getTotalPointsSpent(cls);
       if (mPts > 0) {
          if (cls === 'Fighter') treeMods.push({ id: `mastery_${cls}_str`, sourceId: `mastery_${cls}`, stat: 'Strength', type: 'flat', value: mPts * 3 });
          else if (cls === 'Rogue') treeMods.push({ id: `mastery_${cls}_dex`, sourceId: `mastery_${cls}`, stat: 'Dexterity', type: 'flat', value: mPts * 3 });
          else if (cls === 'Mage') treeMods.push({ id: `mastery_${cls}_int`, sourceId: `mastery_${cls}`, stat: 'Intelligence', type: 'flat', value: mPts * 3 });
       }
       
       const tree = SKILL_TREE[cls] || [];
       for (const node of tree) {
          const pts = skillState.allocatedPoints[node.id] || 0;
          if (pts > 0 && node.type === 'passive' && node.statModifiers) {
             for (const mod of node.statModifiers) {
                treeMods.push({
                   ...mod,
                   id: `${node.id}_${mod.stat}`,
                   sourceId: `passive_${node.id}`,
                   value: mod.value * pts
                });
             }
          }
       }
    };
    
    if (playerClass) processClass(playerClass);
    if (secondaryClass) processClass(secondaryClass);

    return treeMods;
};

interface StatsState {
  modifiers: StatModifier[];
  
  // Actions
  addModifier: (mod: StatModifier) => void;
  removeModifier: (id: string) => void;
  removeModifiersBySource: (sourceId: string) => void;
  updateModifierValue: (id: string, value: number) => void;
  
  // Derived / Getters
  getStat: (stat: StatType) => number;
  getAllStats: () => Record<StatType, number>;
}

export const useStatsStore = create<StatsState>((set, get) => ({
  modifiers: [
    { id: 'base_health', sourceId: 'base_character', stat: 'Health', type: 'flat', value: 80 },
    { id: 'base_energy', sourceId: 'base_character', stat: 'Energy', type: 'flat', value: 30 },
    { id: 'base_damage', sourceId: 'base_character', stat: 'WeaponDamage', type: 'flat', value: 10 },
    { id: 'base_move', sourceId: 'base_character', stat: 'MoveSpeed', type: 'flat', value: 1.33 },
    { id: 'base_hp_regen', sourceId: 'base_character', stat: 'HealthRegeneration', type: 'flat', value: 0.5 },
    { id: 'base_energy_regen', sourceId: 'base_character', stat: 'EnergyRegeneration', type: 'flat', value: 2.5 },
    { id: 'base_deflect_amount', sourceId: 'base_character', stat: 'DeflectAmount', type: 'flat', value: 40 },
    { id: 'base_block_amount', sourceId: 'base_character', stat: 'BlockAmount', type: 'flat', value: 75 },
    { id: 'base_parry_amount', sourceId: 'base_character', stat: 'ParryAmount', type: 'flat', value: 50 },
    
    // Base Attributes
    { id: 'base_strength', sourceId: 'base_character', stat: 'Strength', type: 'flat', value: 5 },
    { id: 'base_dexterity', sourceId: 'base_character', stat: 'Dexterity', type: 'flat', value: 5 },
    { id: 'base_intelligence', sourceId: 'base_character', stat: 'Intelligence', type: 'flat', value: 5 },
    { id: 'base_vitality', sourceId: 'base_character', stat: 'Vitality', type: 'flat', value: 5 },
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
  
  updateModifierValue: (id, value) => set((state) => ({
    modifiers: state.modifiers.map(m => m.id === id ? { ...m, value } : m)
  })),

  getStat: (stat) => {
    let mods = get().modifiers.filter(m => m.stat === stat);
    
    // Add tree modifiers
    const treeMods = getTreeModifiers().filter(m => m.stat === stat);
    mods = mods.concat(treeMods);
    
    // Unarmed Weapon Damage fallback
    if (stat === 'WeaponDamage') {
      const externalWeaponMods = mods.filter(m => m.sourceId !== 'base_character');
      if (externalWeaponMods.length > 0) {
        // If a weapon provides WeaponDamage, ignore the base character unarmed damage
        mods = mods.filter(m => !(m.sourceId === 'base_character'));
      }
    }
    
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
    
    if (stat === 'Health') {
       const vit = get().getStat('Vitality');
       if (vit > 0) {
         mods.push({
           id: 'vit_health_bonus',
           sourceId: 'base_attributes',
           stat: 'Health',
           type: 'flat',
           value: vit * 4
         });
       }
    }

    if (stat === 'Energy') {
       const int = get().getStat('Intelligence');
       if (int > 0) {
         mods.push({
           id: 'int_energy_bonus',
           sourceId: 'base_attributes',
           stat: 'Energy',
           type: 'flat',
           value: int * 1
         });
       }
       const level = usePlayerStore.getState().level;
       if (level > 1) {
         mods.push({
           id: 'level_energy_bonus',
           sourceId: 'base_attributes',
           stat: 'Energy',
           type: 'flat',
           value: (level - 1) * 3
         });
       }
    }

    if (stat === 'HealthRegeneration') {
       const level = usePlayerStore.getState().level;
       if (level > 1) {
         mods.push({
           id: 'level_hp_regen_bonus',
           sourceId: 'base_attributes',
           stat: 'HealthRegeneration',
           type: 'flat',
           value: (level - 1) * 0.05
         });
       }
    }

    if (stat === 'EnergyRegeneration') {
       const level = usePlayerStore.getState().level;
       if (level > 1) {
         mods.push({
           id: 'level_energy_regen_bonus',
           sourceId: 'base_attributes',
           stat: 'EnergyRegeneration',
           type: 'flat',
           value: (level - 1) * 0.2
         });
       }
    }

    if (stat === 'Armor') {
       const str = get().getStat('Strength');
       if (str > 0) {
         mods.push({
           id: 'str_armor_bonus',
           sourceId: 'base_attributes',
           stat: 'Armor',
           type: 'flat',
           value: str
         });
       }
    }

    if (stat === 'HasteRating') {
       const dex = get().getStat('Dexterity');
       if (dex > 0) {
         mods.push({
           id: 'dex_haste_bonus',
           sourceId: 'base_attributes',
           stat: 'HasteRating',
           type: 'flat',
           value: dex
         });
       }
    }

    return StatCalculator.calculateFinalStat(mods);
  },

  getAllStats: () => {
    let mods = [...get().modifiers, ...getTreeModifiers()];
    
    // Unarmed Weapon Damage fallback
    const externalWeaponMods = mods.filter(m => m.stat === 'WeaponDamage' && m.sourceId !== 'base_character');
    if (externalWeaponMods.length > 0) {
      mods = mods.filter(m => !(m.stat === 'WeaponDamage' && m.sourceId === 'base_character'));
    }
    
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
    
    const vit = stats['Vitality'] || 0;
    if (vit > 0) {
      stats['Health'] = (stats['Health'] || 0) + (vit * 4);
    }

    const intStat = stats['Intelligence'] || 0;
    if (intStat > 0) {
      stats['Energy'] = (stats['Energy'] || 0) + (intStat * 1);
    }

    const str = stats['Strength'] || 0;
    if (str > 0) {
      stats['Armor'] = (stats['Armor'] || 0) + str;
    }

    const dex = stats['Dexterity'] || 0;
    if (dex > 0) {
      stats['HasteRating'] = (stats['HasteRating'] || 0) + dex;
    }

    return stats;
  }
}));
