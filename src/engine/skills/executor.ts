import type { Skill, SkillTag } from './types';
import type { DamageType } from '../stats/types';
import { useStatsStore } from '../../store/useStatsStore';
import { useCombatStore } from '../../store/useCombatStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useWorldStore } from '../../store/useWorldStore';
import { useBuffStore } from '../../store/useBuffStore';
import { useInventoryStore } from '../../store/useInventoryStore';
// removed unused useMessageStore
import { useAppStore } from '../../store/useAppStore';

import { getAoETiles, getChebyshevDistance, getTShapeTiles } from '../world/gridMath';
import { DamageCalculator } from '../combat/DamageCalculator';
import { getWeaponSkillDamage } from '../combat/WeaponDPS';

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

    // Gather all matching modifiers. 
    // Damage is now purely percentage, so we just add its flat sum (since all percent modifiers are now type: 'flat')
    const globalDamage = useStatsStore.getState().getStat('Damage') / 100;
    increasedSum += globalDamage;

    for (const mod of modifiers) {
      if (applicableStats.includes(mod.stat)) {
        if (mod.type === 'more') {
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

  static execute(skill: Skill, targetId?: string, targetPos?: {x: number, y: number}, cascadeDepth: number = 0) {
    const { addLog } = useCombatStore.getState();
    const statsState = useStatsStore.getState();
    const worldState = useWorldStore.getState();
    const playerState = usePlayerStore.getState();
    const inventoryState = useInventoryStore.getState();
    
    useCombatStore.getState().triggerCombatEvent();
    
    if (cascadeDepth === 0) {
      const reduction = statsState.getStat('EnergyCostReduction');
      const effectiveEnergy = Math.max(0, Math.floor(skill.energyCost * (1 - (reduction / 100))));
      if (!playerState.useEnergy(effectiveEnergy)) {
        addLog(`Not enough energy for ${skill.name}.`, 'system');
        return;
      }

      if (skill.adrenalineCost) {
        if (!playerState.useAdrenaline(skill.adrenalineCost)) {
          addLog(`Not enough adrenaline for ${skill.name}.`, 'system');
          return;
        }
      }
    }
    
    const weapon1 = inventoryState.equipment['weapon1'];
    const weapon2 = inventoryState.equipment['weapon2'];
    
    if (skill.requiredWeaponCategories && skill.requiredWeaponCategories.length > 0) {
       const w1Cat = weapon1?.weaponCategory || 'Unarmed';
       const w1Valid = skill.requiredWeaponCategories.includes(w1Cat);
       
       let w2Valid = true;
       if (weapon2 && weapon2.itemType !== 'shield' && weapon2.weaponCategory) {
         w2Valid = skill.requiredWeaponCategories.includes(weapon2.weaponCategory);
       }
       
       // At least one weapon must meet the requirement, AND neither weapon can violate it (unless shield)
       const hasRequirement = (weapon1 && w1Valid) || (weapon2 && weapon2.itemType !== 'shield' && w2Valid);
       const noViolations = (!weapon1 || w1Valid) && (!weapon2 || weapon2.itemType === 'shield' || w2Valid);

       if (!hasRequirement || !noViolations) {
         addLog(`Cannot use ${skill.name} with current weapons! Requires: ${skill.requiredWeaponCategories.join(', ')}`, 'system');
         return;
       }
    }
    
    // Calculate global multipliers for this skill
    const damageMultiplier = this.getDamageMultiplier(skill.tags);
    const healingMultiplier = this.getHealingMultiplier();
    const buffEffectMultiplier = this.getBuffEffectMultiplier();
    const buffDurationMultiplier = this.getBuffDurationMultiplier();
    const skillReach = statsState.getStat('SkillReach');

    // Zealous Blow: if the player has the "next skill +25% damage" empowerment active,
    // this whole cast (all targets/hits within it) benefits, then it's consumed once.
    const zealousBlowBuff = skill.id !== 'basic_attack'
      ? (useBuffStore.getState().entityBuffs['player'] || []).find(b => b.buffId === 'zealous_blow_empowered')
      : undefined;
    const zealousBlowActive = !!zealousBlowBuff;
    if (zealousBlowBuff && cascadeDepth === 0) {
      useBuffStore.getState().removeBuff('player', zealousBlowBuff.id);
    }
    
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
    let finalTargetPos = targetPos;
    if (!finalTargetPos && targetId) {
      const t = worldState.enemies.find(e => e.id === targetId);
      if (t) finalTargetPos = t.position;
    }

    if (skill.targeting === 'Area' || skill.targeting === 'Ground' || skill.targeting === 'Directional') {
       const shape = effectiveAoeParams?.shape || 'square';
       const radius = effectiveAoeParams?.radius || skill.range || 0;
       const respectWalls = effectiveAoeParams?.respectWalls || false;

       const isSolid = (x: number, y: number) => {
         if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
         return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
       };

       let center = playerPos;
       let target = null;

       if (skill.targeting === 'Area') {
         // Area usually centers on the target if it's ranged, or player if point blank
         center = (skill.range > 0 && finalTargetPos) ? finalTargetPos : playerPos;
       } else if (skill.targeting === 'Ground') {
         center = finalTargetPos || playerPos;
       } else if (skill.targeting === 'Directional') {
          center = playerPos;
          // For melee Directional AoE skills the underlying shapes (cone, rect) already snap
          // to the nearest cardinal axis, so diagonal target positions produce the same shape
          // as their dominant-axis cardinal.  Rather than blindly forwarding the raw target
          // tile, score all 4 cardinals by how many enemies they catch inside the AoE and
          // choose the best one.  Ties are broken by proximity to where the player actually
          // aimed so the skill still feels responsive when counts are equal.
          if (skill.tags.includes('Melee') && skill.tags.includes('AoE') && effectiveAoeParams) {
            const cardinals = [
              { x: playerPos.x,     y: playerPos.y - 1 }, // North
              { x: playerPos.x + 1, y: playerPos.y     }, // East
              { x: playerPos.x,     y: playerPos.y + 1 }, // South
              { x: playerPos.x - 1, y: playerPos.y     }, // West
            ];

            const scoreDirection = (dirTile: {x: number, y: number}): number => {
              const testTiles = getAoETiles(
                playerPos,
                dirTile,
                effectiveAoeParams!.shape,
                effectiveAoeParams!.radius,
                effectiveAoeParams!.respectWalls || false,
                isSolid,
                worldState.grid.width,
                worldState.grid.height
              );
              return worldState.enemies.filter(
                e => !e.isDead && testTiles.some(pt => pt.x === e.position.x && pt.y === e.position.y)
              ).length;
            };

            const rawTarget = finalTargetPos || playerPos;
            let bestDir = cardinals[0];
            let bestScore = -1;
            let bestProximity = Infinity;

            for (const dir of cardinals) {
              const score = scoreDirection(dir);
              const proximity = Math.abs(dir.x - rawTarget.x) + Math.abs(dir.y - rawTarget.y);
              if (score > bestScore || (score === bestScore && proximity < bestProximity)) {
                bestScore = score;
                bestProximity = proximity;
                bestDir = dir;
              }
            }

            target = bestDir;
          } else {
            target = finalTargetPos || playerPos;
          }
        }

       if (effectiveAoeParams) {
         affectedTiles = getAoETiles(
           center,
           target,
           shape,
           radius,
           respectWalls,
           isSolid,
           worldState.grid.width,
           worldState.grid.height
         );

         // AoE skills should never visually or mechanically affect the player's own tile
         // (the player isn't a valid 'Enemy' target anyway, but including their tile in the
         // VFX/eruption pass is confusing - it looks like the skill is striking the caster).
         affectedTiles = affectedTiles.filter(pt => !(pt.x === playerPos.x && pt.y === playerPos.y));
       }
    }

    // Determine VFX Color
     let vfxColor = 0xffffff;
     const inv = useInventoryStore.getState();
     let finalElem = skill.effects.find(e => e.type === 'damage')?.element;
     
     if (!finalElem) {
        if (skill.tags.includes('Fire')) finalElem = 'Fire';
        else if (skill.tags.includes('Cold')) finalElem = 'Cold';
        else if (skill.tags.includes('Lightning')) finalElem = 'Lightning';
     }

     if (!finalElem || (skill as any).damageType === 'Weapon') {
        const w1 = inv.equipment['weapon1'];
        finalElem = w1 ? (w1 as any).damageType : 'Strike';
     }

     if (finalElem === 'Fire') vfxColor = 0xf97316; // Orange-500
     else if (finalElem === 'Cold') vfxColor = 0x38bdf8; // Sky-400 (Ice Blue)
     else if (finalElem === 'Lightning') vfxColor = 0xa855f7; // Purple-500 (Electric Purple)
     else if ((finalElem as string) === 'Poison') vfxColor = 0x4ade80; // Green-400
     else if (finalElem === 'Strike') vfxColor = 0xd4d4d8; // Zinc-300 (Silver)
     else if (finalElem === 'Pierce') vfxColor = 0x94a3b8; // Slate-400 (Sharp metal)
     else if (finalElem === 'Physical') vfxColor = 0xd4d4d8; // Zinc-300 (Silver fallback)

     // Dispatch AoE tile effects (skipped here for skills with a 'leap' effect - their AoE
     // is centered on the actual landing tile, resolved below inside the effects loop, not
     // the original clicked position)
     const hasLeapEffect = skill.effects.some(e => e.type === 'leap');
     if (!hasLeapEffect) {
        if (affectedTiles.length > 0) {
           affectedTiles.forEach(pt => {
              useCombatStore.getState().addTileEffect(pt.x, pt.y, 'eruption', vfxColor);
           });
        } else if (finalTargetPos && skill.targeting !== 'Self') {
           // Single target hit effect on the target's tile (skipped for Self-targeted skills like
           // buffs, which have no gameplay reason to flash an eruption on the enemy's tile)
           useCombatStore.getState().addTileEffect(finalTargetPos.x, finalTargetPos.y, 'eruption', vfxColor);
        }
     }

    let anyHitRequired = skill.effects.some(e => e.adrenalineOnlyOnHit);
    let anyTargetHit = false;

    for (const effect of skill.effects) {
       if (effect.type === 'charge') {
           let dest: {x: number, y: number} | null = null;
           let focusPos = targetPos;

           if (targetId) {
               const targetEntity = worldState.enemies.find(e => e.id === targetId);
               if (targetEntity) focusPos = targetEntity.position;
           }

           if (focusPos) {
               const dist = getChebyshevDistance(playerState.position, focusPos);
               if (dist > 1 || !targetId) {
                   // If charging to ground (no targetId) and it's empty, we can just go there
                   const isWall = worldState.grid.obstacles.some(o => o.x === focusPos!.x && o.y === focusPos!.y);
                   const isEnemy = worldState.enemies.some(e => !e.isDead && e.position.x === focusPos!.x && e.position.y === focusPos!.y);
                   
                   if (!targetId && !isWall && !isEnemy) {
                       dest = focusPos;
                   } else {
                       // Find adjacent tile closest to player
                       const neighbors = [
                          { x: focusPos.x, y: focusPos.y - 1 },
                          { x: focusPos.x + 1, y: focusPos.y - 1 },
                          { x: focusPos.x + 1, y: focusPos.y },
                          { x: focusPos.x + 1, y: focusPos.y + 1 },
                          { x: focusPos.x, y: focusPos.y + 1 },
                          { x: focusPos.x - 1, y: focusPos.y + 1 },
                          { x: focusPos.x - 1, y: focusPos.y },
                          { x: focusPos.x - 1, y: focusPos.y - 1 }
                       ];
                       
                       let bestNeighbor = null;
                       let bestDist = Infinity;
                       
                       for (const n of neighbors) {
                           if (n.x < 0 || n.x >= worldState.grid.width || n.y < 0 || n.y >= worldState.grid.height) continue;
                           if (worldState.grid.obstacles.some(o => o.x === n.x && o.y === n.y)) continue;
                           if (worldState.enemies.some(e => !e.isDead && e.position.x === n.x && e.position.y === n.y)) continue;
                           
                           const d = (n.x - playerState.position.x) ** 2 + (n.y - playerState.position.y) ** 2;
                           if (d < bestDist) {
                               bestDist = d;
                               bestNeighbor = n;
                           }
                       }
                       if (bestNeighbor) dest = bestNeighbor;
                   }
               }
           }

           if (dest) {
               playerState.setPosition(dest.x, dest.y);
               if (targetId) {
                 const tName = worldState.enemies.find(e => e.id === targetId)?.name || 'target';
                 addLog(`You charge at ${tName}!`, 'ability');
               } else {
                 addLog(`You charge forward!`, 'ability');
               }
           } else if (targetId || targetPos) {
               addLog(`No path to charge!`, 'system');
           }
       }

       if (effect.type === 'leap') {
           if (targetPos) {
               const isSolidTile = (x: number, y: number) => {
                 if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
                 return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
               };
               const isOccupiedTile = (x: number, y: number) => worldState.enemies.some(e => !e.isDead && e.position.x === x && e.position.y === y);

               let dest: {x: number, y: number} | null = null;

               if (!isSolidTile(targetPos.x, targetPos.y) && !isOccupiedTile(targetPos.x, targetPos.y)) {
                  // Destination tile itself is free - leap straight there
                  dest = { x: targetPos.x, y: targetPos.y };
               } else {
                  // Destination is a wall or an enemy (e.g. leaping "onto" a targeted enemy) -
                  // land on the nearest free tile adjacent to it instead, same as Charge does.
                  const neighbors = [
                     { x: targetPos.x, y: targetPos.y - 1 },
                     { x: targetPos.x + 1, y: targetPos.y - 1 },
                     { x: targetPos.x + 1, y: targetPos.y },
                     { x: targetPos.x + 1, y: targetPos.y + 1 },
                     { x: targetPos.x, y: targetPos.y + 1 },
                     { x: targetPos.x - 1, y: targetPos.y + 1 },
                     { x: targetPos.x - 1, y: targetPos.y },
                     { x: targetPos.x - 1, y: targetPos.y - 1 }
                  ];

                  let bestNeighbor = null;
                  let bestDist = Infinity;
                  for (const n of neighbors) {
                     if (isSolidTile(n.x, n.y) || isOccupiedTile(n.x, n.y)) continue;
                     // Must still be within the skill's leap range from the player's current position
                     if (getChebyshevDistance(playerState.position, n) > skill.range) continue;
                     const d = (n.x - playerState.position.x) ** 2 + (n.y - playerState.position.y) ** 2;
                     if (d < bestDist) {
                        bestDist = d;
                        bestNeighbor = n;
                     }
                  }
                  if (bestNeighbor) dest = bestNeighbor;
               }

               if (dest) {
                   // Bypass the normal 750ms movement cooldown entirely (instant reposition)
                   playerState.setPosition(dest.x, dest.y);
                   addLog(`You leap forward!`, 'ability');

                   // The skill's AoE (damage targeting, eruption VFX, hit-effect source position)
                   // must center on where the player actually LANDED, not the originally clicked
                   // tile - recompute both now that dest is known.
                   finalTargetPos = dest;
                   if (effectiveAoeParams) {
                      const isSolidForAoe = (x: number, y: number) => {
                        if (x < 0 || x >= worldState.grid.width || y < 0 || y >= worldState.grid.height) return true;
                        return worldState.grid.obstacles.some(o => o.x === x && o.y === y);
                      };
                      affectedTiles = getAoETiles(
                        dest,
                        null,
                        effectiveAoeParams.shape,
                        effectiveAoeParams.radius,
                        effectiveAoeParams.respectWalls || false,
                        isSolidForAoe,
                        worldState.grid.width,
                        worldState.grid.height
                      ).filter(pt => !(pt.x === playerState.position.x && pt.y === playerState.position.y));
                   }

                   // Eruption VFX was deferred until landing was resolved (see above) - dispatch
                   // it now, centered on the real landing zone.
                   affectedTiles.forEach(pt => {
                      useCombatStore.getState().addTileEffect(pt.x, pt.y, 'eruption', vfxColor);
                   });

                   // Interrupt any enemy casts/channels caught in the landing zone (3x3, computed via affectedTiles below)
                   const landingTiles = getAoETiles(
                     dest,
                     null,
                     'square',
                     1,
                     false,
                     () => false,
                     worldState.grid.width,
                     worldState.grid.height
                   );
                   const now = useAppStore.getState().getGameTime();
                   const stunOnInterruptMs = skill.effects.find(e => e.stunOnInterruptMs)?.stunOnInterruptMs;
                   worldState.enemies.forEach(e => {
                     if (e.isDead) return;
                     if (!landingTiles.some(pt => pt.x === e.position.x && pt.y === e.position.y)) return;
                     if (e.channelingUntil && e.channelingUntil > now) {
                        worldState.updateEnemy(e.id, { channelingUntil: 0 });
                        addLog(`${e.name}'s cast was interrupted!`, 'ability');
                        if (stunOnInterruptMs) {
                           useBuffStore.getState().applyStun(e.id, stunOnInterruptMs);
                           addLog(`${e.name} is stunned!`, 'ability');
                        }
                     }
                   });
               } else {
                   addLog(`No open tile to leap to!`, 'system');
               }
           }
       }

       // 1. Gather all potential targets
       const allEntities = [
         { id: 'player', position: playerState.position, faction: 'player', name: 'You', isDead: playerState.currentHealth <= 0 },
         ...worldState.enemies
       ];

       // Filter by faction
       const filter = effect.targetFilter || (effect.type === 'buff' || effect.type === 'heal' ? 'Ally' : 'Enemy');
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
       
       if (skill.targeting === 'Area' || skill.targeting === 'Directional' || (skill.targeting === 'Ground' && effectiveAoeParams)) {
          // If lingering is enabled, spawn zones (only do this for the first effect to avoid spam, or tie it to the damage effect)
          if (effect.type === 'damage' && effectiveAoeParams?.lingering) {
             const { durationMs, hazardId, damagePerSecond, element } = effectiveAoeParams.lingering;
             const expiresAt = useAppStore.getState().getGameTime() + durationMs;
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
       } else if (filter === 'Self' || filter === 'Ally') {
          // Non-Self-targeting skills (e.g. Single-target enemy attacks) can still carry a
          // secondary buff/heal effect that should land on the player rather than the enemy
          // targetId (e.g. Zealous Blow's "next skill +25% damage" self-buff).
          const selfEntity = validEntities.find(e => e.id === 'player');
          if (selfEntity) finalTargets.push({ enemy: selfEntity, multiplier: 1 });
       } else if (targetId) {
          const t = validEntities.find(e => e.id === targetId);
          if (t) finalTargets.push({ enemy: t, multiplier: 1 });
       }

        // 3. Apply Effect to targets
       if (finalTargets.length > 0) {
          anyTargetHit = true;
       }

       for (const { enemy, multiplier } of finalTargets) {
          let finalElement = effect.element || 'Strike';
          if (skill.requiredWeaponCategories && skill.requiredWeaponCategories.length > 0) {
             if (weapon1 && weapon1.damageType && !effect.element) {
                finalElement = weapon1.damageType;
             }
          }

          if (effect.type === 'damage') {
             const isAttackSkill = skill.tags.includes('Attack') || skill.tags.includes('Melee') || skill.tags.includes('Projectile');
             
             let base = effect.baseValue || 0;
             if (isAttackSkill) {
                // Core skill damage formula: Skill_Damage = (Weapon_DPS * 2.0) * Skill_Multiplier.
                // getWeaponSkillDamage() already includes the DPS scalar; main hand contributes
                // fully, off hand contributes 50%, so slower/heavier weapons (e.g. 2H) don't
                // out-damage faster ones on skills.
                base += getWeaponSkillDamage();
             
                if (effect.damageMultiplier) {
                    base *= effect.damageMultiplier;
                }   
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
             } else if (skill.tags.includes('Spell')) {
                // Spell Enhancements
                const effectiveness = effect.damageEffectiveness || 1.0;
                if (finalElement === 'Strike') {
                    base += statsState.getStat('StrikeDamageToSpells') * effectiveness;
                } else if (finalElement === 'Pierce') {
                    base += statsState.getStat('PierceDamageToSpells') * effectiveness;
                } else if (finalElement === 'Fire') {
                    base += statsState.getStat('FireDamageToSpells') * effectiveness;
                } else if (finalElement === 'Cold') {
                    base += statsState.getStat('ColdDamageToSpells') * effectiveness;
                } else if (finalElement === 'Lightning') {
                    base += statsState.getStat('LightningDamageToSpells') * effectiveness;
                }
             }
             
             let tagIncreasedSum = 0;
             if (skill.tags.includes('Melee')) tagIncreasedSum += statsState.getStat('MeleeDamage') / 100;
             if (skill.tags.includes('Spell')) tagIncreasedSum += statsState.getStat('SpellDamage') / 100;
             if (skill.tags.includes('Area') || skill.tags.includes('AoE')) tagIncreasedSum += statsState.getStat('AreaDamage') / 100;
             if (skill.tags.includes('Projectile')) tagIncreasedSum += statsState.getStat('RangedDamage') / 100;
             if (skill.id !== 'basic_attack') tagIncreasedSum += statsState.getStat('SkillDamage') / 100;

             if (finalElement === 'Strike') tagIncreasedSum += statsState.getStat('StrikeDamage') / 100;
             if (finalElement === 'Pierce') tagIncreasedSum += statsState.getStat('PierceDamage') / 100;
             if (finalElement === 'Fire') tagIncreasedSum += statsState.getStat('FireDamage') / 100;
             if (finalElement === 'Cold') tagIncreasedSum += statsState.getStat('ColdDamage') / 100;
             if (finalElement === 'Lightning') tagIncreasedSum += statsState.getStat('LightningDamage') / 100;

             if (finalElement === 'Strike' || finalElement === 'Pierce') tagIncreasedSum += statsState.getStat('PhysicalDamage') / 100;
             if (finalElement === 'Fire' || finalElement === 'Cold' || finalElement === 'Lightning') tagIncreasedSum += statsState.getStat('ElementalDamage') / 100;

             let finalDamage = base * damageMultiplier * multiplier * (1 + tagIncreasedSum);
             
             if (effect.bonusDamagePerSunderStack) {
                const sunderStacks = useBuffStore.getState().getSunderStacks(enemy.id);
                finalDamage *= (1 + (sunderStacks * effect.bonusDamagePerSunderStack / 100));
             }
             if (effect.bonusDamageIfSundered) {
                const hasSunderStack = useBuffStore.getState().getSunderStacks(enemy.id) > 0;
                if (hasSunderStack) {
                   finalDamage *= (1 + (effect.bonusDamageIfSundered / 100));
                }
             }
             if (zealousBlowActive) {
                finalDamage *= 1.25;
             }
             
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
                  const sunderReduction = useBuffStore.getState().getSunderArmorReduction(enemy.id);
                  enemyDefenderStats = {
                      'Armor': targetObj.stats.armor * (1 - sunderReduction),
                      'FireResist': targetObj.stats.fireResist,
                      'ColdResist': targetObj.stats.coldResist,
                      'LightningResist': targetObj.stats.lightningResist,
                      'StrikeResist': (targetObj.stats.strikeResist || 0) + (targetObj.stats.physicalResist || 0),
                      'PierceResist': (targetObj.stats.pierceResist || 0) + (targetObj.stats.physicalResist || 0),
                      'PhysicalResist': targetObj.stats.physicalResist || 0,
                      'DeflectChance': targetObj.stats.deflectChance || 0,
                      'DeflectAmount': targetObj.stats.deflectEffect || 0,
                      'Block': targetObj.stats.block || 0,
                      'SpellBlock': targetObj.stats.spellBlock || 0,
                      'BlockAmount': targetObj.stats.blockEffect || 0,
                      'Parry': targetObj.stats.parry || 0,
                      'SpellParry': targetObj.stats.spellParry || 0,
                      'ParryAmount': targetObj.stats.parryEffect || 0,
                   };
                   
                   // Enemies with block stats are assumed to have a shield for mechanic purposes
                   if (targetObj.stats.block || targetObj.stats.spellBlock) {
                      defenderHasShield = true;
                      defenderHasWeapon = true;
                   } else if (targetObj.stats.parry || targetObj.stats.spellParry) {
                      defenderHasWeapon = true;
                   }
                }
             }
             
             // isAttackSkill defined above
             let baseCrit = skill.baseCritChance || 0;
             if (isAttackSkill && weapon1?.baseCritChance !== undefined) {
               baseCrit = weapon1.baseCritChance;
             }
             
             const { damage: finalMitigatedDamage, result } = DamageCalculator.calculateDamage(
                finalDamage,
                finalElement as DamageType,
                !isAttackSkill, // isSpell flag
                playerState.level,
                enemy.id === 'player' ? playerState.level : (worldState.enemies.find(e => e.id === enemy.id)?.level || 1),
                statsState.getAllStats(),
                enemyDefenderStats,
                baseCrit,
                defenderHasWeapon,
                defenderHasShield,
                defenderBaseBlockChance
             );

             let resultText = '';
             if (result === 'block') resultText = ' (Blocked)';
             else if (result === 'parry') resultText = ' (Parried)';
             else if (result === 'deflect') resultText = ' (Deflected)';
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
                 
                 // Floating combat text renders the source skill's icon + a slightly larger
                 // font for any real skill cast (not the plain auto-attack basic_attack id).
                 const isRealSkillCast = skill.id !== 'basic_attack';
                 const floatingTextSkillOptions = isRealSkillCast ? { skillIcon: skill.icon, isSkillDamage: true } : {};
                 
                 if (enemy.id === 'player') {
                    playerState.takeDamage(actualDamage);
                    let displayString = actualDamage.toFixed(0);
                    if (result === 'block') displayString += ' (Block)';
                    else if (result === 'parry') displayString += ' (Parry)';
                    else if (result === 'deflect') displayString += ' (Deflect)';
                    
                    useCombatStore.getState().addFloatingText(playerState.position.x, playerState.position.y, displayString, { colorClass: 'text-red-400', isCrit: result === 'crit', ...floatingTextSkillOptions });
                    useCombatStore.getState().addHitEffect('player', playerState.position.x, playerState.position.y, vfxColor, finalElement);
                    addLog(`You hit yourself for ${actualDamage.toFixed(0)} damage!${resultText}`, 'enemy-attack');
                 } else {
                    worldState.damageEnemy(enemy.id, actualDamage);
                    useCombatStore.getState().setLastDamageDealtTime(Date.now());
                    
                    let dmgColor = 'text-zinc-200';
                    if (finalElement === 'Pierce') dmgColor = 'text-stone-300';
                    else if (finalElement === 'Fire') dmgColor = 'text-orange-500';
                    else if (finalElement === 'Cold') dmgColor = 'text-blue-300';
                    else if (finalElement === 'Lightning') dmgColor = 'text-purple-500';
                    
                    let displayString = actualDamage.toFixed(0);
                    if (result === 'block') displayString += ' (Block)';
                    else if (result === 'parry') displayString += ' (Parry)';
                    else if (result === 'deflect') displayString += ' (Deflect)';

                    useCombatStore.getState().addFloatingText(enemy.position.x, enemy.position.y, displayString, { colorClass: dmgColor, isCrit: result === 'crit', ...floatingTextSkillOptions });
                    
                    // For AoE skills, source is the center of the cast. Otherwise, it's the player.
                    const srcX = (skill.targeting === 'Area' || skill.targeting === 'Ground') && finalTargetPos ? finalTargetPos.x : playerState.position.x;
                    const srcY = (skill.targeting === 'Area' || skill.targeting === 'Ground') && finalTargetPos ? finalTargetPos.y : playerState.position.y;
                    
                    useCombatStore.getState().addHitEffect(enemy.id, srcX, srcY, vfxColor, finalElement);
                    
                    addLog(`You hit ${enemy.name} for ${actualDamage.toFixed(0)} ${finalElement} damage.${resultText}`, 'ability');
                    
                    // Universal Sunder application
                    if (effect.applySunderStacks && effect.applySunderStacks > 0) {
                       useBuffStore.getState().applySunder(enemy.id, effect.applySunderStacks);
                    }
                    
                    // Zealous Blow Proc: melee skill hits also have a 5% chance to open the
                    // 6s "Zealous Blow" window (mirrors the auto-attack proc in useGameEngine.ts).
                    if (skill.tags.includes('Melee') && Math.random() < 0.05) {
                       const alreadyReady = (useBuffStore.getState().entityBuffs['player'] || []).some(b => b.buffId === 'zealous_blow_ready');
                       useBuffStore.getState().addBuff('player', {
                          buffId: 'zealous_blow_ready',
                          name: 'Zealous Blow Ready',
                          type: 'buff',
                          stackingBehavior: 'refresh',
                          durationMs: 6000,
                          maxDurationMs: 6000,
                          stacks: 1,
                          maxStacks: 1,
                          icon: 'Sparkles',
                          statModifiers: []
                       });
                       if (!alreadyReady) addLog(`Zealous Blow is ready!`, 'ability');
                    }
                    
                    // Universal Knockdown (only if target currently has Sunder stacks)
                    if (effect.knockdownIfSundered) {
                       const hasSunder = useBuffStore.getState().getSunderStacks(enemy.id) > 0;
                       if (hasSunder) {
                          useBuffStore.getState().applyKnockdown(enemy.id, effect.knockdownDurationMs || 1500);
                          addLog(`${enemy.name} is knocked down!`, 'ability');
                       }
                    }

                    // T-Shape collateral explosion (e.g. Shield Break at 3+ Sunder stacks)
                    if (effect.tShapeSunderThreshold && effect.tShapeDamageMultiplier) {
                       const sunderStacks = useBuffStore.getState().getSunderStacks(enemy.id);
                       if (sunderStacks >= effect.tShapeSunderThreshold) {
                          const tShapeTiles = getTShapeTiles(playerState.position, enemy.position, worldState.grid.width, worldState.grid.height);
                          if (tShapeTiles.length > 0) {
                             tShapeTiles.forEach(pt => useCombatStore.getState().addTileEffect(pt.x, pt.y, 'eruption', vfxColor));
                             const collateralTargets = worldState.enemies.filter(e2 => !e2.isDead && e2.id !== enemy.id && tShapeTiles.some(pt => pt.x === e2.position.x && pt.y === e2.position.y));
                             const tShapeBase = getWeaponSkillDamage() * effect.tShapeDamageMultiplier;
                             collateralTargets.forEach(target2 => {
                                const sunderReduction2 = useBuffStore.getState().getSunderArmorReduction(target2.id);
                                const defenderStats2 = {
                                   'Armor': target2.stats.armor * (1 - sunderReduction2),
                                   'FireResist': target2.stats.fireResist,
                                   'ColdResist': target2.stats.coldResist,
                                   'LightningResist': target2.stats.lightningResist,
                                   'StrikeResist': (target2.stats.strikeResist || 0) + (target2.stats.physicalResist || 0),
                                   'PierceResist': (target2.stats.pierceResist || 0) + (target2.stats.physicalResist || 0),
                                   'PhysicalResist': target2.stats.physicalResist || 0
                                };
                                const { damage: collateralDamage } = DamageCalculator.calculateDamage(
                                   tShapeBase * damageMultiplier,
                                   'Strike',
                                   false,
                                   playerState.level,
                                   target2.level,
                                   statsState.getAllStats(),
                                   defenderStats2,
                                   0,
                                   true,
                                   false,
                                   0
                                );
                                worldState.damageEnemy(target2.id, collateralDamage);
                                useCombatStore.getState().addFloatingText(target2.position.x, target2.position.y, collateralDamage.toFixed(0), { colorClass: 'text-zinc-200' });
                                useCombatStore.getState().addHitEffect(target2.id, enemy.position.x, enemy.position.y, vfxColor, 'Strike');
                                addLog(`The collateral explosion staggers ${target2.name} for ${collateralDamage.toFixed(0)} damage!`, 'ability');
                             });
                          }
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
                   
                   const manaOnHit = statsState.getStat('EnergyGainOnHit');
                   const manaLeech = statsState.getStat('EnergyLeech');
                   let totalManaSustain = 0;
                   if (manaOnHit > 0) totalManaSustain += manaOnHit;
                   if (manaLeech > 0 && isAttackSkill) totalManaSustain += actualDamage * (manaLeech / 100);
                   
                   // On-Kill Effects
                   const targetObj = worldState.enemies.find(e => e.id === enemy.id);
                   if (targetObj && targetObj.health <= actualDamage) {
                       const lifeOnKill = statsState.getStat('LifeOnKill');
                       const manaOnKill = statsState.getStat('EnergyOnKill');
                       if (lifeOnKill > 0) totalSustain += lifeOnKill;
                       if (manaOnKill > 0) totalManaSustain += manaOnKill;
                   }
                   
                   if (totalSustain > 0) {
                     playerState.heal(totalSustain);
                   }
                   if (totalManaSustain > 0) {
                     playerState.restoreEnergy(totalManaSustain);
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

                   // Handle Kill is now centralized in useGameEngine.ts
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
             spawnOrigin: { x: spawnPos.x, y: spawnPos.y },
             rarity: 'Normal',
             health: 100, // Placeholder
             aiProfile: 'melee_rusher',
             faction: 'player', // Ally!
             xpReward: 0,
             goldReward: 0,
             stats: {
                maxHealth: 100,
                attackPower: 10,
                damageType: 'Strike',
                attackSpeed: 1,
                attackRange: 1,
                moveSpeed: 1,
                aggroRange: 5,
                armor: 5,
                fireResist: 0,
                coldResist: 0,
                lightningResist: 0,
                strikeResist: 0,
                pierceResist: 0,
                physicalResist: 0,
                deflectChance: 0,
                deflectEffect: 0,
                block: 0,
                spellBlock: 0,
                blockEffect: 0,
                parry: 0,
                spellParry: 0,
                parryEffect: 0,
             }
          });
          addLog(`Summoned a minion!`, 'ability');
       }
    }

    if (skill.onExecute) {
      skill.onExecute('player', targetId || '');
    }

    if (skill.adrenalineGenerate) {
       if (!anyHitRequired || anyTargetHit) {
          playerState.addAdrenaline(skill.adrenalineGenerate);
       }
    }
  }
}
