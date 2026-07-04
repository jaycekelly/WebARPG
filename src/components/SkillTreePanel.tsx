import { useSkillStore } from '../store/useSkillStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { SKILL_TREE, type TalentNode } from '../data/skillTrees';
import { SKILLS } from '../data/skills';
import { getEffectiveManaCost } from '../engine/input/InputHandler';
import { Flame, ShieldAlert, Footprints, ArrowUpCircle, Sword, Lock } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  Flame,
  ShieldAlert,
  Footprints,
  ArrowUpCircle,
  Sword
};

export function SkillTreePanel() {
  const { allocatedPoints, allocatePoint, getTotalPointsSpent } = useSkillStore();
  const { skillPoints, playerClass } = usePlayerStore();
  const { setContent } = useTooltipStore();

  const totalSpent = getTotalPointsSpent();
  const currentTree = SKILL_TREE[playerClass] || [];

  const actives = currentTree.filter(n => n.type === 'active');
  const passives = currentTree.filter(n => n.type === 'passive');

  const renderNode = (node: TalentNode) => {
    const pointsSpent = allocatedPoints[node.id] || 0;
    const isMaxed = pointsSpent >= node.maxPoints;
    const requiredPoints = (node.tier - 1) * 10;
    const isUnlocked = totalSpent >= requiredPoints;
    const canAfford = skillPoints > 0;
    
    const Icon = ICONS[node.icon] || Flame;

    const renderTooltip = () => {
      let activeSkill = undefined;
      if (node.type === 'active' && node.grantedSkillId) {
        activeSkill = SKILLS[node.grantedSkillId];
      }

      return (
        <div className="w-64 bg-surface-base border border-border-strong rounded-lg px-3 pt-1 pb-2 shadow-2xl backdrop-blur-md">
           {activeSkill ? (
             <>
                <div className="font-bold text-sky-400 mb-1">{activeSkill.name}</div>
                <div className="flex justify-between text-[0.625rem] text-text-secondary mb-2 pb-1 border-b border-border-subtle uppercase tracking-widest">
                   <span>{activeSkill.range > 0 ? `Range ${activeSkill.range}` : 'Melee'}</span>
                   <span>{getEffectiveManaCost(activeSkill)} Mana</span>
                </div>
                {activeSkill.effects.some(e => e.type === 'damage') && (
                  <div className="mb-2 pb-2 border-b border-border-subtle">
                    {activeSkill.effects.filter(e => e.type === 'damage').map((effect, i) => (
                      <div key={i} className="text-xs font-bold text-text-secondary">
                        {effect.baseValue} {effect.element} Damage
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-xs text-text-primary leading-snug">
                   {activeSkill.description}
                </div>
             </>
           ) : (
             <>
               <h3 className={`font-bold text-sm ${node.type === 'active' ? 'text-sky-400' : 'text-blue-500'}`}>{node.name}</h3>
               <p className="text-[0.6875rem] text-text-secondary mt-1 pb-2 border-b border-border-subtle leading-snug">{node.description}</p>
               {node.statModifiers && (
                 <div className="mt-2 flex flex-col gap-0.5">
                   {node.statModifiers.map((mod, i) => {
                      const sign = mod.value > 0 ? '+' : '';
                      const suffix = mod.type === 'increased' ? '%' : '';
                      return <div key={i} className="text-[0.625rem] text-sky-400">{sign}{mod.value}{suffix} {mod.stat} per point</div>;
                   })}
                 </div>
               )}
             </>
           )}

           {!isUnlocked && (
             <div className="mt-2 text-[0.625rem] text-red-500 font-bold border-t border-border-subtle pt-2">Requires {(node.tier - 1) * 10} points spent in tree.</div>
           )}
        </div>
      );
    };

    return (
      <div 
        key={node.id} 
        className={`group relative flex flex-col items-center justify-center transition-all cursor-pointer
          ${isUnlocked 
            ? (isMaxed ? 'opacity-100' : 'opacity-80 hover:opacity-100 hover:scale-110') 
            : 'opacity-30 cursor-not-allowed'}
        `}
        onMouseEnter={() => setContent(renderTooltip())}
        onMouseLeave={() => setContent(null)}
        onClick={() => {
          if (isUnlocked && !isMaxed && canAfford) {
            allocatePoint(node.id);
          }
        }}
      >
        <div className={`relative w-9 h-9 flex items-center justify-center rounded-xl border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors
           ${node.type === 'active' 
             ? (isMaxed ? 'border-accent bg-blue-950/80' : isUnlocked ? 'border-blue-500/50 bg-blue-950/50 hover:border-accent' : 'border-border-subtle bg-surface-base') 
             : (isMaxed ? 'border-accent bg-sky-950/80' : isUnlocked ? 'border-sky-400/50 bg-sky-950/50 hover:border-accent' : 'border-border-subtle bg-surface-base')}
           ${node.type === 'active' ? 'rounded-full' : 'rounded-lg'}
        `}>
           <Icon className={`w-6 h-6 ${isMaxed ? 'text-accent' : (node.type === 'active' ? 'text-blue-500' : 'text-sky-400')}`} />
           
           {!isUnlocked && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-[0.0625rem] rounded-[inherit]">
                <Lock className="text-text-secondary w-6 h-6" />
             </div>
           )}

           <div className={`absolute -bottom-2 -right-2 text-[0.625rem] font-black tracking-widest bg-surface-base px-1.5 py-0.5 rounded border shadow-lg z-20 ${isMaxed ? 'border-accent text-cyan-400' : 'border-border-strong text-text-primary'}`}>
              {pointsSpent}/{node.maxPoints}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex flex-col relative animate-in fade-in bg-surface-deep/50 rounded-b-xl overflow-hidden">
      


      {/* Tree Content */}
      <div className="flex-1 flex overflow-hidden bg-surface-base border border-border-subtle rounded-xl relative">

        {/* Actives Panel */}
        <div className="flex-1 px-4 pt-2 pb-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h3 className="text-center font-black text-blue-500/50 uppercase tracking-[0.2em] mb-2 pb-2 border-b border-blue-500/50 mx-4 whitespace-nowrap">Active Skills</h3>
          <div className="flex flex-col gap-4 items-center pt-1 pb-3">
            {[1, 2, 3, 4, 5].map(tier => (
              <div key={`active-tier-${tier}`} className="relative flex justify-center gap-4 w-full h-12">
                {actives.filter(n => n.tier === tier).map(renderNode)}
              </div>
            ))}
          </div>
        </div>

        {/* Center Spine (Tier Requirements) */}
        <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-28 pointer-events-none flex flex-col items-center pt-2 pb-4 opacity-70 mix-blend-screen">
          {/* Spacer matching the h3 header height exactly */}
          <div className="text-center font-black uppercase tracking-[0.2em] mb-2 pb-2 border-b border-transparent text-transparent select-none">Spine</div>
          <div className="flex flex-col gap-4 items-center pt-1 pb-3 w-full">
            {[1, 2, 3, 4, 5].map(tier => (
              <div key={`spine-tier-${tier}`} className="flex flex-col items-center justify-center w-full h-12">
                 {tier > 1 ? (
                   <div className="flex flex-col items-center bg-surface-deep px-2 py-1 rounded border border-border-subtle shadow-md">
                     <span className="text-[0.625rem] font-black text-text-secondary whitespace-nowrap">Tier {tier}</span>
                     <span className={`text-[0.5625rem] font-bold whitespace-nowrap ${totalSpent >= (tier - 1) * 10 ? 'text-accent' : 'text-red-900'}`}>Req {(tier-1)*10} pts</span>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center bg-surface-deep px-2 py-1 rounded border border-border-subtle shadow-md">
                     <span className="text-[0.625rem] font-black text-accent">Tier 1</span>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>

        {/* Passives Panel */}
        <div className="flex-1 px-4 pt-2 pb-4 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h3 className="text-center font-black text-sky-400/50 uppercase tracking-[0.2em] mb-2 pb-2 border-b border-sky-400/50 mx-4 whitespace-nowrap">Passive Skills</h3>
          <div className="flex flex-col gap-4 items-center pt-1 pb-3">
            {[1, 2, 3, 4, 5].map(tier => (
              <div key={`passive-tier-${tier}`} className="relative flex justify-center gap-4 w-full h-12">
                {passives.filter(n => n.tier === tier).map(renderNode)}
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Footer — absolute corners */}
      <div className="relative shrink-0 w-full mt-2 h-4">
        <div className="absolute bottom-0 left-2 flex items-baseline gap-1">
          <span className="text-[0.5625rem] font-bold text-text-secondary uppercase tracking-widest">Spent:</span>
          <span className="text-xs font-black text-text-secondary leading-none">{totalSpent}</span>
        </div>
        <div className="absolute bottom-0 right-2 flex items-baseline gap-1">
          <span className="text-[0.5625rem] font-bold text-text-secondary uppercase tracking-widest">Available:</span>
          <span className="text-xs font-black text-text-secondary leading-none">{skillPoints}</span>
        </div>
      </div>

    </div>
  );
}
