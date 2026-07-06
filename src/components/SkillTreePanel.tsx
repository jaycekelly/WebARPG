import { useState } from 'react';
import { useSkillStore } from '../store/useSkillStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { SKILL_TREE, type TalentNode } from '../data/skillTrees';
import { SKILLS } from '../data/skills';
import { getEffectiveManaCost, getEffectiveCastTime } from '../engine/input/InputHandler';
import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { Flame } from 'lucide-react';

import { ICONS } from './IconLibrary';

export function SkillTreePanel() {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');
  
  const { allocatedPoints, allocatePoint, getTotalPointsSpent } = useSkillStore();
  const { skillPoints, playerClass, secondaryClass } = usePlayerStore();
  const { setContent } = useTooltipStore();

  const currentClass = activeTab === 'primary' ? playerClass : (secondaryClass || playerClass);
  const totalSpent = getTotalPointsSpent(currentClass);
  const primarySpent = getTotalPointsSpent(playerClass);
  const secondarySpent = secondaryClass ? getTotalPointsSpent(secondaryClass) : 0;
  
  const currentTree = SKILL_TREE[currentClass] || [];


  const renderNode = (node: TalentNode) => {
    const pointsSpent = allocatedPoints[node.id] || 0;
    const isMaxed = pointsSpent >= node.maxPoints;
    const requiredPoints = (node.tier - 1) * 5;
    const isUnlocked = totalSpent >= requiredPoints;
    const canAfford = skillPoints > 0;
    
    const Icon = ICONS[node.icon] || Flame;

    const renderTooltip = () => {
      let activeSkill = undefined;
      if (node.type === 'active' && node.grantedSkillId) {
        activeSkill = SKILLS[node.grantedSkillId];
      }

      return (
        <div className="w-56 bg-surface-overlay border border-border-strong rounded-lg px-2 py-1.5 shadow-2xl backdrop-blur-md text-left pointer-events-none">
           {activeSkill ? (
             <>
                <div className="font-bold text-sm text-sky-400 mb-1">{activeSkill.name}</div>
                <div className="flex justify-between text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest">
                   <span>{getEffectiveManaCost(activeSkill)} Mana</span>
                   <span>{activeSkill.cooldownMs ? `${(activeSkill.cooldownMs / 1000).toFixed(1)} CD` : 'No CD'}</span>
                </div>
                <div className="flex justify-between text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest">
                   <span>{activeSkill.range > 0 ? `Range ${activeSkill.range}` : 'Melee'}</span>
                   <span>{activeSkill.castTime ? `${(getEffectiveCastTime(activeSkill) / 1000).toFixed(1)} Cast` : 'Instant'}</span>
                </div>
                {activeSkill.effects.some(e => e.type === 'damage') && (
                  <div className="mb-1 pb-1 border-b border-border-subtle space-y-0.5">
                    {activeSkill.effects.filter(e => e.type === 'damage').map((effect, i) => {
                      const weaponDamage = useStatsStore.getState().getStat('Damage');
                      const weaponType = (useInventoryStore.getState().equipment['weapon1'] as any)?.damageType || 'Physical';
                      const mult = effect.damageMultiplier || 0;
                      const base = effect.baseValue || 0;
                      const totalAvg = base + (weaponDamage * mult);
                      const el = effect.element || (mult > 0 ? weaponType : 'Physical');
                      return (
                        <div key={i} className="text-xs font-bold text-text-secondary">
                          {Math.floor(totalAvg)} {el} Damage
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="text-xs text-text-primary leading-snug">
                   {activeSkill.description}
                </div>
             </>
           ) : (
             <>
               <h3 className={`font-bold text-sm mb-1 ${node.type === 'active' ? 'text-sky-400' : 'text-blue-500'}`}>{node.name}</h3>
               <p className="text-xs text-text-secondary pb-1 mb-1 border-b border-border-subtle leading-snug">{node.description}</p>
               {node.statModifiers && (
                 <div className="mt-1 flex flex-col gap-0.5">
                   {node.statModifiers.map((mod, i) => {
                      const sign = mod.value > 0 ? '+' : '';
                      const suffix = mod.type === 'increased' ? '%' : '';
                      return <div key={i} className="text-xs text-sky-400">{sign}{mod.value}{suffix} {mod.stat} per point</div>;
                   })}
                 </div>
               )}
             </>
           )}

           {!isUnlocked && (
             <div className="mt-1 text-[0.625rem] text-red-500 font-bold border-t border-border-subtle pt-1">Requires {(node.tier - 1) * 5} points spent in tree.</div>
           )}
        </div>
      );
    };

    return (
      <div 
        key={node.id} 
        className={`group relative flex flex-col items-center justify-center transition-all cursor-pointer
          ${canAfford && isUnlocked && !isMaxed ? 'opacity-100 hover:scale-110' : 'opacity-60'}
          ${!isUnlocked && 'cursor-not-allowed'}
        `}
        onMouseEnter={() => setContent(renderTooltip())}
        onMouseLeave={() => setContent(null)}
        onClick={() => {
          if (isUnlocked && !isMaxed && canAfford) {
            allocatePoint(node.id, currentClass);
          }
        }}
      >
        <div className={`relative w-8 h-8 flex items-center justify-center border transition-all
           ${canAfford && isUnlocked && !isMaxed 
             ? 'border-accent bg-surface-deep shadow-[0_0_8px_rgba(56,189,248,0.5)] animate-pulse' 
             : 'border-border-subtle bg-surface-base'}
           ${node.type === 'active' ? 'rounded' : 'rounded-full'}
        `}>
           <Icon className={`w-5 h-5 ${node.type === 'active' ? 'text-blue-500' : 'text-sky-400'}`} />

        </div>
        
        <div className="text-[8px] font-black tracking-widest mt-0.5 transition-colors leading-none text-text-secondary">
           {pointsSpent}/{node.maxPoints}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative animate-in fade-in flex-1 gap-2">
      
      {/* Header: Tabs & Points */}
      <div className="flex justify-between items-center shrink-0">
        <div className="flex gap-2">
          <button 
            onClick={() => setActiveTab('primary')}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-2 ${activeTab === 'primary' ? 'bg-surface-deep text-accent border border-accent shadow-[0_0_8px_rgba(56,189,248,0.15)]' : 'bg-surface-deep text-text-secondary border border-border-subtle hover:text-text-primary'}`}
          >
            <span>{playerClass}</span>
            <span className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${activeTab === 'primary' ? 'bg-surface-base text-accent' : 'bg-surface-base text-text-secondary'}`}>
              {primarySpent} pts
            </span>
          </button>
          {secondaryClass && (
            <button 
              onClick={() => setActiveTab('secondary')}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors flex items-center gap-2 ${activeTab === 'secondary' ? 'bg-surface-deep text-accent border border-accent shadow-[0_0_8px_rgba(56,189,248,0.15)]' : 'bg-surface-deep text-text-secondary border border-border-subtle hover:text-text-primary'}`}
            >
              <span>{secondaryClass}</span>
              <span className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${activeTab === 'secondary' ? 'bg-surface-base text-accent' : 'bg-surface-base text-text-secondary'}`}>
                {secondarySpent} pts
              </span>
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-[0.625rem] font-bold text-text-secondary uppercase tracking-widest">Unspent SP</span>
          <span className={`text-sm font-black ${skillPoints > 0 ? 'text-accent animate-pulse' : 'text-text-primary'}`}>{skillPoints}</span>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-hidden border border-border-subtle rounded-xl shadow-sm relative bg-transparent">
        <div className="h-full flex flex-col w-full">
           
           {/* Node Area */}
           <div className="flex-1 flex items-stretch px-2">
              {[1, 2, 3, 4, 5].map(tier => (
                 <div key={`tier-col-${tier}`} className="flex-1 flex flex-col items-center justify-center gap-7 border-r border-border-subtle/30 last:border-r-0 py-2">
                    {currentTree.filter(n => n.tier === tier).map(renderNode)}
                 </div>
              ))}
           </div>

           {/* Stylish Bottom Spine */}
           <div className="h-10 shrink-0 bg-surface-deep/80 border-t border-border-subtle flex items-center px-2 relative">
              {/* Progress Line Background */}
              <div className="absolute top-1/2 left-2 right-2 h-px bg-border-subtle -translate-y-1/2 z-0" />
              
              {/* Active Progress Line */}
              <div 
                className="absolute top-1/2 left-2 h-px bg-border-strong -translate-y-1/2 z-0 transition-all duration-500" 
                style={{ width: `calc(${Math.min(100, (totalSpent / 20) * 100)}% - 1rem)` }} 
              />

              {[1, 2, 3, 4, 5].map(tier => {
                  const req = (tier - 1) * 5;
                  const unlocked = totalSpent >= req;
                  return (
                    <div key={`spine-req-${tier}`} className="flex-1 flex justify-center relative z-10">
                      <div className={`flex items-center justify-center rounded px-2 py-0.5 border ${unlocked ? 'bg-surface-deep border-border-strong' : 'bg-surface-base border-border-subtle opacity-70'}`}>
                         <span className={`text-[0.5625rem] font-black uppercase tracking-widest whitespace-nowrap ${unlocked ? 'text-text-primary' : 'text-text-muted'}`}>
                           T{tier} {tier > 1 && !unlocked && <span className="text-red-900/60 opacity-80">({req})</span>}
                         </span>
                      </div>
                    </div>
                  );
              })}
           </div>
        </div>
      </div>
    </div>
  );
}
