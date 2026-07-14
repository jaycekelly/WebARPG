import { useCombatStore, OUT_OF_COMBAT_MOVE_COOLDOWN_MS } from '../../store/useCombatStore';

export type InputRequest = 
  | { type: 'skill'; skillId: string; targetPos?: { x: number; y: number }; targetId?: string }
  | { type: 'move'; dx: number; dy: number }
  | { type: 'interact'; targetId: string };

import { useStatsStore } from '../../store/useStatsStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { RatingCalculator } from '../stats/RatingCalculator';
import { useWorldStore } from '../../store/useWorldStore';
import { useAppStore } from '../../store/useAppStore';
import { useBuffStore } from '../../store/useBuffStore';
import { SKILLS } from '../../data/skills';
import type { Skill } from '../skills/types';
import { SkillExecutor } from '../skills/executor';
import { hasLineOfSight } from '../world/gridMath';

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export const getEffectiveEnergyCost = (skill: Skill) => {
  const reduction = useStatsStore.getState().getStat('EnergyCostReduction');
  return Math.max(0, Math.floor(skill.energyCost * (1 - (reduction / 100))));
};

export const getEffectiveGcd = (skill: Skill) => {
  const cdrRating = useStatsStore.getState().getStat('CooldownReductionRating');
  const hasteRating = useStatsStore.getState().getStat('HasteRating');
  const playerLevel = usePlayerStore.getState().level;
  
  const cdrPercent = RatingCalculator.getCooldownReduction(cdrRating, playerLevel);
  const hastePercent = RatingCalculator.getHasteReduction(hasteRating, playerLevel);
  
  const baseWithCdr = skill.gcdDuration * (1 - cdrPercent);
  return Math.max(100, Math.floor(baseWithCdr / (1 + hastePercent)));
};

export const getEffectiveCastTime = (skill: Skill) => {
  if (skill.castTime <= 0) return 0;
  const castSpeed = useStatsStore.getState().getStat('CastSpeed');
  return Math.max(100, Math.floor(skill.castTime / (1 + (castSpeed / 100))));
};

export const getMainHandAttackCooldown = () => {
  const weapon = useInventoryStore.getState().equipment['weapon1'];
  const baseWeaponSpeed = weapon?.weaponAttackSpeed || 0.5;
  const attackSpeedBonus = useStatsStore.getState().getStat('AttackSpeed');
  const finalAPS = baseWeaponSpeed * (1 + attackSpeedBonus / 100);
  return 1000 / Math.max(0.1, finalAPS);
};

export const getOffHandAttackCooldown = () => {
  const weapon = useInventoryStore.getState().equipment['weapon2'];
  const baseWeaponSpeed = weapon?.weaponAttackSpeed || 0.5;
  const attackSpeedBonus = useStatsStore.getState().getStat('AttackSpeed');
  const finalAPS = baseWeaponSpeed * (1 + attackSpeedBonus / 100);
  return 1000 / Math.max(0.1, finalAPS);
};

export class InputHandler {
  static readonly SKILL_QUEUE_BUFFER_MS = 500;
  static readonly MOVE_QUEUE_BUFFER_MS = 50;

  static requestAction(action: InputRequest) {
    const now = useAppStore.getState().getGameTime();
    const combatState = useCombatStore.getState();
    
    // Check if free
    if (this.canExecute(action, now, combatState)) {
      this.executeAction(action);
    } else {
      const buffer = action.type === 'move' ? this.MOVE_QUEUE_BUFFER_MS : this.SKILL_QUEUE_BUFFER_MS;
      
      if (action.type === 'skill') {
         const cdEnd = combatState.skillCooldowns[action.skillId];
         const gcdRemaining = combatState.gcdEndTime - now;
         const cdRemaining = cdEnd ? cdEnd - now : 0;
         
         // Only show the "On Cooldown" message when the skill's own cooldown is the actual
         // limiting factor (its remaining time exceeds the GCD's remaining time by more than
         // the queue buffer). If GCD is the equal/larger blocker, or the skill has no real
         // cooldown, this is just normal GCD pacing - silently queue instead of erroring.
         const isCdTheLimitingFactor = !!cdEnd && (cdRemaining - gcdRemaining > buffer);
         
         if (isCdTheLimitingFactor) {
            const pos = usePlayerStore.getState().position;
            combatState.addFloatingText(pos.x, pos.y, 'On Cooldown', { colorClass: 'text-red-400' });
            return; // Drop doomed action
         }
      }

      // Queue it
      const isPaused = useAppStore.getState().isPaused;
      const expiresAt = isPaused ? Infinity : (now + buffer);
      combatState.queueAction({
        ...action,
        expiresAt
      });
    }
  }

