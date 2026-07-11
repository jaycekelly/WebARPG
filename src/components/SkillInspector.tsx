import { SKILLS } from '../data/skills';
import { useActiveSkillStore } from '../store/useActiveSkillStore';
import { GENERIC_DIALS, getMorphOptionsForSkill } from '../data/skills/upgrades';
import { ICONS } from './IconLibrary';
import { ChevronLeft, Lock, Check } from 'lucide-react';

interface SkillInspectorProps {
  skillId: string;
  onBack: () => void;
}

export function SkillInspector({ skillId, onBack }: SkillInspectorProps) {
  const skill = SKILLS[skillId];
  const { skillRanks, skillDials, skillMorphs } = useActiveSkillStore(state => state);
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

    return (
      <div key={rankIdx} className={`relative flex flex-col pl-6 ${rankIdx !== 6 ? 'pb-6 border-l border-border-subtle ml-3' : 'pb-2 ml-3'}`}>
        {/* Timeline Node */}
        <div className={`absolute -left-[12px] -top-0.5 w-4 h-4 rounded-full border-2 bg-surface-deep z-10 flex items-center justify-center ${isUnlocked ? 'border-accent text-accent' : isNext ? 'border-accent animate-pulse' : 'border-border-strong text-text-muted'}`}>
          {isUnlocked && <Check className="w-2.5 h-2.5" />}
          {!isUnlocked && !isNext && <Lock className="w-2 h-2 opacity-50" />}
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
            const notChosenButUnlocked = isUnlocked && !isChosen;

            return (
              <div
                key={dial.id}
                className={`flex flex-col p-2 rounded-lg border transition-all h-max ${
                  isChosen ? 'border-accent bg-accent/20 shadow-[0_0_8px_rgba(56,189,248,0.2)]' : 
                  notChosenButUnlocked ? 'border-border-strong bg-surface-deep opacity-50 grayscale' : 
                  isNext ? 'border-border-strong bg-surface-base' : 
                  'border-border-subtle bg-surface-deep opacity-60'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={`flex items-center gap-1.5 ${isChosen ? 'text-text-primary' : 'text-text-primary'}`}>
                    <Icon className={`w-3.5 h-3.5 ${isChosen ? 'text-accent' : 'text-accent'}`} />
                    <span className="font-bold text-[11px] leading-tight">{dial.name}</span>
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
            const notChosenButUnlocked = isUnlocked && !isChosen;

            return (
              <div
                key={morph.id}
                className={`flex flex-col p-2 rounded-lg border transition-all h-max ${
                  isChosen ? 'border-accent bg-accent/20 shadow-[0_0_8px_rgba(56,189,248,0.2)]' : 
                  notChosenButUnlocked ? 'border-border-strong bg-surface-deep opacity-50 grayscale' : 
                  isNext ? 'border-accent/80 bg-surface-base' : 
                  'border-border-subtle bg-surface-deep opacity-60'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <div className={`flex items-center gap-1.5 ${isChosen ? 'text-text-primary' : 'text-text-primary'}`}>
                    <Icon className={`w-3.5 h-3.5 ${isChosen ? 'text-accent' : 'text-accent'}`} />
                    <span className="font-bold text-[11px] leading-tight">{morph.name}</span>
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
          className="p-1 rounded-lg hover:bg-surface-raised border border-transparent hover:border-border-subtle transition-colors text-text-secondary hover:text-text-primary"
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

      {/* Timeline Container */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 pb-4">
        <div className="bg-surface-deep/40 rounded-xl border border-border-subtle p-4 pb-0 pt-4">
          {[1, 2, 3, 4, 5, 6].map(r => renderRankRow(r))}
        </div>
      </div>
    </div>
  );
}
