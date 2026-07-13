import type { Skill } from '../engine/skills/types';
import { getEffectiveCastTime, getEffectiveEnergyCost } from '../engine/input/InputHandler';

interface SkillTooltipProps {
  skill: Skill;
}

export function SkillTooltip({ skill }: SkillTooltipProps) {
  return (
    <div className="w-56 bg-[#141417]/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none">
      <div className="font-bold text-sm text-sky-400 mb-1">{skill.name}</div>
      <div className="flex flex-col text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-[#2a2a30]/40 uppercase tracking-widest gap-1">
        {(() => {
          const stats = [];
          if (getEffectiveEnergyCost(skill) > 0) stats.push({ val: getEffectiveEnergyCost(skill), lbl: 'Energy' });
          if (skill.adrenalineCost) stats.push({ val: skill.adrenalineCost, lbl: 'Adrenaline' });
          if (skill.cooldownMs) stats.push({ val: (skill.cooldownMs / 1000).toFixed(1), lbl: 'CD' });
          if (skill.castTime) {
            const castSec = getEffectiveCastTime(skill) / 1000;
            stats.push({ val: (castSec < 2.0 ? castSec.toFixed(1) : castSec.toFixed(0)) + 's', lbl: 'Cast' });
          }
          if (skill.range > 0) stats.push({ val: skill.range, lbl: 'Range' });
          else stats.push({ val: 'Melee', lbl: 'Range' });

          // Partition into rows of 2
          const rows = [];
          for (let i = 0; i < stats.length; i += 2) {
            rows.push(stats.slice(i, i + 2));
          }

          return rows.map((row, rIdx) => (
            <div key={rIdx} className={`flex justify-between items-center ${rIdx > 0 ? 'border-t border-[#2a2a30]/20 pt-1' : ''}`}>
              {row.map((stat, sIdx) => (
                <div key={sIdx} className="flex gap-1.5">
                  <span className="text-text-muted font-bold">{stat.lbl}:</span>
                  <span className="text-text-secondary font-black">{stat.val}</span>
                </div>
              ))}
            </div>
          ));
        })()}
      </div>
      <div className="text-[11px] text-text-secondary leading-snug mt-1.5 whitespace-pre-wrap">{skill.description}</div>
    </div>
  );
}
