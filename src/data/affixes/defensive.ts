import type { AffixTemplate } from '../../engine/items/types';

export const DEFENSIVE_AFFIXES: AffixTemplate[] = [
  // Health
  {
    id: 'inc_health',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    allowedArmorCategories: ['Heavy', 'Light'],
    minLevel: 5,
    stat: 'Health',
    type: 'increased',
    baseValue: 4,
    levelMultiplier: 0.04,
    descriptionTpl: '+{value}% Maximum Health',
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
    descriptionTpl: '+{value}% Health Regen',
    exclusivityGroup: 'HealthRegen'
  },
  
  {
    id: 'inc_energy',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    allowedArmorCategories: ['Caster'],
    minLevel: 5,
    stat: 'Energy',
    type: 'increased',
    baseValue: 3,
    levelMultiplier: 0.04,
    descriptionTpl: '+{value}% Max Energy',
    exclusivityGroup: 'MaxEnergy'
  },
  {
    id: 'inc_energy_regen',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome'],
    allowedArmorCategories: ['Caster'],
    minLevel: 1,
    stat: 'EnergyRegenPercent',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Energy Regen',
    exclusivityGroup: 'EnergyRegen'
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
    descriptionTpl: '+{value}% Armor',
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
    descriptionTpl: '+{value}% Fire Resistance'
  },
  {
    id: 'flat_cold_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'ColdResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Cold Resistance'
  },
  {
    id: 'flat_lightning_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'LightningResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Lightning Resistance'
  },
  {
    id: 'flat_strike_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'StrikeResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Strike Resistance'
  },
  {
    id: 'flat_pierce_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'PierceResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Pierce Resistance'
  },
  {
    id: 'flat_phys_resist',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'PhysicalResist',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Physical Resistance'
  },

  // ----------------------------------------------------
  // Deflection (Rogue Armor/Shields + Amulets)
  // ----------------------------------------------------
  {
    id: 'deflect_chance',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet'],
    allowedArmorCategories: ['Light'],
    minLevel: 1,
    stat: 'DeflectRating',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 1.5,
    descriptionTpl: '+{value} Deflect Rating',
    exclusivityGroup: 'Deflect'
  },
  {
    id: 'deflect_effect',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'amulet'],
    allowedArmorCategories: ['Light'],
    minLevel: 1,
    stat: 'DeflectAmount',
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
    stat: 'BlockRating',
    type: 'flat',
    baseValue: 20,
    levelMultiplier: 2.0,
    descriptionTpl: '+{value} Block Rating',
    exclusivityGroup: 'Block'
  },
  {
    id: 'spell_block_chance',
    allowedTypes: ['shield', 'amulet'],
    minLevel: 1,
    stat: 'SpellBlockRating',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 1.5,
    descriptionTpl: '+{value} Spell Block Rating',
    exclusivityGroup: 'Block'
  },

  // ----------------------------------------------------
  // Parry (Weapons + Amulets)
  // ----------------------------------------------------
  {
    id: 'parry_chance_weapon',
    allowedTypes: ['weapon-1h', 'weapon-2h'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'ParryRating',
    type: 'flat',
    baseValue: 22,
    levelMultiplier: 2.25,
    descriptionTpl: '+{value} Parry Rating',
    exclusivityGroup: 'Parry'
  },
  {
    id: 'parry_chance_jewelry',
    allowedTypes: ['amulet'],
    minLevel: 1,
    stat: 'ParryRating',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 1.5,
    descriptionTpl: '+{value} Parry Rating',
    exclusivityGroup: 'Parry'
  },
  {
    id: 'spell_parry_chance_weapon',
    allowedTypes: ['weapon-1h', 'weapon-2h'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'SpellParryRating',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 1.5,
    descriptionTpl: '+{value} Spell Parry Rating',
    exclusivityGroup: 'Parry'
  },
  {
    id: 'spell_parry_chance_jewelry',
    allowedTypes: ['amulet'],
    minLevel: 1,
    stat: 'SpellParryRating',
    type: 'flat',
    baseValue: 10,
    levelMultiplier: 1.0,
    descriptionTpl: '+{value} Spell Parry Rating',
    exclusivityGroup: 'Parry'
  }
];
