import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { RatingCalculator } from '../engine/stats/RatingCalculator';
import { Sword, Shield, Zap, Heart, Book, Crosshair, Wrench, Flame, ShieldOff, Activity } from 'lucide-react';
import type { StatType } from '../engine/stats/types';

interface StatDefinition {
  id: StatType;
  label: string;
  suffix?: string;
  fractionDigits?: number;
}

interface StatCategory {
  title: string;
  icon: React.ElementType;
  stats: StatDefinition[];
}

// Categories follow the exact order from src/engine/stats/types.ts
// ThreatMultiplier and Tenacity are skipped (unimplemented)
const STAT_CATEGORIES: StatCategory[] = [
  {
    title: 'Health & Mana',
    icon: Heart,
    stats: [
      { id: 'Health', label: 'Max Health', fractionDigits: 0 },
      { id: 'HealthRegeneration', label: 'Health/sec', fractionDigits: 2 },
      { id: 'HealthRegenPercent', label: 'Health Regen', suffix: '%', fractionDigits: 1 },
      { id: 'Mana', label: 'Max Mana', fractionDigits: 0 },
      { id: 'ManaRegeneration', label: 'Mana/sec', fractionDigits: 2 },
      { id: 'ManaRegenPercent', label: 'Mana Regen', suffix: '%', fractionDigits: 1 },
    ]
  },
  {
    title: 'Damage',
    icon: Sword,
    stats: [
      { id: 'WeaponDamage', label: 'Weapon Damage', fractionDigits: 0 },
      { id: 'AttacksPerSecond', label: 'Attack Speed', fractionDigits: 2 },

      { id: 'HasteRating', label: 'Haste Rating', fractionDigits: 0 },
      { id: 'StrikeDamage', label: 'Strike Damage', suffix: '%', fractionDigits: 0 },
      { id: 'PierceDamage', label: 'Pierce Damage', suffix: '%', fractionDigits: 0 },
      { id: 'PhysicalDamage', label: 'Physical Damage', suffix: '%', fractionDigits: 0 },
      { id: 'FireDamage', label: 'Fire Damage', suffix: '%', fractionDigits: 0 },
      { id: 'ColdDamage', label: 'Cold Damage', suffix: '%', fractionDigits: 0 },
      { id: 'LightningDamage', label: 'Lightning Damage', suffix: '%', fractionDigits: 0 },
      { id: 'ElementalDamage', label: 'Elemental Damage', suffix: '%', fractionDigits: 0 },
      { id: 'MeleeDamage', label: 'Melee Damage', suffix: '%', fractionDigits: 0 },
      { id: 'RangedDamage', label: 'Ranged Damage', suffix: '%', fractionDigits: 0 },
      { id: 'SkillDamage', label: 'Skill Damage', suffix: '%', fractionDigits: 0 },
      { id: 'SpellDamage', label: 'Spell Damage', suffix: '%', fractionDigits: 0 },
      { id: 'AreaDamage', label: 'Area Damage', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Penetration',
    icon: Zap,
    stats: [
      { id: 'StrikePenetrationPercent', label: 'Strike Pen', suffix: '%', fractionDigits: 0 },
      { id: 'PiercePenetrationPercent', label: 'Pierce Pen', suffix: '%', fractionDigits: 0 },
      { id: 'PhysicalPenetrationPercent', label: 'Physical Pen', suffix: '%', fractionDigits: 0 },
      { id: 'FirePenetrationPercent', label: 'Fire Pen', suffix: '%', fractionDigits: 0 },
      { id: 'ColdPenetrationPercent', label: 'Cold Pen', suffix: '%', fractionDigits: 0 },
      { id: 'LightningPenetrationPercent', label: 'Lightning Pen', suffix: '%', fractionDigits: 0 },
      { id: 'ElementalPenetrationPercent', label: 'Elemental Pen', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Critical',
    icon: Crosshair,
    stats: [
      { id: 'AttackCriticalStrikeChance', label: 'Attack Crit Chance', suffix: '%', fractionDigits: 1 },
      { id: 'SpellCriticalStrikeChance', label: 'Spell Crit Chance', suffix: '%', fractionDigits: 1 },
      { id: 'CriticalStrikeMultiplier', label: 'Crit Multiplier', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Weapon Enhancements',
    icon: Wrench,
    stats: [
      { id: 'StrikeDamageToWeapons', label: 'Strike Damage (Wep)', fractionDigits: 0 },
      { id: 'PierceDamageToWeapons', label: 'Pierce Damage (Wep)', fractionDigits: 0 },
      { id: 'FireDamageToWeapons', label: 'Fire Damage (Wep)', fractionDigits: 0 },
      { id: 'ColdDamageToWeapons', label: 'Cold Damage (Wep)', fractionDigits: 0 },
      { id: 'LightningDamageToWeapons', label: 'Lightning Damage (Wep)', fractionDigits: 0 },
      { id: 'WeaponElementalDamage', label: 'Wep Elemental Damage', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'DoT & Status Effects',
    icon: Flame,
    stats: [
      { id: 'DoTDamage', label: 'DoT Damage', suffix: '%', fractionDigits: 0 },
      { id: 'DoTDuration', label: 'DoT Duration', suffix: '%', fractionDigits: 0 },
      { id: 'StatusEffectPower', label: 'Status Effect Power', suffix: '%', fractionDigits: 0 },
      { id: 'StatusEffectDuration', label: 'Status Effect Duration', suffix: '%', fractionDigits: 0 },
      { id: 'BurnEffect', label: 'Burn Effect', suffix: '%', fractionDigits: 0 },
      { id: 'ChillEffect', label: 'Chill Effect', suffix: '%', fractionDigits: 0 },
      { id: 'ShockEffect', label: 'Shock Effect', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Armor & Resistances',
    icon: Shield,
    stats: [
      { id: 'Armor', label: 'Armor', fractionDigits: 0 },
      { id: 'DamageReduction', label: 'Damage Reduction', suffix: '%', fractionDigits: 0 },
      { id: 'StrikeResist', label: 'Strike Resist', suffix: '%', fractionDigits: 0 },
      { id: 'PierceResist', label: 'Pierce Resist', suffix: '%', fractionDigits: 0 },
      { id: 'PhysicalResist', label: 'Physical Resist', suffix: '%', fractionDigits: 0 },
      { id: 'FireResist', label: 'Fire Resist', suffix: '%', fractionDigits: 0 },
      { id: 'ColdResist', label: 'Cold Resist', suffix: '%', fractionDigits: 0 },
      { id: 'LightningResist', label: 'Lightning Resist', suffix: '%', fractionDigits: 0 },
      { id: 'AllElementalResist', label: 'All Elemental Resist', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Deflection & Blocking',
    icon: ShieldOff,
    stats: [
      { id: 'DeflectRating', label: 'Deflect Rating', fractionDigits: 0 },
      { id: 'DeflectEffect', label: 'Deflect Amount', suffix: '%', fractionDigits: 0 },
      { id: 'BlockRating', label: 'Block Rating', fractionDigits: 0 },
      { id: 'SpellBlockRating', label: 'Spell Block Rating', fractionDigits: 0 },
      { id: 'BlockEffect', label: 'Block Effect', suffix: '%', fractionDigits: 0 },
      { id: 'ParryRating', label: 'Parry Rating', fractionDigits: 0 },
      { id: 'SpellParryRating', label: 'Spell Parry Rating', fractionDigits: 0 },
      { id: 'ParryEffect', label: 'Parry Effect', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Sustain & Recovery',
    icon: Activity,
    stats: [
      { id: 'HealingDealt', label: 'Healing Dealt', suffix: '%', fractionDigits: 0 },
      { id: 'HealingReceived', label: 'Healing Received', suffix: '%', fractionDigits: 0 },
      { id: 'Lifesteal', label: 'Lifesteal', suffix: '%', fractionDigits: 1 },
      { id: 'SpellVamp', label: 'Spell Vamp', suffix: '%', fractionDigits: 1 },
      { id: 'LifeGainOnHit', label: 'Life per Hit', fractionDigits: 1 },
      { id: 'LifeOnKill', label: 'Life per Kill', fractionDigits: 1 },
      { id: 'ManaLeech', label: 'Mana Leech', suffix: '%', fractionDigits: 1 },
      { id: 'ManaGainOnHit', label: 'Mana per Hit', fractionDigits: 1 },
      { id: 'ManaOnKill', label: 'Mana per Kill', fractionDigits: 1 },
    ]
  },
  {
    title: 'Misc',
    icon: Book,
    stats: [
      { id: 'SkillReach', label: 'Skill Reach', fractionDigits: 0 },
      { id: 'CooldownReductionRating', label: 'CDR Rating', fractionDigits: 0 },
      { id: 'MoveSpeed', label: 'Move Speed', fractionDigits: 0 },
      { id: 'ManaCostReduction', label: 'Mana Cost Reduction', suffix: '%', fractionDigits: 0 },
      { id: 'BuffEffect', label: 'Buff Effect', suffix: '%', fractionDigits: 0 },
      { id: 'BuffDuration', label: 'Buff Duration', suffix: '%', fractionDigits: 0 },
      { id: 'MagicFind', label: 'Magic Find', suffix: '%', fractionDigits: 0 },
      { id: 'GoldFind', label: 'Gold Find', suffix: '%', fractionDigits: 0 },
      { id: 'ExperienceGain', label: 'Experience Gain', suffix: '%', fractionDigits: 0 },
    ]
  }
];

function computeTotalRegen(getStat: (stat: StatType) => number, statId: StatType): number {
  if (statId === 'HealthRegeneration') {
    const flatRegen = getStat('HealthRegeneration');
    const pctRegen = getStat('HealthRegenPercent');
    return flatRegen * (1 + pctRegen / 100);
  }
  if (statId === 'ManaRegeneration') {
    const flatRegen = getStat('ManaRegeneration');
    const pctRegen = getStat('ManaRegenPercent');
    return flatRegen * (1 + pctRegen / 100);
  }
  return getStat(statId);
}

export function CharacterSheet() {
  const { getStat } = useStatsStore();
  const level = usePlayerStore(state => state.level);

  return (
    <div className="p-4 flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-3">
        {STAT_CATEGORIES.map((category) => (
          <div key={category.title} className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 mb-1">
              <category.icon className="w-4 h-4 opacity-70" />
              {category.title}
            </h3>
            <div className="bg-surface-base rounded-xl border border-border-subtle overflow-hidden shadow-inner py-0.5">
              {category.stats.map((statDef, index) => {
                const isRegen = statDef.id === 'HealthRegeneration' || statDef.id === 'ManaRegeneration';
                let rawVal = isRegen ? computeTotalRegen(getStat, statDef.id) : getStat(statDef.id);

                let displayVal: string;
                let hasStat: boolean;

                if (statDef.id === 'WeaponDamage') {
                   const baseWeapon = getStat('WeaponDamage');
                   const globalDmg = getStat('Damage') / 100;
                   const weapon1 = useInventoryStore.getState().equipment['weapon1'];
                   const dmgType = weapon1?.damageType || 'Strike';
                   let tagDmg = 0;
                   if (dmgType === 'Strike') {
                      tagDmg += getStat('StrikeDamage') / 100;
                      tagDmg += getStat('PhysicalDamage') / 100;
                      tagDmg += getStat('MeleeDamage') / 100;
                   } else if (dmgType === 'Pierce') {
                      tagDmg += getStat('PierceDamage') / 100;
                      tagDmg += getStat('PhysicalDamage') / 100;
                      tagDmg += getStat('RangedDamage') / 100;
                   }
                   rawVal = baseWeapon * (1 + globalDmg) * (1 + tagDmg);
                   hasStat = rawVal > 0;
                   const minVal = Math.floor(rawVal * 0.75);
                   const maxVal = Math.ceil(rawVal * 1.25);
                   displayVal = hasStat ? `${minVal}-${maxVal}` : '--';
                } else if (statDef.id === 'AttacksPerSecond') {
                   const weapon1 = useInventoryStore.getState().equipment['weapon1'];
                   const baseAPS = weapon1?.weaponAttackSpeed || 0.5;
                   const attackSpeedBonus = getStat('AttackSpeed') / 100;
                   rawVal = baseAPS * (1 + attackSpeedBonus);
                   hasStat = rawVal > 0;
                   displayVal = hasStat ? `${rawVal.toFixed(statDef.fractionDigits ?? 0)}` : '--';
                } else if (statDef.id === 'MoveSpeed') {
                  const BASE_MOVE_SPEED = 1.33;
                  const pctIncrease = ((rawVal / BASE_MOVE_SPEED) - 1) * 100;
                  hasStat = Math.abs(pctIncrease) > 0.001;
                  displayVal = hasStat ? `${pctIncrease.toFixed(0)}%` : '--';
                } else if (statDef.id.endsWith('Rating')) {
                  hasStat = rawVal > 0;
                  if (hasStat) {
                     let pct = 0;
                     if (statDef.id === 'DeflectRating') pct = RatingCalculator.getDeflectChance(rawVal, level) * 100;
                     else if (statDef.id === 'BlockRating' || statDef.id === 'SpellBlockRating') pct = RatingCalculator.getBlockChance(rawVal, level) * 100;
                     else if (statDef.id === 'ParryRating' || statDef.id === 'SpellParryRating') pct = RatingCalculator.getParryChance(rawVal, level) * 100;
                     else if (statDef.id === 'CooldownReductionRating') pct = RatingCalculator.getCooldownReduction(rawVal, level) * 100;
                     else if (statDef.id === 'HasteRating') pct = RatingCalculator.getHasteReduction(rawVal, level) * 100;
                     
                     displayVal = `${rawVal.toFixed(0)} (${pct.toFixed(1)}%)`;
                  } else {
                     displayVal = '--';
                  }
                } else {
                  hasStat = rawVal !== 0;
                  displayVal = hasStat ? `${rawVal.toFixed(statDef.fractionDigits ?? 0)}${statDef.suffix || ''}` : '--';
                }

                return (
                  <div
                    key={statDef.id}
                    className={`flex justify-between items-center px-4 py-1 text-xs transition-colors
                      ${index !== category.stats.length - 1 ? 'border-b border-border-subtle' : ''}
                      ${hasStat ? 'hover:bg-surface-raised' : 'opacity-40'}
                    `}
                  >
                    <span className="text-text-secondary">{statDef.label}</span>
                    <span className={`font-mono font-medium ${hasStat ? 'text-text-primary' : 'text-text-muted'}`}>
                      {displayVal}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
