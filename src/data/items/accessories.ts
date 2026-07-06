import type { ItemTemplate } from '../../engine/items/types';
import { Stat } from '../../engine/stats/types';

export const ACCESSORIES: Record<string, ItemTemplate> = {
  // #region Rings
  // #region Tier 1
  bronze_ring: {
    id: 'bronze_ring',
    name: 'Bronze Ring',
    icon: 'ring',
    itemType: 'ring',
    baseStats: [Stat('PhysicalResist', 15)],
  },
  silver_ring: {
    id: 'silver_ring',
    name: 'Silver Ring',
    icon: 'ring',
    itemType: 'ring',
    baseStats: [Stat('AllElementalResist', 10)],
  },
  // #endregion
  // #endregion

  // #region Amulets
  // #region Tier 1
  ruby_amulet: {
    id: 'ruby_amulet',
    name: 'Ruby Amulet',
    icon: 'amulet',
    itemType: 'amulet',
    baseStats: [Stat('Health', 20)],
  },
  sapphire_amulet: {
    id: 'sapphire_amulet',
    name: 'Sapphire Amulet',
    icon: 'amulet',
    itemType: 'amulet',
    baseStats: [Stat('Mana', 20)],
  },
  // #endregion
  // #endregion
};