  static canExecute(action: InputRequest, now: number, combatState: ReturnType<typeof useCombatStore.getState>) {
    // Only block skills while casting. Movement is allowed to pass through so it can interrupt the cast.
    if (combatState.castingSkillId && action.type !== 'move') return false;
    
    if (action.type === 'move') {
      let moveCooldown: number;
      if (combatState.isInCombat()) {
        const moveSpeed = useStatsStore.getState().getStat('MoveSpeed');
        moveCooldown = 1000 / Math.max(0.1, moveSpeed);
      } else {
        moveCooldown = OUT_OF_COMBAT_MOVE_COOLDOWN_MS;
      }
      return (now - combatState.lastMoveTime) >= moveCooldown;
    } else if (action.type === 'skill') {
      const actionSkill = SKILLS[action.skillId];
      if (!actionSkill?.offGcd && now < combatState.gcdEndTime) return false;
      const cdEnd = combatState.skillCooldowns[action.skillId];
      if (cdEnd && now < cdEnd) return false;
      return true;
    }
    return false;
  }

  static executeAction(action: InputRequest) {
    if (action.type === 'move') {
      usePlayerStore.getState().move(action.dx, action.dy);
    } else if (action.type === 'skill') {
      this.executeSkill(action.skillId, action.targetId, action.targetPos);
    }
  }

  static executeSkill(skillId: string, targetId?: string, targetPos?: {x: number, y: number}) {
    const skill = SKILLS[skillId];
    if (!skill) return;

    const combatState = useCombatStore.getState();
    const playerState = usePlayerStore.getState();



    const worldState = useWorldStore.getState();
    const preTarget = targetId ? worldState.enemies.find(e => e.id === targetId) : undefined;
    if (preTarget && preTarget.isDead) return; // Drop action if target died in queue

    let tId = targetId;
    let tPos = targetPos;

    // Combo Chain Resolution (e.g. Heavy Strike Combo): resolve which chained hit to actually execute
    const isPaused = useAppStore.getState().isPaused;

    let resolvedSkill = skill;
    if (skill.comboChainIds && skill.comboChainIds.length > 0) {
      const now = useAppStore.getState().getGameTime();
      const timeoutMs = skill.comboTimeoutMs || 3000;
      const step = combatState.advanceCombo(now, timeoutMs, skill.comboChainIds.length); // 1-based step
      const chainSkillId = skill.comboChainIds[step - 1];
      const chainSkill = SKILLS[chainSkillId];
      if (chainSkill) {
        resolvedSkill = chainSkill;
      }

      // Combo hits derive their direction/target from the player's current auto-target
      // rather than requiring a manual tile click, so the chain isn't broken by targeting UI.
      // However, if the game is paused, we force manual targeting.
      if (!tId && !tPos && !isPaused) {
        const currentTarget = playerState.activeTargetId
          ? worldState.enemies.find(e => e.id === playerState.activeTargetId && !e.isDead)
          : undefined;
        if (currentTarget) {
          tId = currentTarget.id;
          tPos = { ...currentTarget.position };
        }
      }
    }
    
    // Removed overly-aggressive auto-snap for Ground skills in manual targeting mode.
    // If the user clicks the floor in manual targeting (no tId), they want to aim exactly at the floor.

    // Auto-target the player's current target for skills like Ground Slam, unless there's no
    // current target or the game is in Tactical Pause (manual ground targeting takes over then).
    if (resolvedSkill.autoTargetCurrentEnemy && !tId && !tPos) {
      const currentTarget = (!isPaused && playerState.activeTargetId)
        ? worldState.enemies.find(e => e.id === playerState.activeTargetId && !e.isDead)
        : undefined;
      if (currentTarget) {
        tId = currentTarget.id;
        tPos = { ...currentTarget.position };
      }
    }

    const { addLog, triggerGcd, setCasting } = combatState;
    const { position, currentEnergy } = playerState;

    const target = tId ? worldState.enemies.find(e => e.id === tId) : undefined;

    // Prevent casting Ground/Directional/Area spells directly on solid obstacles
    if (tPos && !target && resolvedSkill.targeting !== 'Self') {
      if (resolvedSkill.targeting === 'Single') {
        combatState.addFloatingText(position.x, position.y, 'No Target', { colorClass: 'text-yellow-400' });
        addLog(`You need a target for ${resolvedSkill.name}.`, 'system');
        combatState.setTargetingSkill(null);
        return;
      }
      const isObstacle = worldState.grid.obstacles.some(o => o.x === tPos!.x && o.y === tPos!.y);
      if (isObstacle) {
        combatState.addFloatingText(position.x, position.y, 'Invalid Target', { colorClass: 'text-yellow-400' });
        addLog(`Cannot target obstacles with ${resolvedSkill.name}.`, 'system');
        combatState.setTargetingSkill(null);
        return;
      }
    }

    // Check Energy
    const effectiveEnergy = getEffectiveEnergyCost(skill);
    if (currentEnergy < effectiveEnergy) {
      combatState.addFloatingText(position.x, position.y, 'Not Enough Energy', { colorClass: 'text-yellow-400' });
      addLog(`Not enough energy for ${skill.name}.`, 'system');
      return;
    }

    // Check Adrenaline
    if (skill.adrenalineCost) {
      const currentAdrenaline = playerState.currentAdrenaline;
      if (currentAdrenaline < skill.adrenalineCost) {
        combatState.addFloatingText(position.x, position.y, 'Not Enough Adrenaline', { colorClass: 'text-yellow-400' });
        addLog(`Not enough adrenaline for ${skill.name}.`, 'system');
        return;
      }
    }

    // Check Required Buff (e.g. Zealous Blow needs its proc window active on the player)
    if (skill.requiresBuffId) {
      const hasRequiredBuff = (useBuffStore.getState().entityBuffs['player'] || []).some(b => b.buffId === skill.requiresBuffId);
      if (!hasRequiredBuff) {
        combatState.addFloatingText(position.x, position.y, 'Not Ready', { colorClass: 'text-yellow-400' });
        addLog(`${skill.name} isn't ready yet.`, 'system');
        return;
      }
    }

    // Combo hits require an active target (they auto-resolve direction from it, not manual clicks)
    if (skill.comboChainIds && skill.comboChainIds.length > 0 && !tId) {
      combatState.addFloatingText(position.x, position.y, 'No Target', { colorClass: 'text-yellow-400' });
      addLog(`You need a target for ${skill.name}.`, 'system');
      combatState.resetCombo();
      return;
    }

    // Enter Targeting Mode if required
    if (!tPos && !tId && (resolvedSkill.targeting === 'Ground' || resolvedSkill.targeting === 'Directional' || resolvedSkill.targeting === 'Area' || resolvedSkill.targeting === 'Single')) {
      if (combatState.targetingSkillId === skill.id) {
        combatState.setTargetingSkill(null);
        return;
      }
      combatState.setTargetingSkill(skill.id);
      return;
    }

    // Check Range if we have a target
    const effectiveRange = resolvedSkill.range > 0 ? resolvedSkill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);

