import { useState, useEffect } from 'react';
import { useSkillStore } from '../store/useSkillStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { SKILL_TREE, type TalentNode } from '../data/skillTrees';
import { SKILLS } from '../data/skills';
import { Flame } from 'lucide-react';

import { ICONS } from './IconLibrary';
import { SkillTooltip } from './SkillTooltip';

export function SkillTreePanel() {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary' | 'select_secondary'>('primary');
  const [previewClass, setPreviewClass] = useState<any | null>(null);
  
  const { allocatedPoints, allocatePoint, getTotalPointsSpent } = useSkillStore();
  const { passivePoints, playerClass, secondaryClass, level } = usePlayerStore();
  const { setContent } = useTooltipStore();

  useEffect(() => {
    return () => setContent(null);
  }, [setContent]);

  const availableClasses: any[] = (['Fighter', 'Rogue', 'Ranger', 'Mage'] as any[]).filter(c => c !== playerClass);
  const selectedPreviewClass = previewClass || availableClasses[0];

  const currentClass = activeTab === 'primary' ? playerClass 
    : activeTab === 'secondary' ? (secondaryClass || playerClass) 
    : selectedPreviewClass;
  const mastery = getTotalPointsSpent(currentClass);
  
  const currentTree = (SKILL_TREE as any)[currentClass] || [];
  const TIER_REQS = [0, 0, 5, 10, 15, 20]; // index corresponds to tier
  const VISUAL_POINTS = [0, 10, 30, 50, 70, 90]; // matching visual percentage markers
  
  const renderNode = (node: TalentNode) => {
    const pointsSpent = allocatedPoints[node.id] || 0;
    const isMaxed = pointsSpent >= node.maxPoints;
    const requiredPoints = TIER_REQS[node.tier] || 0;
    const isUnlocked = mastery >= requiredPoints;
    const canAfford = passivePoints > 0;
    
    const Icon = ICONS[node.icon] || Flame;

    const renderTooltip = () => {
      let activeSkill = undefined;
      if (node.type === 'active' && node.grantedSkillId) {
        activeSkill = SKILLS[node.grantedSkillId];
      }

      if (activeSkill) {
        return <SkillTooltip skill={activeSkill} />;
      }

      const showNextRank = pointsSpent > 0 && pointsSpent < node.maxPoints;

      const renderModifiers = (rankVal: number) => {
        if (!node.statModifiers) return null;
        return (
          <div className="flex flex-col gap-0.5 text-xs text-text-secondary font-medium">
            {node.statModifiers.map((mod, i) => {
               const val = mod.value * rankVal;
               const formattedStat = mod.stat === 'StrikeDamage' ? 'Strike Damage' : mod.stat.replace(/([A-Z])/g, ' $1').trim();
               if (mod.type === 'increased') {
                 return <div key={i}>Increases {formattedStat} by {val}%</div>;
               } else {
                 const sign = val > 0 ? '+' : '';
                 return <div key={i}>{sign}{val} {formattedStat}</div>;
               }
            })}
          </div>
        );
      };

      if (pointsSpent === 0) {
        return (
          <div className="w-56 bg-[#141417]/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none animate-in fade-in duration-200">
             <div className="font-bold text-sm text-sky-400 mb-1">{node.name}</div>
             <div className="text-[10px] text-text-secondary uppercase tracking-widest mb-0.5 font-bold">
               Next Rank
             </div>
             {renderModifiers(1)}
          </div>
        );
      }

      return (
        <div className="w-56 bg-[#141417]/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none animate-in fade-in duration-200">
           <div className="font-bold text-sm text-sky-400 mb-1">{node.name}</div>
           <div className="text-[10px] text-text-secondary uppercase tracking-widest mb-0.5 font-bold">
             Rank {pointsSpent}/{node.maxPoints}
           </div>
           {renderModifiers(pointsSpent)}
           {showNextRank && (
             <div className="mt-6">
               <div className="text-[10px] text-text-secondary uppercase tracking-widest mb-0.5 font-bold">
                 Next Rank
               </div>
               {renderModifiers(pointsSpent + 1)}
             </div>
           )}
        </div>
      );
    };

    return (
      <div 
        key={node.id} 
        className={`group relative flex flex-col items-center justify-center transition-all cursor-pointer
          ${isUnlocked ? 'opacity-100' : 'opacity-40'}
          ${!isUnlocked ? 'cursor-not-allowed' : ''}
        `}
        onMouseEnter={() => setContent(renderTooltip())}
        onMouseLeave={() => setContent(null)}
        onClick={() => {
          if (isUnlocked && !isMaxed && canAfford) {
            allocatePoint(node.id, currentClass);
          }
        }}
      >
        <div className={`relative w-10 h-10 flex items-center justify-center transition-all rounded-none border hover:border-accent
            ${canAfford && isUnlocked && !isMaxed 
              ? 'bg-[#1c1c21] border-accent/90 animate-subtle-pulse shadow-[0_0_6px_rgba(56,189,248,0.3)]' 
              : isUnlocked ? 'bg-[#1c1c21] border-[#2a2a30]/40' : 'bg-[#0c0c0f]/60 border-[#2a2a30]/20'}
        `}>
           <Icon className={`w-6 h-6 ${node.type === 'active' ? 'text-blue-500' : 'text-sky-400'} ${!isUnlocked ? 'opacity-40' : ''}`} />
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
            className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-2 rounded-none active:scale-[0.98]
              ${activeTab === 'primary' 
                ? 'border border-accent bg-[#1e1e23] text-accent font-black shadow-[0_0_8px_rgba(56,189,248,0.2)]' 
                : 'border border-[#2a2a30]/40 bg-[#0c0c0f] text-text-secondary hover:bg-[#1c1c21] hover:border-border-strong hover:text-text-primary'}`}
          >
            <span>{playerClass}</span>
            <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-none font-bold border ${activeTab === 'primary' ? 'bg-[#0c0c0f] text-accent border-accent/20' : 'bg-[#141417]/50 text-text-secondary border-border-subtle'}`}>
              {getTotalPointsSpent(playerClass)}
            </span>
          </button>
          {secondaryClass ? (
            <button 
              onClick={() => setActiveTab('secondary')}
              className={`px-3 py-1.5 text-xs font-bold transition-all flex items-center gap-2 rounded-none active:scale-[0.98]
                ${activeTab === 'secondary' 
                  ? 'border border-accent bg-[#1e1e23] text-accent font-black shadow-[0_0_8px_rgba(56,189,248,0.2)]' 
                  : 'border border-[#2a2a30]/40 bg-[#0c0c0f] text-text-secondary hover:bg-[#1c1c21] hover:border-border-strong hover:text-text-primary'}`}
            >
              <span>{secondaryClass}</span>
              <span className={`text-[0.6rem] px-1.5 py-0.5 rounded-none font-bold border ${activeTab === 'secondary' ? 'bg-[#0c0c0f] text-accent border-accent/20' : 'bg-[#141417]/50 text-text-secondary border-border-subtle'}`}>
                {getTotalPointsSpent(secondaryClass)}
              </span>
            </button>
          ) : (
            level >= 5 && (
                <button 
                  onClick={() => setActiveTab('select_secondary')}
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
          <span className="text-[0.625rem] font-bold text-text-secondary uppercase tracking-widest">Unspent PP</span>
          <span className={`text-sm font-black ${passivePoints > 0 ? 'text-accent animate-pulse' : 'text-text-primary'}`}>{passivePoints}</span>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-hidden relative bg-black/20 flex flex-col">
         
         {activeTab === 'select_secondary' && (
             <div className="absolute top-0 left-0 right-0 z-40 bg-[#0e0f11] p-3 flex flex-col items-center animate-in slide-in-from-top-4 shadow-2xl rounded-none">
                 <div className="text-[10px] font-black uppercase tracking-widest text-text-secondary mb-2">Select Secondary Class</div>
                 <div className="flex gap-2">
                     {availableClasses.map(cls => (
                         <button 
                             key={cls}
                             onClick={() => setPreviewClass(cls)}
                             className={`px-3 py-1.5 font-bold text-xs transition-all rounded-none ${selectedPreviewClass === cls ? 'bg-[#202227] text-accent' : 'bg-[#0e0f11] text-text-secondary hover:text-text-primary hover:bg-[#202227]'}`}
                         >
                             {cls}
                         </button>
                     ))}
                 </div>
                 <div className="flex gap-2 mt-3">
                         <button 
                             className="px-4 py-1.5 bg-[#0e0f11] hover:bg-[#202227] text-text-secondary font-bold text-xs rounded-none"
                             onClick={() => setActiveTab('primary')}
                         >
                             Cancel
                         </button>
                             <button 
                                 className="px-4 py-1.5 bg-accent/15 text-accent font-bold text-xs rounded-none hover:bg-accent/25"
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
         
         {/* Node Area */}
         <div className="flex-1 relative flex flex-col px-8 pt-4 pb-2">
            <div className="flex-1 relative">
               {[1, 2, 3, 4, 5].map(tier => {
                  const req = TIER_REQS[tier];
                  const percent = VISUAL_POINTS[tier];
                  const unlocked = mastery >= req;
                  return (
                    <div 
                       key={`tier-col-${tier}`} 
                       className="absolute top-0 bottom-0 flex flex-col items-center justify-center gap-7 w-16" 
                       style={{ left: `${percent}%`, transform: 'translateX(-50%)' }}
                    >
                       <div className="absolute top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent -z-10" />
                       
                       {/* Tier Marker */}
                       <div className="absolute bottom-0 flex flex-col items-center bg-black/60 px-2 py-0.5 z-30 shadow-sm">
                          <div className={`text-[10px] font-black tracking-widest whitespace-nowrap ${unlocked ? 'text-text-primary' : 'text-text-secondary'}`}>
                             T{tier} <span className={unlocked ? 'opacity-60' : 'text-red-500 opacity-100'}>({req})</span>
                          </div>
                       </div>
                       
                       {currentTree.filter((n: any) => n.tier === tier).map(renderNode)}
                    </div>
                  );
               })}
            </div>
         </div>

         {/* Class Rank Badge Footer */}
         <div className="bg-[#0c0c0f] py-2 flex justify-center items-center z-20">
            <div className="flex items-center px-3 py-1">
               <span className="text-xs font-bold text-text-secondary mr-2 flex items-baseline gap-1">
                  {currentClass} <span className="text-accent text-sm font-black">{mastery}</span>
               </span>
               <div className="w-px h-3.5 bg-zinc-400/80 mr-2" />
               <span className="text-sky-400 font-black text-xs mr-1">+{mastery * 3}</span>
               <span className="text-[10px] text-text-secondary font-bold tracking-widest">{currentClass === 'Fighter' ? 'STR' : currentClass === 'Rogue' ? 'DEX' : 'INT'}</span>
            </div>
         </div>   
      </div>
    </div>
  );
}
