import type { AffixTemplate } from '../../engine/items/types';

export const SUSTAIN_AFFIXES: AffixTemplate[] = [
  // ----------------------------------------------------
  // Heal Group
  // ----------------------------------------------------
  {
    id: 'inc_healing_dealt',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'HealingDealt',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Healing Dealt',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'inc_healing_received',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'HealingReceived',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Healing Received',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'flat_spell_vamp',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'SpellVamp',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Spell Vamp',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'flat_lifesteal',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'Lifesteal',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Lifesteal',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'flat_life_on_hit',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'LifeGainOnHit',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Life Gain on Hit',
    exclusivityGroup: 'Heal'
  },

  // ----------------------------------------------------
  // Mana Leech Group
  // ----------------------------------------------------
  {
    id: 'flat_mana_leech',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'ManaLeech',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Mana Leech',
    exclusivityGroup: 'ManaLeech'
  },
  {
    id: 'flat_mana_on_hit',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'ManaGainOnHit',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Mana Gain on Hit',
    exclusivityGroup: 'ManaLeech'
  }
];
