import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getMainHandAttackCooldown, getOffHandAttackCooldown, getEffectiveGcd } from './input/InputHandler';
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
import { findPath } from './world/pathfinding';

export function useGameEngine() {
  useEffect(() => {
    let animationFrameId: number;
    let lastTick = performance.now();
    let accumulatedHpRegen = 0;
    let accumulatedManaRegen = 0;
    let lastRegenFlushTime = performance.now();

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
      
      try {
        const playerState = usePlayerStore.getState();
      const worldState = useWorldStore.getState();
      const combatState = useCombatStore.getState();
      const statsState = useStatsStore.getState();
      const buffState = useBuffStore.getState();

      combatState.clearExpiredFloatingTexts(now);

      const { dotEvents, hotEvents } = buffState.tickBuffs(deltaTime);
      
      dotEvents.forEach(event => {
        if (event.entityId === 'player') {
          usePlayerStore.getState().takeDamage(event.damage);
          const { position } = usePlayerStore.getState();
          combatState.addFloatingText(position.x, position.y, event.damage.toFixed(0), 'text-zinc-100');
          // Optional: combat log for player taking dot damage
        } else {
          const enemy = worldState.enemies.find(e => e.id === event.entityId);
          worldState.damageEnemy(event.entityId, event.damage);
          if (enemy) {
             combatState.addFloatingText(enemy.position.x, enemy.position.y, event.damage.toFixed(0), 'text-purple-400');
          }
          if (enemy?.isDead && !enemy.rewardsGranted) {
             combatState.addLog(`${enemy.name} died to ${event.damageType} damage over time.`, 'system');
          }
        }
      });

      hotEvents.forEach(event => {
        if (event.entityId === 'player') {
          usePlayerStore.getState().heal(event.healAmount);
          // Removed floating text for HoTs to prevent visual clutter
        } else {
          // Implement enemy healing if necessary in the future
        }
      });

      // Regeneration Logic
      const dtSec = deltaTime / 1000;
      
      const maxHp = statsState.getStat('Health');
      const hpRegenFlat = statsState.getStat('HealthRegeneration');
      const hpRegenPercent = statsState.getStat('HealthRegenPercent');
      
      const baseHpRegen = (maxHp * 0.0025) + hpRegenFlat;
      const totalHpRegen = baseHpRegen * (1 + (hpRegenPercent / 100));
      accumulatedHpRegen += totalHpRegen * dtSec;
      
      const maxMana = statsState.getStat('Mana');
      const manaRegenFlat = statsState.getStat('ManaRegeneration');
      const manaRegenPercent = statsState.getStat('ManaRegenPercent');
      
      const baseManaRegen = (maxMana * 0.015) + manaRegenFlat;
      const totalManaRegen = baseManaRegen * (1 + (manaRegenPercent / 100));
      accumulatedManaRegen += totalManaRegen * dtSec;

      // Flush to Zustand Store max 4 times a second, or if we accumulated at least 1 whole point
      if (currentTime - lastRegenFlushTime >= 250 || accumulatedHpRegen >= 1 || accumulatedManaRegen >= 1) {
        if (accumulatedHpRegen > 0 && playerState.currentHealth < maxHp && playerState.currentHealth > 0) {
            usePlayerStore.getState().heal(accumulatedHpRegen);
        }
        if (accumulatedManaRegen > 0 && playerState.currentMana < maxMana && playerState.currentHealth > 0) {
            usePlayerStore.getState().restoreMana(accumulatedManaRegen);
        }
        accumulatedHpRegen = 0;
        accumulatedManaRegen = 0;
        lastRegenFlushTime = currentTime;
      }

      // Handle Ground Zones
      worldState.clearExpiredZones(now);
      worldState.zones.forEach(zone => {
        const tickDamage = zone.damagePerSecond * (deltaTime / 1000);
        if (tickDamage > 0) {
          // Player on zone
          if (position.x === zone.position.x && position.y === zone.position.y) {
             usePlayerStore.getState().takeDamage(tickDamage);
             combatState.addFloatingText(position.x, position.y, tickDamage.toFixed(0), 'text-zinc-100');
          }
          
          // Enemy on zone
          const enemy = worldState.getEnemyAt(zone.position.x, zone.position.y);
          if (enemy && !enemy.isDead) {
             worldState.damageEnemy(enemy.id, tickDamage);
             combatState.addFloatingText(enemy.position.x, enemy.position.y, tickDamage.toFixed(0), 'text-orange-500');
             const updated = useWorldStore.getState().enemies.find(e => e.id === enemy.id);
             if (updated?.isDead && !updated.rewardsGranted) {
               combatState.addLog(`${enemy.name} died to ${zone.hazardId}.`, 'system');
             }
          }
        }
      });

      const isSolid = (x: number, y: number) => {
        if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
        return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
      };

      const { activeTargetId, position, currentHealth } = playerState;
      const { castingSkillId, castEndTime, setCasting } = combatState;
      
      // Prevent anything if dead
      if (currentHealth <= 0) return;

      // Handle Input Queue
      const { queuedAction, clearQueue } = combatState;
      if (queuedAction) {
        if (now > queuedAction.expiresAt) {
          clearQueue();
        } else if (InputHandler.canExecute(queuedAction, now, combatState)) {
          InputHandler.executeAction(queuedAction);
          clearQueue();
        }
      }

      // Handle Cast Completions
      if (castingSkillId && castEndTime > 0 && now >= castEndTime) {
        const skill = SKILLS[castingSkillId];
        if (skill) {
          combatState.setLastAttackAnimationTime(now);
          SkillExecutor.execute(skill, combatState.castTargetId, combatState.castTargetPos);
          combatState.triggerGcd(getEffectiveGcd(skill));
        }
        setCasting(null);
      }

      // Auto Target Checking (1-time check per enemy)
      const inventoryState = useInventoryStore.getState();
      const mainHand = inventoryState.equipment['weapon1'];
      const offHand = inventoryState.equipment['weapon2'];
      const playerWeapon = mainHand || offHand;
      const weaponRange = playerWeapon?.weaponRange || 1;
      
      let acquiredTargetId = activeTargetId;
      worldState.enemies.forEach(e => {
         if (e.isDead || e.autoTargetChecked) return;
         const dist = getChebyshevDistance(position, e.position);
         if (dist <= weaponRange) {
            let canHit = false;
            if (weaponRange <= 1) canHit = !checkCornerBlock(position, e.position, isSolid);
            else canHit = hasLineOfSight(position, e.position, isSolid);
            
            if (canHit) {
               worldState.updateEnemy(e.id, { autoTargetChecked: true });
               if (!acquiredTargetId) {
                  usePlayerStore.getState().setTarget(e.id);
                  acquiredTargetId = e.id;
               }
            }
         }
      });

      // Auto Attack Logic
      if (acquiredTargetId && !castingSkillId) {
        const target = worldState.enemies.find(e => e.id === acquiredTargetId);
        
        if (target && !target.isDead) {
          const dist = getChebyshevDistance(position, target.position);
          
          const executeWeaponAttack = (weapon: any, isOffHand: boolean) => {
            const autoAttackRange = weapon?.weaponRange || 1;
            
            let canHit = false;
            if (dist <= autoAttackRange) {
              if (autoAttackRange <= 1) {
                 canHit = !checkCornerBlock(position, target.position, isSolid);
              } else {
                 canHit = hasLineOfSight(position, target.position, isSolid);
              }
            }
            
            if (!canHit) return false;
            
            const lastAttackTime = isOffHand ? combatState.lastOffHandAttackTime : combatState.lastMainHandAttackTime;
            const attackCooldown = isOffHand ? getOffHandAttackCooldown() : getMainHandAttackCooldown();
            const timeSinceLastAttack = now - lastAttackTime;
            
            if (timeSinceLastAttack >= attackCooldown) {
              combatState.setLastAttackAnimationTime(now);
              if (isOffHand) {
                combatState.setLastOffHandAttackTime(now);
              } else {
                combatState.setLastMainHandAttackTime(now);
              }
              
              const damageType = weapon?.damageType || 'Strike';
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
              
              if (damageType === 'Strike') baseAttackPower += statsState.getStat('StrikeDamageToWeapons');
              else if (damageType === 'Pierce') baseAttackPower += statsState.getStat('PierceDamageToWeapons');
              else if (damageType === 'Fire') baseAttackPower += statsState.getStat('FireDamageToWeapons');
              else if (damageType === 'Cold') baseAttackPower += statsState.getStat('ColdDamageToWeapons');
              else if (damageType === 'Lightning') baseAttackPower += statsState.getStat('LightningDamageToWeapons');
              
              if (damageType === 'Fire' || damageType === 'Cold' || damageType === 'Lightning') {
                  const elementalMult = 1 + (statsState.getStat('WeaponElementalDamage') / 100);
                  baseAttackPower *= elementalMult;
              }
              
              let damageMultiplier = SkillExecutor.getDamageMultiplier(attackTags);
              if (isOffHand) damageMultiplier *= 0.5; // Off-hand does 50% damage
              
              const attackPower = baseAttackPower * damageMultiplier;
              
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
                false,
                playerState.level,
                statsState.getAllStats(),
                enemyDefenderStats,
                weapon?.baseCritChance || 5,
                true,
                false,
                0,
                true
              );
              
              const handName = isOffHand ? 'Off-Hand' : 'Main-Hand';
              if (result === 'deflect') {
                 combatState.addLog(`You missed ${target.name} with ${handName}!`, 'system');
              } else {
                 let resultText = '';
                 if (result === 'block') resultText = ' (Blocked)';
                 else if (result === 'parry') resultText = ' (Parried)';
                 else if (result === 'crit') resultText = ' (Critical Strike!)';
                
                 worldState.damageEnemy(target.id, finalDamage);
                 
                 let dmgColor = 'text-zinc-100';
                 if (damageType === 'Fire') dmgColor = 'text-orange-500';
                 else if (damageType === 'Cold') dmgColor = 'text-blue-400';
                 else if (damageType === 'Lightning') dmgColor = 'text-yellow-400';
                 
                 combatState.addFloatingText(target.position.x, target.position.y, finalDamage.toFixed(0), dmgColor);
                 combatState.addHitEffect(target.id);
                 
                 combatState.addLog(`You hit ${target.name} for ${finalDamage.toFixed(0)} damage with ${handName}.${resultText}`, 'player-attack');
                 
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
                 
                 if (target.health <= finalDamage) {
                     const lifeOnKill = statsState.getStat('LifeOnKill');
                     const manaOnKill = statsState.getStat('ManaOnKill');
                     if (lifeOnKill > 0) totalSustain += lifeOnKill;
                     if (manaOnKill > 0) totalManaSustain += manaOnKill;
                 }
                 
                 if (totalSustain > 0) usePlayerStore.getState().heal(totalSustain);
                 if (totalManaSustain > 0) usePlayerStore.getState().restoreMana(totalManaSustain);
              }
              return true;
            }
            return false;
          };
          
          const weapon1 = useInventoryStore.getState().equipment['weapon1'];
          const weapon2 = useInventoryStore.getState().equipment['weapon2'];
          
          executeWeaponAttack(weapon1, false);
          
          // Only execute off-hand attack if it's a weapon (not a shield)
          if (weapon2 && weapon2.itemType !== 'shield') {
            executeWeaponAttack(weapon2, true);
          }
            

          }
        }

      // Pre-calculate Aggro State Changes
      const groupsToDropAggro = new Set<string>();
      const enemiesToDropAggro = new Set<string>();
      const groupsToAggro = new Set<string>();
      const enemiesToAggro = new Set<string>();

      worldState.enemies.forEach(enemy => {
        if (enemy.isDead) return;
        if (enemy.isAggroed) {
          const distFromSpawn = getChebyshevDistance(enemy.position, enemy.spawnOrigin);
          const leashRange = Math.max(10, enemy.stats.aggroRange * 2);
          if (distFromSpawn > leashRange) {
            if (enemy.groupId) groupsToDropAggro.add(enemy.groupId);
            else enemiesToDropAggro.add(enemy.id);
          } else {
            // Keep the group aggroed if one member is safely fighting
            if (enemy.groupId) groupsToAggro.add(enemy.groupId);
          }
        } else {
          // Hysteresis: Enemies cannot gain aggro if they are outside their home territory.
          const distFromSpawn = getChebyshevDistance(enemy.position, enemy.spawnOrigin);
          if (distFromSpawn <= 2) {
             const distToPlayer = getChebyshevDistance(enemy.position, position);
             if (distToPlayer <= enemy.stats.aggroRange) {
               if (hasLineOfSight(enemy.position, position, isSolid)) {
                 if (enemy.groupId) groupsToAggro.add(enemy.groupId);
                 else enemiesToAggro.add(enemy.id);
               }
             }
          }
        }
      });

      // Pre-compute solids for O(1) pathfinding lookups
      const staticSolidSet = new Set<string>();
      worldState.grid.obstacles.forEach(o => staticSolidSet.add(`${o.x},${o.y}`));
      
      const dynamicSolidSet = new Set<string>(staticSolidSet);
      worldState.enemies.forEach(e => {
         if (!e.isDead) dynamicSolidSet.add(`${e.position.x},${e.position.y}`);
      });

      const isStaticSolid = (x: number, y: number) => {
        return staticSolidSet.has(`${x},${y}`);
      };

      let pathfindingOperationsThisFrame = 0;
      const MAX_PATHFINDING_PER_FRAME = 3;

      // Enemy AI Logic
      worldState.enemies.forEach(enemy => {
        if (enemy.isDead) return;

        let isAggroed = enemy.isAggroed;
        
        if (isAggroed) {
            if (enemy.groupId && groupsToDropAggro.has(enemy.groupId)) isAggroed = false;
            else if (!enemy.groupId && enemiesToDropAggro.has(enemy.id)) isAggroed = false;
        } else {
            if (enemy.groupId && groupsToDropAggro.has(enemy.groupId)) isAggroed = false; // Leashing overrides gaining aggro
            else if (enemy.groupId && groupsToAggro.has(enemy.groupId)) isAggroed = true;
            else if (!enemy.groupId && enemiesToAggro.has(enemy.id)) isAggroed = true;
        }
        
        if (isAggroed !== enemy.isAggroed) {
           if (!isAggroed) {
              worldState.updateEnemy(enemy.id, { isAggroed: false });
           } else {
              worldState.updateEnemy(enemy.id, { isAggroed: true });
           }
        }

        if (!isAggroed) {
           const distToOrigin = getChebyshevDistance(enemy.position, enemy.spawnOrigin);
           if (distToOrigin > 0) {
               const moveCooldown = 1000 / Math.max(0.1, enemy.stats.moveSpeed);
               if (now - (enemy.lastMoveTime || 0) >= moveCooldown) {
                  // Throttle pathfinding
                  if (pathfindingOperationsThisFrame >= MAX_PATHFINDING_PER_FRAME) return;
                  pathfindingOperationsThisFrame++;

                  const path = findPath(enemy.position, enemy.spawnOrigin, isStaticSolid);
                  if (path && path.length > 0) {
                     const nextPos = path[0];
                     const collidingEnemy = dynamicSolidSet.has(`${nextPos.x},${nextPos.y}`);
                     const collidingPlayer = (nextPos.x === position.x && nextPos.y === position.y);
                     
                     if (!collidingEnemy && !collidingPlayer) {
                        worldState.moveEnemy(enemy.id, nextPos);
                        worldState.updateEnemyMoveTime(enemy.id, now);
                        // Update dynamic map so other enemies this frame don't walk into it
                        dynamicSolidSet.delete(`${enemy.position.x},${enemy.position.y}`);
                        dynamicSolidSet.add(`${nextPos.x},${nextPos.y}`);
                     }
                  }
               }
           }
           return; // Stop processing further AI logic if not aggroed
        }
        
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
                combatState.addFloatingText(position.x, position.y, finalDamage.toFixed(0), 'text-zinc-100');
                combatState.addHitEffect('player');
                let resultText = '';
               if (result === 'block') resultText = ' (Blocked)';
               else if (result === 'parry') resultText = ' (Parried)';
               combatState.addLog(`${enemy.name} hits you for ${Math.floor(finalDamage)} damage!${resultText}`, 'enemy-attack');
            }
          }
        } else if (enemy.aiProfile === 'melee_rusher') {
          // AI Movement
          const moveCooldown = 1000 / Math.max(0.1, enemy.stats.moveSpeed);
          if (now - (enemy.lastMoveTime || 0) >= moveCooldown) {
            
            // Throttle pathfinding
            if (pathfindingOperationsThisFrame >= MAX_PATHFINDING_PER_FRAME) return;
            pathfindingOperationsThisFrame++;

            // Use static solids for BFS so enemies don't path in crazy circles around each other
            const path = findPath(enemy.position, position, isStaticSolid);
            
            if (path && path.length > 0) {
              const idealNextPos = path[0];
              const collidingPlayer = (idealNextPos.x === position.x && idealNextPos.y === position.y);
              
              if (!collidingPlayer) {
                const collidingEnemy = dynamicSolidSet.has(`${idealNextPos.x},${idealNextPos.y}`);
                let nextPos = idealNextPos;
                
                if (collidingEnemy) {
                   // Local Avoidance: Find a valid adjacent tile that brings us closer (or keeps us sliding)
                   const neighbors = [
                     { x: enemy.position.x, y: enemy.position.y - 1 },
                     { x: enemy.position.x + 1, y: enemy.position.y - 1 },
                     { x: enemy.position.x + 1, y: enemy.position.y },
                     { x: enemy.position.x + 1, y: enemy.position.y + 1 },
                     { x: enemy.position.x, y: enemy.position.y + 1 },
                     { x: enemy.position.x - 1, y: enemy.position.y + 1 },
                     { x: enemy.position.x - 1, y: enemy.position.y },
                     { x: enemy.position.x - 1, y: enemy.position.y - 1 }
                   ];
                   
                   let bestNeighbor = null;
                   let bestDist = Infinity;
                   const currentDist = (enemy.position.x - position.x)**2 + (enemy.position.y - position.y)**2;
                   
                   for (const n of neighbors) {
                      if (n.x < 0 || n.x >= worldState.grid.width || n.y < 0 || n.y >= worldState.grid.height) continue;
                      if (isStaticSolid(n.x, n.y)) continue;
                      if (dynamicSolidSet.has(`${n.x},${n.y}`)) continue;
                      if (n.x === position.x && n.y === position.y) continue;
                      
                      const dist = (n.x - position.x)**2 + (n.y - position.y)**2;
                      // Only allow neighbors that bring us strictly closer (prevents vibrating in place)
                      if (dist < currentDist && dist < bestDist) {
                         bestDist = dist;
                         bestNeighbor = n;
                      }
                   }
                   
                   if (bestNeighbor) {
                      nextPos = bestNeighbor;
                   } else {
                      // Completely blocked from moving closer, just wait
                      // We update the move time so we don't spam pathfinding
                      worldState.updateEnemyMoveTime(enemy.id, now);
                      return;
                   }
                }

                worldState.moveEnemy(enemy.id, nextPos);
                worldState.updateEnemyMoveTime(enemy.id, now);
                // Update dynamic map so other enemies this frame don't walk into it
                dynamicSolidSet.delete(`${enemy.position.x},${enemy.position.y}`);
                dynamicSolidSet.add(`${nextPos.x},${nextPos.y}`);
              }
            }
          }
        }
      });
      
      // Handle Dead Enemies & Rewards (Centralized)
      worldState.enemies.forEach(enemy => {
        if (enemy.isDead && !enemy.rewardsGranted) {
           worldState.markEnemyRewardsGranted(enemy.id);
           
           combatState.addLog(`You killed ${enemy.name}!`, 'system');
           
           // Grant XP and Gold
           const xpGain = Math.max(1, Math.floor(enemy.xpReward * (1 + statsState.getStat('ExperienceGain') / 100)));
           const randomMultiplier = 0.5 + Math.random();
           const goldGain = Math.floor(enemy.goldReward * randomMultiplier * (1 + statsState.getStat('GoldFind') / 100));
           usePlayerStore.getState().addXp(xpGain);
           usePlayerStore.getState().addGold(goldGain);
           combatState.addLog(`Gained ${xpGain} XP and ${goldGain} Gold.`, 'system');
           
           // Flask Charges
           let chargesGained = 0;
           if (enemy.rarity === 'Normal') chargesGained = 1 / 3;
           else if (enemy.rarity === 'Magic') chargesGained = 0.5;
           else if (enemy.rarity === 'Rare' || enemy.rarity === 'Boss') chargesGained = 2;
           if (chargesGained > 0) usePlayerStore.getState().addFlaskCharges(chargesGained);
           
           // Drop Loot
           let dropChance = 0;
           let maxDrops = 1;
           const playerStore = usePlayerStore.getState();
           
           if (enemy.rarity === 'Normal') {
             dropChance = 0.25;
             if (playerStore.normalPityCount >= 4) dropChance = 1.0;
           } else if (enemy.rarity === 'Magic') {
             dropChance = 0.50;
             if (playerStore.magicPityCount >= 2) dropChance = 1.0;
           } else if (enemy.rarity === 'Rare') {
             dropChance = 1.0;
             maxDrops = 2;
           } else if (enemy.rarity === 'Boss') {
             dropChance = 1.0;
             maxDrops = 3;
           }

           const willDrop = Math.random() < dropChance;
           
           if (willDrop) {
             if (enemy.rarity === 'Normal' || enemy.rarity === 'Magic') {
               playerStore.resetPity(enemy.rarity);
             }
             
             const drops: Item[] = [];
             const mf = statsState.getStat('MagicFind');
             for (let i = 0; i < maxDrops; i++) {
               const item = ItemGenerator.generateRandomLoot(enemy.level, mf);
               if (item) drops.push(item);
             }
             
             if (drops.length > 0) {
               const ws = useWorldStore.getState();
               const ps = usePlayerStore.getState();
               const origin = enemy.position;
               const claimedSpots = new Set<string>();
               
               const isTileEmpty = (x: number, y: number) => {
                 if (x < 0 || x >= ws.grid.width || y < 0 || y >= ws.grid.height) return false;
                 if (ws.grid.obstacles.some(o => o.x === x && o.y === y)) return false;
                 if (ps.position.x === x && ps.position.y === y) return false;
                 if (ws.enemies.some(e => !e.isDead && e.position.x === x && e.position.y === y)) return false;
                 if (ws.lootDrops.some(ld => ld.position.x === x && ld.position.y === y)) return false;
                 if (claimedSpots.has(`${x},${y}`)) return false;
                 return true;
               };

               drops.forEach(item => {
                 let targetPos = origin;
                 
                 if (isTileEmpty(origin.x, origin.y)) {
                   targetPos = { x: origin.x, y: origin.y };
                   claimedSpots.add(`${targetPos.x},${targetPos.y}`);
                 } else {
                   const adjacent: {x: number, y: number}[] = [];
                   for (let dx = -1; dx <= 1; dx++) {
                     for (let dy = -1; dy <= 1; dy++) {
                       if (dx === 0 && dy === 0) continue;
                       const nx = origin.x + dx;
                       const ny = origin.y + dy;
                       if (isTileEmpty(nx, ny)) {
                         adjacent.push({ x: nx, y: ny });
                       }
                     }
                   }
                   
                   if (adjacent.length > 0) {
                     const r = Math.floor(Math.random() * adjacent.length);
                     targetPos = adjacent[r];
                     claimedSpots.add(`${targetPos.x},${targetPos.y}`);
                   }
                 }
                 
                 worldState.addLoot(targetPos, [item]);
               });
             }
           } else {
             if (enemy.rarity === 'Normal' || enemy.rarity === 'Magic') {
               playerStore.incrementPity(enemy.rarity);
             }
           }
           
           if (usePlayerStore.getState().activeTargetId === enemy.id) {
             usePlayerStore.getState().setTarget(null);
           }
        }
      });
      
      } catch (err) {
        console.error('Game Engine Error:', err);
        const combatState = useCombatStore.getState();
        if (err instanceof Error) {
          combatState.addLog(`ENGINE CRASH: ${err.message}`, 'system');
        } else {
          combatState.addLog(`ENGINE CRASH: Unknown error`, 'system');
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);
}