    if (target) {
      const dist = getDistance(position, target.position);
      if (dist > effectiveRange) {
        combatState.addFloatingText(position.x, position.y, 'Out of Range', { colorClass: 'text-yellow-400' });
        return;
      }
    } else if (tPos) {
      const dist = getDistance(position, tPos);
      if (dist > effectiveRange) {
        combatState.addFloatingText(position.x, position.y, 'Out of Range', { colorClass: 'text-yellow-400' });
        return;
      }
    } else if (resolvedSkill.targeting === 'Single' && !target) {
      combatState.addFloatingText(position.x, position.y, 'Need Target', { colorClass: 'text-yellow-400' });
      addLog(`You need a target for ${resolvedSkill.name}.`, 'system');
      return;
    }

    // Check Line of Sight
    if (target || tPos) {
      const checkPos = target ? target.position : tPos!;
      const isSolid = (x: number, y: number) => {
        if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
        return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
      };
      if (!hasLineOfSight(position, checkPos, isSolid)) {
        combatState.addFloatingText(position.x, position.y, 'Obstructed', { colorClass: 'text-yellow-400' });
        addLog(`Line of sight is blocked.`, 'system');
        return;
      }
    }

    // Execute Skill or Start Cast
    const effCastTime = getEffectiveCastTime(resolvedSkill);
    
    // Consume the gating buff (e.g. Zealous Blow's proc window) now that all checks passed
    if (skill.requiresBuffId && skill.consumesRequiredBuff) {
      const buffs = useBuffStore.getState().entityBuffs['player'] || [];
      const readyBuff = buffs.find(b => b.buffId === skill.requiresBuffId);
      if (readyBuff) {
        useBuffStore.getState().removeBuff('player', readyBuff.id);
      }
    }
    
    // Always trigger GCD and Cooldowns immediately upon initiating cast or execution.
    // GCD/cooldown bookkeeping stays keyed on the top-level bound skill (so combo starters
    // remain free/no-CD regardless of which chained hit was resolved).
    if (!skill.offGcd) {
      triggerGcd(getEffectiveGcd(skill));
    }
    if (skill.cooldownMs) {
       combatState.triggerSkillCooldown(skill.id, skill.cooldownMs);
    }
    combatState.setLastAttackAnimationTime(useAppStore.getState().getGameTime());

    if (effCastTime > 0) {
      setCasting(resolvedSkill.id, effCastTime, tId, tPos);
      addLog(`Casting ${resolvedSkill.name}...`, 'system');
    } else {
      SkillExecutor.execute(resolvedSkill, tId, tPos);
    }

    const isCombo = !!(skill.comboChainIds && skill.comboChainIds.length > 0);
    combatState.recordSkillCast(isCombo);

    // Auto-unpause on successful skill cast
    const appState = useAppStore.getState();
    if (appState.isPaused) {
      const shouldUnpause = resolvedSkill.effects.some(e => e.type === 'damage') || 
                            resolvedSkill.tags.includes('Attack') || 
                            resolvedSkill.tags.includes('Movement');
      if (shouldUnpause) {
        appState.setPaused(false);
      }
    }
  }
}
