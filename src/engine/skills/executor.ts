import type { Skill, SkillTag } from './types';
import type { DamageType } from '../stats/types';
import { useStatsStore } from '../../store/useStatsStore';
import { useCombatStore } from '../../store/useCombatStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useWorldStore } from '../../store/useWorldStore';
import { useBuffStore } from '../../store/useBuffStore';
import { useInventoryStore } from '../../store/useInventoryStore';

import { getAoETiles, getChebyshevDistance } from '../world/gridMath';
import { DamageCalculator } from '../combat/DamageCalculator';

export class SkillExecutor {
  /**
   * Calculate total damage multiplier based on the skill's tags.
   */
  static getDamageMultiplier(tags: SkillTag[]): number {
    const { modifiers } = useStatsStore.getState();
    let increasedSum = 0;
    let moreMultiplier = 1;

    // We always apply global 'Damage' modifiers
    const applicableStats = ['Damage'];

    // Map tags to stat names
    if (tags.includes('Melee')) applicableStats.push('MeleeDamage');
    if (tags.includes('Spell')) applicableStats.push('SpellDamage');
    if (tags.includes('Projectile')) applicableStats.push('RangedDamage');
    if (tags.includes('Area')) applicableStats.push('AreaDamage');
    if (tags.includes('Physical')) applicableStats.push('PhysicalDamage');
    if (tags.includes('Fire')) applicableStats.push('FireDamage');
    if (tags.includes('Cold')) applicableStats.push('ColdDamage');
    if (tags.includes('Lightning')) applicableStats.push('LightningDamage');
    if (tags.includes('Minion')) applicableStats.push('MinionDamage');
    if (tags.includes('Strike')) applicableStats.push('StrikeDamage');
    if (tags.includes('Pierce')) applicableStats.push('PierceDamage');
    
    // Automatically inherit Physical scaling if it's Strike or Pierce
    if (tags.includes('Physical') || tags.includes('Strike') || tags.includes('Pierce')) {
       applicableStats.push('PhysicalDamage');
    }
    
    if (tags.includes('Spell') || tags.includes('Attack')) applicableStats.push('SkillDamage');
    
    if (tags.includes('Fire') || tags.includes('Cold') || tags.includes('Lightning')) {
       applicableStats.push('ElementalDamage');
    }

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

    // Also add global BuffEffect/Duration to damage if they are DOTs? No, Damage is separate.
    return Math.max(0, 1 + increasedSum) * moreMultiplier;
  }

  static getBuffEffectMultiplier(): number {
    return Math.max(0, 1 + (useStatsStore.getState().getStat('BuffEffect') / 100));
  }

  static getBuffDurationMultiplier(): number {
    return Math.max(0, 1 + (useStatsStore.getState().getStat('BuffDuration') / 100));
  }

  static getHealingMultiplier(): number {
    return Math.max(0, 1 + (useStatsStore.getState().getStat('HealingReceived') / 100));
  }

