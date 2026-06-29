import type { BaseStat, ItemType } from '../engine/items/types';
import type { DamageType } from '../engine/stats/types';

// A template for creating new item instances
interface ItemTemplate {
  id: string;
  name: string;
  icon: string;
  itemType: ItemType;
  baseStats: BaseStat[];
  damageType?: DamageType;
}

export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  rusty_sword: {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    icon: 'Sword',
    itemType: 'weapon-1h',
    damageType: 'Slashing',
    baseStats: [
      { stat: 'Damage', value: 5, type: 'flat' }
    ]
  },
  iron_greatsword: {
    id: 'iron_greatsword',
    name: 'Iron Greatsword',
    icon: 'Sword', // Can change icon later
    itemType: 'weapon-2h',
    damageType: 'Slashing',
    baseStats: [
      { stat: 'Damage', value: 15, type: 'flat' },
      { stat: 'AttackSpeed', value: -10, type: 'increased' } // Slows attack speed
    ]
  },
  leather_tunic: {
    id: 'leather_tunic',
    name: 'Leather Tunic',
    icon: 'Shield',
    itemType: 'chest',
    baseStats: [
      { stat: 'Armor', value: 10, type: 'flat' },
      { stat: 'Health', value: 20, type: 'flat' }
    ]
  },
  silver_ring: {
    id: 'silver_ring',
    name: 'Silver Ring',
    icon: 'Circle',
    itemType: 'ring',
    baseStats: [
      { stat: 'Mana', value: 15, type: 'flat' },
      { stat: 'SpellDamage', value: 10, type: 'increased' }
    ]
  }
};


