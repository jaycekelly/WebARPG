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
    id: 'flat_lifesteal_weapon',
    allowedTypes: ['weapon-1h', 'weapon-2h'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'Lifesteal',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.15,
    descriptionTpl: '+{value}% Lifesteal',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'flat_lifesteal_jewelry',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'Lifesteal',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Lifesteal',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'flat_life_on_hit_weapon',
    allowedTypes: ['weapon-1h', 'weapon-2h'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'LifeGainOnHit',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.3,
    descriptionTpl: '+{value} Life Gain on Hit',
    exclusivityGroup: 'Heal'
  },
  {
    id: 'flat_life_on_hit_jewelry',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'LifeGainOnHit',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Life Gain on Hit',
    exclusivityGroup: 'Heal'
  },

  // ----------------------------------------------------
  // Energy Leech Group
  // ----------------------------------------------------
  {
    id: 'flat_energy_leech_weapon',
    allowedTypes: ['weapon-1h', 'weapon-2h'],
    minLevel: 1,
    stat: 'EnergyLeech',
    type: 'flat',
    baseValue: 1.5,
    levelMultiplier: 0.15,
    descriptionTpl: '+{value}% Energy Leech',
    exclusivityGroup: 'EnergyLeech'
  },
  {
    id: 'flat_energy_leech_jewelry',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'EnergyLeech',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Energy Leech',
    exclusivityGroup: 'EnergyLeech'
  },
  {
    id: 'flat_energy_on_hit_weapon',
    allowedTypes: ['weapon-1h', 'weapon-2h'],
    minLevel: 1,
    stat: 'EnergyGainOnHit',
    type: 'flat',
    baseValue: 1.5,
    levelMultiplier: 0.3,
    descriptionTpl: '+{value} Energy Gain on Hit',
    exclusivityGroup: 'EnergyLeech'
  },
  {
    id: 'flat_energy_on_hit_jewelry',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'EnergyGainOnHit',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Energy Gain on Hit',
    exclusivityGroup: 'EnergyLeech'
  }
];
