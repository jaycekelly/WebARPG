import { useState, useRef, useEffect } from 'react';
import { useActiveSkillStore } from '../store/useActiveSkillStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
import type { Skill } from '../engine/skills/types';
import { SKILLS } from '../data/skills';
import { GENERIC_DIALS, getMorphOptionsForSkill } from '../data/skills/upgrades';
import { ICONS } from './IconLibrary';
import { Flame, X, Menu } from 'lucide-react';
import { SkillInspector } from './SkillInspector';
import { SkillTooltip } from './SkillTooltip';

export function ActiveSkillPanel() {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary' | 'select_secondary'>('primary');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [inspectSkillId, setInspectSkillId] = useState<string | null>(null);
  const [previewClass, setPreviewClass] = useState<any | null>(null);

  const { playerClass, secondaryClass, activeSkillPoints, boundSkills, level } = usePlayerStore();
  const { skillRanks, allocateDial, allocateMorph } = useActiveSkillStore();
  const { setContent } = useTooltipStore();

  const footerRef = useRef<HTMLDivElement>(null);
  const [footerHeight, setFooterHeight] = useState(176);

  useEffect(() => {
    if (selectedSkillId) {
      const measure = () => {
        if (footerRef.current) {
          setFooterHeight(footerRef.current.offsetHeight);
        }
      };
      measure();
      const observer = new ResizeObserver(measure);
      if (footerRef.current) observer.observe(footerRef.current);
      return () => observer.disconnect();
    }
  }, [selectedSkillId]);

  const availableClasses: any[] = (['Fighter', 'Rogue', 'Ranger', 'Mage'] as any[]).filter(c => c !== playerClass);
  const selectedPreviewClass = previewClass || availableClasses[0];

  const currentTabClass = activeTab === 'primary' ? playerClass 
    : activeTab === 'secondary' ? (secondaryClass || playerClass) 
    : selectedPreviewClass;
  const classSkills = Object.values(SKILLS)
    .filter(skill => skill.classRequirement === currentTabClass && !skill.isHidden)
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
    setContent(<SkillTooltip skill={skill} />);
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
                className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-2 rounded-none active:scale-[0.98]
                  ${activeTab === 'primary' 
                    ? 'border border-accent bg-[#1e1e23] text-accent font-black shadow-[0_0_8px_rgba(56,189,248,0.2)]' 
                    : 'border border-[#2a2a30]/40 bg-[#0c0c0f] text-text-secondary hover:bg-[#1c1c21] hover:border-border-strong hover:text-text-primary'}`}
              >
                <span>{playerClass}</span>
                <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-none font-bold border ${activeTab === 'primary' ? 'bg-[#0c0c0f] text-accent border-accent/20' : 'bg-[#141417]/50 text-text-secondary border-border-subtle'}`}>
                  {getPointsSpentInClass()}
                </span>
              </button>
              {secondaryClass ? (
                <button 
                  onClick={() => handleTabClick('secondary')}
                  className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-2 rounded-none active:scale-[0.98]
                    ${activeTab === 'secondary' 
                      ? 'border border-accent bg-[#1e1e23] text-accent font-black shadow-[0_0_8px_rgba(56,189,248,0.2)]' 
                      : 'border border-[#2a2a30]/40 bg-[#0c0c0f] text-text-secondary hover:bg-[#1c1c21] hover:border-border-strong hover:text-text-primary'}`}
                >
                  <span>{secondaryClass}</span>
                  <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-none font-bold border ${activeTab === 'secondary' ? 'bg-[#0c0c0f] text-accent border-accent/20' : 'bg-[#141417]/50 text-text-secondary border-border-subtle'}`}>
                    {getPointsSpentInClass()}
                  </span>
                </button>
              ) : (
                level >= 5 && (
                  <button 
                    onClick={() => handleTabClick('select_secondary')}
                    className={`px-3 py-1.5 text-xs font-bold transition-all rounded-none active:scale-[0.98]
                      ${activeTab === 'select_secondary' 
                        ? 'border border-accent bg-[#1e1e23] text-accent font-black shadow-[0_0_8px_rgba(56,189,248,0.2)]' 
                        : 'border border-[#2a2a30]/40 bg-[#0c0c0f] text-text-secondary hover:bg-[#1c1c21] hover:border-border-strong hover:text-text-primary'}`}
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
          <div 
            className="flex-1 overflow-y-auto bg-transparent px-0 pt-[2px] custom-scrollbar relative"
            style={{ paddingBottom: selectedSkillId ? `${footerHeight + 8}px` : '8px' }}
          >
             {activeTab === 'select_secondary' && (
                 <div className="absolute top-0 left-0 right-0 z-40 bg-[#141417]/93 backdrop-blur-md p-3 flex flex-col items-center animate-in slide-in-from-top-4 shadow-2xl rounded-none">
                     <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Select Secondary Class</div>
                     <div className="flex gap-2">
                         {availableClasses.map(cls => (
                             <button 
                                 key={cls}
                                 onClick={() => setPreviewClass(cls)}
                                 className={`px-3 py-1.5 font-bold text-xs transition-all rounded-none ${selectedPreviewClass === cls ? 'bg-[#1e1e23] text-accent' : 'bg-[#0c0c0f] text-text-secondary hover:text-text-primary hover:bg-[#1e1e23]'}`}
                             >
                                 {cls}
                             </button>
                         ))}
                     </div>
                     <div className="flex gap-2 mt-3">
                         <button 
                             className="px-4 py-1.5 bg-[#0c0c0f] hover:bg-[#1e1e23] text-text-secondary font-bold text-xs rounded-none"
                             onClick={() => setActiveTab('primary')}
                         >
                             Cancel
                         </button>
                         <button 
                             className="px-4 py-1.5 bg-[#1e1e23] text-accent font-bold text-xs rounded-none hover:bg-accent/15"
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
            <div className="grid grid-cols-2 gap-3 h-max">
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
                className={`relative flex flex-col p-2.5 transition-all h-24 rounded-none border
                  ${isUnlocked 
                    ? isSelected 
                      ? 'border-accent bg-[#1c1c21] text-accent shadow-[0_0_8px_rgba(56,189,248,0.15)] active:scale-[0.98]' 
                      : 'border-transparent bg-[#0c0c0f] text-text-secondary hover:text-text-primary hover:bg-[#1c1c21] hover:border-accent active:scale-[0.98]'
                    : 'opacity-40 grayscale border border-transparent bg-[#0c0c0f]/30'
                  }`}
              >
                <div className="flex justify-between items-center w-full mb-auto relative pr-6">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <Icon className={`w-4 h-4 shrink-0 ${isEquipped ? 'text-accent' : 'text-text-secondary'}`} />
                    <span className="font-bold text-xs text-text-primary truncate">{skill.name}</span>
                    {isEquipped && (
                      <span className="text-[9px] font-black w-4 h-4 flex items-center justify-center bg-accent/20 border border-accent/40 text-accent uppercase tracking-wider shrink-0 leading-none shadow-[0_0_4px_rgba(56,189,248,0.15)]">
                        E
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 shrink-0">
                    {!isUnlocked && (
                      <span className="text-[8px] font-bold px-1 py-0.5 bg-red-950/80 text-red-400 uppercase tracking-wider">
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
                  className="absolute top-1.5 right-1.5 text-text-primary hover:text-accent transition-all flex items-center justify-center p-1 bg-[#1c1c21] border border-transparent hover:bg-[#27272f] active:scale-90 rounded-none shadow-sm"
                >
                  <Menu className="w-4 h-4" />
                </button>
                
                <div className="flex justify-between items-end w-full mt-2">
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5, 6].map((pipRank) => {
                      const isMorph = pipRank === 3 || pipRank === 6;
                      const isFilled = pipRank <= rank;
                      
                      return (
                        <div 
                          key={pipRank}
                          className={`h-2 transition-all rounded-none border
                            ${isFilled 
                              ? 'bg-accent border-accent/80 shadow-[0_0_4px_rgba(56,189,248,0.5)]' 
                              : isMorph 
                                ? 'bg-[#0e2a35] border-accent/30' 
                                : 'bg-[#2a2a30] border-[#3f3f46]/30'}
                            ${isMorph ? 'w-3.5' : 'w-2.5'}
                          `}
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
        <div ref={footerRef} className="absolute bottom-0 left-0 right-0 border-t border-accent/30 bg-surface-deep/93 backdrop-blur-md p-3.5 shrink-0 flex flex-col animate-in slide-in-from-bottom-6 duration-300 ease-out z-50 shadow-[0_-8px_32px_rgba(0,0,0,0.7)] rounded-none">
          <button 
            onClick={() => setSelectedSkillId(null)}
            className="absolute top-2.5 right-2.5 text-text-muted hover:text-text-primary transition-colors"
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
                
                <div className="text-xs text-text-secondary mb-3 flex justify-between items-end border-b border-[#2a2a30]/40 pb-2">
                  <span className="font-bold uppercase tracking-wider text-text-secondary">
                    Rank {nextRank} — <span className={canAfford ? 'text-accent' : 'text-red-400'}>{cost} SP</span> — Choose {isMorph ? 'augment' : 'enhancement'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!isMorph && GENERIC_DIALS.map((dial) => {
                    return (
                      <button
                        key={dial.id}
                        disabled={!canAfford}
                        onClick={() => allocateDial(selectedSkillId, nextRank, dial.id)}
                        className={`flex flex-col items-center justify-center p-2 text-center rounded-none border transition-all duration-200
                          ${canAfford 
                            ? 'border-accent/90 bg-[#1c1c21] animate-subtle-pulse shadow-[0_0_6px_rgba(56,189,248,0.3)] hover:border-accent hover:bg-[#1e1e23] active:scale-[0.98] text-text-primary' 
                            : 'border-border-subtle/20 bg-[#0c0c0f]/30 text-text-muted opacity-50'}`}
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
                        className={`flex flex-col items-center justify-center p-2 text-center rounded-none border transition-all duration-200
                          ${canAfford 
                            ? 'border-accent/90 bg-[#1c1c21] animate-subtle-pulse shadow-[0_0_6px_rgba(56,189,248,0.3)] hover:border-accent hover:bg-[#1e1e23] active:scale-[0.98] text-text-primary' 
                            : 'border-border-subtle/20 bg-[#0c0c0f]/30 text-text-muted opacity-50'}`}
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
