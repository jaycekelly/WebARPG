import { useAppStore } from '../store/useAppStore';
import { useSkillStore } from '../store/useSkillStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { SKILL_TREE, type TalentNode } from '../data/skillTrees';
import { X, Flame, ShieldAlert, Footprints, ArrowUpCircle, Sword, Lock, BookOpen } from 'lucide-react';

const ICONS: Record<string, React.ElementType> = {
  Flame,
  ShieldAlert,
  Footprints,
  ArrowUpCircle,
  Sword
};

export function SkillTreeModal() {
  const { skillTreeOpen, setSkillTreeOpen } = useAppStore();
  const { allocatedPoints, allocatePoint, getTotalPointsSpent } = useSkillStore();
  const { skillPoints, playerClass } = usePlayerStore();
  const { setContent } = useTooltipStore();

  if (!skillTreeOpen) return null;

  const totalSpent = getTotalPointsSpent();

  const currentTree = SKILL_TREE[playerClass] || [];

  // Split into Actives and Passives
  const actives = currentTree.filter(n => n.type === 'active');
  const passives = currentTree.filter(n => n.type === 'passive');

  // Helper to render a node
  const renderNode = (node: TalentNode) => {
    const pointsSpent = allocatedPoints[node.id] || 0;
    const isMaxed = pointsSpent >= node.maxPoints;
    const requiredPoints = (node.tier - 1) * 10;
    const isUnlocked = totalSpent >= requiredPoints;
    const canAfford = skillPoints > 0;
    
    const Icon = ICONS[node.icon] || Flame;

    const renderTooltip = () => (
      <div className="w-64 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-2xl backdrop-blur-md">
         <h3 className={`font-bold text-sm ${node.type === 'active' ? 'text-sky-400' : 'text-blue-500'}`}>{node.name}</h3>
         <p className="text-[11px] text-zinc-400 mt-1 pb-2 border-b border-zinc-800/50 leading-snug">{node.description}</p>
         {node.statModifiers && (
           <div className="mt-2 flex flex-col gap-0.5">
             {node.statModifiers.map((mod, i) => {
                const sign = mod.value > 0 ? '+' : '';
                const suffix = mod.type === 'increased' ? '%' : '';
                return <div key={i} className="text-[10px] text-sky-400">{sign}{mod.value}{suffix} {mod.stat} per point</div>;
             })}
           </div>
         )}
         {node.type === 'active' && (
           <div className="mt-2 text-[10px] text-sky-400 font-bold">Unlocks an active skill.</div>
         )}
         
         {!isUnlocked && (
           <div className="mt-2 text-[10px] text-red-500 font-bold">Requires {(node.tier - 1) * 10} points spent in tree.</div>
         )}
      </div>
    );

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
        <div className={`relative w-12 h-12 flex items-center justify-center rounded-xl border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] transition-colors
           ${node.type === 'active' 
             ? (isMaxed ? 'border-sky-400 bg-red-950/80' : isUnlocked ? 'border-red-500/50 bg-red-950/50 hover:border-sky-400' : 'border-zinc-800 bg-zinc-900') 
             : (isMaxed ? 'border-sky-400 bg-blue-950/80' : isUnlocked ? 'border-blue-500/50 bg-blue-950/50 hover:border-sky-400' : 'border-zinc-800 bg-zinc-900')}
           ${node.type === 'active' ? 'rounded-full' : 'rounded-lg'}
        `}>
           <Icon className={`w-6 h-6 ${isMaxed ? 'text-sky-400' : (node.type === 'active' ? 'text-sky-400' : 'text-blue-500')}`} />
           
           {!isUnlocked && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 backdrop-blur-[1px] rounded-[inherit]">
                <Lock className="text-zinc-400 w-6 h-6" />
             </div>
           )}

           <div className={`absolute -bottom-2 -right-2 text-[10px] font-black tracking-widest bg-zinc-900 px-1.5 py-0.5 rounded border shadow-lg z-20 ${isMaxed ? 'border-sky-400 text-cyan-400' : 'border-zinc-700 text-zinc-100'}`}>
              {pointsSpent}/{node.maxPoints}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-3xl h-auto max-h-[90vh] bg-zinc-900 border border-zinc-800 shadow-2xl rounded-2xl flex flex-col overflow-hidden relative">
        
        {/* Header */}
        <header className="h-16 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-zinc-100" />
              Skill Tree
            </h2>
            <div className="text-xs text-zinc-400">Spend points to unlock powerful skills and passive buffs.</div>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Points Available:</span>
              <span className={`text-xl font-black mb-0.5 ${skillPoints > 0 ? 'text-sky-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-zinc-600'}`}>{skillPoints}</span>
            </div>
            <button onClick={() => setSkillTreeOpen(false)} className="p-2 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </header>

        {/* Tree Content */}
        <div className="flex-1 flex overflow-hidden relative">
          
          {/* Actives Panel */}
          <div className="flex-1 border-r border-zinc-800 bg-zinc-900/50 p-4 overflow-y-auto">
            <h3 className="text-center font-black text-red-500/50 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-red-900/30">Active Skills</h3>
            <div className="flex flex-col gap-8 items-center pt-2 pb-6">
              {[1, 2, 3, 4, 5].map(tier => (
                <div key={`active-tier-${tier}`} className="relative flex justify-center gap-4 w-full h-12">
                  {actives.filter(n => n.tier === tier).map(renderNode)}
                </div>
              ))}
            </div>
          </div>

          {/* Center Spine (Tier Requirements) */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-24 pointer-events-none flex flex-col items-center pt-[82px] gap-8">
            {[1, 2, 3, 4, 5].map(tier => (
              <div key={`spine-tier-${tier}`} className="flex flex-col items-center justify-center w-full h-12 opacity-70">
                 {tier > 1 ? (
                   <div className="flex flex-col items-center bg-zinc-900 px-2 py-1 rounded border border-zinc-800 shadow-md">
                     <span className="text-[10px] font-black text-zinc-400">Tier {tier}</span>
                     <span className={`text-[9px] font-bold ${totalSpent >= (tier - 1) * 10 ? 'text-sky-400/80' : 'text-red-900/80'}`}>Req {(tier-1)*10} pts</span>
                   </div>
                 ) : (
                   <div className="flex flex-col items-center bg-zinc-900 px-2 py-1 rounded border border-zinc-800 shadow-md">
                     <span className="text-[10px] font-black text-sky-400/80">Tier 1</span>
                   </div>
                 )}
              </div>
            ))}
          </div>

          {/* Passives Panel */}
          <div className="flex-1 p-4 overflow-y-auto">
            <h3 className="text-center font-black text-blue-500/50 uppercase tracking-[0.2em] mb-4 pb-2 border-b border-blue-900/30">Passive Skills</h3>
            <div className="flex flex-col gap-8 items-center pt-2 pb-6">
              {[1, 2, 3, 4, 5].map(tier => (
                <div key={`passive-tier-${tier}`} className="relative flex justify-center gap-4 w-full h-12">
                  {passives.filter(n => n.tier === tier).map(renderNode)}
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
