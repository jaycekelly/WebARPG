import { useStatsStore } from '../store/useStatsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Sparkles, Sword, Shield, Zap, Activity, Heart, Book } from 'lucide-react';
import type { StatType } from '../engine/stats/types';

interface StatDefinition {
  id: StatType;
  label: string;
  icon?: React.ElementType;
  suffix?: string;
  fractionDigits?: number;
}

interface StatCategory {
  title: string;
  icon: React.ElementType;
  stats: StatDefinition[];
}

const STAT_CATEGORIES: StatCategory[] = [
  {
    title: 'Core & Resources',
    icon: Heart,
    stats: [
      { id: 'Health', label: 'Max Health', fractionDigits: 0 },
      { id: 'Mana', label: 'Max Mana', fractionDigits: 0 },
      { id: 'MoveSpeed', label: 'Move Speed', fractionDigits: 2 },
    ]
  },
  {
    title: 'Offense',
    icon: Sword,
    stats: [
      { id: 'Damage', label: 'Base Damage', fractionDigits: 1 },
      { id: 'AttackSpeed', label: 'Attack Speed', fractionDigits: 2 },
      { id: 'CastSpeed', label: 'Cast Speed', fractionDigits: 2 },
      { id: 'AttackCriticalStrikeChance', label: 'Attack Crit Chance', suffix: '%', fractionDigits: 1 },
      { id: 'AttackCriticalStrikeMultiplier', label: 'Attack Crit Mult', suffix: '%', fractionDigits: 0 },
      { id: 'SpellCriticalStrikeChance', label: 'Spell Crit Chance', suffix: '%', fractionDigits: 1 },
      { id: 'SpellCriticalStrikeMultiplier', label: 'Spell Crit Mult', suffix: '%', fractionDigits: 0 },
      { id: 'StrikeDamageToWeapons', label: 'Strike Damage', fractionDigits: 0 },
      { id: 'PierceDamageToWeapons', label: 'Pierce Damage', fractionDigits: 0 },
      { id: 'WeaponElementalDamage', label: 'Elemental Damage (Wep)', suffix: '%', fractionDigits: 0 },
      { id: 'LightningDamage', label: 'Lightning Damage', fractionDigits: 0 },
      { id: 'AreaDamage', label: 'Area Damage', fractionDigits: 0 },
    ]
  },
  {
    title: 'Penetration',
    icon: Zap,
    stats: [
      { id: 'PhysicalPenetrationFlat', label: 'Physical Pen (Flat)', fractionDigits: 0 },
      { id: 'PhysicalPenetrationPercent', label: 'Physical Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'FirePenetrationFlat', label: 'Fire Pen (Flat)', fractionDigits: 0 },
      { id: 'FirePenetrationPercent', label: 'Fire Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'ColdPenetrationFlat', label: 'Cold Pen (Flat)', fractionDigits: 0 },
      { id: 'ColdPenetrationPercent', label: 'Cold Pen (%)', suffix: '%', fractionDigits: 0 },
      { id: 'LightningPenetrationFlat', label: 'Lightning Pen (Flat)', fractionDigits: 0 },
      { id: 'LightningPenetrationPercent', label: 'Lightning Pen (%)', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Defense',
    icon: Shield,
    stats: [
      { id: 'Armor', label: 'Armor', fractionDigits: 0 },
      { id: 'Block', label: 'Block Chance', suffix: '%', fractionDigits: 0 },
      { id: 'SpellBlock', label: 'Spell Block', suffix: '%', fractionDigits: 0 },
      { id: 'Parry', label: 'Parry Chance', suffix: '%', fractionDigits: 0 },
      { id: 'DeflectChance', label: 'Deflect (Attack)', suffix: '%', fractionDigits: 0 },
      { id: 'SpellDeflectChance', label: 'Deflect (Spell)', suffix: '%', fractionDigits: 0 },
      { id: 'FireResist', label: 'Fire Resist', fractionDigits: 0 },
      { id: 'ColdResist', label: 'Cold Resist', fractionDigits: 0 },
      { id: 'LightningResist', label: 'Lightning Resist', fractionDigits: 0 },
    ]
  },
  {
    title: 'Sustain & Leech',
    icon: Activity,
    stats: [
      { id: 'LifeGainOnHit', label: 'Life per Hit', fractionDigits: 1 },
      { id: 'LifeOnKill', label: 'Life per Kill', fractionDigits: 1 },
      { id: 'Lifesteal', label: 'Lifesteal', suffix: '%', fractionDigits: 1 },
      { id: 'HealingDealt', label: 'Healing Multiplier', suffix: '%', fractionDigits: 0 },
    ]
  },
  {
    title: 'Utility',
    icon: Book,
    stats: [
      { id: 'SkillReach', label: 'Skill Reach', fractionDigits: 0 },
      { id: 'CooldownReduction', label: 'Cooldown Reduction', suffix: '%', fractionDigits: 0 },
      { id: 'ManaCostReduction', label: 'Mana Cost Reduction', suffix: '%', fractionDigits: 0 },
      { id: 'BuffEffect', label: 'Buff Effect', suffix: '%', fractionDigits: 0 },
      { id: 'BuffDuration', label: 'Buff Duration', suffix: '%', fractionDigits: 0 },
      { id: 'ExperienceGain', label: 'Experience Gain', suffix: '%', fractionDigits: 0 },
      { id: 'MagicFind', label: 'Magic Find', suffix: '%', fractionDigits: 0 },
    ]
  }
];

export function CharacterSheet() {
  const { getStat } = useStatsStore();
  const { skillPoints, level } = usePlayerStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Character Stats</h2>
          <div className="text-xs text-zinc-500">Level {level}</div>
        </div>
        {skillPoints > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 px-2 py-1 rounded text-xs font-bold flex items-center gap-1.5 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <Sparkles className="w-3 h-3" />
            {skillPoints} Points
          </div>
        )}
      </div>

      <div className="space-y-6 pb-8">
        {STAT_CATEGORIES.map((category) => (
          <div key={category.title} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-2">
              <category.icon className="w-4 h-4 opacity-70" />
              {category.title}
            </h3>
            <div className="bg-zinc-950/50 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner">
              {category.stats.map((statDef, index) => {
                const val = getStat(statDef.id);
                // Highlight non-zero stats to make them pop
                const isNonZero = val !== 0;
                
                return (
                  <div 
                    key={statDef.id} 
                    className={`flex justify-between items-center px-4 py-2 text-sm transition-colors
                      ${index !== category.stats.length - 1 ? 'border-b border-zinc-900/50' : ''}
                      ${isNonZero ? 'hover:bg-zinc-900/80' : 'opacity-50'}
                    `}
                  >
                    <span className="text-zinc-400">{statDef.label}</span>
                    <span className={`font-mono font-medium ${isNonZero ? 'text-zinc-200' : 'text-zinc-600'}`}>
                      {val.toFixed(statDef.fractionDigits ?? 0)}{statDef.suffix || ''}
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
