import type { StatType } from './types';

const STAT_DISPLAY_NAMES: Record<StatType, string> = {
  // Core Attributes
  'Strength': 'Strength',
  'Dexterity': 'Dexterity',
  'Intelligence': 'Intelligence',
  'Vitality': 'Vitality',

  // Health & Mana
  'Health': 'Max Health',
  'HealthRegeneration': 'Health Regen',
  'HealthRegenPercent': '% Health Regen',
  'Mana': 'Max Mana',
  'ManaRegeneration': 'Mana Regen',
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

  // Penetration (Flat & Percent)
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

  // Defenses
  'Armor': 'Armor',
  'FireResist': 'Fire Resistance',
  'ColdResist': 'Cold Resistance',
  'LightningResist': 'Lightning Resistance',
  'StrikeResist': 'Strike Resistance',
  'PierceResist': 'Pierce Resistance',
  'PhysicalResist': 'Physical Resistance',
  'AllElementalResist': 'All Elemental Resistances',

  // Avoidance
  'DeflectChance': '% Deflect Chance',
  'DeflectEffect': '% Deflect Effect',
  'BlockChance': '% Block Chance',
  'SpellBlockChance': '% Spell Block Chance',
  'ParryChance': '% Parry Chance',
  'SpellParryChance': '% Spell Parry Chance',

  // Leech / Sustain
  'Lifesteal': '% Lifesteal',
  'Spellvamp': '% Spellvamp',
  'LifeGainOnHit': 'Life on Hit',
  'ManaGainOnHit': 'Mana on Hit',
  'ManaLeech': '% Mana Leech',
  'LifeOnKill': 'Life on Kill',
  'ManaOnKill': 'Mana on Kill',

  // Other Utility
  'MoveSpeed': '% Movement Speed',
  'ExperienceGain': '% Experience Gain',
  'GoldFind': '% Gold Find',
  'MagicFind': '% Magic Find',
  'BuffEffect': '% Buff Effect',
  'BuffDuration': '% Buff Duration',
  'SkillReach': 'Skill Reach',
  'CooldownReduction': '% Cooldown Reduction',
  'ManaCostReduction': '% Mana Cost Reduction',
  'HealingReceived': '% Healing Received',
  'HealingDealt': '% Healing Dealt',

  // Base Damage conversions (internal, but we format them just in case)
  'StrikeDamageToWeapons': 'Strike Damage to Attacks',
  'PierceDamageToWeapons': 'Pierce Damage to Attacks',
  'PhysicalDamageToWeapons': 'Physical Damage to Attacks',
  'FireDamageToWeapons': 'Fire Damage to Attacks',
  'ColdDamageToWeapons': 'Cold Damage to Attacks',
  'LightningDamageToWeapons': 'Lightning Damage to Attacks',
  'WeaponElementalDamage': '% Weapon Elemental Damage',
  
  // Crit
  'AttackCriticalStrikeChance': '% Attack Crit Chance',
  'SpellCriticalStrikeChance': '% Spell Crit Chance',
  'CriticalStrikeMultiplier': '% Crit Multiplier'
};

export function formatStatName(stat: StatType): string {
  return STAT_DISPLAY_NAMES[stat] || stat;
}
