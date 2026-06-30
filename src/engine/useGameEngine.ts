import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler } from './input/InputHandler';
import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import type { SkillTag } from './skills/types';
import { SKILLS } from '../data/skills';
import { SkillExecutor } from './skills/executor';
import { DamageCalculator } from './combat/DamageCalculator';
import { ItemGenerator } from './items/ItemGenerator';
import { useAppStore } from '../store/useAppStore';
import { useBuffStore } from '../store/useBuffStore';
import type { Item } from './items/types';

import { getChebyshevDistance, checkCornerBlock, hasLineOfSight } from './world/gridMath';

export function useGameEngine() {
  useEffect(() => {
    let animationFrameId: number;
    let lastTick = performance.now();

    const loop = (currentTime: number) => {
      // Only run engine logic if we are in the dungeon
      if (useAppStore.getState().location !== 'dungeon') {
        lastTick = currentTime;
        animationFrameId = requestAnimationFrame(loop);
        return;
      }

      const deltaTime = currentTime - lastTick;
      lastTick = currentTime;

      const now = Date.now();
      
      const playerState = usePlayerStore.getState();
      const worldState = useWorldStore.getState();
      const combatState = useCombatStore.getState();
      const statsState = useStatsStore.getState();
      const buffState = useBuffStore.getState();

      const dotEvents = buffState.tickBuffs(deltaTime);
      
      dotEvents.forEach(event => {
        if (event.entityId === 'player') {
          usePlayerStore.getState().takeDamage(event.damage);
          // Optional: combat log for player taking dot damage
        } else {
          worldState.damageEnemy(event.entityId, event.damage);
          const enemy = worldState.enemies.find(e => e.id === event.entityId);
          if (enemy?.isDead) {
             combatState.addLog(`${enemy.name} died to ${event.damageType} damage over time.`, 'system');
             usePlayerStore.getState().addXp(enemy.xpReward);
             combatState.addLog(`Gained ${enemy.xpReward} XP.`, 'system');
             if (usePlayerStore.getState().activeTargetId === enemy.id) {
                usePlayerStore.getState().setTarget(null);
             }
          }
        }
      });

      // Regeneration Logic
      const dtSec = deltaTime / 1000;
      
      const maxHp = statsState.getStat('Health');
      const hpRegenFlat = statsState.getStat('HealthRegeneration');
      const hpRegenPercent = statsState.getStat('HealthRegenPercent');
      const hpTick = (hpRegenFlat + (maxHp * (hpRegenPercent / 100))) * dtSec;
      if (hpTick > 0 && playerState.currentHealth < maxHp && playerState.currentHealth > 0) {
          usePlayerStore.getState().heal(hpTick);
      }
      
      const maxMana = statsState.getStat('Mana');
      const manaRegenFlat = statsState.getStat('ManaRegeneration');
      const manaRegenPercent = statsState.getStat('ManaRegenPercent');
      const manaTick = (manaRegenFlat + (maxMana * (manaRegenPercent / 100))) * dtSec;
      if (manaTick > 0 && playerState.currentMana < maxMana && playerState.currentHealth > 0) {
          usePlayerStore.getState().restoreMana(manaTick);
      }

      // Handle Ground Zones
      worldState.clearExpiredZones(now);
      worldState.zones.forEach(zone => {
        const tickDamage = zone.damagePerSecond * (deltaTime / 1000);
        if (tickDamage > 0) {
          // Player on zone
          if (position.x === zone.position.x && position.y === zone.position.y) {
             usePlayerStore.getState().takeDamage(tickDamage);
          }
          
          // Enemy on zone
          const enemy = worldState.getEnemyAt(zone.position.x, zone.position.y);
          if (enemy && !enemy.isDead) {
             worldState.damageEnemy(enemy.id, tickDamage);
             const updated = useWorldStore.getState().enemies.find(e => e.id === enemy.id);
             if (updated?.isDead) {
               combatState.addLog(`${enemy.name} died to ${zone.hazardId}.`, 'system');
               usePlayerStore.getState().addXp(enemy.xpReward);
               combatState.addLog(`Gained ${enemy.xpReward} XP.`, 'system');
               if (usePlayerStore.getState().activeTargetId === enemy.id) {
                  usePlayerStore.getState().setTarget(null);
               }
             }
          }
        }
      });

      const isSolid = (x: number, y: number) => {
        if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
        return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
      };

      const { activeTargetId, position, currentHealth } = playerState;
      const { lastMoveTime, lastAutoAttackTime, setLastAutoAttackTime, castingSkillId, castEndTime, setCasting } = combatState;
      
      // Prevent anything if dead
      if (currentHealth <= 0) return;

      // Handle Input Queue
      const { queuedAction, clearQueue } = combatState;
      if (queuedAction) {
        if (now > queuedAction.expiresAt) {
          clearQueue();
        } else if (InputHandler.canExecute(queuedAction.type, now, combatState)) {
          InputHandler.executeAction(queuedAction);
          clearQueue();
        }
      }

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
          const weapon = useInventoryStore.getState().equipment['weapon1'];
          const autoAttackRange = weapon?.weaponRange || 1; // Pull range from weapon
          
          const dist = getChebyshevDistance(position, target.position);
          
          let canHit = false;
          if (dist <= autoAttackRange) {
            if (autoAttackRange <= 1) {
               // Melee Range: check for corner blocking on diagonals
               canHit = !checkCornerBlock(position, target.position, isSolid);
            } else {
               // Reach / Ranged: check line of sight
               canHit = hasLineOfSight(position, target.position, isSolid);
            }
          }
          
          const isStandingStill = (now - lastMoveTime) > 300;
          
          const timeSinceLastAttack = now - lastAutoAttackTime;
          
          const baseWeaponSpeed = weapon?.weaponAttackSpeed || 1.0; // 1.0 attacks per second unarmed
          const attackSpeedBonus = statsState.getStat('AttackSpeed'); // e.g. 20 means +20%
          const finalAPS = baseWeaponSpeed * (1 + attackSpeedBonus / 100);
          
          const attackCooldown = 1000 / Math.max(0.1, finalAPS);

          if (canHit && isStandingStill && timeSinceLastAttack >= attackCooldown) {
            // FIRE AUTO ATTACK
            setLastAutoAttackTime(now);
            
            const damageType = weapon?.damageType || 'Strike';
            
            // Dynamically assign tags
            const attackTags: SkillTag[] = ['Attack'];
            if (autoAttackRange <= 1) attackTags.push('Melee');
            else attackTags.push('Projectile');
            
            if (damageType === 'Strike') attackTags.push('Strike');
            else if (damageType === 'Pierce') attackTags.push('Pierce');
            
            if (damageType === 'Strike' || damageType === 'Pierce') attackTags.push('Physical');
            else if (damageType === 'Fire') attackTags.push('Fire');
            else if (damageType === 'Cold') attackTags.push('Cold');
            else if (damageType === 'Lightning') attackTags.push('Lightning');
            
            let baseAttackPower = statsState.getStat('Damage');
            
            // Weapon Enhancements
            if (damageType === 'Strike') {
                baseAttackPower += statsState.getStat('StrikeDamageToWeapons');
            } else if (damageType === 'Pierce') {
                baseAttackPower += statsState.getStat('PierceDamageToWeapons');
            } else if (damageType === 'Fire') {
                baseAttackPower += statsState.getStat('FireDamageToWeapons');
            } else if (damageType === 'Cold') {
                baseAttackPower += statsState.getStat('ColdDamageToWeapons');
            } else if (damageType === 'Lightning') {
                baseAttackPower += statsState.getStat('LightningDamageToWeapons');
            }
            
            if (damageType === 'Fire' || damageType === 'Cold' || damageType === 'Lightning') {
                const elementalMult = 1 + (statsState.getStat('WeaponElementalDamage') / 100);
                baseAttackPower *= elementalMult;
            }
            
            const damageMultiplier = SkillExecutor.getDamageMultiplier(attackTags);
            const attackPower = baseAttackPower * damageMultiplier;
            
            // For enemies, map their flat stats to the Record shape DamageCalculator expects
            const enemyDefenderStats = {
              'Armor': target.stats.armor,
              'FireResist': target.stats.fireResist,
              'ColdResist': target.stats.coldResist,
              'LightningResist': target.stats.lightningResist,
              'StrikeResist': (target.stats.strikeResist || 0) + (target.stats.physicalResist || 0),
              'PierceResist': (target.stats.pierceResist || 0) + (target.stats.physicalResist || 0),
              'PhysicalResist': target.stats.physicalResist || 0
            };

            const { damage: finalDamage, result } = DamageCalculator.calculateDamage(
              attackPower,
              damageType,
              false, // Not a spell
              playerState.level,
              statsState.getAllStats(), // Attacker stats
              enemyDefenderStats,       // Defender stats
              weapon?.baseCritChance || 5, // Unarmed gets 5% crit default
              true, // defenderHasWeapon
              false, // defenderHasShield
              0 // defenderBaseBlockChance
            );
            
            if (result === 'deflect') {
               combatState.addLog(`You missed ${target.name}!`, 'system');
            } else {
               let resultText = '';
               if (result === 'block') resultText = ' (Blocked)';
               else if (result === 'parry') resultText = ' (Parried)';
               else if (result === 'crit') resultText = ' (Critical Strike!)';
              
               worldState.damageEnemy(target.id, finalDamage);
               combatState.addLog(`You hit ${target.name} for ${finalDamage.toFixed(0)} damage.${resultText}`, 'player-attack');
               
               // Handle Sustain
               const lifeOnHit = statsState.getStat('LifeGainOnHit');
               const lifesteal = statsState.getStat('Lifesteal');
               let totalSustain = 0;
               if (lifeOnHit > 0) totalSustain += lifeOnHit;
               if (lifesteal > 0) totalSustain += finalDamage * (lifesteal / 100);
               
               const manaOnHit = statsState.getStat('ManaGainOnHit');
               const manaLeech = statsState.getStat('ManaLeech');
               let totalManaSustain = 0;
               if (manaOnHit > 0) totalManaSustain += manaOnHit;
               if (manaLeech > 0) totalManaSustain += finalDamage * (manaLeech / 100);
               
               // On-Kill Effects
               if (target.health <= finalDamage) {
                   const lifeOnKill = statsState.getStat('LifeOnKill');
                   const manaOnKill = statsState.getStat('ManaOnKill');
                   if (lifeOnKill > 0) totalSustain += lifeOnKill;
                   if (manaOnKill > 0) totalManaSustain += manaOnKill;
               }
               
               if (totalSustain > 0) {
                 usePlayerStore.getState().heal(totalSustain);
               }
               if (totalManaSustain > 0) {
                 usePlayerStore.getState().restoreMana(totalManaSustain);
               }
            }
            
            // Handle Kill
            const updatedTarget = useWorldStore.getState().enemies.find(e => e.id === target.id);
            if (updatedTarget?.isDead) {
              combatState.addLog(`You killed ${target.name}!`, 'system');
              // Grant XP and Gold
              const xpGain = Math.max(1, Math.floor(updatedTarget.xpReward * (1 + statsState.getStat('ExperienceGain') / 100)));
              const goldGain = Math.max(1, Math.floor(Math.random() * 5 * updatedTarget.level));
              usePlayerStore.getState().addXp(xpGain);
              usePlayerStore.getState().addGold(goldGain);
              combatState.addLog(`Gained ${xpGain} XP and ${goldGain} Gold.`, 'system');
              
              // Drop Loot
              // Mostly drop 1 item, rarely drop 2
              const dropCount = Math.random() > 0.8 ? 2 : 1;
              const drops: Item[] = [];
              const mf = statsState.getStat('MagicFind');
              for (let i = 0; i < dropCount; i++) {
                const item = ItemGenerator.generateRandomLoot(updatedTarget.level, mf);
                if (item) drops.push(item);
              }
              
              if (drops.length > 0) {
                worldState.addLoot(updatedTarget.position, drops);
              }
              
              usePlayerStore.getState().setTarget(null);
            }
          }
        }
      }

      // Enemy AI Logic
      worldState.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        
        const dist = getChebyshevDistance(enemy.position, position);
        const enemyAttackCooldown = 1000 / Math.max(0.1, enemy.stats.attackSpeed);
        
        let canHit = false;
        if (dist <= enemy.stats.attackRange) {
           if (enemy.stats.attackRange <= 1) {
              canHit = !checkCornerBlock(enemy.position, position, isSolid);
           } else {
              canHit = hasLineOfSight(enemy.position, position, isSolid);
           }
        }
        
        if (canHit) {
          if (now - enemy.lastAttackTime >= enemyAttackCooldown) {
            // ENEMY ATTACKS
            worldState.updateEnemyAttackTime(enemy.id, now);
            
            const inventoryState = useInventoryStore.getState();
            const playerWeapon = inventoryState.equipment['weapon1'] || inventoryState.equipment['weapon2'];
            const playerShield = inventoryState.equipment['weapon2']?.itemType === 'shield' ? inventoryState.equipment['weapon2'] : undefined;
            const playerHasWeapon = !!playerWeapon && playerWeapon.itemType !== 'shield';
            const playerHasShield = !!playerShield;
            const playerBaseBlockChance = playerShield?.baseBlockChance || 0;
            
            // Check for Chill debuff
            let chillMultiplier = 1.0;
            const enemyBuffs = buffState.entityBuffs[enemy.id] || [];
            const chills = enemyBuffs.filter(b => b.buffId === 'chill');
            if (chills.length > 0) {
               // Value is negative, so we subtract from 1
               const highestChill = Math.min(...chills.map(c => c.statModifiers[0]?.value || -15));
               chillMultiplier = 1 + (highestChill / 100);
            }
            
            const rawEnemyDamage = enemy.stats.attackPower * chillMultiplier;
            
            // Enemies currently just use 'Strike' damage, and have no penetration
            const { damage: finalDamage, result } = DamageCalculator.calculateDamage(
              rawEnemyDamage,
              'Strike',
              false, // isSpell
              enemy.level,
              {}, // Enemies have no pen stats yet
              statsState.getAllStats(), // Player's defenses
              0, // baseCritChance
              playerHasWeapon,
              playerHasShield,
              playerBaseBlockChance
            );

            if (result === 'deflect') {
               combatState.addLog(`${enemy.name}'s attack was deflected!`, 'player-attack');
            } else {
               usePlayerStore.getState().takeDamage(finalDamage);
               let resultText = '';
               if (result === 'block') resultText = ' (Blocked)';
               else if (result === 'parry') resultText = ' (Parried)';
               combatState.addLog(`${enemy.name} hits you for ${Math.floor(finalDamage)} damage!${resultText}`, 'enemy-attack');
            }
          }
        } else if (dist <= enemy.stats.aggroRange && enemy.aiProfile === 'melee_rusher') {
          // AI Movement
          const moveCooldown = 1000 / Math.max(0.1, enemy.stats.moveSpeed);
          if (now - (enemy.lastMoveTime || 0) >= moveCooldown) {
            let dx = 0;
            let dy = 0;
            
            if (position.x > enemy.position.x) dx = 1;
            else if (position.x < enemy.position.x) dx = -1;
            
            if (position.y > enemy.position.y) dy = 1;
            else if (position.y < enemy.position.y) dy = -1;
            
            // We keep enemy movement slightly dumb for now, but use isSolid for collisions
            // Force orthagonal movement like the player
            if (dx !== 0 && dy !== 0) {
              if (Math.random() > 0.5) dx = 0;
              else dy = 0;
            }
            
            if (dx !== 0 || dy !== 0) {
              const newX = enemy.position.x + dx;
              const newY = enemy.position.y + dy;
              
              if (newX >= 0 && newX < worldState.grid.width && newY >= 0 && newY < worldState.grid.height) {
                const collidingEnemy = worldState.getEnemyAt(newX, newY);
                const collidingPlayer = (newX === position.x && newY === position.y);
                const collidingObstacle = worldState.grid.obstacles.some(o => o.x === newX && o.y === newY);
                
                if (!collidingEnemy && !collidingPlayer && !collidingObstacle) {
                  worldState.moveEnemy(enemy.id, { x: newX, y: newY });
                  worldState.updateEnemyMoveTime(enemy.id, now);
                }
              }
            }
          }
        }
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
}