  static execute(skill: Skill, targetId?: string, cascadeDepth: number = 0) {
    const { addLog } = useCombatStore.getState();
    const statsState = useStatsStore.getState();
    const worldState = useWorldStore.getState();
    const playerState = usePlayerStore.getState();
    const inventoryState = useInventoryStore.getState();
    
    // Weapon checks
    const weapon = inventoryState.equipment['weapon1'];
    
    if (skill.requiredWeaponCategories && skill.requiredWeaponCategories.length > 0) {
       const weaponCat = weapon?.weaponCategory || 'Unarmed';
       if (!skill.requiredWeaponCategories.includes(weaponCat)) {
         addLog(`Cannot use ${skill.name} with a ${weaponCat}! Requires: ${skill.requiredWeaponCategories.join(', ')}`, 'system');
         return;
       }
    }
    
    // Calculate global multipliers for this skill
    const damageMultiplier = this.getDamageMultiplier(skill.tags);
    const healingMultiplier = this.getHealingMultiplier();
    const buffEffectMultiplier = this.getBuffEffectMultiplier();
    const buffDurationMultiplier = this.getBuffDurationMultiplier();
    const skillReach = statsState.getStat('SkillReach');
    
    // Build effective AoE config
    let effectiveAoeParams = skill.aoeParams ? {
      ...skill.aoeParams,
      falloff: skill.aoeParams.falloff ? { ...skill.aoeParams.falloff } : undefined,
      lingering: skill.aoeParams.lingering ? { ...skill.aoeParams.lingering } : undefined,
      cascade: skill.aoeParams.cascade ? { ...skill.aoeParams.cascade } : undefined
    } : undefined;

    if (effectiveAoeParams && skill.skillReachScaling) {
       for (const entry of skill.skillReachScaling) {
          if (skillReach >= entry.required) {
             switch (entry.effect) {
                case 'radius':
                   effectiveAoeParams.radius += entry.value;
                   break;
                case 'falloff':
                   effectiveAoeParams.falloff = { innerRadius: entry.inner, outerMultiplier: entry.outerDamage };
                   break;
                case 'lingering':
                   if (!effectiveAoeParams.lingering) {
                      effectiveAoeParams.lingering = { 
                        durationMs: 0, 
                        damagePerSecond: entry.damagePerTurn || 0,
                        hazardId: entry.hazardId || 'hazard',
                        element: entry.element || 'Strike'
                      };
                   }
                   effectiveAoeParams.lingering.durationMs += entry.duration;
                   if (entry.damagePerTurn) effectiveAoeParams.lingering.damagePerSecond = entry.damagePerTurn;
                   if (entry.hazardId) effectiveAoeParams.lingering.hazardId = entry.hazardId;
                   if (entry.element) effectiveAoeParams.lingering.element = entry.element;
                   break;
                case 'cascade':
                   effectiveAoeParams.cascade = { radius: entry.radius, chance: entry.chance, maxDepth: 1 };
                   break;
                case 'shape':
                   effectiveAoeParams.shape = entry.shape;
                   break;
             }
          }
       }
    }

    if (cascadeDepth === 0) {
       addLog(`You cast ${skill.name}.`, 'ability');
    }

    const playerPos = playerState.position;
    
    // Pre-calculate Area tiles if applicable
    let affectedTiles: {x: number, y: number}[] = [];
    if (skill.targeting === 'Area') {
       const shape = effectiveAoeParams?.shape || 'square';
       const radius = effectiveAoeParams?.radius || skill.range;
       const respectWalls = effectiveAoeParams?.respectWalls || false;
       
       let targetPos = null;
       if (targetId) {
         const t = worldState.enemies.find(e => e.id === targetId);
         if (t) targetPos = t.position;
       }

       const isSolid = (x: number, y: number) => {
         if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
         return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
       };

       affectedTiles = getAoETiles(
         playerPos,
         targetPos,
         shape,
         radius,
         respectWalls,
         isSolid,
         worldState.grid.width,
         worldState.grid.height
       );
    }

    for (const effect of skill.effects) {
       // 1. Gather all potential targets
       const allEntities = [
         { id: 'player', position: playerState.position, faction: 'player', name: 'You', isDead: playerState.currentHealth <= 0 },
         ...worldState.enemies
       ];

       // Filter by faction
       const filter = effect.targetFilter || 'Enemy';
       let validEntities = allEntities.filter(e => !e.isDead);
       
       if (filter === 'Enemy') {
          validEntities = validEntities.filter(e => e.faction === 'enemy');
       } else if (filter === 'Ally') {
          validEntities = validEntities.filter(e => e.faction === 'player');
       } else if (filter === 'Self') {
          validEntities = validEntities.filter(e => e.id === 'player');
       }

       // 2. Select targets based on TargetingType
       let finalTargets: { enemy: any, multiplier: number }[] = [];
       
       if (skill.targeting === 'Area') {
          // If lingering is enabled, spawn zones (only do this for the first effect to avoid spam, or tie it to the damage effect)
          if (effect.type === 'damage' && effectiveAoeParams?.lingering) {
             const { durationMs, hazardId, damagePerSecond, element } = effectiveAoeParams.lingering;
             const expiresAt = Date.now() + durationMs;
             for (const pt of affectedTiles) {
                 worldState.addZone({ position: pt, hazardId, damagePerSecond: damagePerSecond || 0, element: element || 'Strike', expiresAt });
             }
             addLog(`Spawned ${hazardId} zones.`, 'system');
          }

          const entitiesInArea = validEntities.filter(e => affectedTiles.some(pt => pt.x === e.position.x && pt.y === e.position.y));
          
          finalTargets = entitiesInArea.map(e => {
             let mult = 1;
             if (effectiveAoeParams?.falloff) {
                const dist = getChebyshevDistance(playerPos, e.position);
                if (dist > effectiveAoeParams.falloff.innerRadius) {
                   mult = effectiveAoeParams.falloff.outerMultiplier;
                }
             }
             return { enemy: e, multiplier: mult };
          });
       } else if (skill.targeting === 'Self') {
          const selfEntity = validEntities.find(e => e.id === 'player');
          if (selfEntity) finalTargets.push({ enemy: selfEntity, multiplier: 1 });
       } else if (targetId) {
          const t = validEntities.find(e => e.id === targetId);
          if (t) finalTargets.push({ enemy: t, multiplier: 1 });
       }

        // 3. Apply Effect to targets
       for (const { enemy, multiplier } of finalTargets) {
          let finalElement = effect.element || 'Strike';
      
          // If this is a weapon skill and it doesn't hardcode an element, inherit from weapon
          if (skill.requiredWeaponCategories && skill.requiredWeaponCategories.length > 0) {
             if (weapon && weapon.damageType && !effect.element) {
                finalElement = weapon.damageType;
             }
          }

          if (effect.type === 'damage') {
             const isAttackSkill = skill.tags.includes('Attack') || skill.tags.includes('Melee') || skill.tags.includes('Projectile');
             
             let base = effect.baseValue || 0;
             if (isAttackSkill) {
                base += statsState.getStat('Damage'); // Add weapon base damage
                
                // Weapon Enhancements
                if (finalElement === 'Strike') {
                    base += statsState.getStat('StrikeDamageToWeapons');
                } else if (finalElement === 'Pierce') {
                    base += statsState.getStat('PierceDamageToWeapons');
                } else if (finalElement === 'Fire') {
                    base += statsState.getStat('FireDamageToWeapons');
                } else if (finalElement === 'Cold') {
                    base += statsState.getStat('ColdDamageToWeapons');
                } else if (finalElement === 'Lightning') {
                    base += statsState.getStat('LightningDamageToWeapons');
                }
                
                if (finalElement === 'Fire' || finalElement === 'Cold' || finalElement === 'Lightning') {
                    const elementalMult = 1 + (statsState.getStat('WeaponElementalDamage') / 100);
                    base *= elementalMult;
                }
             }
             
             let finalDamage = base * damageMultiplier * multiplier;
             
             let defenderHasWeapon = true;
             let defenderHasShield = false;
             let defenderBaseBlockChance = 0;
             let enemyDefenderStats: Record<string, number> = {};
             
             if (enemy.id === 'player') {
                enemyDefenderStats = statsState.getAllStats();
                const inventoryState = useInventoryStore.getState();
                const weapon = inventoryState.equipment['weapon1'] || inventoryState.equipment['weapon2'];
                const shield = inventoryState.equipment['weapon2']?.itemType === 'shield' ? inventoryState.equipment['weapon2'] : undefined;
                defenderHasWeapon = !!weapon && weapon.itemType !== 'shield';
                defenderHasShield = !!shield;
                defenderBaseBlockChance = shield?.baseBlockChance || 0;
             } else {
                const targetObj = worldState.enemies.find(e => e.id === enemy.id);
                if (targetObj) {
                  enemyDefenderStats = {
                      'Armor': targetObj.stats.armor,
                      'FireResist': targetObj.stats.fireResist,
                      'ColdResist': targetObj.stats.coldResist,
                      'LightningResist': targetObj.stats.lightningResist,
                      'StrikeResist': (targetObj.stats.strikeResist || 0) + (targetObj.stats.physicalResist || 0),
                      'PierceResist': (targetObj.stats.pierceResist || 0) + (targetObj.stats.physicalResist || 0),
                      'PhysicalResist': targetObj.stats.physicalResist || 0
                   };
                }
             }
             
             // isAttackSkill defined above
             let baseCrit = skill.baseCritChance || 0;
             if (isAttackSkill && weapon?.baseCritChance !== undefined) {
               baseCrit = weapon.baseCritChance;
             }
             
             const { damage: finalMitigatedDamage, result } = DamageCalculator.calculateDamage(
                finalDamage,
                finalElement as DamageType,
                !isAttackSkill, // isSpell flag
                playerState.level,
                statsState.getAllStats(),
                enemyDefenderStats,
                baseCrit,
                defenderHasWeapon,
                defenderHasShield,
                defenderBaseBlockChance
             );

             if (result === 'deflect') {
                if (enemy.id === 'player') {
                   addLog(`You deflected your own attack!`, 'system');
                } else {
                   addLog(`You missed ${enemy.name}!`, 'system');
                }
             } else {
                 let resultText = '';
                 if (result === 'block') resultText = ' (Blocked)';
                 else if (result === 'parry') resultText = ' (Parried)';
                 else if (result === 'crit') resultText = ' (Critical Strike!)';
                 
                 // Apply Shock Multiplier
                 let shockMultiplier = 1.0;
                 const entityBuffs = useBuffStore.getState().entityBuffs[enemy.id] || [];
                 const shocks = entityBuffs.filter(b => b.buffId === 'shock');
                 if (shocks.length > 0) {
                   const highestShock = Math.max(...shocks.map(s => s.statModifiers[0]?.value || 10));
                   shockMultiplier = 1 + (highestShock / 100);
                 }
                 
                 const actualDamage = finalMitigatedDamage * shockMultiplier;
                 
                 if (enemy.id === 'player') {
                    playerState.takeDamage(actualDamage);
                    addLog(`You hit yourself for ${actualDamage.toFixed(0)} damage!${resultText}`, 'enemy-attack');
                 } else {
                    worldState.damageEnemy(enemy.id, actualDamage);
                    addLog(`You hit ${enemy.name} for ${actualDamage.toFixed(0)} ${finalElement} damage.${resultText}`, 'ability');
                    
                    // Ailment Application
                    if (actualDamage > 0) {
                      const statusPower = statsState.getStat('StatusEffectPower');
                      const statusDurMult = 1 + (statsState.getStat('StatusEffectDuration') / 100);
                      
                      if (finalElement === 'Fire') {
                        const burnEffect = statsState.getStat('BurnEffect');
                        const dotDurMult = 1 + (statsState.getStat('DoTDuration') / 100);
                        const dotDmgMult = 1 + (statsState.getStat('DoTDamage') / 100);
                        const dotDmg = actualDamage * 0.20 * dotDmgMult * (1 + burnEffect / 100);
                        
                        useBuffStore.getState().addBuff(enemy.id, {
                           buffId: 'burn',
                           name: 'Burn',
                           type: 'debuff',
                           stackingBehavior: 'independent',
                           durationMs: 4000 * dotDurMult,
                           maxDurationMs: 4000 * dotDurMult,
                           stacks: 1,
                           maxStacks: 1,
                           icon: 'Flame',
                           statModifiers: [],
                           isDoT: true,
                           dotDamagePerTick: dotDmg,
                           dotTickRateMs: 1000,
                           dotDamageType: 'Fire'
                        });
                      }
                      
                      if (finalElement === 'Cold') {
                        const chillEffect = statsState.getStat('ChillEffect');
                        const chillMagnitude = Math.min(75, 15 + Math.min(35, actualDamage / 5) + statusPower + chillEffect);
                        useBuffStore.getState().addBuff(enemy.id, {
                           buffId: 'chill',
                           name: 'Chill',
                           type: 'debuff',
                           stackingBehavior: 'independent',
                           durationMs: 4000 * statusDurMult,
                           maxDurationMs: 4000 * statusDurMult,
                           stacks: 1,
                           maxStacks: 1,
                           icon: 'Snowflake',
                           statModifiers: [{ stat: 'Damage', type: 'more', value: -chillMagnitude }]
                        });
                      }
                      
                      if (finalElement === 'Lightning') {
                        const shockEffect = statsState.getStat('ShockEffect');
                        const shockMagnitude = Math.min(100, 10 + Math.min(40, actualDamage / 5) + statusPower + shockEffect);
                        useBuffStore.getState().addBuff(enemy.id, {
                           buffId: 'shock',
                           name: 'Shock',
                           type: 'debuff',
                           stackingBehavior: 'independent',
                           durationMs: 4000 * statusDurMult,
                           maxDurationMs: 4000 * statusDurMult,
                           stacks: 1,
                           maxStacks: 1,
                           icon: 'Zap',
                           statModifiers: [{ stat: 'Damage', type: 'flat', value: shockMagnitude }] // We store magnitude here safely
                        });
                      }
                    }
                   
                   // Sustain
                   const lifeOnHit = statsState.getStat('LifeGainOnHit');
                   const lifesteal = statsState.getStat('Lifesteal');
                   const spellVamp = statsState.getStat('SpellVamp');
                   let totalSustain = 0;
                   if (lifeOnHit > 0) totalSustain += lifeOnHit;
                   if (lifesteal > 0 && isAttackSkill) totalSustain += actualDamage * (lifesteal / 100);
                   if (spellVamp > 0 && !isAttackSkill) totalSustain += actualDamage * (spellVamp / 100);
                   
                   const manaOnHit = statsState.getStat('ManaGainOnHit');
                   const manaLeech = statsState.getStat('ManaLeech');
                   let totalManaSustain = 0;
                   if (manaOnHit > 0) totalManaSustain += manaOnHit;
                   if (manaLeech > 0 && isAttackSkill) totalManaSustain += actualDamage * (manaLeech / 100);
                   
                   // On-Kill Effects
                   const targetObj = worldState.enemies.find(e => e.id === enemy.id);
                   if (targetObj && targetObj.health <= actualDamage) {
                       const lifeOnKill = statsState.getStat('LifeOnKill');
                       const manaOnKill = statsState.getStat('ManaOnKill');
                       if (lifeOnKill > 0) totalSustain += lifeOnKill;
                       if (manaOnKill > 0) totalManaSustain += manaOnKill;
                   }
                   
                   if (totalSustain > 0) {
                     playerState.heal(totalSustain);
                   }
                   if (totalManaSustain > 0) {
                     playerState.restoreMana(totalManaSustain);
                   }
                   
                   // Cascade
                   if (effectiveAoeParams?.cascade && cascadeDepth < (effectiveAoeParams.cascade.maxDepth || 1)) {
                      if (Math.random() <= effectiveAoeParams.cascade.chance) {
                         setTimeout(() => {
                            const cascadeTiles = getAoETiles(enemy.position, null, 'square', effectiveAoeParams!.cascade!.radius, false, () => false, worldState.grid.width, worldState.grid.height);
                            const cascadeTargets = worldState.enemies.filter(e => !e.isDead && cascadeTiles.some(pt => pt.x === e.position.x && pt.y === e.position.y));
                            addLog(`${enemy.name} cascades!`, 'ability');
                            for (const ct of cascadeTargets) {
                               worldState.damageEnemy(ct.id, finalDamage * 0.5);
                               addLog(`Cascade hits ${ct.name} for ${(finalDamage * 0.5).toFixed(0)} damage.`, 'ability');
                            }
                         }, 200);
                      }
                   }

                   // Handle Kill
                   const updatedTarget = useWorldStore.getState().enemies.find(e => e.id === enemy.id);
                   if (updatedTarget?.isDead && updatedTarget.faction === 'enemy') {
                      addLog(`You defeated ${enemy.name}!`, 'system');
                      
                      const xpGain = Math.max(1, Math.floor(updatedTarget.xpReward * (1 + statsState.getStat('ExperienceGain') / 100)));
                      const { leveledUp, newLevel } = playerState.addXp(xpGain);
                      addLog(`You gained ${xpGain} XP.`, 'system');
                      if (leveledUp) addLog(`Level Up! You are now Level ${newLevel}!`, 'system');
                      if (playerState.activeTargetId === enemy.id) playerState.setTarget(null);
                   }
                }
             }
          }
          else if (effect.type === 'heal') {
             const healAmount = (effect.baseValue || 0) * multiplier * healingMultiplier;
             if (enemy.id === 'player') {
                playerState.heal(healAmount);
                addLog(`You recovered ${healAmount.toFixed(0)} HP.`, 'ability');
             } else {
                // Heals minion
                const currentEnemy = worldState.enemies.find(e => e.id === enemy.id);
                if (currentEnemy) {
                   const maxHealth = currentEnemy.stats.maxHealth;
                   const newHealth = Math.min(maxHealth, currentEnemy.health + healAmount);
                   worldState.damageEnemy(enemy.id, currentEnemy.health - newHealth); // Negative damage = heal
                   addLog(`You healed ${enemy.name} for ${healAmount.toFixed(0)} HP.`, 'ability');
                }
             }
          }
          else if (effect.type === 'buff' && effect.buffId) {
             const finalDuration = effect.durationMs ? effect.durationMs * buffDurationMultiplier : null;
             
             // Scale stat modifiers if they are numeric
             const scaledModifiers = (effect.statModifiers || []).map(m => ({
               ...m,
               value: m.value * buffEffectMultiplier
             }));

             if (enemy.id === 'player') {
                useBuffStore.getState().addBuff('player', {
                   buffId: effect.buffId,
                   name: effect.buffName || skill.name,
                   type: 'buff',
                   stackingBehavior: 'independent',
                   durationMs: finalDuration,
                   maxDurationMs: finalDuration,
                   stacks: 1,
                   maxStacks: 1,
                   icon: skill.icon,
                   statModifiers: scaledModifiers
                });
                addLog(`You gain ${effect.buffName || skill.name}!`, 'ability');
             } else {
                addLog(`${enemy.name} gains ${effect.buffName || skill.name}.`, 'ability');
                // We'd need an enemy buff store to actually apply stats, but for now log it
             }
          }
       }

       // 4. Handle Summons
       if (effect.type === 'summon' && effect.summonParams) {
          // Just spawn them adjacent to player
          // Wait, we need the enemy template. For MVP, let's hardcode a skeleton template
          // or fetch it if we had a data store. The user said "summons will be units on the grid that have their own ai".
          const spawnPos = { x: playerPos.x + 1, y: playerPos.y }; // Naive spawn for now
          
          worldState.spawnEnemy({
             templateId: effect.summonParams.templateId,
             name: 'Summoned Minion',
             level: playerState.level,
             position: spawnPos,
             health: 100, // Placeholder
             aiProfile: 'melee_rusher',
             faction: 'player', // Ally!
             xpReward: 0,
             stats: {
                maxHealth: 100,
                attackPower: 10,
                attackSpeed: 1,
                attackRange: 1,
                moveSpeed: 1.5,
                aggroRange: 5,
                armor: 0, fireResist: 0, coldResist: 0, lightningResist: 0
             }
          });
          addLog(`Summoned a minion!`, 'ability');
       }
    }

    if (skill.onExecute) {
      skill.onExecute('player', targetId || '');
    }
  }
}
