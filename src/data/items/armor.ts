import type { ItemTemplate } from '../../engine/items/types';
import { Stat } from '../../engine/stats/types';

export const ARMOR: Record<string, ItemTemplate> = {
  wooden_shield: {
    id: 'wooden_shield',
    name: 'Wooden Shield',
    icon: 'Shield',
    itemType: 'shield',
    baseBlockChance: 15,
    baseStats: [Stat('Armor', 12)],
  },
  leather_tunic: {
    id: 'leather_tunic',
    name: 'Leather Tunic',
    icon: 'Shield',
    itemType: 'chest',
    baseStats: [Stat('Armor', 10), Stat('Health', 20)],
  },
};
