import type { ItemTemplate } from '../../engine/items/types';
import { Stat } from '../../engine/stats/types';

export const ACCESSORIES: Record<string, ItemTemplate> = {
  silver_ring: {
    id: 'silver_ring',
    name: 'Silver Ring',
    icon: 'Circle',
    itemType: 'ring',
    baseStats: [
      Stat('Mana', 15),
      Stat('SpellDamage', 10, 'increased'),
    ],
  },
};
