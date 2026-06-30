import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getEffectiveCastTime, getEffectiveManaCost, getMainHandAttackCooldown, getOffHandAttackCooldown } from '../engine/input/InputHandler';
import { useStatsStore } from '../store/useStatsStore';
import { useBuffStore } from '../store/useBuffStore';
import { useSkillStore } from '../store/useSkillStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { Crosshair, X, Flame, ShieldAlert, Footprints, ArrowUpCircle, Sword } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SKILLS } from '../data/skills';

// Map icon strings to actual Lucide components for MVP
const ICONS: Record<string, React.ElementType> = {
  Flame,
  ShieldAlert,
  Footprints,
  ArrowUpCircle,
  Sword
};

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export function CombatOverlay() {
  const { activeTargetId, setTarget, position, currentMana, currentHealth, level, currentXp, boundSkills, bindSkill } = usePlayerStore();
  const setContent = useTooltipStore(state => state.setContent);
  const { enemies } = useWorldStore();
  const { gcdEndTime, castingSkillId, castEndTime, lastMainHandAttackTime, lastOffHandAttackTime } = useCombatStore();
  const { getStat } = useStatsStore();
  const { entityBuffs } = useBuffStore();
  const { unlockedActives } = useSkillStore();
  
  const playerBuffs = entityBuffs['player'] || [];
  
  const maxHealth = getStat('Health');
  const maxMana = getStat('Mana');
  const xpRequired = 100 * Math.pow(level, 2);

  const [now, setNow] = useState(Date.now());
  const [bindingSlotIndex, setBindingSlotIndex] = useState<number | null>(null);
  
  // Re-render frequently to update the GCD visual sweep smoothly
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  const target = enemies.find(e => e.id === activeTargetId);

  // Swing Timer logic
  const mainHandCooldown = getMainHandAttackCooldown();
  const offHandCooldown = getOffHandAttackCooldown();
  const weapon2 = useInventoryStore.getState().equipment['weapon2'];
  const hasOffHandWeapon = weapon2 && weapon2.itemType !== 'shield';
  
  const timeSinceMainAttack = now - lastMainHandAttackTime;
  const timeSinceOffAttack = now - lastOffHandAttackTime;
  
  const isMainTimerActive = timeSinceMainAttack < mainHandCooldown;
  const isOffTimerActive = hasOffHandWeapon && timeSinceOffAttack < offHandCooldown;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Tab targeting
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent browser UI focus shift
        const playerPos = usePlayerStore.getState().position;
        const allEnemies = [...useWorldStore.getState().enemies]
          .filter(en => !en.isDead)
          .sort((a, b) => {
            const dxA = playerPos.x - a.position.x;
            const dyA = playerPos.y - a.position.y;
            const distA = dxA * dxA + dyA * dyA; // Euclidean distance squared
            
            const dxB = playerPos.x - b.position.x;
            const dyB = playerPos.y - b.position.y;
            const distB = dxB * dxB + dyB * dyB;
            if (distA === distB) {
              return a.id.localeCompare(b.id);
            }
            return distA - distB;
          });
          
        if (allEnemies.length === 0) return;
        
        const currentTargetId = usePlayerStore.getState().activeTargetId;
        const currentIndex = allEnemies.findIndex(en => en.id === currentTargetId);
        
        // Cycle to next closest, or the closest if none targeted
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % allEnemies.length;
        usePlayerStore.getState().setTarget(allEnemies[nextIndex].id);
        return;
      }

      // Handle 1-6 Skill usage
      const skillKeys = ['1', '2', '3', '4', '5', '6'];
      if (skillKeys.includes(e.key)) {
         const index = parseInt(e.key) - 1;
         const boundId = usePlayerStore.getState().boundSkills[index];
         if (boundId) {
            InputHandler.requestAction({ type: 'skill', skillId: boundId, targetId: usePlayerStore.getState().activeTargetId || undefined });
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthPercent = target ? (target.health / target.stats.maxHealth) * 100 : 0;
  
  const gcdRemaining = Math.max(0, gcdEndTime - now);
  const gcdPercent = (gcdRemaining / 2000) * 100; // Updated to match 2.0s GCD
  const isGcdActive = gcdRemaining > 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      
      {/* Target Frame (Top Center) */}
      <div className="flex justify-center pointer-events-none pt-2">
        {target && (
          <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg p-4 pr-10 flex items-center gap-4 min-w-[300px] relative pointer-events-auto">
            <button onClick={() => setTarget(null)} className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-300 transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="w-12 h-12 bg-red-950 rounded border border-red-800 flex items-center justify-center shadow-inner flex-shrink-0">
              <Crosshair className="text-red-500 w-6 h-6 animate-[spin_4s_linear_infinite]" />
            </div>
            <div className="flex-1 flex flex-col justify-center pb-0.5">
              <div className="font-bold text-red-50 text-base mb-1.5 leading-none">{target.name}</div>
              <div className="relative h-4 w-full bg-zinc-800 rounded-sm overflow-hidden shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-300"
                  style={{ width: `${healthPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white shadow-black drop-shadow-md pb-[1px]">
                  {Math.ceil(target.health)} / {target.stats.maxHealth}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HUD & Action Bar (Bottom Center) */}
      <div className="flex flex-col items-center pointer-events-none gap-3">
        
        {/* Timers Container */}
        <div className="flex flex-col items-center gap-1 w-64 pointer-events-auto">
          {/* Cast Bar */}
          {castingSkillId && castEndTime > 0 && SKILLS[castingSkillId] && (
            <div className="w-full">
              <div className="text-[10px] text-center text-white mb-0.5 font-bold shadow-sm drop-shadow-md">
                Casting {SKILLS[castingSkillId].name}...
              </div>
              <div className="h-1.5 w-full bg-zinc-900 rounded-sm border border-zinc-700 overflow-hidden shadow-lg">
                    <div 
                      className="bg-cyan-500 h-full transition-all duration-75"
                      style={{ width: `${Math.min(100, Math.max(0, 100 - ((castEndTime - now) / Math.max(1, getEffectiveCastTime(SKILLS[castingSkillId]))) * 100))}%` }}
                    />
              </div>
            </div>
          )}

          {/* Main Hand Swing Timer */}
          {isMainTimerActive && (
            <div className="w-full">
              <div className="h-1 w-full bg-zinc-900 rounded-sm border border-zinc-700 overflow-hidden shadow-lg">
                <div 
                  className="bg-orange-500 h-full transition-all duration-75"
                  style={{ width: `${Math.max(0, 100 - (timeSinceMainAttack / mainHandCooldown) * 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Off-Hand Swing Timer */}
          {isOffTimerActive && (
            <div className="w-full">
              <div className="h-1 w-full bg-zinc-900 rounded-sm border border-zinc-700 overflow-hidden shadow-lg">
                <div 
                  className="bg-yellow-500 h-full transition-all duration-75"
                  style={{ width: `${Math.max(0, 100 - (timeSinceOffAttack / offHandCooldown) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Active Buffs */}
        {playerBuffs.length > 0 && (
          <div className="flex gap-1.5 justify-center mb-1">
            {playerBuffs.map(buff => {
              const BuffIcon = ICONS[buff.icon] || ArrowUpCircle;
              return (
                <div key={buff.id} className="relative group">
                  <div className={`w-8 h-8 rounded-sm border flex flex-col items-center justify-center bg-zinc-900 overflow-hidden shadow-lg ${buff.type === 'buff' ? 'border-emerald-500/50 text-emerald-500' : 'border-red-500/50 text-red-500'}`}>
                    <BuffIcon className="w-4 h-4 opacity-80" />
                    {buff.stacks > 1 && (
                      <span className="absolute bottom-0 right-0 text-[8px] font-bold bg-zinc-950/80 px-1 rounded-tl">{buff.stacks}</span>
                    )}
                    {/* Visual duration wipe */}
                    {buff.durationMs && buff.maxDurationMs && (
                      <div 
                        className="absolute bottom-0 left-0 w-full bg-black/50 origin-bottom"
                        style={{ height: `${(buff.durationMs / buff.maxDurationMs) * 100}%` }}
                      />
                    )}
                  </div>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-zinc-950 border border-zinc-700 rounded p-2 text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                    <div className={`font-bold mb-1 ${buff.type === 'buff' ? 'text-emerald-500' : 'text-red-500'}`}>{buff.name}</div>
                    {buff.durationMs ? (
                       <div className="text-zinc-500 mb-1 font-mono">{(buff.durationMs / 1000).toFixed(1)}s remaining</div>
                    ) : (
                       <div className="text-zinc-500 mb-1 italic">Permanent</div>
                    )}
                    {buff.statModifiers.map((mod, i) => {
                      const sign = mod.value > 0 ? '+' : '';
                      const suffix = mod.type === 'increased' ? '%' : '';
                      return <div key={i} className="text-zinc-300">{sign}{mod.value * buff.stacks}{suffix} {mod.stat}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* HP / MP / XP Bars */}
        <div className="flex flex-col gap-1 w-80 bg-zinc-900 border border-zinc-800 p-2 rounded-lg shadow-xl">
          {/* Health */}
          <div className="relative h-3 w-full bg-zinc-800 rounded-sm overflow-hidden">
             <div 
               className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-75"
               style={{ width: `${Math.min(100, (currentHealth / maxHealth) * 100)}%` }}
             />
             <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow-black drop-shadow-md pb-[1px]">
                {Math.floor(currentHealth)} / {Math.floor(maxHealth)}
             </div>
          </div>
          {/* Mana */}
          <div className="relative h-3 w-full bg-zinc-800 rounded-sm overflow-hidden">
             <div 
               className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-75"
               style={{ width: `${Math.min(100, (currentMana / maxMana) * 100)}%` }}
             />
             <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow-black drop-shadow-md pb-[1px]">
                {Math.floor(currentMana)} / {Math.floor(maxMana)}
             </div>
          </div>
          {/* XP row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[8px] font-black w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-sm">
              {level}
            </div>
            <div className="relative h-1.5 flex-1 bg-zinc-800 rounded-sm overflow-hidden">
               <div 
                 className="absolute top-0 left-0 h-full bg-purple-600 transition-all duration-300 shadow-[0_0_8px_rgba(147,51,234,0.5)]"
                 style={{ width: `${Math.min(100, (currentXp / xpRequired) * 100)}%` }}
               />
            </div>
            {/* Invisible spacer to perfectly center the XP bar under the HP/MP bars */}
            <div className="w-4 flex-shrink-0" />
          </div>
        </div>

        {/* Action Bar */}
        <div className="w-fit flex gap-2 p-2 bg-zinc-900/90 backdrop-blur-md rounded-xl border border-zinc-800 shadow-2xl pointer-events-auto">
           
           {boundSkills.slice(0, 6).map((skillId, index) => {
             const skill = skillId ? SKILLS[skillId] : null;
             const IconComponent = skill ? (ICONS[skill.icon] || Flame) : null;
             
             // Range check visual
             let outOfRange = false;
             if (skill && target && skill.range > 0) {
                const dist = getDistance(position, target.position);
                outOfRange = dist > skill.range;
             }

             const isBinding = bindingSlotIndex === index;

             return (
              <div key={index} className="relative group">
                <button 
                  disabled={!skill || isGcdActive || currentMana < (skill ? getEffectiveManaCost(skill) : 0)}
                  className={`relative w-14 h-14 rounded border flex items-center justify-center transition-all group overflow-hidden
                    ${!skill ? 'bg-zinc-900/50 border-zinc-800/50 border-dashed hover:border-cyan-500/50 hover:bg-zinc-800' : isGcdActive ? 'bg-zinc-800 border-zinc-800 cursor-not-allowed' : 'bg-zinc-800 border-zinc-800 hover:border-cyan-500 hover:bg-zinc-700'}
                    ${outOfRange ? 'opacity-30' : ''}
                    ${isBinding ? 'ring-2 ring-cyan-500' : ''}
                  `}
                  onClick={() => skill && InputHandler.requestAction({ type: 'skill', skillId: skill.id, targetId: activeTargetId || undefined })}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setBindingSlotIndex(isBinding ? null : index);
                  }}
                  onMouseEnter={() => {
                    if (!isBinding && skill) {
                      setContent(
                        <div className="w-48 bg-zinc-950 border border-zinc-700 rounded-lg shadow-2xl p-2 text-left pointer-events-none">
                          <div className="font-bold text-orange-500 mb-1">{skill.name}</div>
                          <div className="flex justify-between text-[10px] text-zinc-400 mb-2 pb-1 border-b border-zinc-800 uppercase tracking-widest">
                             <span>{skill.range > 0 ? `Range ${skill.range}` : 'Melee'}</span>
                             <span>{getEffectiveManaCost(skill)} Mana</span>
                          </div>
                          {skill.effects.some(e => e.type === 'damage') && (
                            <div className="mb-2 pb-2 border-b border-zinc-800">
                              {skill.effects.filter(e => e.type === 'damage').map((effect, i) => (
                                <div key={i} className="text-xs font-bold text-red-400">
                                  {effect.baseValue} {effect.element} Damage
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="text-xs text-zinc-300 leading-snug mb-2">
                             {skill.description}
                          </div>
                        </div>
                      );
                    }
                  }}
                  onMouseLeave={() => setContent(null)}
                >
                  {/* GCD Sweep Overlay */}
                  {skill && isGcdActive && (
                    <div 
                      className="absolute inset-0 bg-black/60 origin-bottom transition-all ease-linear"
                      style={{ height: `${gcdPercent}%` }}
                    />
                  )}

                  {IconComponent && <IconComponent className={`w-6 h-6 relative z-10 ${outOfRange ? 'text-red-900' : 'text-orange-500 group-hover:scale-110'} transition-transform`} />}
                  <span className="text-[10px] font-bold text-zinc-400 absolute bottom-0 left-1 z-10">{index + 1}</span>
                  
                  {/* Mana Cost indicator */}
                  {skill && (
                    <div className="absolute top-0 right-0 px-1 py-0.5 bg-blue-900/80 text-[8px] text-blue-200 rounded-bl font-bold z-10">
                      {getEffectiveManaCost(skill)}
                    </div>
                  )}

                </button>

                {/* Popover Menu */}
                {isBinding && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-zinc-950 border border-zinc-700 rounded-xl shadow-2xl p-2 z-50 animate-in slide-in-from-bottom-2">
                    <div className="text-xs font-bold text-zinc-400 mb-2 px-1 text-center">Bind Skill</div>
                    <div className="flex flex-col gap-1">
                      {unlockedActives.map(actId => {
                        const act = SKILLS[actId];
                        if (!act) return null;
                        const ActIcon = ICONS[act.icon] || Flame;
                        return (
                          <button
                            key={actId}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-zinc-800 hover:text-white transition-colors"
                            onClick={() => { bindSkill(index, actId); setBindingSlotIndex(null); }}
                          >
                            <ActIcon className="w-4 h-4 text-orange-500" />
                            {act.name}
                          </button>
                        );
                      })}
                      <div className="h-px w-full bg-zinc-800 my-1" />
                      <button
                        className="w-full text-left px-2 py-1.5 rounded text-xs text-zinc-500 hover:bg-zinc-800 hover:text-red-400 transition-colors"
                        onClick={() => { bindSkill(index, null); setBindingSlotIndex(null); }}
                      >
                        (Clear Slot)
                      </button>
                    </div>
                  </div>
                )}
              </div>
             );
           })}
        </div>
      </div>
      
    </div>
  );
}
