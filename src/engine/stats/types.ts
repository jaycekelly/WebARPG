export type ModifierType = 'flat' | 'increased' | 'more';

export type DamageType = 'Strike' | 'Pierce' | 'Fire' | 'Cold' | 'Lightning';

export interface StatModifier {
  id: string;          // Unique ID for this specific modifier instance
  sourceId: string;    // E.g., 'item_rusty_sword', 'buff_enrage', 'base_character'
  stat: StatType;
  type: ModifierType;
  value: number;
}

export type StatType =
  // Core Attributes
  | 'Strength'
  | 'Dexterity'
  | 'Intelligence'
  | 'Vitality'

  // Health & Mana
  | 'Health'
  | 'HealthRegeneration'
  | 'HealthRegenPercent'
  | 'Mana'
  | 'ManaRegeneration'
  | 'ManaRegenPercent'

  // Damage
  | 'Damage'
  | 'AttackSpeed'
  | 'CastSpeed'
  | 'StrikeDamage'
  | 'PierceDamage'
  | 'PhysicalDamage'
  | 'FireDamage'
  | 'ColdDamage'
  | 'LightningDamage'
  | 'ElementalDamage'
  | 'MeleeDamage'
  | 'RangedDamage'
  | 'SkillDamage'
  | 'SpellDamage'
  | 'AreaDamage'

  // Penetration (Flat & Percent)
  | 'StrikePenetrationFlat'
  | 'StrikePenetrationPercent'
  | 'PiercePenetrationFlat'
  | 'PiercePenetrationPercent'
  | 'PhysicalPenetrationFlat'
  | 'PhysicalPenetrationPercent'
  | 'FirePenetrationFlat'
  | 'FirePenetrationPercent'
  | 'ColdPenetrationFlat'
  | 'ColdPenetrationPercent'
  | 'LightningPenetrationFlat'
  | 'LightningPenetrationPercent'
  | 'ElementalPenetrationFlat'
  | 'ElementalPenetrationPercent'

  // Critical
  | 'AttackCriticalStrikeChance'
  | 'SpellCriticalStrikeChance'
  | 'CriticalStrikeMultiplier'

  // Weapon Enhancements
  | 'StrikeDamageToWeapons'
  | 'PierceDamageToWeapons'
  | 'FireDamageToWeapons'
  | 'ColdDamageToWeapons'
  | 'LightningDamageToWeapons'
  | 'WeaponElementalDamage'

  // Damage Over Time (DoT) & Status Effects
  | 'DoTDamage'
  | 'DoTDuration'
  | 'StatusEffectPower'
  | 'StatusEffectDuration'
  | 'BurnEffect'
  | 'ChillEffect'
  | 'ShockEffect'

  // Armor & Resistances
  | 'Armor'
  | 'DamageReduction'
  | 'StrikeResist'
  | 'PierceResist'
  | 'PhysicalResist'
  | 'FireResist'
  | 'ColdResist'
  | 'LightningResist'
  | 'AllElementalResist'

  // Deflection & Blocking
  | 'DeflectChance'
  | 'DeflectEffect'
  | 'Block'
  | 'SpellBlock'
  | 'BlockEffect'
  | 'Parry'
  | 'SpellParry'
  | 'ParryEffect'

  // Sustain & Recovery
  | 'HealingDealt'
  | 'HealingReceived'
  | 'Lifesteal'
  | 'SpellVamp'
  | 'LifeGainOnHit'
  | 'LifeOnKill'
  | 'ManaLeech'
  | 'ManaGainOnHit'
  | 'ManaOnKill'

  // Misc
  | 'SkillReach'
  | 'CooldownReduction'
  | 'MoveSpeed'
  | 'ManaCostReduction'
  | 'Tenacity'
  | 'BuffEffect'
  | 'BuffDuration'
  | 'ExperienceGain'
  | 'MagicFind'
  | 'GoldFind'
  | 'ThreatMultiplier';

// Helper function to easily define stats in data files
export function Stat(
  stat: StatType,
  value: number,
  type: ModifierType = 'flat',
): { stat: StatType; value: number; type: ModifierType } {
  return { stat, value, type };
}
