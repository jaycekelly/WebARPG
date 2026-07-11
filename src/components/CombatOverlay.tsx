import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getEffectiveCastTime, getEffectiveEnergyCost, getEffectiveGcd, getMainHandAttackCooldown, getOffHandAttackCooldown } from '../engine/input/InputHandler';
import { hasLineOfSight, getChebyshevDistance } from '../engine/world/gridMath';
import { useStatsStore } from '../store/useStatsStore';
import { useBuffStore } from '../store/useBuffStore';
import { useSkillStore } from '../store/useSkillStore';
import { useAppStore } from '../store/useAppStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { useVisionStore } from '../store/useVisionStore';
import { useMessageStore } from '../store/useMessageStore';
import { FlaskConical, X, Flame, ArrowUpCircle, Backpack, BookOpen, Sparkles } from 'lucide-react';
import { IconWhirl } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { SKILLS } from '../data/skills';
import { setRunState } from '../store/storage';

import { ICONS } from './IconLibrary';

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export function CombatOverlay() {
  const { playerClass, secondaryClass, activeTargetId, setTarget, position, currentEnergy, currentAdrenaline, currentHealth, level, currentXp, boundSkills, bindSkill, lastFlaskTime, useFlask, attributePoints, activeSkillPoints, passivePoints } = usePlayerStore();
  const setContent = useTooltipStore(state => state.setContent);
  const { enemies } = useWorldStore();
  const { gcdEndTime, castingSkillId, castEndTime, skillCooldowns, lastMainHandAttackTime, lastOffHandAttackTime } = useCombatStore();
  const { getStat } = useStatsStore();
  const { entityBuffs } = useBuffStore();
  const { unlockedActives } = useSkillStore();
  const { messages } = useMessageStore();
  
  const isFighter = playerClass === 'Fighter' || secondaryClass === 'Fighter';
  
  
  const playerBuffs = entityBuffs['player'] || [];
  const visiblePlayerBuffs = playerBuffs.filter(b => b.maxDurationMs !== null && b.maxDurationMs <= 30000 && b.buffId !== 'flask_recovery' && b.buffId !== 'zealous_blow_ready');
  
  let expectedHealAmount = 0;
  for (const b of playerBuffs) {
      if (b.isHoT && b.hotHealPerTick && b.durationMs && b.hotTickRateMs) {
          const ticksRemaining = Math.floor(b.durationMs / b.hotTickRateMs);
          expectedHealAmount += ticksRemaining * b.hotHealPerTick;
      }
  }
  
  const maxHealth = getStat('Health');
  const maxEnergy = getStat('Energy');
  const maxAdrenaline = 100;
  const xpRequired = 100 * Math.pow(level, 2);

  const target = enemies.find(e => e.id === activeTargetId && !e.isDead);


  const [now, setNow] = useState(useAppStore.getState().getGameTime());
  const [bindingSlotIndex, setBindingSlotIndex] = useState<number | null>(null);
  
  // Re-render frequently to update the GCD visual sweep smoothly
  useEffect(() => {
    const interval = setInterval(() => setNow(useAppStore.getState().getGameTime()), 50);
    return () => clearInterval(interval);
  }, []);

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
  // Click outside bind slot — close it
  useEffect(() => {
    if (bindingSlotIndex === null) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking inside the bind menu
      if (target.closest('.skill-bind-menu')) return;
      setBindingSlotIndex(null);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [bindingSlotIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Esc in CombatOverlay: close bind slot first, then let App handle the rest
      if (e.key === 'Escape') {
        if (bindingSlotIndex !== null) {
          setBindingSlotIndex(null);
          return;
        }
        const playerState = usePlayerStore.getState();
        // 4. Clear Target
        if (playerState.activeTargetId) {
          playerState.setTarget(null, true);
          return;
        }
        // If no bind slot open, let App.tsx handle Esc (cast cancel, targeting, windows, etc.)
        return;
      }

      // Handle Town Portal
      if (e.key.toLowerCase() === 'b') {
        const appState = useAppStore.getState();
        if (appState.location === 'dungeon') {
          const combatState = useCombatStore.getState();
          if (appState.getGameTime() - combatState.lastCombatEventTime < 5000) {
            useMessageStore.getState().addScreenMessage('above', 'Cannot portal in combat', 4000);
            return;
          }
          if (combatState.castingSkillId !== 'portal_skill') {
            combatState.setCasting('portal_skill', 4000);
          }
        }
      }

      // Handle Tab targeting
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent browser UI focus shift
        const playerPos = usePlayerStore.getState().position;
        const TARGET_MAX_DIST_SQ = 10 * 10; // 10 tiles
        const visibleTiles = useVisionStore.getState().visibleTiles;
        const allEnemies = [...useWorldStore.getState().enemies]
          .filter(en => !en.isDead)
          .filter(en => visibleTiles.has(`${Math.floor(en.position.x)},${Math.floor(en.position.y)}`))
          .map(en => {
            const dx = playerPos.x - en.position.x;
            const dy = playerPos.y - en.position.y;
            return { enemy: en, distSq: dx * dx + dy * dy };
          })
          .filter(item => item.distSq <= TARGET_MAX_DIST_SQ)
          .sort((a, b) => {
            if (a.distSq === b.distSq) {
              return a.enemy.id.localeCompare(b.enemy.id);
            }
            return a.distSq - b.distSq;
          })
          .map(item => item.enemy);
          
        if (allEnemies.length === 0) {
          // If no enemies in range, clear target if we had one, or do nothing
          return;
        }
        
        const currentTargetId = usePlayerStore.getState().activeTargetId;
        const currentIndex = allEnemies.findIndex(en => en.id === currentTargetId);
        
        // Cycle to next closest, or the closest if none targeted
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % allEnemies.length;
        usePlayerStore.getState().setTarget(allEnemies[nextIndex].id);
        return;
      }

      const tryExecuteSkill = (boundId: string) => {
        const skill = SKILLS[boundId];
        if (!skill) return;

        const playerState = usePlayerStore.getState();
        const worldState = useWorldStore.getState();

        let targetEntity = null;
        if (playerState.activeTargetId) {
          targetEntity = worldState.enemies.find(e => e.id === playerState.activeTargetId);
        }
        
        if (targetEntity && !useAppStore.getState().isPaused) {
          InputHandler.requestAction({ type: 'skill', skillId: boundId, targetPos: targetEntity.position, targetId: targetEntity.id });
        } else {
          InputHandler.requestAction({ type: 'skill', skillId: boundId });
        }
      };

      // Handle 1-6 Skill usage
      const skillKeys = ['1', '2', '3', '4', '5', '6'];
      if (skillKeys.includes(e.key)) {
         const index = parseInt(e.key) - 1;
         const boundId = usePlayerStore.getState().boundSkills[index];
         if (boundId) {
            tryExecuteSkill(boundId);
         }
      }



      // Handle Flask
      if (e.key.toLowerCase() === 'r') {
        const playerState = usePlayerStore.getState();
        const maxHp = useStatsStore.getState().getStat('Health');
        if (playerState.currentHealth < maxHp && playerState.useFlask()) {
           useBuffStore.getState().addBuff('player', {
             buffId: 'flask_recovery',
             name: 'Flask Recovery',
             type: 'buff',
             stackingBehavior: 'refresh',
             durationMs: 3000,
             maxDurationMs: 3000,
             stacks: 1,
             maxStacks: 1,
             icon: 'Droplet',
             statModifiers: [],
             isHoT: true,
             hotTickRateMs: 50,
             hotHealPerTick: (maxHp * 0.5) / (3000 / 50)
           });
           
           useCombatStore.getState().addLog('Used Healing Flask.', 'system');
        }
      }


    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthPercent = target ? (target.health / target.stats.maxHealth) * 100 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between z-10">
      {/* Target Frame (Top Center) */}
      <div className="flex justify-center pointer-events-none pt-4">
        {target && (
          <div className="bg-surface-deep border-2 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] rounded-lg pt-1.5 pb-2.5 px-2 flex flex-col items-center w-fit relative pointer-events-auto animate-[fadeIn_0.3s_ease-out]">
            <button onClick={() => setTarget(null, true)} className="absolute top-1 right-1 text-text-secondary hover:text-text-primary transition-colors z-40">
              <X className="w-3 h-3" />
            </button>
            <div className="flex-col justify-center w-[13.1875rem]">
              <div className="font-bold text-text-primary text-sm mb-1.5 leading-none text-center [text-shadow:2px_2px_1px_rgba(0,0,0,1)]">{target.name}</div>
              <div className="relative h-[0.875rem] w-full bg-surface-deep rounded-[0.125rem] overflow-hidden border border-border-subtle shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full transition-all duration-150 border-r border-red-950 z-20"
                  style={{ 
                    width: `${healthPercent}%`,
                    background: 'linear-gradient(to bottom, #dc2626 0%, #dc2626 50%, #991b1b 50%, #991b1b 100%)'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-30 font-mono tracking-widest pt-[0.0625rem]">
                  {target.health > 0 ? Math.max(1, Math.floor(target.health)) : 0}/{target.stats.maxHealth}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Messages (Type 2 and 3) */}
      {(() => {
        const location = useAppStore.getState().location;
        const dungeonSelectOpen = useAppStore.getState().dungeonSelectOpen;
        
        let showInteract = false;
        let interactText = 'Interact';
        if (location === 'town' && !dungeonSelectOpen) {
           const grid = useWorldStore.getState().grid;
           const entrance = grid.obstacles.find(o => o.type === 'dungeon_entrance');
           if (entrance) {
              const dist = Math.max(Math.abs(position.x - entrance.x), Math.abs(position.y - entrance.y));
              if (dist <= 1) {
                showInteract = true;
                interactText = 'Enter';
              }
           }
           
           const npc = grid.obstacles.find(o => o.type === 'npc_guide');
           if (npc) {
              const dist = Math.max(Math.abs(position.x - npc.x), Math.abs(position.y - npc.y));
              if (dist <= 1) {
                showInteract = true;
                interactText = 'Talk';
              }
           }
        }
        
        return (
          <>
          {showInteract && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[11rem] pointer-events-none z-50 flex flex-col items-center animate-in fade-in duration-300">
               <div className="bg-surface-deep/80 border border-border-subtle rounded-md pl-2 pr-2.5 py-1.5 backdrop-blur-sm flex items-center gap-2.5 shadow-md">
                  <span className="text-[0.65rem] font-black tracking-widest text-text-primary bg-surface-raised border border-border-strong rounded w-5 h-5 flex items-center justify-center shadow-sm leading-none font-mono">F</span>
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">{interactText}</span>
               </div>
            </div>
          )}
      {messages.map((msg, _, arr) => {
         const hasTopMessage = arr.some(m => m.type === 'top');
         if (msg.type === 'above') {
           const isLevelUp = msg.text.includes('Level Up');
           const mtClass = hasTopMessage ? '-mt-[15.5rem]' : '-mt-[14rem]';
           return (
             <div key={msg.id} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${mtClass} pointer-events-none z-50 flex flex-col items-center ${isLevelUp ? 'animate-[levelUpFade_3s_ease-in-out_forwards]' : 'animate-in fade-in slide-in-from-bottom-2 duration-500'}`}>
               <span className={isLevelUp ? "font-sans text-accent font-black text-2xl uppercase tracking-[0.2em] drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" : "font-sans text-amber-500 font-bold text-sm [text-shadow:2px_2px_1px_rgba(0,0,0,1)]"}>
                 {msg.text}
               </span>
             </div>
           );
         }
         if (msg.type === 'top') {
           const isPause = msg.text === 'TACTICAL PAUSE';
           return (
             <div key={msg.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-[14rem] pointer-events-none z-50 flex flex-col items-center animate-in slide-in-from-top-2 fade-in duration-300">
               <span className={isPause ? "font-sans text-accent font-black text-base uppercase tracking-widest animate-pulse drop-shadow-lg" : "font-sans text-amber-500 font-bold text-sm [text-shadow:2px_2px_1px_rgba(0,0,0,1)]"}>
                 {msg.text}
               </span>
             </div>
           );
         }
         if (msg.type === 'below') {
           const mtClass = showInteract ? 'mt-[9.5rem]' : 'mt-[11rem]';
           return (
             <div key={msg.id} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${mtClass} pointer-events-none z-50 flex flex-col items-center animate-in slide-in-from-top-2 fade-in duration-300 transition-all`}>
               <span className="font-sans text-text-primary italic text-sm [text-shadow:2px_2px_1px_rgba(0,0,0,1)] font-normal">
                 {msg.text}
               </span>
             </div>
           );
         }
         return null;
      })}
      </>
      );
      })()}

      {/* HUD & Action Bar (Bottom Center) */}
      <div className="flex flex-col items-center pointer-events-none gap-1.5 relative w-full h-full">
        {/* Center Action Stack */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end gap-2 pointer-events-none z-40">
          
          {/* Dynamic Floating Bars (Cast Bar, Swing Timers) */}
          <div className="flex flex-col items-center gap-1 pointer-events-none w-[12.75rem]">
            
            {/* Cast Bar (Top) */}
            {castingSkillId && castEndTime > 0 && (SKILLS[castingSkillId] || castingSkillId === 'portal_skill') && (
              <div className="flex flex-col items-center w-[9.5625rem] mb-1">
                <div className="text-xs text-center whitespace-nowrap text-text-primary mb-0.5 font-bold [text-shadow:2px_2px_1px_rgba(0,0,0,1)] tracking-wide">
                  {castingSkillId === 'portal_skill' ? 'Forfeiting' : SKILLS[castingSkillId].name}
                </div>
                <div className="h-3.5 w-full bg-surface-deep rounded-none border border-border-subtle overflow-hidden shadow-inner">
                  <div
                    className="h-full transition-all duration-75 border-r border-[#6b21a8]"
                    style={{ 
                      width: `${Math.min(100, Math.max(0, 100 - ((castEndTime - now) / Math.max(1, castingSkillId === 'portal_skill' ? 4000 : getEffectiveCastTime(SKILLS[castingSkillId]))) * 100))}%`,
                      background: 'linear-gradient(to bottom, #a855f7 0%, #a855f7 50%, #9333ea 50%, #9333ea 100%)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Main Hand Swing Timer (Middle) */}
            {isMainTimerActive && (
              <div className="h-1.5 w-full bg-surface-deep rounded-none border border-border-subtle overflow-hidden shadow-inner">
                <div 
                  className="h-full transition-all duration-75 border-r border-amber-950"
                  style={{ 
                    width: `${Math.max(0, 100 - (timeSinceMainAttack / mainHandCooldown) * 100)}%`,
                    background: 'linear-gradient(to bottom, #f59e0b 0%, #f59e0b 50%, #d97706 50%, #d97706 100%)'
                  }}
                />
              </div>
            )}

            {/* Off-Hand Swing Timer (Bottom) */}
            {isOffTimerActive && (
              <div className="h-1.5 w-full bg-surface-deep rounded-none border border-border-subtle overflow-hidden shadow-inner opacity-80">
                <div 
                  className="h-full transition-all duration-75 border-r border-amber-950"
                  style={{ 
                    width: `${Math.max(0, 100 - (timeSinceOffAttack / offHandCooldown) * 100)}%`,
                    background: 'linear-gradient(to bottom, #f59e0b 0%, #f59e0b 50%, #d97706 50%, #d97706 100%)'
                  }}
                />
              </div>
            )}
          </div>

        {/* Active Buffs */}
        {visiblePlayerBuffs.length > 0 && (
          <div className="flex gap-1.5 justify-center mb-1">
            {visiblePlayerBuffs.map(buff => {
              const BuffIcon = ICONS[buff.icon] || ArrowUpCircle;
              return (
                <div key={buff.id} className="relative group">
                  <div className={`w-8 h-8 rounded-sm border flex flex-col items-center justify-center bg-surface-base overflow-hidden shadow-lg ${buff.type === 'buff' ? 'border-sky-400/50 text-sky-400' : 'border-red-500/50 text-red-500'}`}>
                    <BuffIcon className="w-4 h-4 opacity-80" />
                    {buff.stacks > 1 && (
                      <span className="absolute bottom-0 right-0 text-[0.5rem] font-bold bg-surface-base/80 px-1 rounded-tl">{buff.stacks}</span>
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-surface-overlay border border-border-strong rounded px-2 py-1 text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
                    <div className={`font-bold mb-1 ${buff.type === 'buff' ? 'text-sky-400' : 'text-red-500'}`}>{buff.name}</div>
                    {buff.durationMs ? (
                       <div className="text-text-secondary mb-1 font-mono">{(buff.durationMs / 1000).toFixed(1)}s remaining</div>
                    ) : (
                       <div className="text-text-secondary mb-1 italic">Permanent</div>
                    )}
                    {buff.statModifiers.map((mod, i) => {
                      const sign = mod.value > 0 ? '+' : '';
                      const suffix = mod.type === 'increased' ? '%' : '';
                      return <div key={i} className="text-text-primary">{sign}{mod.value * buff.stacks}{suffix} {mod.stat}</div>;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Main Skill Bar with Docked Flask */}
        <div className="relative flex items-end pointer-events-auto mt-1 w-max mb-5">
            
            {/* Docked Flask Slot (Offset to the left of the center skill bar) */}
            <div className="absolute right-full mr-2 bottom-0 h-12 flex items-center justify-center drop-shadow-2xl gap-2">
               <div className="relative w-12 h-12 flex flex-col items-center justify-center">
                  <button 
                    className={`relative w-full h-full flex items-center justify-center transition-all bg-transparent focus:outline-none focus:ring-0 group
                      ${now - lastFlaskTime < 30000 ? 'cursor-not-allowed grayscale brightness-50' : ''}
                    `}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (currentHealth < maxHealth && useFlask()) {
                         useBuffStore.getState().addBuff('player', {
                           buffId: 'flask_recovery',
                           name: 'Flask Recovery',
                           type: 'buff',
                           stackingBehavior: 'refresh',
                           durationMs: 2000,
                           maxDurationMs: 2000,
                           stacks: 1,
                           maxStacks: 1,
                           icon: 'FlaskConical',
                           statModifiers: [],
                           isHoT: true,
                           hotTickRateMs: 50,
                           hotHealPerTick: (maxHealth * 0.3) / (2000 / 50)
                         });
                         
                         useCombatStore.getState().addLog('Used Healing Flask.', 'system');
                      }
                    }}
                    onMouseEnter={() => setContent(
                     <div className="w-52 bg-surface-overlay border border-border-strong rounded-lg shadow-2xl px-2 py-1 text-left pointer-events-none backdrop-blur-md">
                       <div className="font-bold text-red-400 mb-1">
                         Healing Flask
                       </div>
                       <div className="text-[0.625rem] text-text-secondary pb-1 mb-1 border-b border-border-subtle uppercase tracking-widest">
                         30.0 CD
                       </div>
                       <div className="text-xs text-text-primary leading-snug mb-1">
                         Restores <span className="text-red-400 font-bold">30%</span> of your maximum health over <span className="text-text-primary font-bold">2 seconds</span>.
                       </div>
                     </div>
                   )}
                   onMouseLeave={() => setContent(null)}
                  >
                     <FlaskConical className="mb-0.5 w-6 h-6 text-red-500 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] z-10 transition-transform group-hover:scale-110" />
                     {now - lastFlaskTime < 30000 && (
                        <div 
                          className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-full"
                          style={{ background: `conic-gradient(transparent ${100 - ((30000 - (now - lastFlaskTime)) / 30000) * 100}%, rgba(0,0,0,0.8) 0)` }}
                        >
                          <span className="text-white font-bold text-sm z-30 [text-shadow:2px_2px_1px_rgba(0,0,0,1)]">
                            {Math.ceil((30000 - (now - lastFlaskTime)) / 1000)}
                          </span>
                        </div>
                     )}
                  </button>
                  
                  {/* Floating Hotkey */}
                  <div className="absolute -bottom-5 w-4 h-4 bg-zinc-900 flex items-center justify-center text-[9px] font-bold text-white z-30 shadow-[0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none">
                    R
                  </div>
                  {/* Underline */}
                  <div className="absolute bottom-0 left-[20%] w-[60%] h-[4px] bg-zinc-900 drop-shadow-md pointer-events-none" />
               </div>
               {/* Vertical Separator */}
               <div className="w-[4px] h-5 bg-zinc-900 self-end mr-1" />
            </div>

            {/* Main Skill Bar */}
            <div className="flex gap-1 drop-shadow-2xl relative">
              
              {boundSkills.slice(0, 8).map((skillId, index) => {
                const skill = skillId ? SKILLS[skillId] : null;
                const IconComponent = skill ? (ICONS[skill.icon] || Flame) : null;
                
                let outOfRange = false;
                if (skill && target) {
                   const effectiveRange = skill.range > 0 ? skill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);
                   const dist = getDistance(position, target.position);
                   outOfRange = dist > effectiveRange;
                }

                const isBinding = bindingSlotIndex === index;
                
                // Cooldown & GCD logic
                const timeUntilGcdFree = Math.max(0, gcdEndTime - now);
                const skillCdEndTime = skill ? (skillCooldowns[skill.id] || 0) : 0;
                const timeUntilSkillFree = Math.max(0, skillCdEndTime - now);
                
                let activePercent = 0;
                let onCooldown = false;
                
                if (skill?.offGcd) {
                   if (timeUntilSkillFree > 0) {
                      activePercent = skill.cooldownMs ? (timeUntilSkillFree / skill.cooldownMs) * 100 : 0;
                      onCooldown = true;
                   }
                } else {
                   if (timeUntilSkillFree > timeUntilGcdFree) {
                       activePercent = skill && skill.cooldownMs ? (timeUntilSkillFree / skill.cooldownMs) * 100 : 0;
                       onCooldown = true;
                   } else if (timeUntilGcdFree > 0) {
                       activePercent = skill ? (timeUntilGcdFree / getEffectiveGcd(skill)) * 100 : 0;
                       onCooldown = true;
                   }
                }

                const isOnGcd = timeUntilGcdFree > 0 && timeUntilGcdFree >= timeUntilSkillFree;
                
                const isCastingThis = castingSkillId === skillId;
                let castPercent = 0;
                if (isCastingThis && skill && skill.castTime) {
                   const elapsed = now - (castEndTime - skill.castTime);
                   castPercent = Math.min(100, (elapsed / skill.castTime) * 100);
                }

                const outOfEnergy = skill ? (currentEnergy < getEffectiveEnergyCost(skill) || (!!skill.adrenalineCost && currentAdrenaline < skill.adrenalineCost)) : false;
                const hasRequiredBuff = skill?.requiresBuffId ? playerBuffs.some(b => b.buffId === skill.requiresBuffId) : false;
                const missingBuff = skill?.requiresBuffId ? !hasRequiredBuff : false;
                const isProcced = skill?.requiresBuffId && hasRequiredBuff;

                return (
                  <div key={index} className="relative flex flex-col items-center">
                    <button
                      className={`relative w-12 h-12 flex items-center justify-center transition-all bg-transparent focus:outline-none focus:ring-0 group
                        ${isBinding ? 'animate-pulse scale-110' : ''}
                        ${(outOfEnergy || missingBuff) && !isBinding ? 'grayscale brightness-50' : ''}
                      `}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (bindingSlotIndex !== null) {
                           setBindingSlotIndex(index);
                           return;
                        }
                        if (!skill) return;
                        
                        // Execute skill logic
                        const appState = useAppStore.getState();
                        const playerState = usePlayerStore.getState();
                        const worldState = useWorldStore.getState();
                        const combatState = useCombatStore.getState();
                        let canAutoTarget = false;
                        let targetEntity = null;

                        if (playerState.activeTargetId) {
                          targetEntity = worldState.enemies.find(e => e.id === playerState.activeTargetId);
                          if (targetEntity && !targetEntity.isDead) {
                            const effectiveRange = skill.range > 0 ? skill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);
                            const dist = getChebyshevDistance(playerState.position, targetEntity.position);
                            const isSolid = (x: number, y: number) => {
                              if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
                              return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
                            };
                            if (dist <= effectiveRange && hasLineOfSight(playerState.position, targetEntity.position, isSolid)) {
                              canAutoTarget = true;
                            }
                          }
                        }
                        
                        if (!appState.isPaused && canAutoTarget && targetEntity) {
                          InputHandler.requestAction({ type: 'skill', skillId: skill.id, targetPos: targetEntity.position, targetId: targetEntity.id });
                        } else {
                          combatState.setTargetingSkill(skill.id);
                        }
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        if (bindingSlotIndex === index) setBindingSlotIndex(null);
                        else setBindingSlotIndex(index);
                      }}
                      onMouseEnter={() => {
                        if (!isBinding && skill) {
                          setContent(
                            <div className="w-56 bg-surface-overlay border border-border-strong rounded-lg shadow-2xl px-2 py-1.5 text-left pointer-events-none backdrop-blur-md">
                              <div className="font-bold text-sm text-sky-400 mb-1">{skill.name}</div>
                              <div className="flex flex-col text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest gap-1">
                                {(() => {
                                  const stats = [];
                                  if (getEffectiveEnergyCost(skill) > 0) stats.push({ val: getEffectiveEnergyCost(skill), lbl: 'Energy' });
                                  if (skill.adrenalineCost) stats.push({ val: skill.adrenalineCost, lbl: 'Adrenaline' });
                                  if (skill.cooldownMs) stats.push({ val: (skill.cooldownMs / 1000).toFixed(1), lbl: 'CD' });
                                  if (skill.castTime) stats.push({ val: (getEffectiveCastTime(skill) / 1000).toFixed(1) + 's', lbl: 'Cast' });
                                  stats.push({ val: skill.range > 1 ? skill.range : 'Melee', lbl: skill.range > 1 ? 'Range' : '' });
                                  
                                  const rows = [];
                                  for (let i = 0; i < stats.length; i += 2) {
                                    rows.push(stats.slice(i, i + 2));
                                  }
                                  
                                  return rows.map((row, i) => (
                                    <div key={i} className="flex justify-between items-center border-b border-border-subtle/50 pb-0.5 last:border-0 last:pb-0">
                                      <div className="flex items-center gap-1">
                                        <span>{row[0].val}</span>
                                        {row[0].lbl && <span>{row[0].lbl}</span>}
                                      </div>
                                      {row[1] && (
                                        <div className="flex items-center gap-1 text-right">
                                          <span>{row[1].val}</span>
                                          {row[1].lbl && <span>{row[1].lbl}</span>}
                                        </div>
                                      )}
                                    </div>
                                  ));
                                })()}
                              </div>
                              {skill.effects.some(e => e.type === 'damage') && (
                                <div className="mb-1 pb-1 border-b border-border-subtle space-y-0.5">
                                  {skill.effects.filter(e => e.type === 'damage').map((effect, i) => {
                                    const weaponDamage = useStatsStore.getState().getStat('WeaponDamage');
                                    const weaponType = (useInventoryStore.getState().equipment['weapon1'] as any)?.damageType || 'Physical';
                                    const mult = effect.damageMultiplier || 0;
                                    const base = effect.baseValue || 0;
                                    const totalAvg = base + (weaponDamage * mult);
                                    const el = effect.element || (mult > 0 ? weaponType : 'Physical');
                                    
                                    if (skill.id === 'basic_attack') {
                                      const min = Math.floor(totalAvg * 0.75);
                                      const max = Math.ceil(totalAvg * 1.25);
                                      return (
                                      <div key={i} className="text-xs text-text-secondary">
                                        {min} - {max} {el} Damage
                                      </div>
                                    );
                                  }
                                    
                                    return (
                                      <div key={i} className="text-xs text-text-secondary">
                                        {Math.floor(totalAvg)} {el} Damage
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="text-xs text-text-secondary leading-snug">
                                 {skill.description}
                              </div>
                            </div>
                          );
                        }
                      }}
                      onMouseLeave={() => {
                        setContent(null);
                      }}
                    >
                      {skill && IconComponent ? (
                        <div className={`relative z-10 w-full h-full flex items-center justify-center transition-transform group-hover:scale-110 ${outOfRange ? 'opacity-50' : ''}`}>
                          <IconComponent className={`mb-1.5 w-8 h-8 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${isProcced ? 'text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]' : 'text-sky-400'}`} />
                        </div>
                      ) : null}

                      {/* Cooldown Overlay */}
                      {onCooldown && skill && (
                        <div 
                           className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none rounded-full"
                           style={{ background: `conic-gradient(transparent ${100 - activePercent}%, rgba(0,0,0,0.8) 0)` }}
                        >
                            <span className="text-white font-bold text-[0.625rem] z-30 [text-shadow:2px_2px_1px_rgba(0,0,0,1)]">
                               {(Math.max(timeUntilSkillFree, timeUntilGcdFree) / 1000).toFixed(1)}
                            </span>
                        </div>
                      )}
                      
                      {/* Casting Overlay */}
                      {isCastingThis && skill && (
                        <div className="absolute inset-0 bg-sky-900/30 z-20 overflow-hidden pointer-events-none rounded-md">
                           <div 
                             className="absolute bottom-0 left-0 w-full bg-sky-400/50 transition-none" 
                             style={{ height: `${castPercent}%` }} 
                           />
                        </div>
                      )}
                    </button>
                    
                    {/* Underline */}
                    <div className="absolute bottom-0 left-[10%] w-[80%] h-[4px] bg-zinc-900 drop-shadow-md pointer-events-none" />
                    
                    {/* Floating Hotkey */}
                    <div className={`absolute -bottom-5 w-4 h-4 bg-zinc-900 flex items-center justify-center text-[9px] font-bold text-white z-30 shadow-[0_2px_4px_rgba(0,0,0,0.5)] pointer-events-none ${isBinding ? 'border border-accent text-accent' : ''}`}>
                      {index + 1}
                    </div>

                    {/* Skill Binding Menu */}
                    {isBinding && (
                      <div className="skill-bind-menu absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-surface-deep border border-border-strong rounded-lg shadow-2xl z-[100]">
                        <div className="p-2 border-b border-border-subtle bg-surface-deep rounded-t-lg">
                          <h3 className="text-xs font-bold text-accent">Bind Skill to Slot {index + 1}</h3>
                        </div>
                        <div className="p-1 max-h-48 overflow-y-auto">
                          {unlockedActives.map(actId => {
                            const act = SKILLS[actId];
                            if (!act) return null;
                            const ActIcon = ICONS[act.icon] || Flame;
                            return (
                              <button
                                key={act.id}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
                                  hover:bg-surface-raised text-text-secondary hover:text-text-primary
                                `}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  bindSkill(index, act.id);
                                  setBindingSlotIndex(null);
                                }}
                              >
                                <ActIcon className="w-4 h-4 text-sky-400" />
                                {act.name}
                              </button>
                            );
                          })}
                          <div className="h-px w-full bg-border-subtle my-1" />
                          <button
                            className="w-full text-left px-2 py-1.5 rounded text-xs text-text-secondary hover:bg-surface-raised hover:text-text-secondary transition-colors"
                            onClick={(e) => { e.stopPropagation(); bindSkill(index, null); setBindingSlotIndex(null); }}
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

          {/* Resources Container (Bottom Left) */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-[8px] z-40 pointer-events-auto w-[360px]">
            {/* Vitals Box */}
            <div className="flex flex-col gap-[8px] drop-shadow-2xl">
              {/* Health Bar */}
              <div className="relative flex w-full items-center">
                 <div className="relative w-full h-[1.25rem] bg-black/40 overflow-hidden">
                    {expectedHealAmount > 0 && (
                      <div 
                        className="absolute top-0 left-0 h-full bg-red-400/70 transition-all duration-75"
                        style={{ width: `${Math.min(100, ((currentHealth + expectedHealAmount) / maxHealth) * 100)}%` }}
                      />
                    )}
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#dc2626] transition-all duration-75"
                      style={{ width: `${Math.min(100, (currentHealth / maxHealth) * 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[1px]">
                      {currentHealth > 0 ? Math.max(1, Math.floor(currentHealth)) : 0}/{maxHealth}
                    </div>
                 </div>
              </div>

              {/* Energy Bar */}
              <div className="relative w-full h-[0.875rem] bg-black/40 overflow-hidden">
                 <div 
                   className="absolute top-0 left-0 h-full bg-[#eab308] transition-all duration-300"
                   style={{ width: `${Math.min(100, (currentEnergy / maxEnergy) * 100)}%` }}
                 />
                 <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[0.0625rem]">
                   {Math.floor(currentEnergy)}/{maxEnergy}
                 </div>
              </div>

              {/* Adrenaline Bar */}
              {isFighter && (
                 <div className="relative w-full h-[0.875rem] bg-black/40 overflow-hidden">
                    <div 
                      className="absolute top-0 left-0 h-full bg-[#f97316]"
                      style={{ 
                        display: currentAdrenaline > 0 ? 'block' : 'none',
                        width: `${Math.min(100, (currentAdrenaline / maxAdrenaline) * 100)}%`
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[0.0625rem]">
                      {Math.floor(currentAdrenaline)}/{maxAdrenaline}
                    </div>
                 </div>
              )}
            </div>

            {/* XP Bar & Level */}
            <div className="flex w-full items-center h-[0.5rem] gap-1">
               <span className="text-[0.55rem] text-white font-bold font-mono [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none shrink-0">
                 {level}
               </span>
               <div className="relative flex-1 h-[0.5rem] bg-black/40 overflow-hidden opacity-90">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#a78bfa] transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentXp / xpRequired) * 100)}%` }}
                  />
               </div>
            </div>
          </div>
          {/* MP Globe Removed */}
        </div>
      {/* Death Screen */}

      {/* Death Screen */}
      {currentHealth <= 0 && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto animate-in fade-in duration-1000">
           <h1 className="text-red-600 font-black text-6xl uppercase tracking-[0.5em] drop-shadow-[0_0_20px_rgba(220,38,38,0.8)] mb-8">You Died</h1>
           <p className="text-text-secondary text-lg mb-8 max-w-md text-center">Your run has ended. All dungeon progress and unbanked items have been lost.</p>
           <button 
             onClick={() => {
               setRunState('town');
               useAppStore.getState().setLocation('town');
               usePlayerStore.getState().setTarget(null, true);
               window.location.reload();
             }}
             className="px-8 py-3 bg-surface-deep border border-red-900/50 hover:border-red-500 text-red-500 hover:text-red-400 hover:shadow-[0_0_15px_rgba(239,68,68,0.3)] rounded-lg font-bold text-lg transition-all cursor-pointer"
           >
             Respawn in Town
           </button>
        </div>
      )}
      {/* Keybind Hints */}
      <div className="absolute bottom-16 right-3 pointer-events-none z-50 flex flex-col gap-1.5 items-end opacity-75">
         <div className="flex items-center gap-2">
           <span className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-wider text-right [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">Move Diagonal</span>
           <span className="text-[0.55rem] font-black tracking-widest text-white bg-zinc-900 px-1.5 py-0.5 shadow-md leading-none font-mono">Q E Z C</span>
         </div>
         <div className="flex items-center gap-2">
           <span className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-wider text-right [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">Health Potion</span>
           <span className="text-[0.55rem] font-black tracking-widest text-white bg-zinc-900 px-1.5 py-0.5 shadow-md leading-none font-mono">R</span>
         </div>
         <div className="flex items-center gap-2">
           <span className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-wider text-right [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">Cycle Targets</span>
           <span className="text-[0.55rem] font-black tracking-widest text-white bg-zinc-900 px-1.5 py-0.5 shadow-md leading-none font-mono">TAB</span>
         </div>
         <div className="flex items-center gap-2">
           <span className="text-[0.65rem] font-bold text-zinc-400 uppercase tracking-wider text-right [text-shadow:1px_1px_0px_rgba(0,0,0,1)]">Tactical Pause</span>
           <span className="text-[0.55rem] font-black tracking-widest text-white bg-zinc-900 px-1.5 py-0.5 shadow-md leading-none font-mono">SPACE</span>
         </div>
      </div>
      
      {/* UI Window Toggles (Bottom Right) */}
      <div className="absolute bottom-3 right-3 pointer-events-auto z-50 flex gap-2">
        {useAppStore(s => s.location) === 'dungeon' && (
          <button
            onClick={() => {
              const combatState = useCombatStore.getState();
              if (useAppStore.getState().getGameTime() - combatState.lastCombatEventTime < 5000) {
                useMessageStore.getState().addScreenMessage('above', 'Cannot portal in combat', 4000);
                return;
              }
              if (combatState.castingSkillId !== 'portal_skill') {
                combatState.setCasting('portal_skill', 4000);
              }
            }}
            onMouseEnter={() => setContent(
              <div className="w-52 bg-surface-overlay border border-border-strong shadow-2xl rounded-lg px-2 py-1.5 text-left backdrop-blur-md pointer-events-none mb-2">
                <div className="font-bold text-sm text-text-primary mb-1 tracking-tight">Town Portal (B)</div>
                <div className="text-xs text-text-secondary leading-relaxed">
                  Forfeit dungeon and return to town
                </div>
              </div>
            )}
            onMouseLeave={() => setContent(null)}
            className="w-10 h-10 flex items-center justify-center flex-col gap-0.5 group transition-colors bg-black/60 text-text-secondary hover:text-red-400 hover:bg-zinc-900 shadow-md"
          >
            <IconWhirl className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => {
            const appState = useAppStore.getState();
            if (appState.characterWindowOpen && appState.characterWindowTab === 'inventory') {
              appState.setCharacterWindowOpen(false);
            } else {
              appState.setCharacterWindowTab('inventory');
              appState.setCharacterWindowOpen(true);
            }
          }}
          onMouseEnter={() => setContent(
            <div className="w-auto bg-surface-overlay border border-border-strong shadow-2xl rounded-lg px-2 py-1 text-left backdrop-blur-md pointer-events-none mb-2">
              <div className="text-xs text-text-primary leading-relaxed font-bold">
                Inventory (I)
              </div>
            </div>
          )}
          onMouseLeave={() => setContent(null)}
          className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group relative transition-colors ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'inventory')
              ? 'text-accent bg-zinc-800 shadow-inner'
              : 'bg-black/60 text-text-secondary hover:text-text-primary hover:bg-zinc-900 shadow-md'
          }`}
        >
          <Backpack className="w-5 h-5" />
          {attributePoints > 0 && (
             <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 rounded-full z-50 flex items-center justify-center">
                <div className="absolute w-4 h-4 bg-red-600 rounded-full animate-pulse transform-gpu"></div>
                <span className="relative text-white text-[0.6rem] font-bold leading-none mt-[1px]">
                  {attributePoints}
                </span>
             </div>
          )}
        </button>

        <button
          onClick={() => {
            const appState = useAppStore.getState();
            if (appState.characterWindowOpen && appState.characterWindowTab === 'active_skills') {
              appState.setCharacterWindowOpen(false);
            } else {
              appState.setCharacterWindowTab('active_skills');
              appState.setCharacterWindowOpen(true);
            }
          }}
          onMouseEnter={() => setContent(
            <div className="w-auto bg-surface-overlay border border-border-strong shadow-2xl rounded-lg px-2 py-1 text-left backdrop-blur-md pointer-events-none mb-2">
              <div className="text-xs text-text-primary leading-relaxed font-bold">
                Skills (K)
              </div>
            </div>
          )}
          onMouseLeave={() => setContent(null)}
          className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group relative transition-colors ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'active_skills')
              ? 'text-accent bg-zinc-800 shadow-inner'
              : 'bg-black/60 text-text-secondary hover:text-text-primary hover:bg-zinc-900 shadow-md'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          {activeSkillPoints > 0 && (
             <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 rounded-full z-50 flex items-center justify-center">
                <div className="absolute w-4 h-4 bg-red-600 rounded-full animate-pulse transform-gpu"></div>
                <span className="relative text-white text-[0.6rem] font-bold leading-none mt-[1px]">
                  {activeSkillPoints}
                </span>
             </div>
          )}
        </button>

        <button
          onClick={() => {
            const appState = useAppStore.getState();
            if (appState.characterWindowOpen && appState.characterWindowTab === 'skills') {
              appState.setCharacterWindowOpen(false);
            } else {
              appState.setCharacterWindowTab('skills');
              appState.setCharacterWindowOpen(true);
            }
          }}
          onMouseEnter={() => setContent(
            <div className="w-auto bg-surface-overlay border border-border-strong shadow-2xl rounded-lg px-2 py-1 text-left backdrop-blur-md pointer-events-none mb-2">
              <div className="text-xs text-text-primary leading-relaxed font-bold">
                Passives (P)
              </div>
            </div>
          )}
          onMouseLeave={() => setContent(null)}
          className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group relative transition-colors ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'skills')
              ? 'text-accent bg-zinc-800 shadow-inner'
              : 'bg-black/60 text-text-secondary hover:text-text-primary hover:bg-zinc-900 shadow-md'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          {passivePoints > 0 && (
             <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 rounded-full z-50 flex items-center justify-center">
                <div className="absolute w-4 h-4 bg-red-600 rounded-full animate-pulse transform-gpu"></div>
                <span className="relative text-white text-[0.6rem] font-bold leading-none mt-[1px]">
                  {passivePoints}
                </span>
             </div>
          )}
        </button>
      </div>

    </div>
  );
}
