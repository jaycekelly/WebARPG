import type { Skill } from '../engine/skills/types';
import { getEffectiveCastTime, getEffectiveEnergyCost } from '../engine/input/InputHandler';
import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';

interface SkillTooltipProps {
  skill: Skill;
}

export function SkillTooltip({ skill }: SkillTooltipProps) {
  return (
    <div className="w-56 bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none animate-in fade-in duration-200">
      <div className="font-bold text-sm text-sky-400 mb-1">{skill.name}</div>
      <div className="flex flex-col text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle/40 uppercase tracking-widest gap-1">
        {(() => {
          const stats = [];
          if (getEffectiveEnergyCost(skill) > 0) stats.push({ val: getEffectiveEnergyCost(skill), lbl: 'Energy' });
          if (skill.adrenalineCost) stats.push({ val: skill.adrenalineCost, lbl: 'Adrenaline' });
          if (skill.cooldownMs) stats.push({ val: (skill.cooldownMs / 1000).toFixed(1), lbl: 'CD' });
          if (skill.castTime) {
            const castSec = getEffectiveCastTime(skill) / 1000;
            stats.push({ val: (castSec < 2.0 ? castSec.toFixed(1) : castSec.toFixed(0)) + 's', lbl: 'Cast' });
          }
          stats.push({ val: skill.range > 1 ? skill.range : 'Melee', lbl: skill.range > 1 ? 'Range' : '' });

          const rows = [];
          for (let i = 0; i < stats.length; i += 2) {
            rows.push(stats.slice(i, i + 2));
          }

          return rows.map((row, i) => (
            <div key={i} className="flex justify-between items-center border-b border-border-subtle/40 pb-0.5 last:border-0 last:pb-0">
              <div className="flex items-center gap-1">
                <span>{row[0].val}</span>
                {row[0].lbl && <span>{row[0].lbl}</span>}
              </div>
              {row[1] && (
                <div className="flex items-center gap-1 text-right">
                  <span>{row[1].val}</span>
                  {row[1].lbl && <span>{row[1].lbl}</span>}
                </div>
              )}
            </div>
          ));
        })()}
      </div>
      {skill.effects.some(e => e.type === 'damage') && (
        <div className="mb-1 pb-1 border-b border-border-subtle/40 space-y-0.5">
          {skill.effects.filter(e => e.type === 'damage').map((effect, i) => {
            const weaponDamage = useStatsStore.getState().getStat('WeaponDamage');
            const weaponType = (useInventoryStore.getState().equipment['weapon1'] as any)?.damageType || 'Physical';
            const mult = effect.damageMultiplier || 0;
            const base = effect.baseValue || 0;
            const totalAvg = base + (weaponDamage * mult);
            const el = effect.element || (mult > 0 ? weaponType : 'Physical');

            if (skill.id === 'basic_attack') {
              const min = Math.floor(totalAvg * 0.75);
              const max = Math.ceil(totalAvg * 1.25);
              return (
                <div key={i} className="text-xs text-text-secondary">
                  {min} - {max} {el} Damage
                </div>
              );
            }

            return (
              <div key={i} className="text-xs text-text-secondary">
                {Math.floor(totalAvg)} {el} Damage
              </div>
            );
          })}
        </div>
      )}
      <div className="text-xs text-text-secondary leading-snug">
        {skill.description}
      </div>
    </div>
  );
}
