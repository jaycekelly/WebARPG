import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
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
    title: 'Core Stats',
    icon: Activity,
    stats: [
      { id: 'Health', label: 'Max Health', fractionDigits: 0 },
      { id: 'Energy', label: 'Max Energy', fractionDigits: 0 },
      { id: 'Armor', label: 'Armor', fractionDigits: 0 },
      { id: 'DeflectRating', label: 'Deflect Rating', fractionDigits: 0 },
      { id: 'WeaponDamage', label: 'Weapon Damage', fractionDigits: 0 },
      { id: 'AttacksPerSecond', label: 'Attack Speed', fractionDigits: 2 },
      { id: 'HasteRating', label: 'Haste Rating', fractionDigits: 0 },
    ]
  },
  {
    title: 'Health & Energy',
    icon: Heart,
    stats: [
      { id: 'HealthRegeneration', label: 'Health/sec', fractionDigits: 2 },
      { id: 'HealthRegenPercent', label: 'Health Regen', suffix: '%', fractionDigits: 1 },
      { id: 'EnergyRegeneration', label: 'Energy/sec', fractionDigits: 2 },
      { id: 'EnergyRegenPercent', label: 'Energy Regen', suffix: '%', fractionDigits: 1 },
    ]
  },
  {
    title: 'Damage',
    icon: Sword,
    stats: [
      { id: 'Damage', label: 'Global Damage', suffix: '%', fractionDigits: 0 },
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
      { id: 'DeflectAmount', label: 'Deflect Amount', suffix: '%', fractionDigits: 0 },
      { id: 'BlockRating', label: 'Block Rating', fractionDigits: 0 },
      { id: 'SpellBlockRating', label: 'Spell Block Rating', fractionDigits: 0 },
      { id: 'BlockAmount', label: 'Block Amount', suffix: '%', fractionDigits: 0 },
      { id: 'ParryRating', label: 'Parry Rating', fractionDigits: 0 },
      { id: 'SpellParryRating', label: 'Spell Parry Rating', fractionDigits: 0 },
      { id: 'ParryAmount', label: 'Parry Amount', suffix: '%', fractionDigits: 0 },
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
      { id: 'EnergyLeech', label: 'Energy Leech', suffix: '%', fractionDigits: 1 },
      { id: 'EnergyGainOnHit', label: 'Energy per Hit', fractionDigits: 1 },
      { id: 'EnergyOnKill', label: 'Energy per Kill', fractionDigits: 1 },
    ]
  },
  {
    title: 'Misc',
    icon: Book,
    stats: [
      { id: 'SkillReach', label: 'Skill Reach', fractionDigits: 0 },
      { id: 'CooldownReductionRating', label: 'CDR Rating', fractionDigits: 0 },
      { id: 'MoveSpeed', label: 'Move Speed', fractionDigits: 0 },
      { id: 'EnergyCostReduction', label: 'Energy Cost Reduction', suffix: '%', fractionDigits: 0 },
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
  if (statId === 'EnergyRegeneration') {
    const flatRegen = getStat('EnergyRegeneration');
    const pctRegen = getStat('EnergyRegenPercent');
    return flatRegen * (1 + pctRegen / 100);
  }
  return getStat(statId);
}

export function CharacterSheet() {
  const { getStat } = useStatsStore();
  const { level } = usePlayerStore();
  const { setContent } = useTooltipStore();

  return (
    <div className="p-4 flex flex-col gap-3 h-full overflow-y-auto custom-scrollbar">
      <div className="flex flex-col gap-3">
        {STAT_CATEGORIES.map((category) => (
          <div key={category.title} className="flex flex-col gap-2">
            <h3 className="text-[15px] font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 mb-1">
              {category.title}
            </h3>
            <div className="bg-surface-base rounded-none overflow-hidden py-0.5">
              {category.stats.map((statDef, index) => {
                const isRegen = statDef.id === 'HealthRegeneration' || statDef.id === 'EnergyRegeneration';
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
                     key={index} 
                     className="flex justify-between items-center py-1.5 px-3 hover:bg-surface-overlay transition-colors rounded-none group"
                     onMouseEnter={() => {
                        let desc = '';
                        if (statDef.id === 'Armor') {
                           const armor = getStat('Armor');
                           const innatePen = (level * 1.5) + (Math.pow(level, 2) / 10);
                           const effectiveArmor = Math.max(0, armor - innatePen);
                           const dr = Math.min(0.85, effectiveArmor / (effectiveArmor + 100));
                           desc = `Expected -${(dr * 100).toFixed(0)}% damage from an enemy your level`;
                        } else if (statDef.id === 'HasteRating') {
                           desc = "Lowers your Global Cooldown (GCD), allowing you to cast skills faster";
                        } else if (statDef.id === 'DeflectRating') {
                           desc = "Chance to reduce incoming damage by your Deflect Amount (40% base)";
                        }
                        
                        if (desc) {
                           setContent(
                             <div className="w-60 bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none">
                               <div className="text-xs text-text-secondary leading-relaxed">
                                 {desc}
                               </div>
                             </div>
                           );
                        }
                     }}
                     onMouseLeave={() => setContent(null)}
                   >
                     <span className={`text-[0.6875rem] font-semibold tracking-wide uppercase ${hasStat ? 'text-text-secondary group-hover:text-text-primary' : 'text-text-muted group-hover:text-text-secondary'} transition-colors`}>
                       {statDef.label}
                     </span>
                     <span className={`font-mono font-medium text-xs ${hasStat ? 'text-text-primary' : 'text-text-muted'}`}>
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
