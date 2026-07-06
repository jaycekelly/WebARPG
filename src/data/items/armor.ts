import type { ItemTemplate } from '../../engine/items/types';
import { Stat } from '../../engine/stats/types';

export const ARMOR: Record<string, ItemTemplate> = {
  // #region Fighter Armor (Pure Armor)
  // #region Tier 1
  iron_helm: {
    id: 'iron_helm',
    name: 'Iron Helm',
    icon: 'helmet',
    itemType: 'helm',
    armorCategory: 'Heavy',
    baseStats: [Stat('Armor', 8)],
  },
  iron_chest: {
    id: 'iron_chest',
    name: 'Iron Chestplate',
    icon: 'chest_armor',
    itemType: 'chest',
    armorCategory: 'Heavy',
    baseStats: [Stat('Armor', 15)],
  },
  iron_legs: {
    id: 'iron_legs',
    name: 'Iron Legs',
    icon: 'leg_armor',
    itemType: 'legs',
    armorCategory: 'Heavy',
    baseStats: [Stat('Armor', 10)],
  },
  iron_gloves: {
    id: 'iron_gloves',
    name: 'Iron Gauntlets',
    icon: 'gloves',
    itemType: 'gloves',
    armorCategory: 'Heavy',
    baseStats: [Stat('Armor', 4)],
  },
  iron_boots: {
    id: 'iron_boots',
    name: 'Iron Boots',
    icon: 'boots',
    itemType: 'boots',
    armorCategory: 'Heavy',
    baseStats: [Stat('Armor', 5)],
  },
  iron_shield: {
    id: 'iron_shield',
    name: 'Iron Shield',
    icon: 'Shield',
    itemType: 'shield',
    armorCategory: 'Heavy',
    baseBlockChance: 25,
    baseStats: [Stat('Armor', 10)],
  },
  apprentice_tome: {
    id: 'apprentice_tome',
    name: 'Apprentice Tome',
    icon: 'Book',
    itemType: 'tome',
    armorCategory: 'Caster',
    baseStats: [Stat('SpellDamage', 5)],
  },
  // #endregion
  // #endregion

  // #region Rogue Armor (Armor + Deflect)
  // #region Tier 1
  leather_cowl: {
    id: 'leather_cowl',
    name: 'Leather Cowl',
    icon: 'helmet',
    itemType: 'helm',
    armorCategory: 'Light',
    baseStats: [Stat('Armor', 6), Stat('DeflectChance', 1)],
  },
  leather_tunic: {
    id: 'leather_tunic',
    name: 'Leather Tunic',
    icon: 'chest_armor',
    itemType: 'chest',
    armorCategory: 'Light',
    baseStats: [Stat('Armor', 14), Stat('DeflectChance', 3)],
  },
  leather_leggings: {
    id: 'leather_leggings',
    name: 'Leather Leggings',
    icon: 'leg_armor',
    itemType: 'legs',
    armorCategory: 'Light',
    baseStats: [Stat('Armor', 8), Stat('DeflectChance', 2)],
  },
  leather_gloves: {
    id: 'leather_gloves',
    name: 'Leather Gloves',
    icon: 'gloves',
    itemType: 'gloves',
    armorCategory: 'Light',
    baseStats: [Stat('Armor', 4), Stat('DeflectChance', 1)],
  },
  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    icon: 'boots',
    itemType: 'boots',
    armorCategory: 'Light',
    baseStats: [Stat('Armor', 4), Stat('DeflectChance', 1)],
  },
  buckler: {
    id: 'buckler',
    name: 'Buckler',
    icon: 'Shield',
    itemType: 'shield',
    armorCategory: 'Light',
    baseBlockChance: 15,
    baseStats: [Stat('Armor', 8), Stat('DeflectChance', 3)],
  },
  // #endregion
  // #endregion

  // #region Mage Armor (Armor + Mana Regen)
  // #region Tier 1
  silk_hood: {
    id: 'silk_hood',
    name: 'Silk Hood',
    icon: 'helmet',
    itemType: 'helm',
    armorCategory: 'Caster',
    baseStats: [Stat('Armor', 5), Stat('ManaRegenPercent', 5)],
  },
  silk_robe: {
    id: 'silk_robe',
    name: 'Silk Robe',
    icon: 'chest_armor',
    itemType: 'chest',
    armorCategory: 'Caster',
    baseStats: [Stat('Armor', 12), Stat('ManaRegenPercent', 10)],
  },
  silk_leggings: {
    id: 'silk_leggings',
    name: 'Silk Leggings',
    icon: 'leg_armor',
    itemType: 'legs',
    armorCategory: 'Caster',
    baseStats: [Stat('Armor', 7), Stat('ManaRegenPercent', 8)],
  },
  silk_gloves: {
    id: 'silk_gloves',
    name: 'Silk Gloves',
    icon: 'gloves',
    itemType: 'gloves',
    armorCategory: 'Caster',
    baseStats: [Stat('Armor', 3), Stat('ManaRegenPercent', 4)],
  },
  silk_shoes: {
    id: 'silk_shoes',
    name: 'Silk Shoes',
    icon: 'boots',
    itemType: 'boots',
    armorCategory: 'Caster',
    baseStats: [Stat('Armor', 3), Stat('ManaRegenPercent', 4)],
  },
  warding_shield: {
    id: 'warding_shield',
    name: 'Warding Shield',
    icon: 'Shield',
    itemType: 'shield',
    armorCategory: 'Caster',
    baseBlockChance: 10,
    baseStats: [Stat('Armor', 6), Stat('ManaRegenPercent', 15)],
  },
  // #endregion
  // #endregion
};
