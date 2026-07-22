import { create } from 'zustand';
import type { StatModifier, StatType } from '../engine/stats/types';
import { StatCalculator } from '../engine/stats/StatCalculator';
import { useBuffStore } from './useBuffStore';
import { usePlayerStore } from './usePlayerStore';
import { useSkillStore } from './useSkillStore';
import { useInventoryStore } from './useInventoryStore';
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
          if (cls === 'Warrior') treeMods.push({ id: `mastery_${cls}_str`, sourceId: `mastery_${cls}`, stat: 'Strength', type: 'flat', value: mPts * 3 });
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

const getEquipmentModifiers = (): StatModifier[] => {
    const equipmentMods: StatModifier[] = [];
    const equipState = useInventoryStore.getState();
    if (!equipState) return equipmentMods;

    for (const [slot, item] of Object.entries(equipState.equipment)) {
        if (slot === 'weapon1_alt' || slot === 'weapon2_alt') continue;
        
        if (item) {
            if (item.baseStats) {
                for (const baseStat of item.baseStats) {
                    equipmentMods.push({
                        ...baseStat,
                        id: `${slot}_${item.id}_base_${baseStat.stat}_${Math.random()}`,
                        sourceId: `equip_${slot}`
                    });
                }
            }
            if (item.affixes) {
                for (const affix of item.affixes) {
                    equipmentMods.push({
                        ...affix.stat,
                        id: `${slot}_${item.id}_affix_${affix.id}_${affix.stat.stat}_${Math.random()}`,
                        sourceId: `equip_${slot}`
                    });
                }
            }
        }
    }
    return equipmentMods;
};

const getBaseAttributeModifiers = (): StatModifier[] => {
    const mods: StatModifier[] = [];
    const { allocatedAttributes } = usePlayerStore.getState();
    if (allocatedAttributes) {
        if (allocatedAttributes.Strength > 0) mods.push({ id: 'alloc_str', sourceId: 'allocated_attributes', stat: 'Strength', type: 'flat', value: allocatedAttributes.Strength });
        if (allocatedAttributes.Dexterity > 0) mods.push({ id: 'alloc_dex', sourceId: 'allocated_attributes', stat: 'Dexterity', type: 'flat', value: allocatedAttributes.Dexterity });
        if (allocatedAttributes.Intelligence > 0) mods.push({ id: 'alloc_int', sourceId: 'allocated_attributes', stat: 'Intelligence', type: 'flat', value: allocatedAttributes.Intelligence });
        if (allocatedAttributes.Vitality > 0) mods.push({ id: 'alloc_vit', sourceId: 'allocated_attributes', stat: 'Vitality', type: 'flat', value: allocatedAttributes.Vitality });
    }
    return mods;
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
    { id: 'base_move', sourceId: 'base_character', stat: 'MoveSpeed', type: 'flat', value: 1.33 }, // 1000/1.33 ≈ 750ms baseline
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
    { id: 'base_crit_multiplier', sourceId: 'base_character', stat: 'CriticalStrikeMultiplier', type: 'flat', value: 150 },
  ],

  addModifier: (mod) => {
    cachedAllStats = null;
    set((state) => ({ modifiers: [...state.modifiers, mod] }));
  },

  removeModifier: (id) => {
    cachedAllStats = null;
    set((state) => ({ modifiers: state.modifiers.filter(m => m.id !== id) }));
  },

  removeModifiersBySource: (sourceId) => {
    cachedAllStats = null;
    set((state) => ({ modifiers: state.modifiers.filter(m => m.sourceId !== sourceId) }));
  },
  
  updateModifierValue: (id, value) => {
    cachedAllStats = null;
    set((state) => ({ modifiers: state.modifiers.map(m => m.id === id ? { ...m, value } : m) }));
  },

  getStat: (stat) => {
    return get().getAllStats()[stat] ?? 0;
  },

  getAllStats: () => {
    ensureSubscriptions();
    if (cachedAllStats) {
      return cachedAllStats;
    }

    let mods = [...get().modifiers, ...getTreeModifiers(), ...getEquipmentModifiers(), ...getBaseAttributeModifiers()];
    
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

    const level = usePlayerStore.getState().level;
    if (level > 1) {
      stats['Health'] = (stats['Health'] || 0) + ((level - 1) * 10);
      stats['HealthRegeneration'] = (stats['HealthRegeneration'] || 0) + ((level - 1) * 0.075);
      stats['Energy'] = (stats['Energy'] || 0) + ((level - 1) * 3);
      stats['EnergyRegeneration'] = (stats['EnergyRegeneration'] || 0) + ((level - 1) * 0.2);
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

    cachedAllStats = stats;
    return stats;
  }
}));

let cachedAllStats: Record<string, number> | null = null;
let subscriptionsInitialized = false;

function invalidateStatsCache() {
  cachedAllStats = null;
}

function ensureSubscriptions() {
  if (subscriptionsInitialized) return;
  subscriptionsInitialized = true;

  useInventoryStore.subscribe(() => { invalidateStatsCache(); });
  useSkillStore.subscribe(() => { invalidateStatsCache(); });
  usePlayerStore.subscribe((state, prevState) => {
    if (
      state.level !== prevState.level ||
      state.playerClass !== prevState.playerClass ||
      state.secondaryClass !== prevState.secondaryClass ||
      state.allocatedAttributes !== prevState.allocatedAttributes
    ) {
      invalidateStatsCache();
    }
  });
  useBuffStore.subscribe((state, prevState) => {
    if (state.entityBuffs['player'] !== prevState.entityBuffs['player']) {
      invalidateStatsCache();
    }
  });
}

