import { useStatsStore } from '../store/useStatsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Sword, Shield, Zap, Activity, Heart, Book, Crosshair, Wrench, Flame, ShieldOff, Plus, ArrowUp } from 'lucide-react';
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
      { id: 'Damage', label: 'Damage', suffix: '%', fractionDigits: 0 },
      { id: 'AttackSpeed', label: 'Attack Speed', fractionDigits: 2 },
      { id: 'CastSpeed', label: 'Cast Speed', fractionDigits: 2 },
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
      { id: 'StrikePenetrationFlat', label: 'Strike Pen (Flat)', fractionDigits: 0 },
      { id: 'StrikePenetrationPercent', label: 'Strike Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'PiercePenetrationFlat', label: 'Pierce Pen (Flat)', fractionDigits: 0 },
      { id: 'PiercePenetrationPercent', label: 'Pierce Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'PhysicalPenetrationFlat', label: 'Physical Pen (Flat)', fractionDigits: 0 },
      { id: 'PhysicalPenetrationPercent', label: 'Physical Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'FirePenetrationFlat', label: 'Fire Pen (Flat)', fractionDigits: 0 },
      { id: 'FirePenetrationPercent', label: 'Fire Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'ColdPenetrationFlat', label: 'Cold Pen (Flat)', fractionDigits: 0 },
      { id: 'ColdPenetrationPercent', label: 'Cold Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'LightningPenetrationFlat', label: 'Lightning Pen (Flat)', fractionDigits: 0 },
      { id: 'LightningPenetrationPercent', label: 'Lightning Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'ElementalPenetrationFlat', label: 'Elemental Pen (Flat)', fractionDigits: 0 },
      { id: 'ElementalPenetrationPercent', label: 'Elemental Pen (%)', suffix: '%', fractionDigits: 0 },
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
      { id: 'DeflectChance', label: 'Deflect Chance', suffix: '%', fractionDigits: 0 },
      { id: 'DeflectEffect', label: 'Deflect Amount', suffix: '%', fractionDigits: 0 },
      { id: 'Block', label: 'Block Chance', suffix: '%', fractionDigits: 0 },
      { id: 'SpellBlock', label: 'Spell Block', suffix: '%', fractionDigits: 0 },
      { id: 'BlockEffect', label: 'Block Effect', suffix: '%', fractionDigits: 0 },
      { id: 'Parry', label: 'Parry Chance', suffix: '%', fractionDigits: 0 },
      { id: 'SpellParry', label: 'Spell Parry', suffix: '%', fractionDigits: 0 },
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
      { id: 'CooldownReduction', label: 'Cooldown Reduction', suffix: '%', fractionDigits: 0 },
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
    const maxHp = getStat('Health');
    const flatRegen = getStat('HealthRegeneration');
    const pctRegen = getStat('HealthRegenPercent');
    return ((maxHp * 0.0025) + flatRegen) * (1 + pctRegen / 100);
  }
  if (statId === 'ManaRegeneration') {
    const maxMana = getStat('Mana');
    const flatRegen = getStat('ManaRegeneration');
    const pctRegen = getStat('ManaRegenPercent');
    return ((maxMana * 0.015) + flatRegen) * (1 + pctRegen / 100);
  }
  return getStat(statId);
}

export function CharacterSheet() {
  const { getStat } = useStatsStore();
  const { level, attributePoints, allocateAttribute } = usePlayerStore();

  return (
    <div className="px-4 pb-4 pt-1 flex flex-col gap-3">
      <div className="flex items-center justify-between pb-2 border-b border-border-subtle">
        <div>
          <h2 className="text-xl font-black text-text-primary">Level {level}</h2>
        </div>
        <div className="flex gap-2">
          {attributePoints > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-[0_0_10px_rgba(59,130,246,0.2)]">
              <ArrowUp className="w-3 h-3" />
              {attributePoints} AP
            </div>
          )}
        </div>
      </div>

      {/* Core Attributes */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2">
          <Activity className="w-4 h-4 opacity-70" />
          Attributes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(['Strength', 'Dexterity', 'Intelligence', 'Vitality'] as const).map(attr => (
            <div key={attr} className="bg-surface-base rounded-xl border border-border-subtle overflow-hidden shadow-inner flex items-center justify-between p-2">
               <div className="flex flex-col px-2">
                 <span className="text-text-secondary text-xs uppercase tracking-wide">{attr.substring(0, 3)}</span>
                 <span className="font-mono text-text-primary">{getStat(attr).toFixed(0)}</span>
               </div>
               {attributePoints > 0 && (
                 <button 
                   onClick={() => allocateAttribute(attr)}
                   className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-text-primary flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg shadow-blue-500/20"
                 >
                   <Plus className="w-4 h-4" />
                 </button>
               )}
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {STAT_CATEGORIES.map((category) => (
          <div key={category.title} className="flex flex-col gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 mb-1">
              <category.icon className="w-4 h-4 opacity-70" />
              {category.title}
            </h3>
            <div className="bg-surface-base rounded-xl border border-border-subtle overflow-hidden shadow-inner">
              {category.stats.map((statDef, index) => {
                const isRegen = statDef.id === 'HealthRegeneration' || statDef.id === 'ManaRegeneration';
                const rawVal = isRegen ? computeTotalRegen(getStat, statDef.id) : getStat(statDef.id);

                let displayVal: string;
                let hasStat: boolean;

                if (statDef.id === 'MoveSpeed') {
                  // MoveSpeed base is 1.33 flat — show the % increase from items above base
                  const BASE_MOVE_SPEED = 1.33;
                  const pctIncrease = ((rawVal / BASE_MOVE_SPEED) - 1) * 100;
                  hasStat = Math.abs(pctIncrease) > 0.001;
                  displayVal = hasStat ? `${pctIncrease.toFixed(0)}%` : '--';
                } else {
                  hasStat = rawVal !== 0;
                  displayVal = hasStat ? `${rawVal.toFixed(statDef.fractionDigits ?? 0)}${statDef.suffix || ''}` : '--';
                }

                return (
                  <div
                    key={statDef.id}
                    className={`flex justify-between items-center px-4 py-1.5 text-xs transition-colors
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
