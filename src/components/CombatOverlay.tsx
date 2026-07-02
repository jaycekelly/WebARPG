import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getEffectiveCastTime, getEffectiveManaCost, getEffectiveGcd } from '../engine/input/InputHandler';
import { hasLineOfSight, getChebyshevDistance } from '../engine/world/gridMath';
import { useStatsStore } from '../store/useStatsStore';
import { useBuffStore } from '../store/useBuffStore';
import { useSkillStore } from '../store/useSkillStore';
import { useAppStore } from '../store/useAppStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { Crosshair, X, Flame, ShieldAlert, Footprints, ArrowUpCircle, Sword, Droplet, FlaskConical, Zap, Backpack, User, BookOpen } from 'lucide-react';
import { useEffect, useState } from 'react';
import { SKILLS } from '../data/skills';

// Map icon strings to actual Lucide components for MVP
const ICONS: Record<string, React.ElementType> = {
  Flame,
  ShieldAlert,
  Footprints,
  ArrowUpCircle,
  Sword,
  Droplet,
  FlaskConical,
  Zap
};

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export function CombatOverlay() {
  const { activeTargetId, setTarget, position, currentMana, currentHealth, level, currentXp, boundSkills, bindSkill, flaskCharges, maxFlaskCharges, useFlask } = usePlayerStore();
  const setContent = useTooltipStore(state => state.setContent);
  const { enemies } = useWorldStore();
  const { gcdEndTime, castingSkillId, castEndTime, skillCooldowns } = useCombatStore();
  const { getStat } = useStatsStore();
  const { entityBuffs } = useBuffStore();
  const { unlockedActives } = useSkillStore();
  const isPaused = useAppStore(state => state.isPaused);
  
  const playerBuffs = entityBuffs['player'] || [];
  const visiblePlayerBuffs = playerBuffs.filter(b => b.maxDurationMs !== null && b.maxDurationMs <= 30000 && b.buffId !== 'flask_recovery');
  
  let expectedHealAmount = 0;
  for (const b of playerBuffs) {
      if (b.isHoT && b.hotHealPerTick && b.durationMs && b.hotTickRateMs) {
          const ticksRemaining = Math.floor(b.durationMs / b.hotTickRateMs);
          expectedHealAmount += ticksRemaining * b.hotHealPerTick;
      }
  }
  
  const maxHealth = getStat('Health');
  const maxMana = getStat('Mana');
  const xpRequired = 100 * Math.pow(level, 2);

  const target = enemies.find(e => e.id === activeTargetId);


  const [now, setNow] = useState(useAppStore.getState().getGameTime());
  const [bindingSlotIndex, setBindingSlotIndex] = useState<number | null>(null);
  
  // Re-render frequently to update the GCD visual sweep smoothly
  useEffect(() => {
    const interval = setInterval(() => setNow(useAppStore.getState().getGameTime()), 50);
    return () => clearInterval(interval);
  }, []);

  // Swing Timer logic
  // const mainHandCooldown = getMainHandAttackCooldown();
  // const offHandCooldown = getOffHandAttackCooldown();
  // const weapon2 = useInventoryStore.getState().equipment['weapon2'];
  // const hasOffHandWeapon = weapon2 && weapon2.itemType !== 'shield';
  // 
  // const timeSinceMainAttack = now - lastMainHandAttackTime;
  // const timeSinceOffAttack = now - lastOffHandAttackTime;
  // 
  // const isMainTimerActive = timeSinceMainAttack < mainHandCooldown;
  // const isOffTimerActive = hasOffHandWeapon && timeSinceOffAttack < offHandCooldown;

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Tab targeting
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent browser UI focus shift
        const playerPos = usePlayerStore.getState().position;
        const TARGET_MAX_DIST_SQ = 10 * 10; // 10 tiles
        const allEnemies = [...useWorldStore.getState().enemies]
          .filter(en => !en.isDead)
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

        const appState = useAppStore.getState();
        const playerState = usePlayerStore.getState();
        const worldState = useWorldStore.getState();
        const combatState = useCombatStore.getState();

        let targetEntity = null;
        if (playerState.activeTargetId) {
          targetEntity = worldState.enemies.find(e => e.id === playerState.activeTargetId);
        }
        
        const now = appState.getGameTime();
        const cdEnd = combatState.skillCooldowns[boundId] || 0;
        if (now < cdEnd) {
           return; // Do not open targeting if skill is on cooldown
        }

        if (!targetEntity || appState.isPaused) {
          combatState.setTargetingSkill(boundId);
        } else {
          InputHandler.requestAction({ type: 'skill', skillId: boundId, targetPos: targetEntity.position, targetId: targetEntity.id });
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



      // Handle Camera Toggle
      if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        usePlayerStore.getState().toggleCameraMode();
      }

      // Handle Flask
      if (e.key.toLowerCase() === 'r') {
        const playerState = usePlayerStore.getState();
        const maxHp = useStatsStore.getState().getStat('Health');
        if (playerState.currentHealth < maxHp && playerState.flaskCharges >= 1) {
           playerState.useFlask();
           useBuffStore.getState().addBuff('player', {
             buffId: 'flask_recovery',
             name: 'Flask Recovery',
             type: 'buff',
             stackingBehavior: 'refresh',
             durationMs: 4000,
             maxDurationMs: 4000,
             stacks: 1,
             maxStacks: 1,
             icon: 'Droplet',
             statModifiers: [],
             isHoT: true,
             hotTickRateMs: 50,
             hotHealPerTick: (maxHp * 0.5) / (4000 / 50)
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
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between px-8 py-4 z-10">
      {isPaused && (
        <div className="absolute inset-0 pointer-events-none ring-[0.5rem] ring-sky-500/30 bg-sky-900/10 z-0 animate-pulse transition-all"></div>
      )}
      
      {/* Target Frame (Top Center) */}
      <div className="flex justify-center pointer-events-none">
        {target && (
          <div className="bg-surface-base border border-border-subtle shadow-2xl rounded-lg p-3 pr-8 flex items-center gap-4 min-w-[17.5rem] relative pointer-events-auto">
            <button onClick={() => setTarget(null)} className="absolute top-3 right-3 text-text-secondary hover:text-text-primary transition-colors">
              <X className="w-4 h-4" />
            </button>
            <div className="w-11 h-11 bg-red-950 rounded border border-red-800 flex items-center justify-center shadow-inner flex-shrink-0">
              <Crosshair className="text-red-500 w-6 h-6 animate-[spin_4s_linear_infinite]" />
            </div>
            <div className="flex-1 flex flex-col justify-center pb-0.5">
              <div className="font-bold text-text-primary text-sm mb-1.5 leading-none">{target.name}</div>
              <div className="relative h-2.5 w-full bg-surface-raised rounded-sm overflow-hidden shadow-inner">
                <div 
                  className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-150 z-20"
                  style={{ width: `${healthPercent}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-[0.625rem] font-bold text-text-primary shadow-black drop-shadow-md pb-[0.0625rem] z-30">
                  {Math.ceil(target.health)} / {target.stats.maxHealth}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* HUD & Action Bar (Bottom Center) */}
      <div className="flex flex-col items-center pointer-events-none gap-1.5 relative">

        {/* Cast Bar — floats high above the action bar */}
        {castingSkillId && castEndTime > 0 && SKILLS[castingSkillId] && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none" style={{ width: '12rem' }}>
            <div className="text-xs text-center text-text-primary mb-1 font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,1)] tracking-wide">
              Casting {SKILLS[castingSkillId].name}...
            </div>
            <div className="h-2 w-full bg-surface-base rounded border border-border-subtle overflow-hidden shadow-lg">
              <div
                className="bg-sky-400 h-full transition-all duration-75"
                style={{ width: `${Math.min(100, Math.max(0, 100 - ((castEndTime - now) / Math.max(1, getEffectiveCastTime(SKILLS[castingSkillId]))) * 100))}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Timers Container */}
        <div className="flex flex-col items-center gap-1 w-64 pointer-events-auto">
          {isPaused && (
            <div className="text-sky-400 font-bold text-xs uppercase tracking-widest animate-pulse drop-shadow-md mb-1">
              Tactical Pause
            </div>
          )}


          {/* Main Hand Swing Timer */}
          {/*
          {isMainTimerActive && (
            <div className="w-full">
              <div className="h-1 w-full bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden shadow-lg">
                <div 
                  className="bg-amber-500 h-full transition-all duration-75"
                  style={{ width: `${Math.max(0, 100 - (timeSinceMainAttack / mainHandCooldown) * 100)}%` }}
                />
              </div>
            </div>
          )}
          */}

          {/* Off-Hand Swing Timer */}
          {/*
          {isOffTimerActive && (
            <div className="w-full">
              <div className="h-1 w-full bg-zinc-900 rounded-sm border border-zinc-800 overflow-hidden shadow-lg">
                <div 
                  className="bg-amber-500 h-full transition-all duration-75"
                  style={{ width: `${Math.max(0, 100 - (timeSinceOffAttack / offHandCooldown) * 100)}%` }}
                />
              </div>
            </div>
          )}
          */}
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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs bg-surface-overlay border border-border-strong rounded p-2 text-xs opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-2xl">
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
        <div className="flex items-end justify-center pointer-events-auto z-40 translate-y-[0.6875rem]">
          
          {/* HP Globe + Flask */}
          <div className="relative shrink-0 z-20 mb-2">
            <div className="absolute -inset-1.5 rounded-full border-t border-border-subtle bg-surface-deep -z-10" />
            <div className="w-32 h-32 rounded-full border border-border-subtle bg-surface-base backdrop-blur-md relative overflow-hidden flex items-center justify-center shadow-lg">
              
              {/* Expected Healing Overlay */}
              <div 
                className="absolute bottom-0 left-0 w-full bg-red-400/30 transition-all duration-75"
                style={{ height: `${Math.min(100, ((currentHealth + expectedHealAmount) / maxHealth) * 100)}%` }}
              />
              <div 
                className="absolute bottom-0 left-0 w-full bg-red-700 transition-all duration-75"
                style={{ height: `${Math.min(100, (currentHealth / maxHealth) * 100)}%` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wider">
                  {Math.floor(currentHealth)}
                </span>
              </div>
            </div>

            {/* Flask Button */}
            <div className="absolute -bottom-0 -left-4 z-30">
               <button 
                 className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all focus:outline-none focus:ring-0
                   ${flaskCharges >= 1 ? 'bg-zinc-900 border-border-subtle hover:border-border-strong hover:bg-zinc-800' : 'bg-zinc-900 border-border-subtle cursor-not-allowed'}
                 `}
                 onClick={() => {
                   if (currentHealth < maxHealth && flaskCharges >= 1) {
                      useFlask();
                      useBuffStore.getState().addBuff('player', {
                        buffId: 'flask_recovery',
                        name: 'Flask Recovery',
                        type: 'buff',
                        stackingBehavior: 'refresh',
                        durationMs: 4000,
                        maxDurationMs: 4000,
                        stacks: 1,
                        maxStacks: 1,
                        icon: 'FlaskConical',
                        statModifiers: [],
                        isHoT: true,
                        hotTickRateMs: 50,
                        hotHealPerTick: (maxHealth * 0.5) / (4000 / 50)
                      });
                      
                      useCombatStore.getState().addLog('Used Healing Flask.', 'system');
                   }
                 }}
                 onMouseEnter={() => setContent(
                  <div className="w-52 bg-surface-overlay border border-border-strong rounded-lg shadow-2xl px-2 py-1.5 text-left pointer-events-none">
                    <div className="font-bold text-red-400 mb-1">
                      Healing Flask
                    </div>
                    <div className="text-[0.625rem] text-text-secondary pb-1 mb-1 border-b border-border-subtle uppercase tracking-widest">
                      {Math.floor(flaskCharges)} / {maxFlaskCharges} charges
                    </div>
                    <div className="text-xs text-text-primary leading-snug mb-1">
                      Restores <span className="text-red-400 font-bold">50%</span> of your maximum health over <span className="text-text-primary font-bold">4 seconds</span>.
                    </div>
                    <div className="text-[0.625rem] text-text-secondary leading-snug mt-1 pt-1 border-t border-border-subtle">
                      Recharges by killing monsters.
                    </div>
                  </div>
                )}
                onMouseLeave={() => setContent(null)}
               >
                  <FlaskConical className="w-5 h-5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] z-10" />
                  <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[0.75rem] font-black text-text-primary z-10 px-1">{Math.floor(flaskCharges)}</span>
                   <span className="absolute top-1/2 -left-4 -translate-y-1/2 text-[0.625rem] font-bold text-text-secondary z-10 px-1.5 bg-surface-deep rounded border border-border-subtle">{`R`}</span>
               </button>
            </div>
          </div>

          {/* Center Console (XP + Action Bar + Hotkeys) */}
          <div className="flex flex-col mx-4 z-10 w-fit gap-1 relative">
            

            {/* XP Bar */}
            <div className="flex items-center w-full px-1.5 relative mb-[-0.125rem]">
               <div className="absolute left-2 -top-5 z-20">
                  <span className="text-[0.75rem] text-white font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                     {level}
                  </span>
               </div>
               <div className="relative flex-1 h-[0.5rem] bg-surface-deep overflow-hidden border border-border-subtle rounded-sm w-full">
                  <div 
                    className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentXp / xpRequired) * 100)}%` }}
                  />
               </div>
            </div>


            {/* Action Bar Container (Only wraps skills) */}
            <div className="px-1.5 py-1.5 flex gap-1.5 relative">
              <div className="absolute -top-[1.0625rem] bottom-0 -left-[0.0625rem] -right-[0.0625rem] -z-10 bg-surface-deep border-t border-border-subtle rounded-md" />
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
                            <div className="w-48 bg-surface-overlay border border-border-strong rounded-lg shadow-2xl px-2 py-1.5 text-left pointer-events-none">
                              <div className="font-bold text-sky-400 mb-1">{skill.name}</div>
                              <div className="flex justify-between text-[0.625rem] text-text-secondary mb-2 pb-1 border-b border-border-subtle uppercase tracking-widest">
                                 <span>{skill.range > 0 ? `Range ${skill.range}` : 'Melee'}</span>
                                 <span>{getEffectiveManaCost(skill)} Mana</span>
                              </div>
                              {skill.effects.some(e => e.type === 'damage') && (
                                <div className="mb-2 pb-2 border-b border-border-subtle">
                                  {skill.effects.filter(e => e.type === 'damage').map((effect, i) => (
                                    <div key={i} className="text-xs font-bold text-text-secondary">
                                      {effect.baseValue} {effect.element} Damage
                                    </div>
                                  ))}
                                </div>
                              )}

                              <div className="text-xs text-text-primary leading-snug mb-2">
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
                    </button>

                    {/* Skill Binding Menu */}
                    {isBinding && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 bg-surface-base border border-border-strong rounded-lg shadow-xl z-50">
                        <div className="p-2 border-b border-border-subtle bg-surface-base rounded-t-lg">
                          <h3 className="text-xs font-bold text-accent">Bind Skill to Slot {index + 1}</h3>
                        </div>
                        <div className="p-1 max-h-48 overflow-y-auto">
                          {unlockedActives.map(actId => {
                            const act = SKILLS[actId];
                            if (!act) return null;
                            const ActIcon = ICONS[act.icon] || Flame;
                            const isBound = boundSkills.includes(act.id);
                            return (
                              <button
                                key={act.id}
                                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors
                                  ${isBound ? 'opacity-50 cursor-not-allowed text-text-muted' : 'hover:bg-surface-raised text-text-secondary hover:text-text-primary'}
                                `}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!isBound) {
                                    bindSkill(index, act.id);
                                    setBindingSlotIndex(null);
                                  }
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

             {/* Keybind Boxes underneath (Floating on their own) */}
            <div className="flex gap-1.5 justify-center -mt-[0.0625rem]">
               {boundSkills.slice(0, 8).map((_, index) => (
                  <div key={`keybind-${index}`} className="w-12 flex justify-center">
                      <span className="bg-surface-deep border border-border-subtle text-[0.625rem] font-bold text-text-secondary px-2 py-0.5 rounded">
                       {index + 1}
                     </span>
                  </div>
               ))}
            </div>
          </div>

          {/* MP Globe */}
          <div className="relative shrink-0 z-20 mb-2">
            <div className="absolute -inset-1.5 rounded-full border-t border-border-subtle bg-surface-deep -z-10" />
            <div className="w-32 h-32 rounded-full border border-border-subtle bg-surface-base backdrop-blur-md relative overflow-hidden flex items-center justify-center shadow-lg">
              <div 
                className="absolute bottom-0 left-0 w-full bg-blue-700 transition-all duration-300"
                style={{ height: `${Math.min(100, (currentMana / maxMana) * 100)}%` }}
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-sm font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-wider">
                  {Math.floor(currentMana)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      {/* Camera Toggle Button */}
      <div className="absolute top-3 right-3 pointer-events-auto z-50">
         <button 
           onClick={() => usePlayerStore.getState().toggleCameraMode()}
           className="px-3 py-1.5 bg-surface-base border border-border-subtle text-xs font-semibold text-text-secondary hover:text-accent hover:border-accent rounded shadow-md transition-colors"
         >
           Camera: {usePlayerStore(state => state.cameraMode) === 'auto' ? 'Auto (Y)' : 'Free (Y)'}
         </button>
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
          className="w-12 h-12 bg-surface-base border border-border-subtle text-text-secondary hover:text-accent hover:border-accent rounded-xl shadow-lg transition-colors flex items-center justify-center flex-col gap-0.5 group"
          title="Inventory (I)"
        >
          <Backpack className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[0.5625rem] font-bold">INV</span>
        </button>

        <button 
          onClick={() => {
            const appState = useAppStore.getState();
            if (appState.characterWindowOpen && appState.characterWindowTab === 'stats') {
              appState.setCharacterWindowOpen(false);
            } else {
              appState.setCharacterWindowTab('stats');
              appState.setCharacterWindowOpen(true);
            }
          }}
          className="w-12 h-12 bg-surface-base border border-border-subtle text-text-secondary hover:text-accent hover:border-accent rounded-xl shadow-lg transition-colors flex items-center justify-center flex-col gap-0.5 group relative"
          title="Character Stats (C)"
        >
          <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[0.5625rem] font-bold">CHAR</span>
          {usePlayerStore(state => state.attributePoints) > 0 && (
             <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-[0.625rem] font-bold flex items-center justify-center border-2 border-zinc-950 animate-pulse">
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
          className="w-12 h-12 bg-surface-base border border-border-subtle text-text-secondary hover:text-accent hover:border-accent rounded-xl shadow-lg transition-colors flex items-center justify-center flex-col gap-0.5 group relative"
          title="Skills"
        >
          <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span className="text-[0.5625rem] font-bold">SKILLS</span>
          {usePlayerStore(state => state.skillPoints) > 0 && (
             <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-600 text-white rounded-full text-[0.625rem] font-bold flex items-center justify-center border-2 border-zinc-950 animate-pulse">
               {usePlayerStore.getState().skillPoints}
             </span>
          )}
        </button>
      </div>

    </div>
  );
}
