import type { StatType } from './types';

const STAT_DISPLAY_NAMES: Record<StatType, string> = {
  // Core Attributes
  'Strength': 'Strength',
  'Dexterity': 'Dexterity',
  'Intelligence': 'Intelligence',
  'Vitality': 'Vitality',

  // Health & Mana
  'Health': 'Max Health',
  'HealthRegeneration': 'Health Regen / sec',
  'HealthRegenPercent': '% Health Regen',
  'Mana': 'Max Mana',
  'ManaRegeneration': 'Mana Regen / sec',
  'ManaRegenPercent': '% Mana Regen',

  // Damage
  'Damage': 'Damage',
  'AttackSpeed': '% Attack Speed',
  'CastSpeed': '% Cast Speed',
  'StrikeDamage': '% Strike Damage',
  'PierceDamage': '% Pierce Damage',
  'PhysicalDamage': '% Physical Damage',
  'FireDamage': '% Fire Damage',
  'ColdDamage': '% Cold Damage',
  'LightningDamage': '% Lightning Damage',
  'ElementalDamage': '% Elemental Damage',
  'MeleeDamage': '% Melee Damage',
  'RangedDamage': '% Ranged Damage',
  'SkillDamage': '% Skill Damage',
  'SpellDamage': '% Spell Damage',
  'AreaDamage': '% Area Damage',

  // Penetration
  'StrikePenetrationFlat': 'Strike Penetration',
  'StrikePenetrationPercent': '% Strike Penetration',
  'PiercePenetrationFlat': 'Pierce Penetration',
  'PiercePenetrationPercent': '% Pierce Penetration',
  'PhysicalPenetrationFlat': 'Physical Penetration',
  'PhysicalPenetrationPercent': '% Physical Penetration',
  'FirePenetrationFlat': 'Fire Penetration',
  'FirePenetrationPercent': '% Fire Penetration',
  'ColdPenetrationFlat': 'Cold Penetration',
  'ColdPenetrationPercent': '% Cold Penetration',
  'LightningPenetrationFlat': 'Lightning Penetration',
  'LightningPenetrationPercent': '% Lightning Penetration',
  'ElementalPenetrationFlat': 'Elemental Penetration',
  'ElementalPenetrationPercent': '% Elemental Penetration',

  // Critical
  'AttackCriticalStrikeChance': '% Crit Chance',
  'SpellCriticalStrikeChance': '% Spell Crit Chance',
  'CriticalStrikeMultiplier': '% Crit Multiplier',

  // Weapon Enhancements
  'StrikeDamageToWeapons': 'Strike Damage to Attacks',
  'PierceDamageToWeapons': 'Pierce Damage to Attacks',
  'FireDamageToWeapons': 'Fire Damage to Attacks',
  'ColdDamageToWeapons': 'Cold Damage to Attacks',
  'LightningDamageToWeapons': 'Lightning Damage to Attacks',
  'WeaponElementalDamage': '% Attack Elemental Damage',

  // DoT & Status
  'DoTDamage': '% Damage over Time',
  'DoTDuration': '% DoT Duration',
  'StatusEffectPower': '% Status Effect Power',
  'StatusEffectDuration': '% Status Effect Duration',
  'BurnEffect': '% Burn Effect',
  'ChillEffect': '% Chill Effect',
  'ShockEffect': '% Shock Effect',

  // Defenses
  'Armor': 'Armor',
  'DamageReduction': '% Damage Reduction',
  'StrikeResist': 'Strike Resistance',
  'PierceResist': 'Pierce Resistance',
  'PhysicalResist': 'Physical Resistance',
  'FireResist': 'Fire Resistance',
  'ColdResist': 'Cold Resistance',
  'LightningResist': 'Lightning Resistance',
  'AllElementalResist': 'All Ele Resistance',

  // Avoidance
  'DeflectChance': '% Deflect Chance',
  'DeflectEffect': '% Deflect Effect',
  'Block': '% Block Chance',
  'SpellBlock': '% Spell Block Chance',
  'BlockEffect': '% Block Effect',
  'Parry': '% Parry Chance',
  'SpellParry': '% Spell Parry Chance',
  'ParryEffect': '% Parry Effect',

  // Leech / Sustain
  'HealingDealt': '% Healing Dealt',
  'HealingReceived': '% Healing Received',
  'Lifesteal': '% Lifesteal',
  'SpellVamp': '% Spellvamp',
  'LifeGainOnHit': 'Life on Hit',
  'LifeOnKill': 'Life on Kill',
  'ManaLeech': '% Mana Leech',
  'ManaGainOnHit': 'Mana on Hit',
  'ManaOnKill': 'Mana on Kill',

  // Misc
  'SkillReach': 'Skill Reach',
  'CooldownReduction': '% Cooldown Reduction',
  'MoveSpeed': '% Move Speed',
  'ManaCostReduction': '% Mana Cost Reduction',
  'Tenacity': '% Tenacity',
  'BuffEffect': '% Buff Effect',
  'BuffDuration': '% Buff Duration',
  'ExperienceGain': '% Experience Gain',
  'MagicFind': '% Magic Find',
  'GoldFind': '% Gold Find',
  'ThreatMultiplier': '% Threat Multiplier',
};

export function formatStatName(stat: StatType): string {
  return STAT_DISPLAY_NAMES[stat] || stat;
}
