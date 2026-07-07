import { useCombatStore } from '../../store/useCombatStore';

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
import { SKILLS } from '../../data/skills';
import type { Skill } from '../skills/types';
import { SkillExecutor } from '../skills/executor';
import { hasLineOfSight } from '../world/gridMath';

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export const getEffectiveManaCost = (skill: Skill) => {
  const reduction = useStatsStore.getState().getStat('ManaCostReduction');
  return Math.max(0, Math.floor(skill.manaCost * (1 - (reduction / 100))));
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
         const isCdDoomed = cdEnd && (cdEnd - now > buffer);
         const isGcdDoomed = (combatState.gcdEndTime - now > buffer);
         
         if (isCdDoomed || isGcdDoomed) {
            const pos = usePlayerStore.getState().position;
            combatState.addFloatingText(pos.x, pos.y, 'On Cooldown', { colorClass: 'text-red-400' });
            return; // Drop doomed action
         }
      }

      // Queue it
      combatState.queueAction({
        ...action,
        expiresAt: now + buffer
      });
    }
  }

  static canExecute(action: InputRequest, now: number, combatState: ReturnType<typeof useCombatStore.getState>) {
    if (combatState.castingSkillId) return false;
    
    if (action.type === 'move') {
      const moveSpeed = useStatsStore.getState().getStat('MoveSpeed');
      const moveCooldown = 1000 / Math.max(0.1, moveSpeed);
      return (now - combatState.lastMoveTime) >= moveCooldown;
    } else if (action.type === 'skill') {
      if (now < combatState.gcdEndTime) return false;
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

    let tId = targetId;
    let tPos = targetPos;

    const combatState = useCombatStore.getState();
    const playerState = usePlayerStore.getState();
    const worldState = useWorldStore.getState();
    
    // Auto-snap Ground skills (like Charge) to nearby enemies if they clicked the floor accidentally
    if (skill.targeting === 'Ground' && tPos && !tId) {
      // Find closest enemy within 1.5 tiles (Chebyshev distance <= 1)
      let bestEnemy = null;
      let bestDist = Infinity;
      for (const e of worldState.enemies) {
        if (e.isDead) continue;
        const dist = Math.max(Math.abs(tPos.x - e.position.x), Math.abs(tPos.y - e.position.y));
        if (dist <= 1 && dist < bestDist) {
          bestDist = dist;
          bestEnemy = e;
        }
      }
      if (bestEnemy) {
        tPos = { ...bestEnemy.position };
      }
    }

    const { addLog, triggerGcd, setCasting } = combatState;
    const { position, currentMana } = playerState;

    const target = tId ? worldState.enemies.find(e => e.id === tId) : undefined;

    // Prevent casting Ground/Directional/Area spells directly on solid obstacles
    if (tPos && !target && skill.targeting !== 'Self') {
      if (skill.targeting === 'Single') {
        combatState.addFloatingText(position.x, position.y, 'No Target', { colorClass: 'text-yellow-400' });
        addLog(`You need a target for ${skill.name}.`, 'system');
        combatState.setTargetingSkill(null);
        return;
      }
      const isObstacle = worldState.grid.obstacles.some(o => o.x === tPos!.x && o.y === tPos!.y);
      if (isObstacle) {
        combatState.addFloatingText(position.x, position.y, 'Invalid Target', { colorClass: 'text-yellow-400' });
        addLog(`Cannot target obstacles with ${skill.name}.`, 'system');
        combatState.setTargetingSkill(null);
        return;
      }
    }

    // Check Mana
    const effectiveMana = getEffectiveManaCost(skill);
    if (currentMana < effectiveMana) {
      combatState.addFloatingText(position.x, position.y, 'Not Enough Mana', { colorClass: 'text-blue-400' });
      addLog(`Not enough mana for ${skill.name}.`, 'system');
      return;
    }

    // Enter Targeting Mode if required
    if (!tPos && !tId && (skill.targeting === 'Ground' || skill.targeting === 'Directional' || skill.targeting === 'Area' || skill.targeting === 'Single')) {
      if (combatState.targetingSkillId === skill.id) {
        combatState.setTargetingSkill(null);
        return;
      }
      combatState.setTargetingSkill(skill.id);
      return;
    }

    // Check Range if we have a target
    const effectiveRange = skill.range > 0 ? skill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);

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
    } else if (skill.targeting === 'Single' && !target) {
      combatState.addFloatingText(position.x, position.y, 'Need Target', { colorClass: 'text-yellow-400' });
      addLog(`You need a target for ${skill.name}.`, 'system');
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
    const effCastTime = getEffectiveCastTime(skill);
    
    // Always trigger GCD and Cooldowns immediately upon initiating cast or execution
    triggerGcd(getEffectiveGcd(skill));
    if (skill.cooldownMs) {
       combatState.triggerSkillCooldown(skill.id, skill.cooldownMs);
    }
    combatState.setLastAttackAnimationTime(useAppStore.getState().getGameTime());

    if (effCastTime > 0) {
      setCasting(skill.id, effCastTime, tId, tPos);
      addLog(`Casting ${skill.name}...`, 'system');
    } else {
      SkillExecutor.execute(skill, tId, tPos);
    }

    // Auto-unpause on successful skill cast
    const appState = useAppStore.getState();
    if (appState.isPaused) {
      const shouldUnpause = skill.effects.some(e => e.type === 'damage') || 
                            skill.tags.includes('Attack') || 
                            skill.tags.includes('Movement');
      if (shouldUnpause) {
        appState.setPaused(false);
      }
    }
  }
}
