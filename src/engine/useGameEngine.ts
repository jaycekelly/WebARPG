import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { InputHandler, getMainHandAttackCooldown, getOffHandAttackCooldown } from './input/InputHandler';
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
      
      try {
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
          if (enemy?.isDead && !enemy.rewardsGranted) {
             combatState.addLog(`${enemy.name} died to ${event.damageType} damage over time.`, 'system');
          }
        }
      });

      // Regeneration Logic
      const dtSec = deltaTime / 1000;
      
      const maxHp = statsState.getStat('Health');
      const hpRegenFlat = statsState.getStat('HealthRegeneration');
      const hpRegenPercent = statsState.getStat('HealthRegenPercent');
      
      const baseHpRegen = (maxHp * 0.005) + hpRegenFlat;
      const totalHpRegen = baseHpRegen * (1 + (hpRegenPercent / 100));
      const hpTick = totalHpRegen * dtSec;
      
      if (hpTick > 0 && playerState.currentHealth < maxHp && playerState.currentHealth > 0) {
          usePlayerStore.getState().heal(hpTick);
      }
      
      const maxMana = statsState.getStat('Mana');
      const manaRegenFlat = statsState.getStat('ManaRegeneration');
      const manaRegenPercent = statsState.getStat('ManaRegenPercent');
      
      const baseManaRegen = (maxMana * 0.01) + manaRegenFlat;
      const totalManaRegen = baseManaRegen * (1 + (manaRegenPercent / 100));
      const manaTick = totalManaRegen * dtSec;
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
      const { lastMoveTime, castingSkillId, castEndTime, setCasting } = combatState;
      
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
        
        if (target && !target.isDead && (now - lastMoveTime) > 300) {
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
                 const adjacent: {x: number, y: number}[] = [];
                 for (let dx = -1; dx <= 1; dx++) {
                   for (let dy = -1; dy <= 1; dy++) {
                     const nx = origin.x + dx;
                     const ny = origin.y + dy;
                     if (isTileEmpty(nx, ny)) {
                       adjacent.push({ x: nx, y: ny });
                     }
                   }
                 }
                 
                 let targetPos = origin;
                 if (adjacent.length > 0) {
                   const r = Math.floor(Math.random() * adjacent.length);
                   targetPos = adjacent[r];
                   claimedSpots.add(`${targetPos.x},${targetPos.y}`);
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
