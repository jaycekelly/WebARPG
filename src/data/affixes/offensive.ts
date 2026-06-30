import type { AffixTemplate } from '../../engine/items/types';

export const OFFENSIVE_AFFIXES: AffixTemplate[] = [
  // ----------------------------------------------------
  // Generic Damage (Weaker)
  // ----------------------------------------------------
  {
    id: 'flat_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'Damage',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.03,
    descriptionTpl: '+{value} Damage',
    exclusivityGroup: 'Damage'
  },
  {
    id: 'inc_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'Damage',
    type: 'increased',
    baseValue: 4,
    levelMultiplier: 0.02,
    descriptionTpl: '{value}% Increased Damage',
    exclusivityGroup: 'Damage'
  },

  // ----------------------------------------------------
  // Delivery Methods (Damage Group)
  // ----------------------------------------------------
  {
    id: 'inc_melee_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'], // No Tome
    allowedWeaponCategories: ['Sword', 'Dagger', 'Axe', 'Scepter', 'Unarmed'], // No Bow/Wand/Staff
    minLevel: 1,
    stat: 'MeleeDamage',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.03,
    descriptionTpl: '{value}% Increased Melee Damage',
    exclusivityGroup: 'Damage'
  },
  {
    id: 'inc_ranged_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Bow', 'Wand', 'Staff'],
    minLevel: 1,
    stat: 'RangedDamage',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.03,
    descriptionTpl: '{value}% Increased Ranged Damage',
    exclusivityGroup: 'Damage'
  },
  {
    id: 'inc_spell_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'SpellDamage',
    type: 'increased',
    baseValue: 6,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Spell Damage',
    exclusivityGroup: 'Damage'
  },
  {
    id: 'inc_skill_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'SkillDamage',
    type: 'increased',
    baseValue: 6,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Skill Damage',
    exclusivityGroup: 'Damage'
  },
  {
    id: 'inc_area_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 5,
    stat: 'AreaDamage',
    type: 'increased',
    baseValue: 6,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Area Damage',
    exclusivityGroup: 'Damage'
  },

  // ----------------------------------------------------
  // Damage Types (DamageType Group)
  // ----------------------------------------------------
  // Slightly weaker broad types
  {
    id: 'inc_physical_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'PhysicalDamage',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.03,
    descriptionTpl: '{value}% Increased Physical Damage',
    exclusivityGroup: 'DamageType'
  },
  {
    id: 'inc_elemental_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'ElementalDamage',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.03,
    descriptionTpl: '{value}% Increased Elemental Damage',
    exclusivityGroup: 'DamageType'
  },
  
  // Specific Types
  {
    id: 'inc_strike_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Axe', 'Scepter', 'Unarmed'], // Dagger is pierce, Bow is pierce
    minLevel: 1,
    stat: 'StrikeDamage',
    type: 'increased',
    baseValue: 7,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Strike Damage',
    exclusivityGroup: 'DamageType'
  },
  {
    id: 'inc_pierce_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring'],
    allowedWeaponCategories: ['Dagger', 'Bow'],
    minLevel: 1,
    stat: 'PierceDamage',
    type: 'increased',
    baseValue: 7,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Pierce Damage',
    exclusivityGroup: 'DamageType'
  },
  {
    id: 'inc_fire_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'FireDamage',
    type: 'increased',
    baseValue: 7,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Fire Damage',
    exclusivityGroup: 'DamageType'
  },
  {
    id: 'inc_cold_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'ColdDamage',
    type: 'increased',
    baseValue: 7,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Cold Damage',
    exclusivityGroup: 'DamageType'
  },
  {
    id: 'inc_lightning_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'LightningDamage',
    type: 'increased',
    baseValue: 7,
    levelMultiplier: 0.04,
    descriptionTpl: '{value}% Increased Lightning Damage',
    exclusivityGroup: 'DamageType'
  },

  // ----------------------------------------------------
  // Speed
  // ----------------------------------------------------
  {
    id: 'inc_attack_speed',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet', 'ring', 'gloves'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'AttackSpeed',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.02,
    descriptionTpl: '{value}% Increased Attack Speed'
  },
  {
    id: 'inc_cast_speed',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring', 'gloves'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'CastSpeed',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.02,
    descriptionTpl: '{value}% Increased Cast Speed'
  },

  // ----------------------------------------------------
  // Penetration
  // ----------------------------------------------------
  {
    id: 'flat_phys_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'PhysicalPenetrationFlat',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Physical Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_phys_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Dagger', 'Bow', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 10,
    stat: 'PhysicalPenetrationPercent',
    type: 'flat', 
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Physical Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'flat_strike_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 1,
    stat: 'StrikePenetrationFlat',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Strike Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_strike_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Axe', 'Scepter', 'Unarmed'],
    minLevel: 10,
    stat: 'StrikePenetrationPercent',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Strike Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'flat_pierce_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Dagger', 'Bow'],
    minLevel: 1,
    stat: 'PiercePenetrationFlat',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Pierce Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_pierce_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Dagger', 'Bow'],
    minLevel: 10,
    stat: 'PiercePenetrationPercent',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Pierce Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'flat_fire_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'FirePenetrationFlat',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Fire Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_fire_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 10,
    stat: 'FirePenetrationPercent',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Fire Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'flat_cold_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'ColdPenetrationFlat',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Cold Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_cold_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 10,
    stat: 'ColdPenetrationPercent',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Cold Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'flat_lightning_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'LightningPenetrationFlat',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Lightning Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_lightning_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 10,
    stat: 'LightningPenetrationPercent',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Lightning Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'flat_ele_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'ElementalPenetrationFlat',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Elemental Penetration',
    exclusivityGroup: 'Penetration'
  },
  {
    id: 'inc_ele_pen',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 10,
    stat: 'ElementalPenetrationPercent',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '{value}% Elemental Penetration',
    exclusivityGroup: 'Penetration'
  },

  // ----------------------------------------------------
  // Critical
  // ----------------------------------------------------
  {
    id: 'flat_crit_chance',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'AttackCriticalStrikeChance',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value}% Critical Strike Chance',
    exclusivityGroup: 'CritChance'
  },
  {
    id: 'inc_crit_chance',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 5,
    stat: 'AttackCriticalStrikeChance',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.2,
    descriptionTpl: '{value}% Increased Critical Strike Chance',
    exclusivityGroup: 'CritChance'
  },
  {
    id: 'inc_crit_multi',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 5,
    stat: 'CriticalStrikeMultiplier',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value}% Critical Strike Multiplier'
  },

  // ----------------------------------------------------
  // Weapon Enhancements
  // ----------------------------------------------------
  {
    id: 'flat_strike_to_weapons',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Sword', 'Axe', 'Scepter', 'Unarmed'], // Dagger/Bow are Pierce
    minLevel: 1,
    stat: 'StrikeDamageToWeapons',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Strike Damage to Weapons',
    exclusivityGroup: 'FlatDamage'
  },
  {
    id: 'flat_pierce_to_weapons',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Dagger', 'Bow'],
    minLevel: 1,
    stat: 'PierceDamageToWeapons',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Pierce Damage to Weapons',
    exclusivityGroup: 'FlatDamage'
  },
  {
    id: 'flat_fire_to_weapons',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'FireDamageToWeapons',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Fire Damage to Weapons',
    exclusivityGroup: 'FlatDamage'
  },
  {
    id: 'flat_cold_to_weapons',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'ColdDamageToWeapons',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Cold Damage to Weapons',
    exclusivityGroup: 'FlatDamage'
  },
  {
    id: 'flat_lightning_to_weapons',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'LightningDamageToWeapons',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Lightning Damage to Weapons',
    exclusivityGroup: 'FlatDamage'
  },

  // ----------------------------------------------------
  // DoT & Status
  // ----------------------------------------------------
  {
    id: 'status_power',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'StatusEffectPower',
    type: 'flat',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value} Status Effect Power',
    exclusivityGroup: 'BurnDamage'
  },
  {
    id: 'burn_effect',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    minLevel: 1,
    stat: 'BurnEffect',
    type: 'flat',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Burn Effect',
    exclusivityGroup: 'BurnDamage'
  }
];
