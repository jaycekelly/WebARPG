import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getEffectiveCastTime, getEffectiveEnergyCost, getEffectiveGcd, getMainHandAttackCooldown, getOffHandAttackCooldown } from '../engine/input/InputHandler';
import { useStatsStore } from '../store/useStatsStore';
import { useBuffStore } from '../store/useBuffStore';
import { useSkillStore } from '../store/useSkillStore';
import { useAppStore } from '../store/useAppStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { useVisionStore } from '../store/useVisionStore';
import { useMessageStore } from '../store/useMessageStore';
import { FlaskConical, Flame, ArrowUpCircle, Backpack, BookOpen, Sparkles } from 'lucide-react';
import { IconWhirl } from '@tabler/icons-react';
import { useEffect, useState, memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { SKILLS } from '../data/skills';
import { setRunState } from '../store/storage';

import { ICONS } from './IconLibrary';
import { SkillTooltip } from './SkillTooltip';

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

const MemoizedBuffIcon = memo(({ icon: IconComponent }: { icon: any }) => {
   return <IconComponent className="w-3.5 h-3.5 opacity-80" />;
});

const MemoizedSkillIcon = memo(({ icon: IconComponent, isProcced }: { icon: any, isProcced: boolean }) => {
   return <IconComponent className={`mb-1.5 w-8 h-8 drop-shadow-icon text-sky-400 ${isProcced ? 'drop-shadow-glow-accent' : ''}`} />;
});

export function CombatOverlay() {
  const { activeTargetId, currentEnergy, currentAdrenaline, currentHealth, level, currentXp, boundSkills, bindSkill, lastFlaskTime, useFlask, attributePoints, activeSkillPoints, passivePoints } = usePlayerStore(useShallow(s => ({
    activeTargetId: s.activeTargetId,
    currentEnergy: s.currentEnergy,
    currentAdrenaline: s.currentAdrenaline,
    currentHealth: s.currentHealth,
    level: s.level,
    currentXp: s.currentXp,
    boundSkills: s.boundSkills,
    bindSkill: s.bindSkill,
    lastFlaskTime: s.lastFlaskTime,
    useFlask: s.useFlask,
    attributePoints: s.attributePoints,
    activeSkillPoints: s.activeSkillPoints,
    passivePoints: s.passivePoints,
  })));
  
  const position = usePlayerStore.getState().position;
  const setContent = useTooltipStore(state => state.setContent);
  
  // No custom equality fn needed (and zustand v5's create() no longer accepts one):
  // useWorldStore.moveEnemy/damageEnemy/updateEnemy always replace the changed enemy
  // with a new object and leave untouched enemies' references intact, so a plain
  // selector already gives correct Object.is-based re-render behavior - a new target
  // reference only when the targeted enemy itself actually changed.
  const target = useWorldStore(s => s.enemies.find(e => e.id === activeTargetId && !e.isDead));

  const { gcdEndTime, castingSkillId, castEndTime, skillCooldowns, lastMainHandAttackTime, lastOffHandAttackTime, comboStep, lastComboTime } = useCombatStore(useShallow(s => ({
    gcdEndTime: s.gcdEndTime,
    castingSkillId: s.castingSkillId,
    castEndTime: s.castEndTime,
    skillCooldowns: s.skillCooldowns,
    lastMainHandAttackTime: s.lastMainHandAttackTime,
    lastOffHandAttackTime: s.lastOffHandAttackTime,
    comboStep: s.comboStep,
    lastComboTime: s.lastComboTime,
  })));
  const getStat = useStatsStore(s => s.getStat);
  const entityBuffs = useBuffStore(s => s.entityBuffs);
  const unlockedActives = useSkillStore(s => s.unlockedActives);
  const messages = useMessageStore(s => s.messages);

  const [now, setNow] = useState(useAppStore.getState().getGameTime());
  const [bindingSlotIndex, setBindingSlotIndex] = useState<number | null>(null);

  
  
  const playerBuffs = entityBuffs['player'] || [];
  const visiblePlayerBuffs = playerBuffs.filter(b => b.maxDurationMs !== null && b.maxDurationMs <= 30000 && b.buffId !== 'flask_recovery' && b.buffId !== 'zealous_blow_ready');
  
  let expectedHealAmount = 0;
  for (const b of playerBuffs) {
      if (b.isHoT && b.hotHealPerTick && b.expiresAt && b.hotTickRateMs) {
          const ticksRemaining = Math.floor(Math.max(0, b.expiresAt - now) / b.hotTickRateMs);
          expectedHealAmount += ticksRemaining * b.hotHealPerTick;
      }
  }
  
  const maxHealth = getStat('Health');
  const maxEnergy = getStat('Energy');

  const xpRequired = 100 * Math.pow(level, 2);
  
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
        
        if (targetEntity) {
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
             durationMs: 2000,
             maxDurationMs: 2000,
             stacks: 1,
             maxStacks: 1,
             icon: 'FlaskConical',
             statModifiers: [],
             isHoT: true,
             hotTickRateMs: 50,
             hotHealPerTick: (maxHp * 0.3) / (2000 / 50)
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
          <div className="flex flex-col items-center w-[12.75rem] relative pointer-events-auto animate-[fadeIn_0.3s_ease-out] select-none">
            <div className="font-bold text-text-primary text-[0.75rem] mb-1.5 leading-none text-center drop-shadow-text pt-[1px]">{target.name}</div>
            <div className="relative h-[0.875rem] w-full bg-black/40 backdrop-blur-md rounded-none overflow-hidden border-none shadow-depth-md">
              <div 
                className="absolute top-0 left-0 h-full transition-all duration-150 border-r border-red-950 z-20 bg-red-600"
                style={{ 
                  width: `${healthPercent}%`
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-30 font-mono tracking-widest pt-[0.0625rem]">
                {target.health > 0 ? Math.max(1, Math.floor(target.health)) : 0}/{target.stats.maxHealth}
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[8rem] pointer-events-none z-50 flex flex-col items-center animate-in fade-in duration-300">
               <div className="bg-surface-deep/93 rounded-none pl-2 pr-3 py-1.5 flex items-center gap-2.5 shadow-depth-md border-none">
                  <span className="text-xs font-black tracking-widest text-text-primary bg-surface-overlay rounded-none w-6 h-6 flex items-center justify-center shadow-depth-sm leading-none font-mono">F</span>
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
             <div key={msg.id} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${mtClass} pointer-events-none z-50 flex flex-col items-center ${isLevelUp ? 'animate-[levelUpFade_4s_ease-in-out_forwards]' : 'animate-in fade-in slide-in-from-bottom-2 duration-500'}`}>
               <span className={isLevelUp ? "font-sans text-accent font-black text-2xl uppercase tracking-[0.2em] drop-shadow-glow-accent" : "font-sans text-amber-500 font-bold text-sm [text-shadow:2px_2px_1px_rgba(0,0,0,1)]"}>
                 {msg.text}
               </span>
             </div>
           );
         }
         if (msg.type === 'top') {
           const isPause = msg.text === 'TACTICAL PAUSE';
           return (
             <div key={msg.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-[14rem] pointer-events-none z-50 flex flex-col items-center animate-in slide-in-from-top-2 fade-in duration-300">
               <span className={isPause ? "font-sans text-accent font-black text-base uppercase tracking-widest animate-pulse drop-shadow-depth-sm" : "font-sans text-amber-500 font-bold text-sm [text-shadow:2px_2px_1px_rgba(0,0,0,1)]"}>
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
          <div className="flex flex-col items-center gap-[2px] pointer-events-none w-[12.75rem]">
            
            {/* Cast Bar (Top) */}
            <div className="h-10 flex flex-col items-center justify-end w-full">
              {castingSkillId && castEndTime > 0 && (SKILLS[castingSkillId] || castingSkillId === 'portal_skill') ? (
                <div className="flex flex-col items-center w-[8rem] mb-1">
                  <div className="text-xs text-center whitespace-nowrap text-text-primary -mt-[7px] mb-[3.5px] font-bold [text-shadow:2px_2px_1px_rgba(0,0,0,1)] tracking-wide">
                    {castingSkillId === 'portal_skill' ? 'Forfeiting' : SKILLS[castingSkillId].name}
                  </div>
                  <div className="h-3.5 w-full bg-black/40 overflow-hidden backdrop-blur-md rounded-none">
                    <div
                      className="h-full transition-all duration-75 bg-purple-600"
                      style={{ 
                        width: `${Math.min(100, Math.max(0, 100 - ((castEndTime - now) / Math.max(1, castingSkillId === 'portal_skill' ? 4000 : getEffectiveCastTime(SKILLS[castingSkillId]))) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Main Hand Swing Timer (Middle) */}
            <div className={`h-2 w-full flex items-center ${isMainTimerActive ? '' : 'opacity-0 pointer-events-none'}`}>
              <div className="h-[5px] w-full bg-black/40 overflow-hidden backdrop-blur-md rounded-none">
                <div 
                  className="h-full transition-all duration-75 bg-amber-600"
                  style={{ 
                    width: `${Math.max(0, 100 - (timeSinceMainAttack / mainHandCooldown) * 100)}%`
                  }}
                />
              </div>
            </div>

            {/* Off-Hand Swing Timer (Bottom) */}
            <div className={`h-2 w-full flex items-center ${isOffTimerActive ? '' : 'opacity-0 pointer-events-none'}`}>
              <div className="h-[5px] w-full bg-black/40 overflow-hidden backdrop-blur-md rounded-none opacity-80">
                <div 
                  className="h-full transition-all duration-75 bg-amber-600"
                  style={{ 
                    width: `${Math.max(0, 100 - (timeSinceOffAttack / offHandCooldown) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

        {/* Active Buffs (fixed h-8 container to prevent bar bouncing) */}
        <div className="flex gap-1.5 justify-center h-8 mb-1">
          {visiblePlayerBuffs.map(buff => {
            const BuffIcon = ICONS[buff.icon] || ArrowUpCircle;
            const remaining = buff.expiresAt ? Math.max(0, buff.expiresAt - now) : null;
            const isExpiring = remaining !== null && remaining < 2500;
            return (
              <div key={buff.id} className="relative group">
                <div className={`relative w-7 h-7 rounded-none border flex flex-col items-center justify-center bg-surface-base overflow-hidden shadow-depth-sm ${buff.type === 'buff' ? 'border-sky-400/50 text-sky-400' : 'border-red-500/50 text-red-500'} ${isExpiring ? 'animate-pulse' : ''}`}>
                  <MemoizedBuffIcon icon={BuffIcon} />
                  {buff.stacks > 1 && (
                    <span className="absolute bottom-0 right-0 text-[0.5rem] font-bold bg-surface-base/80 px-1 rounded-none z-20">{buff.stacks}</span>
                  )}
                  {/* Visual duration wipe */}
                  {remaining !== null && buff.maxDurationMs && (
                    <div 
                      className="absolute bottom-0 left-0 w-full bg-black/50 origin-bottom"
                      style={{ height: `${(1 - remaining / buff.maxDurationMs) * 100}%` }}
                    />
                  )}
                  {/* Duration Text Overlay */}
                  {remaining !== null && (
                    <span className="absolute text-[0.55rem] font-bold text-white z-10 [text-shadow:1px_1px_1px_rgba(0,0,0,1)] pointer-events-none">
                      {Math.ceil(remaining / 1000)}
                    </span>
                  )}
                </div>
                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-surface-deep/95 backdrop-blur-md border border-transparent rounded-none px-2 py-1 text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-depth-md">
                  <div className={`font-bold mb-1 ${buff.type === 'buff' ? 'text-sky-400' : 'text-red-500'}`}>{buff.name}</div>
                  {remaining !== null ? (
                     <div className="text-text-secondary mb-1 font-mono">{(remaining / 1000).toFixed(1)}s remaining</div>
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

        {/* Main Skill Bar with Docked Flask */}
        <div className="relative flex items-end pointer-events-auto mt-1 w-max mb-5">
            
            {/* Docked Flask Slot (Offset to the left of the center skill bar) */}
            <div className="absolute right-full mr-2 bottom-0 h-12 flex items-center justify-center  gap-2">
                <div className="relative w-12 h-12 flex flex-col items-center justify-center group">
                   <div className="relative w-full h-full">
                      <button 
                        className={`w-full h-full flex items-center justify-center transition-all bg-transparent focus:outline-none focus:ring-0
                          ${now - lastFlaskTime < 30000 ? 'cursor-not-allowed' : ''}
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
                          <div className="w-52 bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-depth-md rounded-none px-2 py-1.5 text-left pointer-events-none mb-2">
                            <div className="font-bold text-sm text-red-400 mb-1">
                              Healing Flask
                            </div>
                            <div className="text-[0.625rem] text-text-secondary pb-1 mb-1 border-b border-border-subtle/40 uppercase tracking-widest">
                              30.0 CD
                            </div>
                            <div className="text-xs text-text-secondary leading-snug mb-1">
                              Restores <span className="text-red-400 font-bold">30%</span> of your maximum health over <span className="text-text-secondary font-bold">2 seconds</span>.
                            </div>
                          </div>
                        )}
                       onMouseLeave={() => setContent(null)}
                      >
                         <FlaskConical className="mt-1 w-6 h-6 text-red-500 drop-shadow-icon z-10 transition-transform group-hover:scale-110" />
                      </button>
                      
                      {now - lastFlaskTime < 30000 && (() => {
                          const timeRemaining = 30000 - (now - lastFlaskTime);
                          const activePercent = (timeRemaining / 30000) * 100;
                          return (
                            <div className="absolute inset-0 z-20 pointer-events-none">
                              {/* Dim the square slot area behind the circle to match */}
                              <div className="absolute w-9 h-9 top-[10px] left-[8px] bg-black/20 rounded-none" />
                              
                              {/* Centered circular sweep window - smaller and shifted down */}
                              <div 
                                 className="absolute w-9 h-9 top-[10px] left-[8px] rounded-full overflow-hidden"
                                 style={{ background: `conic-gradient(from 0deg, transparent ${100 - activePercent}%, rgba(255,255,255,0.95) ${100 - activePercent}%, rgba(0,0,0,0.50) ${Math.min(100, 100 - activePercent + 2)}%, rgba(0,0,0,0.50) 100%)` }}
                              />
                              
                              {/* Countdown Text - brought down a tad to align with the circle */}
                              <div className="absolute inset-0 flex items-center justify-center z-30 translate-x-[2px] translate-y-[4px]">
                                <span className="text-white font-bold text-xs [text-shadow:2px_2px_1px_rgba(0,0,0,1)]">
                                  {Math.ceil(timeRemaining / 1000)}
                                </span>
                              </div>
                            </div>
                          );
                      })()}
                   </div>
                  
                  {/* Floating Hotkey */}
                  <div className="absolute -bottom-5 w-4 h-4 bg-surface-overlay flex items-center justify-center text-[9px] font-bold text-white z-30 shadow-depth-sm pointer-events-none">
                    R
                  </div>
                  {/* Underline */}
                  <div className="absolute bottom-0 left-[20%] w-[60%] h-[4px] bg-surface-overlay shadow-depth-sm pointer-events-none" />
               </div>
               {/* Vertical Separator */}
               <div className="w-[4px] h-5 bg-surface-overlay self-end mr-1" />
            </div>

            {/* Main Skill Bar */}
            <div className="flex gap-1  relative">
              
              {boundSkills.slice(0, 8).map((skillId, index) => {
                let skill = skillId ? SKILLS[skillId] : null;

                // Resolve dynamic combo chain steps for active displaying
                if (skill && skill.comboChainIds && skill.comboChainIds.length > 0) {
                  const timeoutMs = skill.comboTimeoutMs || 5000;
                  const isComboActive = now - lastComboTime < timeoutMs;
                  const activeStep = isComboActive ? (comboStep % skill.comboChainIds.length) : 0;
                  const chainSkillId = skill.comboChainIds[activeStep];
                  const chainSkill = SKILLS[chainSkillId];
                  if (chainSkill) {
                    skill = {
                      ...skill,
                      icon: chainSkill.icon,
                      name: chainSkill.name,
                      description: chainSkill.description,
                      effects: chainSkill.effects,
                    };
                  }
                }

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

                // const isOnGcd = timeUntilGcdFree > 0 && timeUntilGcdFree >= timeUntilSkillFree;
                
                const isCastingThis = castingSkillId === skillId;
                let castPercent = 0;
                if (isCastingThis && skill && skill.castTime) {
                   const elapsed = now - (castEndTime - skill.castTime);
                   castPercent = Math.min(100, (elapsed / skill.castTime) * 100);
                }

                const outOfEnergy = skill ? (currentEnergy < getEffectiveEnergyCost(skill) || (!!skill.adrenalineCost && currentAdrenaline < skill.adrenalineCost)) : false;
                const hasRequiredBuff = skill?.requiresBuffId ? playerBuffs.some(b => b.buffId === skill.requiresBuffId) : false;
                const missingBuff = skill?.requiresBuffId ? !hasRequiredBuff : false;
                const isProcced = !!(skill?.requiresBuffId && hasRequiredBuff);

                const shouldGreyOut = skill ? ((outOfEnergy || missingBuff || outOfRange) && !isBinding) : false;

                return (
                  <div key={index} className="relative flex flex-col items-center">
                    <div className="relative w-12 h-12 group">
                      <button
                        className={`w-full h-full flex items-center justify-center transition-all bg-transparent focus:outline-none focus:ring-0
                          ${isBinding ? 'animate-pulse scale-110' : ''}
                          ${shouldGreyOut ? 'grayscale brightness-50' : ''}
                        `}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (bindingSlotIndex !== null) {
                             setBindingSlotIndex(index);
                             return;
                          }
                          if (!skill) return;
                          
                          const playerState = usePlayerStore.getState();
                          const worldState = useWorldStore.getState();
                          const combatState = useCombatStore.getState();
                          let targetEntity = null;

                          if (playerState.activeTargetId) {
                            targetEntity = worldState.enemies.find(e => e.id === playerState.activeTargetId && !e.isDead);
                          }
                          
                          if (targetEntity) {
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
                            setContent(<SkillTooltip skill={skill} />);
                          }
                        }}
                        onMouseLeave={() => {
                          setContent(null);
                        }}
                      >
                        {skill && IconComponent ? (
                          <div className="relative z-10 w-full h-full flex items-center justify-center transition-transform group-hover:scale-110">
                            <MemoizedSkillIcon icon={IconComponent} isProcced={isProcced} />
                          </div>
                        ) : null}
                      </button>

                      {/* Cooldown Overlay (FFXIV style: circular sweep inside a square slot) */}
                      {onCooldown && skill && (
                        <div className="absolute inset-0 z-20 pointer-events-none">
                          {/* Dim the square slot corners */}
                          <div className="absolute inset-0 bg-black/20 rounded-none" />
                          
                          {/* Centered circular sweep window (outline removed, scaled up) */}
                          <div 
                             className="absolute w-[2.75rem] h-[2.75rem] top-[0.125rem] left-[0.125rem] rounded-full overflow-hidden"
                             style={{ background: `conic-gradient(from 0deg, transparent ${100 - activePercent}%, rgba(255,255,255,0.95) ${100 - activePercent}%, rgba(0,0,0,0.50) ${Math.min(100, 100 - activePercent + 2)}%, rgba(0,0,0,0.50) 100%)` }}
                          />
                          
                          {/* Countdown Text */}
                          <div className="absolute inset-0 flex items-center justify-center z-30">
                             <span className="text-white font-bold text-xs [text-shadow:2px_2px_1px_rgba(0,0,0,1)]">
                                {(() => {
                                  const remainingSec = Math.max(timeUntilSkillFree, timeUntilGcdFree) / 1000;
                                  return remainingSec < 2.0 ? remainingSec.toFixed(1) : remainingSec.toFixed(0);
                                })()}
                             </span>
                          </div>
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
                    </div>
                    
                    {/* Underline */}
                    <div className="absolute bottom-0 left-[10%] w-[80%] h-[4px] bg-surface-overlay shadow-depth-sm pointer-events-none" />
                    
                    {/* Floating Hotkey */}
                    <div className={`absolute -bottom-5 w-4 h-4 bg-surface-overlay flex items-center justify-center text-[9px] font-bold text-white z-30 shadow-depth-sm pointer-events-none ${isBinding ? 'border border-accent text-accent' : ''}`}>
                      {index + 1}
                    </div>

                    {/* Skill Binding Menu */}
                    {isBinding && (
                      <div className="skill-bind-menu absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-surface-deep/93 backdrop-blur-md shadow-depth-md z-[100] rounded-none border-none">
                        <div className="p-2 border-b border-border-subtle/40 bg-surface-base/93 backdrop-blur-md rounded-none">
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
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-none text-xs transition-colors
                                  hover:bg-surface-overlay text-text-secondary hover:text-text-primary
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
                          <div className="h-px w-full bg-border-subtle/40 my-1" />
                          <button
                            className="w-full text-left px-2 py-1.5 rounded-none text-xs text-text-secondary hover:bg-surface-overlay hover:text-text-primary transition-colors"
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
            <div className="flex flex-col gap-[8px] mb-[3px]">
              <div className="w-full h-[22px]"></div>

              {/* Health Bar */}
              <div className="relative flex w-full items-center">
                 <div className="relative w-full h-[1.375rem] bg-black/40 overflow-hidden backdrop-blur-md rounded-none">
                    {expectedHealAmount > 0 && (
                      <div 
                        className="absolute top-0 left-0 h-full bg-red-400/70 transition-all duration-75"
                        style={{ width: `${Math.min(100, ((currentHealth + expectedHealAmount) / maxHealth) * 100)}%` }}
                      />
                    )}
                    <div 
                      className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-75"
                      style={{ width: `${Math.min(100, (currentHealth / maxHealth) * 100)}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[1px]">
                      {currentHealth > 0 ? Math.max(1, Math.floor(currentHealth)) : 0}/{maxHealth}
                    </div>
                 </div>
              </div>

              {/* Energy Bar */}
              <div className="relative w-full h-[22px] bg-black/40 overflow-hidden backdrop-blur-md rounded-none">
                 <div 
                   className="absolute top-0 left-0 h-full bg-yellow-500 transition-all duration-300"
                   style={{ width: `${Math.min(100, (currentEnergy / maxEnergy) * 100)}%` }}
                 />
                 <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[0.0625rem]">
                   {Math.floor(currentEnergy)}/{maxEnergy}
                 </div>
              </div>


            </div>

            {/* XP Bar & Level */}
            <div className="flex w-full items-center h-[7px] gap-1">
               <span className="text-[0.75rem] text-white font-bold font-mono [text-shadow:2px_2px_1px_rgba(0,0,0,1)] leading-none shrink-0 -translate-y-[1.5px]">
                 {level}
               </span>
               <div className="relative flex-1 h-[7px] bg-black/40 overflow-hidden opacity-90 backdrop-blur-md rounded-none">
                  <div 
                    className="absolute top-0 left-0 h-full bg-white transition-all duration-300"
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
           <h1 className="text-red-600 font-black text-6xl uppercase tracking-[0.5em] drop-shadow-glow-red-strong mb-8">You Died</h1>
           <p className="text-text-secondary text-lg mb-8 max-w-md text-center">Your run has ended. All dungeon progress and unbanked items have been lost.</p>
           <button 
             onClick={() => {
               setRunState('town');
               useAppStore.getState().setLocation('town');
               usePlayerStore.getState().setTarget(null, true);
               window.location.reload();
             }}
             className="px-8 py-3 bg-surface-deep border border-red-900/50 hover:border-red-500 text-red-500 hover:text-red-400 hover:shadow-glow-red rounded-lg font-bold text-lg transition-all cursor-pointer"
           >
             Respawn in Town
           </button>
        </div>
      )}
      <div className="absolute top-3 left-3 pointer-events-none z-50 flex flex-col gap-2.75 items-start opacity-[0.93] scale-[0.85] origin-top-left">
         <div className="flex items-center gap-2">
           <span className="text-xs font-black tracking-widest text-white bg-zinc-900 px-2 py-0.5 leading-none font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Q E Z C</span>
           <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-left drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Move Diagonal</span>
         </div>
         <div className="flex items-center gap-2">
           <span className="text-xs font-black tracking-widest text-white bg-zinc-900 px-2 py-0.5 leading-none font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">SPACE</span>
           <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-left drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Tactical Pause</span>
         </div>
         <div className="flex items-center gap-2">
           <span className="text-xs font-black tracking-widest text-white bg-zinc-900 px-2 py-0.5 leading-none font-mono drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">TAB</span>
           <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider text-left drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">Cycle Targets</span>
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
              <div className="w-52 bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-depth-md rounded-none px-2 py-1.5 text-left pointer-events-none mb-2">
                <div className="font-bold text-sm text-text-primary mb-1 tracking-tight">Town Portal (B)</div>
                <div className="text-xs text-text-secondary leading-relaxed">
                   Forfeit dungeon and return to town
                </div>
              </div>
            )}
            onMouseLeave={() => setContent(null)}
            className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group transition-all bg-surface-deep/93 rounded-none border shadow-depth-md ${
              castingSkillId === 'portal_skill'
                ? 'border-accent text-accent shadow-ui-glow'
                : 'border-transparent text-text-secondary hover:ring-1 hover:ring-accent'
            }`}
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
            <div className="w-auto bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-depth-md rounded-none px-2 py-1 text-left pointer-events-none mb-2">
              <div className="text-xs text-text-primary leading-relaxed font-bold">
                Inventory (I)
              </div>
            </div>
          )}
          onMouseLeave={() => setContent(null)}
          className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group relative transition-all rounded-none border shadow-depth-md ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'inventory')
              ? 'border-accent bg-surface-deep/93 text-accent font-black shadow-ui-glow'
              : 'border-transparent bg-surface-deep/93 text-text-secondary hover:text-text-primary hover:ring-1 hover:ring-accent'
          }`}
        >
          <Backpack className="w-5 h-5" />
          {attributePoints > 0 && (
             <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 shadow-glow-red animate-pulse z-50" />
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
            <div className="w-auto bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-depth-md rounded-none px-2 py-1 text-left pointer-events-none mb-2">
              <div className="text-xs text-text-primary leading-relaxed font-bold">
                Skills (K)
              </div>
            </div>
          )}
          onMouseLeave={() => setContent(null)}
          className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group relative transition-all rounded-none border shadow-depth-md ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'active_skills')
              ? 'border-accent bg-surface-deep/93 text-accent font-black shadow-ui-glow'
              : 'border-transparent bg-surface-deep/93 text-text-secondary hover:text-text-primary hover:ring-1 hover:ring-accent'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          {activeSkillPoints > 0 && (
             <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 shadow-glow-red animate-pulse z-50" />
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
            <div className="w-auto bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-depth-md rounded-none px-2 py-1 text-left pointer-events-none mb-2">
              <div className="text-xs text-text-primary leading-relaxed font-bold">
                Passives (P)
              </div>
            </div>
          )}
          onMouseLeave={() => setContent(null)}
          className={`w-10 h-10 flex items-center justify-center flex-col gap-0.5 group relative transition-all rounded-none border shadow-depth-md ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'skills')
              ? 'border-accent bg-surface-deep/93 text-accent font-black shadow-ui-glow'
              : 'border-transparent bg-surface-deep/93 text-text-secondary hover:text-text-primary hover:ring-1 hover:ring-accent'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          {passivePoints > 0 && (
             <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 shadow-glow-red animate-pulse z-50" />
          )}
        </button>
      </div>

    </div>
  );
}
