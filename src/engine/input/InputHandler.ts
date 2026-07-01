import { useCombatStore, type InputRequest } from '../../store/useCombatStore';
import { useStatsStore } from '../../store/useStatsStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useWorldStore } from '../../store/useWorldStore';
import { SKILLS } from '../../data/skills';
import type { Skill } from '../skills/types';
import { SkillExecutor } from '../skills/executor';

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export const getEffectiveManaCost = (skill: Skill) => {
  const reduction = useStatsStore.getState().getStat('ManaCostReduction');
  return Math.max(0, Math.floor(skill.manaCost * (1 - (reduction / 100))));
};

export const getEffectiveGcd = (skill: Skill) => {
  const reduction = useStatsStore.getState().getStat('CooldownReduction');
  return Math.max(100, Math.floor(skill.gcdDuration * (1 - (reduction / 100))));
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
    const now = Date.now();
    const combatState = useCombatStore.getState();
    
    // Check if free
    if (this.canExecute(action, now, combatState)) {
      this.executeAction(action);
    } else {
      // Queue it
      const buffer = action.type === 'move' ? this.MOVE_QUEUE_BUFFER_MS : this.SKILL_QUEUE_BUFFER_MS;
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

    const combatState = useCombatStore.getState();
    const playerState = usePlayerStore.getState();
    const worldState = useWorldStore.getState();
    const { addLog, triggerGcd, setCasting } = combatState;
    const { position, currentMana } = playerState;

    const target = targetId ? worldState.enemies.find(e => e.id === targetId) : undefined;

    // Check Mana
    const effectiveMana = getEffectiveManaCost(skill);
    if (currentMana < effectiveMana) {
      addLog(`Not enough mana for ${skill.name}.`, 'system');
      return;
    }

    // Enter Targeting Mode if required
    if (!targetPos && !targetId && (skill.targeting === 'Ground' || skill.targeting === 'Directional' || skill.targeting === 'Area')) {
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
        addLog(`Target is out of range for ${skill.name}.`, 'system');
        return;
      }
    } else if (targetPos) {
      const dist = getDistance(position, targetPos);
      if (dist > effectiveRange) {
        addLog(`Target area is out of range for ${skill.name}.`, 'system');
        return;
      }
    } else if (skill.targeting === 'Single') {
      addLog(`You need a target for ${skill.name}.`, 'system');
      return;
    }

    // Execute Skill or Start Cast
    const effCastTime = getEffectiveCastTime(skill);
    if (effCastTime > 0) {
      setCasting(skill.id, effCastTime, targetId, targetPos);
      addLog(`Casting ${skill.name}...`, 'system');
    } else {
      triggerGcd(getEffectiveGcd(skill));
      if (skill.cooldownMs) {
         combatState.triggerSkillCooldown(skill.id, skill.cooldownMs);
      }
      combatState.setLastAttackAnimationTime(Date.now());
      SkillExecutor.execute(skill, targetId, targetPos);
    }
  }
}
