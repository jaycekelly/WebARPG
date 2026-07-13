import { SKILLS } from '../data/skills';
import { useActiveSkillStore } from '../store/useActiveSkillStore';
import { GENERIC_DIALS, getMorphOptionsForSkill } from '../data/skills/upgrades';
import { ICONS } from './IconLibrary';
import { ChevronLeft, Check } from 'lucide-react';

import { usePlayerStore } from '../store/usePlayerStore';

interface SkillInspectorProps {
  skillId: string;
  onBack: () => void;
}

export function SkillInspector({ skillId, onBack }: SkillInspectorProps) {
  const skill = SKILLS[skillId];
  const { skillRanks, skillDials, skillMorphs } = useActiveSkillStore(state => state);
  const activeSkillPoints = usePlayerStore(state => state.activeSkillPoints);
  const rank = skillRanks[skillId] || 0;
  const chosenDials = skillDials[skillId] || {};
  const chosenMorphs = skillMorphs[skillId] || {};

  if (!skill) return null;

  const RANK_COSTS = [1, 1, 2, 2, 2, 3];

  const renderRankRow = (rankIdx: number) => {
    const isUnlocked = rank >= rankIdx;
    const isNext = rank + 1 === rankIdx;
    const isMorph = rankIdx === 3 || rankIdx === 6;
    const cost = RANK_COSTS[rankIdx - 1];
    const canAfford = activeSkillPoints >= cost;

    return (
      <div key={rankIdx} className={`relative flex flex-col pl-6 ${rankIdx !== 6 ? 'pb-6 border-l border-[#2a2a30]/40 ml-3' : 'pb-2 ml-3'}`}>
        {/* Timeline Node */}
        <div className={`absolute -left-[12px] -top-0.5 w-4 h-4 z-10 flex items-center justify-center rounded-none border ${
          isUnlocked 
            ? 'bg-accent/10 border-accent text-accent' 
            : isNext && canAfford
              ? 'bg-[#1c1c21] border-accent/90 animate-subtle-pulse text-accent shadow-[0_0_6px_rgba(56,189,248,0.3)]' 
              : 'bg-[#0c0c0f] border-[#2a2a30]/20 text-text-muted'
        }`}>
          {isUnlocked && <Check className="w-2.5 h-2.5" />}
        </div>

        {/* Rank Header */}
        <div className="flex justify-between items-center -mt-1 mb-2">
          <div className="font-bold text-xs tracking-widest uppercase">
            <span className={isUnlocked ? 'text-text-primary' : isNext ? 'text-accent' : 'text-text-secondary'}>Rank {rankIdx}</span>
            {isMorph && <span className="ml-2 text-[10px] text-accent/80">Augment</span>}
          </div>
          <div className="text-xs text-text-secondary tracking-widest uppercase font-bold">
            {cost} SP
          </div>
        </div>

        {/* Choices Grid */}
        <div className={`grid gap-2 grid-cols-2`}>
          {!isMorph && GENERIC_DIALS.map((dial) => {
            const Icon = ICONS[dial.icon] || ICONS['Flame'];
            const isChosen = chosenDials[rankIdx] === dial.id;

            return (
              <div
                key={dial.id}
                className={`flex flex-col p-2 transition-all h-max rounded-none border ${
                  isChosen 
                    ? 'bg-accent/10 border-accent text-accent shadow-sm' : 
                  isNext 
                    ? canAfford
                      ? 'border-accent/90 bg-[#1c1c21] animate-subtle-pulse shadow-[0_0_6px_rgba(56,189,248,0.3)] hover:border-accent hover:bg-[#1e1e23] cursor-pointer text-text-primary'
                      : 'border-accent/20 bg-[#1c1c21] hover:border-accent/50 hover:bg-[#1e1e23] cursor-pointer text-text-secondary shadow-sm'
                    : 'bg-[#0c0c0f] border-transparent text-text-muted opacity-30 grayscale'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={`flex items-center gap-1.5 ${isChosen ? 'text-accent' : 'text-text-secondary'}`}>
                    <Icon className={`w-3.5 h-3.5 ${isChosen ? 'text-accent' : 'text-text-muted'}`} />
                    <span className="font-bold text-[11px] leading-tight text-text-primary">{dial.name}</span>
                  </div>
                  {isChosen && <Check className="w-3 h-3 text-accent" />}
                </div>
                <span className="text-[9px] text-text-secondary leading-tight">{dial.description}</span>
              </div>
            );
          })}
          
          {isMorph && getMorphOptionsForSkill(skillId, rankIdx).map((morph) => {
            const Icon = ICONS[morph.icon] || ICONS['Flame'];
            const isChosen = chosenMorphs[rankIdx] === morph.id;

            return (
              <div
                key={morph.id}
                className={`flex flex-col p-2 transition-all h-max rounded-none border ${
                  isChosen 
                    ? 'bg-accent/10 border-accent text-accent shadow-sm' : 
                  isNext 
                    ? canAfford
                      ? 'border-accent/90 bg-[#1c1c21] animate-subtle-pulse shadow-[0_0_6px_rgba(56,189,248,0.3)] hover:border-accent hover:bg-[#1e1e23] cursor-pointer text-text-primary'
                      : 'border-accent/20 bg-[#1c1c21] hover:border-accent/50 hover:bg-[#1e1e23] cursor-pointer text-text-secondary shadow-sm'
                    : 'bg-[#0c0c0f] border-transparent text-text-muted opacity-30 grayscale'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={`flex items-center gap-1.5 ${isChosen ? 'text-accent' : 'text-text-secondary'}`}>
                    <Icon className={`w-3.5 h-3.5 ${isChosen ? 'text-accent' : 'text-text-muted'}`} />
                    <span className="font-bold text-[11px] leading-tight text-text-primary">{morph.name}</span>
                  </div>
                  {isChosen && <Check className="w-3 h-3 text-accent" />}
                </div>
                <span className="text-[9px] text-text-secondary leading-tight">{morph.description}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full h-full animate-in slide-in-from-right-4 fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2 shrink-0 px-2 pt-0">
        <button 
          onClick={onBack}
          className="p-1 bg-[#0c0c0f] hover:bg-[#1c1c21] transition-all rounded-none text-text-secondary hover:text-accent border border-transparent hover:border-accent hover:ring-1 hover:ring-accent"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex flex-col">
          <span className="text-xs text-text-secondary uppercase tracking-widest font-bold">Skill Inspector</span>
          <span className="text-sm font-black text-accent">{skill.name}</span>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[10px] text-text-secondary uppercase tracking-widest font-bold">Current Rank</div>
          <div className="text-sm font-black text-text-primary">{rank}/6</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
        <div className="bg-transparent p-4 pb-0 pt-4">
          {[1, 2, 3, 4, 5, 6].map(r => renderRankRow(r))}
        </div>
      </div>
    </div>
  );
}
