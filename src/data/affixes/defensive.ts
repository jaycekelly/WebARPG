import type { AffixTemplate } from '../../engine/items/types';

export const DEFENSIVE_AFFIXES: AffixTemplate[] = [
  // Health
  {
    id: 'flat_health',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    allowedArmorCategories: ['Heavy', 'Light'],
    minLevel: 1,
    stat: 'Health',
    type: 'flat',
    baseValue: 6,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value} Maximum Health',
    exclusivityGroup: 'MaxHealth'
  },
  {
    id: 'inc_health',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    allowedArmorCategories: ['Heavy', 'Light'],
    minLevel: 5,
    stat: 'Health',
    type: 'increased',
    baseValue: 4,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Maximum Health',
    exclusivityGroup: 'MaxHealth'
  },
  
  {
    id: 'inc_health_regen',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'HealthRegenPercent',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.05,
    descriptionTpl: '{value}% Health Regen',
    exclusivityGroup: 'HealthRegen'
  },
  
  // Mana
  {
    id: 'flat_mana',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    allowedArmorCategories: ['Caster'],
    minLevel: 1,
    stat: 'Mana',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value} Maximum Mana',
    exclusivityGroup: 'MaxMana'
  },
  {
    id: 'inc_mana',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    allowedArmorCategories: ['Caster'],
    minLevel: 5,
    stat: 'Mana',
    type: 'increased',
    baseValue: 3,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Maximum Mana',
    exclusivityGroup: 'MaxMana'
  },
  {
    id: 'inc_mana_regen',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    allowedArmorCategories: ['Caster'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'ManaRegenPercent',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.05,
    descriptionTpl: '{value}% Mana Regen',
    exclusivityGroup: 'ManaRegen'
  },
  
  // Armor (Generic Defense, allowed on everything except weapons)
  {
    id: 'flat_armor',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'Armor',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.04,
    descriptionTpl: '+{value} Armor',
    exclusivityGroup: 'Armor'
  },
  {
    id: 'inc_armor',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 10,
    stat: 'Armor',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.03,
    descriptionTpl: '{value}% Increased Armor',
    exclusivityGroup: 'Armor'
  },

  // ----------------------------------------------------
  // Resistances
  // ----------------------------------------------------
  {
    id: 'flat_fire_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'FireResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Fire Resistance'
  },
  {
    id: 'flat_cold_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'ColdResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Cold Resistance'
  },
  {
    id: 'flat_lightning_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'LightningResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Lightning Resistance'
  },
  {
    id: 'flat_strike_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'StrikeResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Strike Resistance'
  },
  {
    id: 'flat_pierce_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'PierceResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Pierce Resistance'
  },
  {
    id: 'flat_phys_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'PhysicalResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Physical Resistance'
  },

  // ----------------------------------------------------
  // Deflection (Rogue Armor/Shields + Amulets)
  // ----------------------------------------------------
  {
    id: 'deflect_chance',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet'],
    allowedArmorCategories: ['Light'],
    minLevel: 1,
    stat: 'DeflectChance',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Deflect Chance',
    exclusivityGroup: 'Deflect'
  },
  {
    id: 'deflect_effect',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet'],
    allowedArmorCategories: ['Light'],
    minLevel: 1,
    stat: 'DeflectEffect',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Deflect Effect',
    exclusivityGroup: 'Deflect'
  },

  // ----------------------------------------------------
  // Blocking (Shields + Amulets)
  // ----------------------------------------------------
  {
    id: 'block_chance',
    allowedTypes: ['shield', 'amulet'],
    minLevel: 1,
    stat: 'Block',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Block Chance',
    exclusivityGroup: 'Block'
  },
  {
    id: 'spell_block_chance',
    allowedTypes: ['shield', 'amulet'],
    minLevel: 1,
    stat: 'SpellBlock',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Spell Block Chance',
    exclusivityGroup: 'Block'
  },

  // ----------------------------------------------------
  // Parry (Weapons + Amulets)
  // ----------------------------------------------------
  {
    id: 'parry_chance',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet'],
    minLevel: 1,
    stat: 'Parry',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Parry Chance',
    exclusivityGroup: 'Parry'
  },
  {
    id: 'spell_parry_chance',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet'],
    minLevel: 1,
    stat: 'SpellParry',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Spell Parry Chance',
    exclusivityGroup: 'Parry'
  }
];
