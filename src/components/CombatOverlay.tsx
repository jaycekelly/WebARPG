import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getEffectiveCastTime, getEffectiveManaCost, getEffectiveGcd, getMainHandAttackCooldown, getOffHandAttackCooldown } from '../engine/input/InputHandler';
import { hasLineOfSight, getChebyshevDistance } from '../engine/world/gridMath';
import { useStatsStore } from '../store/useStatsStore';
import { useBuffStore } from '../store/useBuffStore';
import { useSkillStore } from '../store/useSkillStore';
import { useAppStore } from '../store/useAppStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { useVisionStore } from '../store/useVisionStore';
import { useMessageStore } from '../store/useMessageStore';
import { FlaskConical, X, Flame, ArrowUpCircle, Backpack, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SKILLS } from '../data/skills';

import { ICONS } from './IconLibrary';

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export function CombatOverlay() {
  const { activeTargetId, setTarget, position, currentMana, currentHealth, level, currentXp, boundSkills, bindSkill, lastFlaskTime, useFlask, lastManaFlaskTime, useManaFlask } = usePlayerStore();
  const setContent = useTooltipStore(state => state.setContent);
  const { enemies } = useWorldStore();
  const { gcdEndTime, castingSkillId, castEndTime, skillCooldowns, lastMainHandAttackTime, lastOffHandAttackTime } = useCombatStore();
  const { getStat } = useStatsStore();
  const { entityBuffs } = useBuffStore();
  const { unlockedActives } = useSkillStore();
  const { messages } = useMessageStore();
  
  const playerBuffs = entityBuffs['player'] || [];
  const visiblePlayerBuffs = playerBuffs.filter(b => b.maxDurationMs !== null && b.maxDurationMs <= 30000 && b.buffId !== 'flask_recovery' && b.buffId !== 'mana_flask_recovery');
  
  let expectedHealAmount = 0;
  let expectedManaAmount = 0;
  for (const b of playerBuffs) {
      if (b.isHoT && b.hotHealPerTick && b.durationMs && b.hotTickRateMs) {
          const ticksRemaining = Math.floor(b.durationMs / b.hotTickRateMs);
          expectedHealAmount += ticksRemaining * b.hotHealPerTick;
      }
      if (b.buffId === 'mana_flask_recovery' && b.isHoT && b.hotManaPerTick && b.durationMs && b.hotTickRateMs) {
          const ticksRemaining = Math.floor(b.durationMs / b.hotTickRateMs);
          expectedManaAmount += ticksRemaining * b.hotManaPerTick;
      }
  }
  
  const maxHealth = getStat('Health');
  const maxMana = getStat('Mana');
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
        // If no bind slot open, let App.tsx handle Esc (cast cancel, targeting, windows, etc.)
        return;
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

      // Handle Mana Flask
      if (e.key.toLowerCase() === 't') {
        const playerState = usePlayerStore.getState();
        const maxMp = useStatsStore.getState().getStat('Mana');
        if (playerState.currentMana < maxMp && playerState.useManaFlask()) {
           useBuffStore.getState().addBuff('player', {
             buffId: 'mana_flask_recovery',
             name: 'Mana Flask Recovery',
             type: 'buff',
             stackingBehavior: 'refresh',
             durationMs: 3000,
             maxDurationMs: 3000,
             stacks: 1,
             maxStacks: 1,
             icon: 'Zap',
             statModifiers: [],
             isHoT: true,
             hotTickRateMs: 50,
             hotManaPerTick: (maxMp * 0.5) / (3000 / 50)
           });
           
           useCombatStore.getState().addLog('Used Mana Flask.', 'system');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthPercent = target ? (target.health / target.stats.maxHealth) * 100 : 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-8 py-4 z-10">
      {/* Target Frame (Top Center) */}
      <div className="flex justify-center pointer-events-none">
        {target && (
          <div className="bg-surface-deep border-2 border-red-500/40 shadow-[0_0_20px_rgba(239,68,68,0.15)] rounded-lg pt-1.5 pb-2.5 px-2 flex flex-col items-center w-fit relative pointer-events-auto animate-[fadeIn_0.3s_ease-out]">
            <button onClick={() => setTarget(null, true)} className="absolute top-1 right-1 text-text-secondary hover:text-text-primary transition-colors z-40">
              <X className="w-3 h-3" />
            </button>
            <div className="flex-col justify-center w-[13.1875rem]">
              <div className="font-bold text-text-primary text-sm mb-1.5 leading-none text-center">{target.name}</div>
              <div className="relative h-[0.875rem] w-full bg-surface-deep rounded-[0.125rem] overflow-hidden border border-border-subtle shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full transition-all duration-150 border-r border-red-950 z-20"
                  style={{ 
                    width: `${healthPercent}%`,
                    background: 'linear-gradient(to bottom, #dc2626 0%, #dc2626 50%, #991b1b 50%, #991b1b 100%)'
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none z-30 font-mono tracking-widest pt-[0.0625rem]">
                  {Math.floor(target.health)}/{target.stats.maxHealth}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Screen Messages (Type 2 and 3) */}
      {messages.map((msg, _, arr) => {
         const hasTopMessage = arr.some(m => m.type === 'top');
         if (msg.type === 'above') {
           const isLevelUp = msg.text.includes('Level Up');
           const mtClass = hasTopMessage ? '-mt-[18rem]' : '-mt-[14rem]';
           return (
             <div key={msg.id} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${mtClass} pointer-events-none z-50 flex flex-col items-center ${isLevelUp ? 'animate-[levelUpFade_3s_ease-in-out_forwards]' : 'animate-in fade-in slide-in-from-bottom-2 duration-500'}`}>
               <span className={isLevelUp ? "text-accent font-black text-2xl uppercase tracking-[0.2em] drop-shadow-[0_0_12px_rgba(56,189,248,0.8)]" : "text-amber-500 font-bold text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"}>
                 {msg.text}
               </span>
             </div>
           );
         }
         if (msg.type === 'top') {
           const isPause = msg.text === 'TACTICAL PAUSE';
           return (
             <div key={msg.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -mt-[14rem] pointer-events-none z-50 flex flex-col items-center animate-in slide-in-from-top-2 fade-in duration-300">
               <span className={isPause ? "text-accent font-black text-base uppercase tracking-widest animate-pulse drop-shadow-lg" : "text-amber-500 font-bold text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,1)]"}>
                 {msg.text}
               </span>
             </div>
           );
         }
         if (msg.type === 'below') {
           return (
             <div key={msg.id} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-[11rem] pointer-events-none z-50 flex flex-col items-center animate-in slide-in-from-top-2 fade-in duration-300">
               <span className="text-text-primary italic text-sm drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                 {msg.text}
               </span>
             </div>
           );
         }
         return null;
      })}

      {/* HUD & Action Bar (Bottom Center) */}
      <div className="flex flex-col items-center pointer-events-none gap-1.5 relative">
        {/* Dynamic Floating Bars (Cast Bar, Swing Timers) */}
        <div className="absolute bottom-[calc(100%+5rem)] left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none" style={{ width: '10rem' }}>
          
          {/* Cast Bar (Top) */}
          {castingSkillId && castEndTime > 0 && SKILLS[castingSkillId] && (
            <div className="flex flex-col items-center w-[6.666rem] mb-1">
              <div className="text-xs text-center whitespace-nowrap text-text-primary mb-0.5 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wide">
                {SKILLS[castingSkillId].name}
              </div>
              <div className="h-3.5 w-full bg-surface-deep rounded-[0.125rem] border border-border-subtle overflow-hidden shadow-inner">
                <div
                  className="h-full transition-all duration-75 border-r border-[#6b21a8]"
                  style={{ 
                    width: `${Math.min(100, Math.max(0, 100 - ((castEndTime - now) / Math.max(1, getEffectiveCastTime(SKILLS[castingSkillId]))) * 100))}%`,
                    background: 'linear-gradient(to bottom, #a855f7 0%, #a855f7 50%, #9333ea 50%, #9333ea 100%)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Main Hand Swing Timer (Middle) */}
          {isMainTimerActive && (
            <div className="h-1.5 w-full bg-surface-deep rounded-[0.125rem] border border-border-subtle overflow-hidden shadow-inner">
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
            <div className="h-1.5 w-full bg-surface-deep rounded-[0.125rem] border border-border-subtle overflow-hidden shadow-inner opacity-80">
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

        {/* HUD Assembly (Flat Minimalist) */}
        <div className="flex flex-col items-center justify-end pointer-events-auto z-40 translate-y-2.5 gap-2.5">
          


          {/* Center Console (XP + Action Bar + Hotkeys) */}
          <div className="flex flex-col mx-auto z-30 w-fit gap-1.5 relative bg-surface-deep p-1.5 rounded-lg shadow-2xl">

            {/* Flask Button (Moved to absolute left of Health Bar) */}
            <div className="absolute -top-[0.1875rem] -left-10 z-30">
               <button 
                 className={`relative w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden transition-all focus:outline-none focus:ring-0
                   ${now - lastFlaskTime >= 30000 ? 'bg-surface-deep border-border-subtle hover:border-accent' : 'bg-surface-deep border-border-subtle cursor-not-allowed opacity-80'}
                 `}
                 onClick={() => {
                   if (currentHealth < maxHealth && useFlask()) {
                      useBuffStore.getState().addBuff('player', {
                        buffId: 'flask_recovery',
                        name: 'Flask Recovery',
                        type: 'buff',
                        stackingBehavior: 'refresh',
                        durationMs: 3000,
                        maxDurationMs: 3000,
                        stacks: 1,
                        maxStacks: 1,
                        icon: 'FlaskConical',
                        statModifiers: [],
                        isHoT: true,
                        hotTickRateMs: 50,
                        hotHealPerTick: (maxHealth * 0.5) / (3000 / 50)
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
                      Restores <span className="text-red-400 font-bold">50%</span> of your maximum health over <span className="text-text-primary font-bold">3 seconds</span>.
                    </div>
                  </div>
                )}
                onMouseLeave={() => setContent(null)}
               >
                  <FlaskConical className="w-4 h-4 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10" />
                  {now - lastFlaskTime < 30000 && (
                     <div 
                       className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                       style={{ background: `conic-gradient(transparent ${100 - ((30000 - (now - lastFlaskTime)) / 30000) * 100}%, rgba(0,0,0,0.7) 0)` }}
                     >
                       <span className="text-white font-bold text-[0.625rem] z-30 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                         {((30000 - (now - lastFlaskTime)) / 1000).toFixed(1)}
                       </span>
                     </div>
                  )}
               </button>
               <span className="absolute -bottom-1 left-0 text-[0.6875rem] font-bold text-white z-30 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{`R`}</span>
            </div>
            
            {/* Mana Flask Button (Moved to absolute right of Action Bar) */}
            <div className="absolute -top-[0.1875rem] -right-10 z-30">
               <button 
                 className={`relative w-8 h-8 rounded-full border flex items-center justify-center overflow-hidden transition-all focus:outline-none focus:ring-0
                   ${now - lastManaFlaskTime >= 30000 ? 'bg-surface-deep border-border-subtle hover:border-accent' : 'bg-surface-deep border-border-subtle cursor-not-allowed opacity-80'}
                 `}
                 onClick={() => {
                   if (currentMana < maxMana && useManaFlask()) {
                      useBuffStore.getState().addBuff('player', {
                        buffId: 'mana_flask_recovery',
                        name: 'Mana Flask Recovery',
                        type: 'buff',
                        stackingBehavior: 'refresh',
                        durationMs: 3000,
                        maxDurationMs: 3000,
                        stacks: 1,
                        maxStacks: 1,
                        icon: 'Zap',
                        statModifiers: [],
                        isHoT: true,
                        hotTickRateMs: 50,
                        hotManaPerTick: (maxMana * 0.5) / (3000 / 50)
                      });
                      
                      useCombatStore.getState().addLog('Used Mana Flask.', 'system');
                   }
                 }}
                 onMouseEnter={() => setContent(
                  <div className="w-52 bg-surface-overlay border border-border-strong rounded-lg shadow-2xl px-2 py-1 text-left pointer-events-none backdrop-blur-md">
                    <div className="font-bold text-blue-400 mb-1">
                      Mana Flask
                    </div>
                    <div className="text-[0.625rem] text-text-secondary pb-1 mb-1 border-b border-border-subtle uppercase tracking-widest">
                      30.0 CD
                    </div>
                    <div className="text-xs text-text-primary leading-snug mb-1">
                      Restores <span className="text-blue-400 font-bold">50%</span> of your maximum mana over <span className="text-text-primary font-bold">3 seconds</span>.
                    </div>
                  </div>
                )}
                onMouseLeave={() => setContent(null)}
               >
                  <FlaskConical className="w-4 h-4 text-blue-500 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] z-10" />
                  {now - lastManaFlaskTime < 30000 && (
                     <div 
                       className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                       style={{ background: `conic-gradient(transparent ${100 - ((30000 - (now - lastManaFlaskTime)) / 30000) * 100}%, rgba(0,0,0,0.7) 0)` }}
                     >
                       <span className="text-white font-bold text-[0.625rem] z-30 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                         {((30000 - (now - lastManaFlaskTime)) / 1000).toFixed(1)}
                       </span>
                     </div>
                  )}
               </button>
               <span className="absolute -bottom-1 left-0 text-[0.6875rem] font-bold text-white z-30 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{`T`}</span>
            </div>
            
            {/* Health & Mana Bars */}
            <div className="flex w-full gap-1 relative z-20 mb-0.5">
               {/* Health Bar (slots 1-4) */}
               <div className="relative flex-1 h-[0.875rem] bg-surface-deep border border-border-subtle overflow-hidden rounded-[0.125rem]">
                  {expectedHealAmount > 0 && (
                    <div 
                      className="absolute top-0 left-0 h-full bg-red-400/70 border-r border-red-300/50 transition-all duration-75"
                      style={{ width: `${Math.min(100, ((currentHealth + expectedHealAmount) / maxHealth) * 100)}%` }}
                    />
                  )}
                  <div 
                    className="absolute top-0 left-0 h-full transition-all duration-75 border-r border-red-950"
                    style={{ 
                      width: `${Math.min(100, (currentHealth / maxHealth) * 100)}%`,
                      background: 'linear-gradient(to bottom, #dc2626 0%, #dc2626 50%, #991b1b 50%, #991b1b 100%)'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[0.0625rem]">
                    {Math.floor(currentHealth)}/{maxHealth}
                  </div>
               </div>
               {/* Mana Bar (slots 5-8) */}
               <div className="relative flex-1 h-[0.875rem] bg-surface-deep border border-border-subtle overflow-hidden rounded-[0.125rem]">
                  {expectedManaAmount > 0 && (
                    <div 
                      className="absolute top-0 left-0 h-full bg-blue-400/70 border-r border-blue-300/50 transition-all duration-75"
                      style={{ width: `${Math.min(100, ((currentMana + expectedManaAmount) / maxMana) * 100)}%` }}
                    />
                  )}
                  <div 
                    className="absolute top-0 left-0 h-full transition-all duration-300 border-r border-blue-950"
                    style={{ 
                      width: `${Math.min(100, (currentMana / maxMana) * 100)}%`,
                      background: 'linear-gradient(to bottom, #2563eb 0%, #2563eb 50%, #1e40af 50%, #1e40af 100%)'
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-[0.65rem] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,1)] leading-none z-10 font-mono tracking-widest pt-[0.0625rem]">
                    {Math.floor(currentMana)}/{maxMana}
                  </div>
               </div>
            </div>


            {/* Action Bar Container (Only wraps skills) */}
            <div className="flex gap-1.5 relative">
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
                
                if (timeUntilSkillFree > timeUntilGcdFree) {
                    activePercent = skill && skill.cooldownMs ? (timeUntilSkillFree / skill.cooldownMs) * 100 : 0;
                    onCooldown = true;
                } else if (timeUntilGcdFree > 0) {
                    activePercent = skill ? (timeUntilGcdFree / getEffectiveGcd(skill)) * 100 : 0;
                    onCooldown = true;
                }

                const isOnGcd = timeUntilGcdFree > 0 && timeUntilGcdFree >= timeUntilSkillFree;
                
                const isCastingThis = castingSkillId === skillId;
                let castPercent = 0;
                if (isCastingThis && skill && skill.castTime) {
                   const elapsed = now - (castEndTime - skill.castTime);
                   castPercent = Math.min(100, (elapsed / skill.castTime) * 100);
                }

                return (
                  <div key={index} className="relative">
                    <button
                      className={`relative w-12 h-12 flex items-center justify-center rounded-lg border transition-all overflow-hidden bg-surface-base focus:outline-none focus:ring-0
                        ${isBinding ? 'border-accent bg-surface-raised animate-pulse' : 'border-border-subtle hover:border-border-strong hover:bg-surface-raised'}
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
                              <div className="flex justify-between text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest">
                                 <span>{getEffectiveManaCost(skill)} Mana</span>
                                 <span>{skill.cooldownMs ? `${(skill.cooldownMs / 1000).toFixed(1)} CD` : 'No CD'}</span>
                              </div>
                              <div className="flex justify-between text-[0.625rem] text-text-secondary mb-1 pb-1 border-b border-border-subtle uppercase tracking-widest">
                                 <span>{skill.range > 0 ? `Range ${skill.range}` : 'Melee'}</span>
                                 <span>{skill.castTime ? `${(getEffectiveCastTime(skill) / 1000).toFixed(1)} Cast` : 'Instant'}</span>
                              </div>
                              {skill.effects.some(e => e.type === 'damage') && (
                                <div className="mb-1 pb-1 border-b border-border-subtle space-y-0.5">
                                  {skill.effects.filter(e => e.type === 'damage').map((effect, i) => {
                                    const weaponDamage = useStatsStore.getState().getStat('Damage');
                                    const weaponType = (useInventoryStore.getState().equipment['weapon1'] as any)?.damageType || 'Physical';
                                    const mult = effect.damageMultiplier || 0;
                                    const base = effect.baseValue || 0;
                                    const totalAvg = base + (weaponDamage * mult);
                                    const el = effect.element || (mult > 0 ? weaponType : 'Physical');
                                    
                                    if (skill.id === 'basic_attack') {
                                      const min = Math.floor(totalAvg * 0.75);
                                      const max = Math.ceil(totalAvg * 1.25);
                                      return (
                                        <div key={i} className="text-xs font-bold text-text-secondary">
                                          {min} - {max} {el} Damage
                                        </div>
                                      );
                                    }
                                    
                                    return (
                                      <div key={i} className="text-xs font-bold text-text-secondary">
                                        {Math.floor(totalAvg)} {el} Damage
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              <div className="text-xs text-text-primary leading-snug">
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
                        <div className={`relative z-10 w-full h-full flex items-center justify-center ${outOfRange ? 'opacity-50' : ''}`}>
                          <IconComponent className={`w-7 h-7 drop-shadow-md text-sky-400`} />
                        </div>
                      ) : null}

                      {/* Cooldown Overlay */}
                      {onCooldown && skill && (
                        <div 
                           className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none"
                           style={{ background: `conic-gradient(transparent ${100 - activePercent}%, rgba(0,0,0,0.7) 0)` }}
                        >
                            <span className="text-white font-bold text-[0.625rem] z-30 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                               {(Math.max(timeUntilSkillFree, timeUntilGcdFree) / 1000).toFixed(1)}
                            </span>
                           {isOnGcd && (
                              <div className="absolute inset-0 border-2 border-border-strong/50 rounded-lg animate-pulse pointer-events-none" />
                           )}
                        </div>
                      )}
                      
                      {/* Casting Overlay */}
                      {isCastingThis && skill && (
                        <div className="absolute inset-0 bg-sky-900/40 z-20 overflow-hidden border border-sky-400/50">
                           <div 
                             className="absolute bottom-0 left-0 w-full bg-sky-400/30 transition-none" 
                             style={{ height: `${castPercent}%` }} 
                           />
                        </div>
                      )}
                      
                      {/* Keybind */}
                      <span className="absolute bottom-0 left-0.5 text-xs font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)] z-30 pointer-events-none">
                        {index + 1}
                      </span>
                    </button>

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

          {/* XP Bar (Independent) */}
          <div className="flex items-center w-[19.875rem] relative z-20 gap-1.5">
             <span className="text-xs text-white font-bold font-mono drop-shadow-[0_1px_2px_rgba(0,0,0,1)] relative -top-[1px] -mt-[0.0625rem]">
               {level}
             </span>
             <div className="relative flex-1 h-[0.375rem] bg-surface-deep overflow-hidden border border-border-subtle rounded-sm w-full shadow-inner opacity-90">
                <div 
                  className={`absolute top-0 left-0 h-full transition-all duration-300 ${currentXp > 0 ? 'border-r border-[#164e63]' : ''}`}
                  style={{ 
                    width: `${Math.min(100, (currentXp / xpRequired) * 100)}%`,
                    background: 'linear-gradient(to bottom, #22d3ee 0%, #22d3ee 50%, #0891b2 50%, #0891b2 100%)'
                  }}
                />
             </div>
          </div>

          {/* MP Globe Removed */}
        </div>
      </div>
      {/* Control Hints (Bottom Left) */}
      <div className="absolute bottom-3 left-3 pointer-events-none z-50 flex flex-col gap-1 items-start opacity-75">
         <div className="bg-surface-deep/80 border border-border-subtle rounded-md px-1.5 py-1 backdrop-blur-sm flex items-center gap-2 shadow-md">
           <span className="text-[0.55rem] font-black tracking-widest text-text-primary bg-surface-raised border border-border-strong rounded px-1.5 py-0.5 shadow-sm leading-none font-mono">Q E Z C</span>
           <span className="text-[0.65rem] font-bold text-text-secondary uppercase tracking-wider">Move Diagonal</span>
         </div>
         <div className="bg-surface-deep/80 border border-border-subtle rounded-md px-1.5 py-1 backdrop-blur-sm flex items-center gap-2 shadow-md">
           <span className="text-[0.55rem] font-black tracking-widest text-text-primary bg-surface-raised border border-border-strong rounded px-1.5 py-0.5 shadow-sm leading-none font-mono">R, T</span>
           <span className="text-[0.65rem] font-bold text-text-secondary uppercase tracking-wider">Flasks</span>
         </div>
         <div className="bg-surface-deep/80 border border-border-subtle rounded-md px-1.5 py-1 backdrop-blur-sm flex items-center gap-2 shadow-md">
           <span className="text-[0.55rem] font-black tracking-widest text-text-primary bg-surface-raised border border-border-strong rounded px-1.5 py-0.5 shadow-sm leading-none font-mono">TAB</span>
           <span className="text-[0.65rem] font-bold text-text-secondary uppercase tracking-wider">Cycle Targets</span>
         </div>
         <div className="bg-surface-deep/80 border border-border-subtle rounded-md px-1.5 py-1 backdrop-blur-sm flex items-center gap-2 shadow-md">
           <span className="text-[0.55rem] font-black tracking-widest text-text-primary bg-surface-raised border border-border-strong rounded px-1.5 py-0.5 shadow-sm leading-none font-mono">SPACE</span>
           <span className="text-[0.65rem] font-bold text-text-secondary uppercase tracking-wider">Tactical Pause</span>
         </div>
      </div>
      
      {/* UI Window Toggles (Bottom Right) */}
      <div className="absolute bottom-3 right-3 pointer-events-auto z-50 flex gap-2">
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
          className={`w-10 h-10 border rounded-xl shadow-lg transition-colors flex items-center justify-center flex-col gap-0.5 group ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'inventory')
              ? 'text-accent border-accent bg-surface-deep'
              : 'bg-surface-deep border-border-subtle text-text-secondary hover:text-accent hover:border-accent'
          }`}
          title="Inventory (I)"
        >
          <Backpack className="w-5 h-5" />
          {usePlayerStore(state => state.attributePoints) > 0 && (
             <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-[0.625rem] font-bold flex items-center justify-center border-2 border-zinc-950 animate-pulse z-50">
               {usePlayerStore.getState().attributePoints}
             </span>
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
          className={`w-10 h-10 border rounded-xl shadow-lg transition-colors flex items-center justify-center flex-col gap-0.5 group relative ${
            useAppStore(s => s.characterWindowOpen && s.characterWindowTab === 'skills')
              ? 'text-accent border-accent bg-surface-deep'
              : 'bg-surface-deep border-border-subtle text-text-secondary hover:text-accent hover:border-accent'
          }`}
          title="Skills"
        >
          <BookOpen className="w-5 h-5" />
          {usePlayerStore(state => state.skillPoints) > 0 && (
             <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-[0.625rem] font-bold flex items-center justify-center border-2 border-zinc-950 animate-pulse z-50">
               {usePlayerStore.getState().skillPoints}
             </span>
          )}
        </button>
      </div>

    </div>
  );
}
