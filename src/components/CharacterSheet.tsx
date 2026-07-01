import { useStatsStore } from '../store/useStatsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Sparkles, Sword, Shield, Zap, Activity, Heart, Book, Plus, ArrowUp } from 'lucide-react';
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
      { id: 'SpellCriticalStrikeChance', label: 'Spell Crit Chance', suffix: '%', fractionDigits: 1 },
      { id: 'CriticalStrikeMultiplier', label: 'Crit Multiplier', suffix: '%', fractionDigits: 0 },
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
      { id: 'DeflectChance', label: 'Deflect', suffix: '%', fractionDigits: 0 },
      { id: 'DeflectEffect', label: 'Deflect Amount', suffix: '%', fractionDigits: 0 },
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
  const { skillPoints, level, attributePoints, allocateAttribute } = usePlayerStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-bold text-zinc-100">Character Stats</h2>
          <div className="text-xs text-zinc-400">Level {level}</div>
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
      <div className="space-y-3 pb-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
          <Activity className="w-4 h-4 opacity-70" />
          Attributes
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {(['Strength', 'Dexterity', 'Intelligence', 'Vitality'] as const).map(attr => (
            <div key={attr} className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner flex items-center justify-between p-2">
               <div className="flex flex-col px-2">
                 <span className="text-zinc-400 text-xs uppercase tracking-wide">{attr}</span>
                 <span className="font-mono text-zinc-200">{getStat(attr).toFixed(0)}</span>
               </div>
               {attributePoints > 0 && (
                 <button 
                   onClick={() => allocateAttribute(attr)}
                   className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-zinc-100 flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0 shadow-lg shadow-blue-500/20"
                 >
                   <Plus className="w-4 h-4" />
                 </button>
               )}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6 pb-8">
        {STAT_CATEGORIES.map((category) => (
          <div key={category.title} className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <category.icon className="w-4 h-4 opacity-70" />
              {category.title}
            </h3>
            <div className="bg-zinc-900/50 rounded-xl border border-zinc-800/50 overflow-hidden shadow-inner">
              {category.stats.map((statDef, index) => {
                const val = getStat(statDef.id);
                // Highlight non-zero stats to make them pop
                const isNonZero = val !== 0;
                
                let displayVal: string;
                if (statDef.id === 'Damage' && val > 0) {
                  const min = Math.floor(val * 0.75);
                  const max = Math.ceil(val * 1.25);
                  displayVal = `${min} - ${max}`;
                } else {
                  displayVal = `${val.toFixed(statDef.fractionDigits ?? 0)}${statDef.suffix || ''}`;
                }
                
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
