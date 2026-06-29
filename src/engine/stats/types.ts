export type ModifierType = 'flat' | 'increased' | 'more';

export type DamageType = 'Slashing' | 'Piercing' | 'Fire' | 'Cold' | 'Lightning';

export interface StatModifier {
  id: string;          // Unique ID for this specific modifier instance
  sourceId: string;    // E.g., 'item_rusty_sword', 'buff_enrage', 'base_character'
  stat: StatType;
  type: ModifierType;
  value: number;
}

export type StatType =
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
  | 'MoveSpeed'
  | 'StrikeDamage'
  | 'PierceDamage'
  | 'PhysicalDamage' // Strike + Pierce
  | 'FireDamage'
  | 'ColdDamage'
  | 'LightningDamage'
  | 'ElementalDamage' // Fire + Cold + Lightning
  | 'MeleeDamage'
  | 'RangedDamage'
  | 'SkillDamage'
  | 'SpellDamage'
  | 'AreaDamage'

  // Penetration (Flat & Percent)
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
  | 'CriticalStrikeChance'
  | 'CriticalStrikeMultiplier'

  // Weapon Enhancements
  | 'PhysicalDamageToWeapons'
  | 'ElementalDamageToWeapons'
  | 'FireDamageToWeapons'
  | 'ColdDamageToWeapons'
  | 'LightningDamageToWeapons'

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
  | 'SpellDeflectChance'
  | 'DeflectEffect'
  | 'Block'
  | 'SpellBlock'
  | 'BlockEffect'
  | 'WeaponBlock'
  | 'WeaponSpellBlock'
  | 'WeaponBlockEffect'

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
  | 'AreaOfEffect'
  | 'CooldownReduction'
  | 'ManaCostReduction'
  | 'Tenacity'
  | 'BuffEffect'
  | 'BuffDuration'
  | 'ExperienceGain'
  | 'MagicFind'
  | 'ThreatMultiplier';
