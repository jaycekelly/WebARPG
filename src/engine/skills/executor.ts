import type { Skill } from './types';
import { useStatsStore } from '../../store/useStatsStore';
import { useCombatStore } from '../../store/useCombatStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useWorldStore } from '../../store/useWorldStore';

export class SkillExecutor {
  /**
   * Calculate total damage multiplier based on the skill's tags.
   */
  static getDamageMultiplier(skill: Skill): number {
    const { modifiers } = useStatsStore.getState();
    let increasedSum = 0;
    let moreMultiplier = 1;

    // We always apply global 'Damage' modifiers
    const applicableStats = ['Damage'];

    // Map tags to stat names
    if (skill.tags.includes('Melee')) applicableStats.push('MeleeDamage');
    if (skill.tags.includes('Spell')) applicableStats.push('SpellDamage');
    if (skill.tags.includes('Projectile')) applicableStats.push('RangedDamage');
    if (skill.tags.includes('Area')) applicableStats.push('AreaDamage');
    if (skill.tags.includes('Physical')) applicableStats.push('PhysicalDamage');
    if (skill.tags.includes('Fire')) applicableStats.push('FireDamage');
    if (skill.tags.includes('Cold')) applicableStats.push('ColdDamage');
    if (skill.tags.includes('Lightning')) applicableStats.push('LightningDamage');

    // Gather all matching modifiers
    for (const mod of modifiers) {
      if (applicableStats.includes(mod.stat)) {
        if (mod.type === 'increased') {
          increasedSum += (mod.value / 100);
        } else if (mod.type === 'more') {
          moreMultiplier *= (1 + (mod.value / 100));
        }
      }
    }

    return Math.max(0, 1 + increasedSum) * moreMultiplier;
  }

  static execute(skill: Skill, targetId?: string) {
    const { addLog } = useCombatStore.getState();
    
    // Calculate global multipliers for this skill
    const damageMultiplier = this.getDamageMultiplier(skill);

    for (const effect of skill.effects) {
      if (effect.type === 'damage') {
        if (!targetId) continue;
        
        const finalDamage = effect.baseValue * damageMultiplier;
        
        // Execute damage against target
        const worldState = useWorldStore.getState();
        const target = worldState.enemies.find(e => e.id === targetId);
        
        if (target && !target.isDead) {
          worldState.damageEnemy(target.id, finalDamage);
          addLog(`You hit ${target.name} with ${skill.name} for ${finalDamage.toFixed(0)} ${effect.element || ''} damage.`, 'ability');
          
          // Handle kill (Duplicate code for now, can extract to a helper later)
          const updatedTarget = useWorldStore.getState().enemies.find(e => e.id === target.id);
          if (updatedTarget?.isDead) {
            addLog(`You defeated ${target.name}!`, 'system');
            const { leveledUp, newLevel } = usePlayerStore.getState().addXp(target.xpReward);
            addLog(`You gained ${target.xpReward} XP.`, 'system');
            if (leveledUp) {
              addLog(`Level Up! You are now Level ${newLevel}!`, 'system');
            }
            usePlayerStore.getState().setTarget(null);
          }
        }
      } 
      else if (effect.type === 'heal') {
        // Apply Healing
        const healAmount = effect.baseValue; // Could add 'HealingDealt' stat multiplier here later
        usePlayerStore.getState().heal(healAmount);
        addLog(`You cast ${skill.name} and recovered ${healAmount.toFixed(0)} HP.`, 'ability');
      }
    }

    // Escape hatch for custom logic
    if (skill.onExecute) {
      skill.onExecute('player', targetId || '');
    }
  }
}
