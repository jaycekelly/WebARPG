import { useState } from 'react';
import { useActiveSkillStore } from '../store/useActiveSkillStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { getEffectiveEnergyCost, getEffectiveCastTime } from '../engine/input/InputHandler';
import type { Skill } from '../engine/skills/types';
import { SKILLS } from '../data/skills';
import { GENERIC_DIALS, getMorphOptionsForSkill } from '../data/skills/upgrades';
import { ICONS } from './IconLibrary';
import { Flame, X, Menu } from 'lucide-react';
import { SkillInspector } from './SkillInspector';

export function ActiveSkillPanel() {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary' | 'select_secondary'>('primary');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [inspectSkillId, setInspectSkillId] = useState<string | null>(null);
  const [previewClass, setPreviewClass] = useState<any | null>(null);

  const { playerClass, secondaryClass, activeSkillPoints, boundSkills, level } = usePlayerStore();
  const { skillRanks, allocateDial, allocateMorph } = useActiveSkillStore();
  const { setContent } = useTooltipStore();

  const availableClasses: any[] = (['Fighter', 'Rogue', 'Ranger', 'Mage'] as any[]).filter(c => c !== playerClass);
  const selectedPreviewClass = previewClass || availableClasses[0];

  const currentTabClass = activeTab === 'primary' ? playerClass 
    : activeTab === 'secondary' ? (secondaryClass || playerClass) 
    : selectedPreviewClass;
  const classSkills = Object.values(SKILLS)
    .filter(skill => skill.classRequirement === currentTabClass)
    .sort((a, b) => (a.requiredLevel || 0) - (b.requiredLevel || 0));
  
  const handleTabClick = (tab: 'primary' | 'secondary' | 'select_secondary') => {
    setActiveTab(tab);
    setSelectedSkillId(null);
  };

  const getPointsSpentInClass = () => {
    let total = 0;
    for (const skill of classSkills) {
      const rank = skillRanks[skill.id] || 0;
      const RANK_COSTS = [1, 1, 2, 2, 2, 3];
      for (let i = 0; i < rank; i++) {
        total += RANK_COSTS[i];
      }
    }
    return total;
  };

  const handleMouseEnter = (skill: Skill) => {
    setContent(
      <div className="w-56 bg-surface-overlay border border-border-strong rounded-lg px-2 py-1.5 shadow-2xl backdrop-blur-md text-left pointer-events-none">
        <div className="font-bold text-sm text-sky-400 mb-1">{skill.name}</div>
        <div className="flex justify-between text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest">
            <span>{getEffectiveEnergyCost(skill)} Energy</span>
            <span>{skill.cooldownMs ? `${(skill.cooldownMs / 1000).toFixed(1)} CD` : 'No CD'}</span>
        </div>
        <div className="flex justify-between text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest">
            <span>{skill.range > 0 ? `Range ${skill.range}` : 'Melee'}</span>
            <span>{skill.castTime ? `${(getEffectiveCastTime(skill) / 1000).toFixed(1)} Cast` : 'Instant'}</span>
        </div>
        <div className="text-xs text-text-primary mb-1">{skill.description}</div>
      </div>
    );
  };

  const handleMouseLeave = () => {
    setContent(null);
  };

  const RANK_COSTS = [1, 1, 2, 2, 2, 3];

  return (
    <div className="w-full h-full flex flex-col relative animate-in fade-in flex-1 gap-2">
      {inspectSkillId ? (
        <SkillInspector skillId={inspectSkillId} onBack={() => setInspectSkillId(null)} />
      ) : (
        <>
          {/* Header: Tabs & Points */}
          <div className="flex justify-between items-center shrink-0">
            <div className="flex gap-2">
              <button 
                onClick={() => handleTabClick('primary')}
                className={`px-2 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'primary' ? 'bg-surface-deep text-accent border border-accent shadow-[0_0_8px_rgba(56,189,248,0.15)]' : 'bg-surface-deep text-text-secondary border border-border-subtle hover:text-text-primary'}`}
              >
                <span>{playerClass}</span>
                <span className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${activeTab === 'primary' ? 'bg-surface-base text-accent' : 'bg-surface-base text-text-secondary'}`}>
                  {getPointsSpentInClass()}
                </span>
              </button>
              {secondaryClass ? (
                <button 
                  onClick={() => handleTabClick('secondary')}
                  className={`px-2 py-1 rounded text-xs font-bold transition-colors flex items-center gap-1.5 ${activeTab === 'secondary' ? 'bg-surface-deep text-accent border border-accent shadow-[0_0_8px_rgba(56,189,248,0.15)]' : 'bg-surface-deep text-text-secondary border border-border-subtle hover:text-text-primary'}`}
                >
                  <span>{secondaryClass}</span>
                  <span className={`text-[0.625rem] px-1.5 py-0.5 rounded-full ${activeTab === 'secondary' ? 'bg-surface-base text-accent' : 'bg-surface-base text-text-secondary'}`}>
                    {getPointsSpentInClass()}
                  </span>
                </button>
              ) : (
                level >= 5 && (
                  <button 
                    onClick={() => handleTabClick('select_secondary')}
                    className={`px-2 py-1 rounded text-xs font-bold transition-colors border shadow-[0_0_8px_rgba(56,189,248,0.15)] animate-pulse hover:animate-none ${activeTab === 'select_secondary' ? 'bg-surface-deep text-accent border-accent' : 'bg-surface-deep text-text-secondary border-border-subtle hover:text-text-primary'}`}
                  >
                    Select 2nd Class
                  </button>
                )
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-[0.625rem] font-bold text-text-secondary uppercase tracking-widest">Unspent SP</span>
              <span className={`text-sm font-black ${activeSkillPoints > 0 ? 'text-accent animate-pulse' : 'text-text-primary'}`}>{activeSkillPoints}</span>
            </div>
          </div>
          {/* Skill List */}
          <div className="flex-1 overflow-y-auto bg-surface-deep/20 rounded-xl p-2 custom-scrollbar border border-border-subtle shadow-sm relative">
             {activeTab === 'select_secondary' && (
                 <div className="absolute top-0 left-0 right-0 z-40 bg-surface-deep/95 border-b border-border-subtle p-3 flex flex-col items-center animate-in slide-in-from-top-4 shadow-xl">
                     <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Select Secondary Class</div>
                     <div className="flex gap-2">
                         {availableClasses.map(cls => (
                             <button 
                                 key={cls}
                                 onClick={() => setPreviewClass(cls)}
                                 className={`px-3 py-1.5 rounded border font-bold text-xs transition-all ${selectedPreviewClass === cls ? 'bg-accent/20 border-accent text-accent shadow-[0_0_10px_rgba(56,189,248,0.2)]' : 'bg-surface-base border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-raised'}`}
                             >
                                 {cls}
                             </button>
                         ))}
                     </div>
                     <div className="flex gap-2 mt-3">
                         <button 
                             className="px-4 py-1.5 bg-surface-base hover:bg-surface-raised border border-border-subtle rounded text-text-secondary font-bold text-xs"
                             onClick={() => setActiveTab('primary')}
                         >
                             Cancel
                         </button>
                         <button 
                             className="px-4 py-1.5 bg-accent/20 hover:bg-accent/30 border border-accent rounded text-accent font-bold text-xs animate-pulse hover:animate-none shadow-[0_0_10px_rgba(56,189,248,0.2)]"
                             onClick={() => {
                                 usePlayerStore.getState().setSecondaryClass(selectedPreviewClass);
                                 setActiveTab('secondary');
                             }}
                         >
                             Confirm {selectedPreviewClass}
                         </button>
                     </div>
                 </div>
             )}
            <div className="grid grid-cols-2 gap-2 h-max">
          {classSkills.map((skill) => {
            const rank = skillRanks[skill.id] || 0;
            const isEquipped = boundSkills.includes(skill.id);
            const isSelected = selectedSkillId === skill.id;
            const isUnlocked = level >= (skill.requiredLevel || 0);
            const Icon = ICONS[skill.icon] || Flame;

            return (
              <button
                key={skill.id}
                onClick={() => {
                  if (isUnlocked) setSelectedSkillId(skill.id);
                }}
                onMouseEnter={() => handleMouseEnter(skill)}
                onMouseLeave={handleMouseLeave}
                className={`relative flex flex-col p-2.5 rounded-lg border transition-all h-20 ${isSelected ? 'border-accent bg-surface-deep shadow-[0_0_8px_rgba(56,189,248,0.15)]' : 'border-border-subtle bg-surface-base hover:border-border-strong'} ${!isUnlocked ? 'opacity-50 grayscale' : ''}`}
              >
                <div className="flex justify-between items-center w-full mb-auto relative pr-6">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Icon className={`w-4 h-4 shrink-0 ${isEquipped ? 'text-accent' : 'text-text-secondary'}`} />
                    <span className="font-bold text-xs text-text-primary truncate">{skill.name}</span>
                    {isEquipped && (
                      <span className="text-[9px] font-bold px-1 rounded bg-accent/10 text-accent uppercase tracking-wider shrink-0 border border-accent/20">
                        E
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {!isUnlocked && (
                      <span className="text-[8px] font-bold px-1 py-0.5 rounded bg-red-950/80 text-red-400 uppercase tracking-wider border border-red-900/50">
                        Lvl {skill.requiredLevel}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContent(null);
                    setInspectSkillId(skill.id);
                  }}
                  className="absolute top-1.5 right-1.5 text-text-secondary hover:text-text-primary transition-all flex items-center justify-center p-1 rounded md bg-surface-deep/40 border border-border-subtle/30 hover:bg-surface-raised hover:border-border-subtle shadow-sm"
                >
                  <Menu className="w-4 h-4" />
                </button>
                
                <div className="flex justify-between items-end w-full mt-2">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5, 6].map((pipRank) => {
                      const isMorph = pipRank === 3 || pipRank === 6;
                      const isFilled = pipRank <= rank;
                      
                      return (
                        <div 
                          key={pipRank}
                          className={`h-1.5 transition-all ${isMorph ? 'w-2.5 border border-current' : 'w-3'} ${isFilled ? 'bg-accent border-accent shadow-[0_0_5px_rgba(56,189,248,0.5)]' : 'bg-surface-raised border-border-strong opacity-80'} ${(isMorph && !isFilled) ? 'border-text-secondary bg-transparent' : ''}`}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[9px] font-black tracking-widest text-text-secondary uppercase translate-y-0.5">
                    Rank {rank}/6
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detail Footer */}
      {selectedSkillId && (
        <div className="bg-surface-deep/80 p-2 shrink-0 flex flex-col animate-in slide-in-from-bottom-2 relative z-20 border border-border-subtle rounded-xl">
          <button 
            onClick={() => setSelectedSkillId(null)}
            className="absolute top-2 right-2 text-text-muted hover:text-text-primary transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          {(() => {
            const skill = SKILLS[selectedSkillId];
            const rank = skillRanks[selectedSkillId] || 0;
            if (rank === 6) {
              return (
                <div className="text-center text-text-secondary text-sm my-4">
                  <span className="text-accent font-bold">{skill.name}</span> is fully maxed.
                </div>
              );
            }

            const nextRank = rank + 1;
            const cost = RANK_COSTS[rank];
            const canAfford = activeSkillPoints >= cost;
            const isMorph = nextRank === 3 || nextRank === 6;

            return (
              <>
                <div className="flex justify-between items-center mb-2 pr-6">
                  <div className="font-black text-text-primary uppercase tracking-widest text-sm flex items-center gap-2">
                    {skill.name} <span className="text-text-secondary">— Rank {rank}/6</span>
                  </div>
                </div>
                
                <div className="text-xs text-text-secondary mb-3 flex justify-between items-end border-b border-border-subtle pb-2">
                  <span>
                    {isMorph ? `Rank ${nextRank} breakpoint — choose a morph (locks out the others)` : `Rank ${nextRank} upgrade — choose an enhancement`}
                  </span>
                  <span className="text-right ml-2 shrink-0">
                    Next point cost: <span className={`font-bold ${canAfford ? 'text-accent' : 'text-red-400'}`}>{cost}</span>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!isMorph && GENERIC_DIALS.map((dial) => {
                    return (
                      <button
                        key={dial.id}
                        disabled={!canAfford}
                        onClick={() => allocateDial(selectedSkillId, nextRank, dial.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${canAfford ? 'border-border-strong bg-surface-base hover:border-accent hover:bg-surface-raised cursor-pointer' : 'border-border-subtle bg-surface-deep opacity-50 cursor-default'}`}
                      >
                        <span className="font-bold text-text-primary text-[11px] mb-1 leading-tight">{dial.name}</span>
                        <span className="text-[9px] text-text-secondary leading-tight">{dial.description}</span>
                      </button>
                    );
                  })}
                  
                  {isMorph && getMorphOptionsForSkill(selectedSkillId, nextRank).map((morph) => {
                    return (
                      <button
                        key={morph.id}
                        disabled={!canAfford}
                        onClick={() => allocateMorph(selectedSkillId, nextRank, morph.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${canAfford ? 'border-border-strong bg-surface-base hover:border-accent hover:bg-surface-raised cursor-pointer' : 'border-border-subtle bg-surface-deep opacity-50 cursor-default'}`}
                      >
                        <span className="font-bold text-text-primary text-[11px] mb-1 leading-tight">{morph.name}</span>
                        <span className="text-[9px] text-text-secondary leading-tight">{morph.description}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
        </>
      )}
    </div>
  );
}
