import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { SKILLS } from '../data/skills';
import { SkillExecutor } from './skills/executor';
import { DamageCalculator } from './combat/DamageCalculator';

// Helper for distance
const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export function useGameEngine() {
  useEffect(() => {
    let frameId: number;

    const loop = () => {
      const now = Date.now();
      
      const playerState = usePlayerStore.getState();
      const worldState = useWorldStore.getState();
      const combatState = useCombatStore.getState();
      const statsState = useStatsStore.getState();

      const { activeTargetId, position, currentHealth } = playerState;
      const { lastMoveTime, lastAutoAttackTime, setLastAutoAttackTime, castingSkillId, castEndTime, setCasting } = combatState;
      
      // Prevent anything if dead
      if (currentHealth <= 0) return;

      // Handle Cast Completions
      if (castingSkillId && castEndTime > 0 && now >= castEndTime) {
        const skill = SKILLS[castingSkillId];
        if (skill) {
          SkillExecutor.execute(skill, activeTargetId || undefined);
        }
        setCasting(null);
      }

      // Auto Attack Logic
      if (activeTargetId) {
        const target = worldState.enemies.find(e => e.id === activeTargetId);
        
        if (target && !target.isDead) {
          const dist = getDistance(position, target.position);
          const autoAttackRange = 1.5; // Default melee range
          
          const isStandingStill = (now - lastMoveTime) > 300;
          const attackSpeed = statsState.getStat('AttackSpeed');
          const attackPower = statsState.getStat('Damage');
          
          const timeSinceLastAttack = now - lastAutoAttackTime;
          const attackCooldown = 1000 / Math.max(0.1, attackSpeed);

          if (isStandingStill && dist <= autoAttackRange && timeSinceLastAttack >= attackCooldown) {
            // FIRE AUTO ATTACK
            setLastAutoAttackTime(now);
            
            const weapon = useInventoryStore.getState().equipment['weapon1'];
            const damageType = weapon?.damageType || 'Slashing';
            
            // For enemies, map their flat stats to the Record shape DamageCalculator expects
            const enemyDefenderStats = {
              'Armor': target.stats.armor,
              'FireResist': target.stats.fireResist,
              'ColdResist': target.stats.coldResist,
              'LightningResist': target.stats.lightningResist
            };

            const finalDamage = DamageCalculator.calculateDamage(
              attackPower,
              damageType,
              playerState.level,
              statsState.getAllStats(), // Attacker stats
              enemyDefenderStats        // Defender stats
            );
            
            worldState.damageEnemy(target.id, finalDamage);
            combatState.addLog(`You hit ${target.name} for ${Math.floor(finalDamage)} ${damageType} damage.`, 'player-attack');
            
            // Handle Kill
            const updatedTarget = useWorldStore.getState().enemies.find(e => e.id === target.id);
            if (updatedTarget?.isDead) {
              combatState.addLog(`You defeated ${target.name}!`, 'system');
              const { leveledUp, newLevel } = usePlayerStore.getState().addXp(target.xpReward);
              combatState.addLog(`You gained ${target.xpReward} XP.`, 'system');
              if (leveledUp) {
                combatState.addLog(`Level Up! You are now Level ${newLevel}! (+10 HP/Mana, +1 Skill Point)`, 'system');
              }
              usePlayerStore.getState().setTarget(null);
            }
          }
        }
      }

      // Enemy AI Logic
      worldState.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        
        const dist = getDistance(enemy.position, position);
        const enemyAttackCooldown = 1000 / Math.max(0.1, enemy.stats.attackSpeed);
        
        if (dist <= enemy.stats.attackRange) {
          if (now - enemy.lastAttackTime >= enemyAttackCooldown) {
            // ENEMY ATTACKS
            worldState.updateEnemyAttackTime(enemy.id, now);
            
            // Enemies currently just use 'Slashing' damage, and have no penetration
            const finalDamage = DamageCalculator.calculateDamage(
              enemy.stats.attackPower,
              'Slashing',
              enemy.level,
              {}, // Enemies have no pen stats yet
              statsState.getAllStats() // Player's defenses
            );

            usePlayerStore.getState().takeDamage(finalDamage);
            combatState.addLog(`${enemy.name} hits you for ${Math.floor(finalDamage)} damage!`, 'enemy-attack');
          }
        } else if (enemy.aiProfile === 'melee_rusher') {
          // AI Movement
          const moveCooldown = 1000 / Math.max(0.1, enemy.stats.moveSpeed);
          if (now - (enemy.lastMoveTime || 0) >= moveCooldown) {
            let dx = 0;
            let dy = 0;
            
            if (position.x > enemy.position.x) dx = 1;
            else if (position.x < enemy.position.x) dx = -1;
            
            if (position.y > enemy.position.y) dy = 1;
            else if (position.y < enemy.position.y) dy = -1;
            
            // Force orthagonal movement like the player
            if (dx !== 0 && dy !== 0) {
              if (Math.random() > 0.5) dx = 0;
              else dy = 0;
            }
            
            if (dx !== 0 || dy !== 0) {
              const newX = enemy.position.x + dx;
              const newY = enemy.position.y + dy;
              
              if (newX >= 0 && newX < worldState.gridSize.width && newY >= 0 && newY < worldState.gridSize.height) {
                const collidingEnemy = worldState.getEnemyAt(newX, newY);
                const collidingPlayer = (newX === position.x && newY === position.y);
                if (!collidingEnemy && !collidingPlayer) {
                  worldState.moveEnemy(enemy.id, { x: newX, y: newY });
                  worldState.updateEnemyMoveTime(enemy.id, now);
                }
              }
            }
          }
        }
      });

      frameId = requestAnimationFrame(loop);
    };

    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, []);
}
