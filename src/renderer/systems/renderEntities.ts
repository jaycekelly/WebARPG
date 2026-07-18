import { Container, Sprite, Graphics } from 'pixi.js';
import { getEntityTexture, getLootBaseTexture, getLootBeamTexture } from '../assets';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import { getTileLighting, extractLights, type PointLight } from '../utils/lighting';
import { EntityHitboxes } from '../input/canvasInput';
import type { ProjectionParams, ProjectedPoint } from '../../engine/world/screenProjection';
import type { Enemy, LootDrop, Obstacle } from '../../store/useWorldStore';
import type { HitEffect } from '../../store/useCombatStore';
import { useWorldStore } from '../../store/useWorldStore';
import { useLightingStore } from '../../store/useLightingStore';
import { getBiome } from '../../data/biomes';
import type { LightingContext } from '../utils/lighting';

// ---- Constants ---------------------------------------------------------------
const HEALTH_BAR_WIDTH = 90;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_OFFSET_Y = -85;

const SHADOW_WIDTH = 110; // wide oval shadow
const SHADOW_HEIGHT = 65; // ~62% of width = oval

const ENTITY_Z = {
  obstacle: 0,
  loot: -20, // Push flat floor items backwards into the screen so they never obscure standing actors
  enemy: 1,
  player: 2,
} as const;

// Radial VFX texture removed in favor of exact SVG path shadows

const RARITY_COLORS: Record<string, string> = {
  Normal: '#a1a1aa',
  Magic: '#3b82f6',
  Rare: '#eab308',
  Epic: '#a855f7',
  Legendary: '#f97316', // Orange
  Unique: '#facc15', // Gold
};

// ---- Types ------------------------------------------------------------------
interface TrackedSprite {
  container: Container;
  icon: Sprite;
  shadow: Graphics;
  healthBar: Graphics | null;
  selectRing: Graphics;
  flashSprite: Sprite;
  glowBase?: Sprite | null;
  glowBeam?: Sprite | null;
  key: string;
  kind: string;
  category: keyof typeof ENTITY_Z;
  currentX?: number;
  currentY?: number;
  isDashing?: boolean;
}

export interface EntityRenderer {
  container: Container;
  uiContainer: Container;
  update: (
    params: ProjectionParams,
    baseScale: number,
    dt: number,
    playerPos: { x: number; y: number },
    playerHit: boolean,
    enemies: Enemy[],
    activeTargetId: string | null,
    lootDrops: LootDrop[],
    obstacles: Obstacle[],
    hitEffects: HitEffect[],
    hoveredEnemyId?: string | null,
    visibleTiles?: Set<string>,
    exploredTiles?: Set<string>,
  ) => void;
  getPlayerVisualPosition: () => { x: number; y: number } | null;
}

// ---- Factory ----------------------------------------------------------------
export function createEntityRenderer(): EntityRenderer {
  const container = new Container();
  const uiContainer = new Container();
  const tracked = new Map<string, TrackedSprite>();

  // ---- Sub-graphics factories -----------------------------------------------
  function makeShadow(): Graphics {
    const g = new Graphics();
    g.ellipse(0, 5, SHADOW_WIDTH / 2, SHADOW_HEIGHT / 2);
    g.fill({ color: 0x000000, alpha: 0.25 });
    return g;
  }

  function makeHealthBar(): Graphics {
    const g = new Graphics();
    const hw = HEALTH_BAR_WIDTH / 2;
    // border background
    g.roundRect(-hw - 1, -1, HEALTH_BAR_WIDTH + 2, HEALTH_BAR_HEIGHT + 2, 2);
    g.fill({ color: 0x27272a, alpha: 0.5 });
    // background
    g.roundRect(-hw, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);
    g.fill({ color: 0x450a0a });
    // fill (full width initially, will be redrawn)
    g.roundRect(-hw, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);
    g.fill({ color: 0xef4444 });
    return g;
  }

  function makeSelectRing(): Graphics {
    const g = new Graphics();
    g.rect(-1, -1, 1, 1);
    g.stroke({ color: 0xef4444, alpha: 0.75, width: 4 });
    g.visible = false;
    return g;
  }


  // ---- Entity creation -------------------------------------------------------
  function makeEntitySprite(
    kind: string,
    color: string,
    key: string,
    zIdx: number,
    hasHealthBar: boolean,
    iconScale: number = 0.85,
  ): TrackedSprite {
    const c = new Container();
    c.zIndex = zIdx;

    const isObstacle = kind === 'trees' || kind === 'mountain' || kind === 'cave_entrance';

    // Shadow first (bottom of container)
    const shadow = makeShadow();
    if (isObstacle) {
      shadow.scale.set(1.15, 1.15); // Widen obstacle shadows
    } else {
      shadow.scale.set(iconScale, iconScale); // Dynamically scale shadow based on entity size
    }
    c.addChild(shadow);
    
    const isLoot = key.startsWith('loot:');
    const texture = getEntityTexture(kind, color, isLoot);

    let glowBase: Sprite | null = null;
    let glowBeam: Sprite | null = null;
    if (key.startsWith('loot:')) {
      glowBase = new Sprite(getLootBaseTexture());
      glowBase.anchor.set(0.5, 0.5); // Center on ground
      glowBase.blendMode = 'add';
      c.addChildAt(glowBase, 1); // Above shadow

      glowBeam = new Sprite(getLootBeamTexture());
      glowBeam.anchor.set(0.5, 1); // Anchor at bottom center
      glowBeam.blendMode = 'add';
      c.addChildAt(glowBeam, 2); // Above base
    }
    
    // Icon above shadow and glow
    const icon = new Sprite(texture);
    icon.anchor.set(0.5, 0.85);
    if (!isObstacle) {
      icon.scale.set(iconScale, iconScale); // Dynamically scale icon based on entity size
    }
    c.addChild(icon);

    // Health bar above icon
    const healthBar = hasHealthBar ? makeHealthBar() : null;
    if (healthBar) {
      healthBar.y = HEALTH_BAR_OFFSET_Y;
      healthBar.visible = false;
      uiContainer.addChild(healthBar);
    }

    // Select ring (topmost)
    const selectRing = makeSelectRing();
    uiContainer.addChild(selectRing);

    // Flash sprite (same texture, white color, preserve fill if it's loot)
    const flashTexture = getEntityTexture(kind, '#ffffff', isLoot);
    const flashSprite = new Sprite(flashTexture);
    flashSprite.anchor.set(0.5, 0.85);
    if (!isObstacle) {
      flashSprite.scale.set(0.85, 0.85); // Shrink flash to match icon
    }
    flashSprite.visible = false;
    c.addChild(flashSprite);

    const categoryStr = key.split(':')[0];
    const category = (categoryStr === 'player' ? 'player' :
                      categoryStr === 'enemy' ? 'enemy' :
                      categoryStr === 'loot' ? 'loot' : 'obstacle') as keyof typeof ENTITY_Z;

    const entry: TrackedSprite = {
      container: c,
      icon,
      shadow,
      healthBar,
      selectRing,
      flashSprite,
      glowBase,
      glowBeam,
      key,
      kind,
      category,
    };

    container.addChild(c);
    tracked.set(key, entry);
    return entry;
  }

  let activeBaseScale = 1;

  // Flash fade tracking: per-entity flash alpha that decays each frame
  const flashAlphas = new Map<string, number>();

  function updateFlash(entry: TrackedSprite, key: string, isHit: boolean) {
    let alpha = flashAlphas.get(key) ?? 0;
    if (isHit) {
      alpha = 0.7; // Full flash on hit
    } else if (alpha > 0) {
      alpha = Math.max(0, alpha - 0.06); // Fade out over ~12 frames at 60fps
    }
    flashAlphas.set(key, alpha);
    if (alpha > 0) {
      entry.flashSprite.visible = true;
      entry.flashSprite.alpha = alpha;
    } else {
      entry.flashSprite.visible = false;
    }
  }

  function setPosition(
    entry: TrackedSprite,
    projected: ProjectedPoint,
    hopOffset: number,
    jitterOffsetX: number,
    jitterOffsetY: number,
    wx: number,
    wy: number,
    playerPos: { x: number; y: number },
    pointLights: PointLight[],
    visibleTiles: Set<string>,
    exploredTiles: Set<string>,
    ctx: LightingContext
  ) {
    const sx = projected.screenX;
    const sy = projected.screenY;
    entry.container.position.set(sx, sy);
    entry.container.scale.set(projected.scale * activeBaseScale);
    // Apply physical pixel offsets based on entity category to ensure flat items 
    // sort behind standing actors on the same tile
    entry.container.zIndex = projected.zDepth + (ENTITY_Z[entry.category] ?? 0);
    
    // Lighting tint
    let lighting = getTileLighting(wx, wy, playerPos, pointLights, ctx);
    
    // If in memory fog (explored but not visible), it receives no direct light.
    // Use the biome's ambient color scaled to a visible 18% brightness baseline so they match
    // the surrounding environment and avoid simultaneous contrast artifacts (looking brown).
    if (!visibleTiles.has(`${wx},${wy}`) && exploredTiles.has(`${wx},${wy}`)) {
       const minR = ctx.entityAmbient.r;
       const minG = ctx.entityAmbient.g;
       const minB = ctx.entityAmbient.b;
       
       const ent = Math.max(0.18, ctx.minBrightness);
       const finalR = Math.floor(minR + (255 - minR) * ent);
       const finalG = Math.floor(minG + (255 - minG) * ent);
       const finalB = Math.floor(minB + (255 - minB) * ent);
       
       const memoryTint = (finalR << 16) | (finalG << 8) | finalB;
       lighting = { intensity: 0.0, entityTint: memoryTint };
    }
    
    const tint = lighting.entityTint;
    
    entry.icon.tint = tint;
    entry.flashSprite.tint = tint;
    
    entry.icon.skew.x = 0;
    entry.flashSprite.skew.x = 0;
    
    // Apply hop and jitter ONLY to the physical body sprites, not the shadow/floor rings
    entry.icon.x = jitterOffsetX;
    entry.icon.y = -hopOffset + jitterOffsetY;
    entry.flashSprite.x = jitterOffsetX;
    entry.flashSprite.y = -hopOffset + jitterOffsetY;
    if (entry.healthBar) {
      // Base texture height from anchor is ~108, but sprites have padding.
      const topOffset = -(95 * entry.icon.scale.y) - 15;
      const dynamicOffset = topOffset * activeBaseScale * projected.scale;
      entry.healthBar.position.set(sx, sy + dynamicOffset - hopOffset);
      entry.healthBar.scale.set(projected.scale * activeBaseScale);
    }
    entry.selectRing.position.set(sx, sy);
    entry.selectRing.scale.set(projected.scale * activeBaseScale);

    // Store precise on-screen hitbox for pixel-perfect targeting
    if (entry.category === 'enemy') {
      EntityHitboxes.set(entry.key, {
        x: sx,
        y: sy - hopOffset,
        scale: projected.scale * activeBaseScale,
        zDepth: projected.zDepth,
        templateId: entry.kind
      });
    }
  }

  function showEntry(entry: TrackedSprite) {
    entry.container.visible = true;
  }

  function hideEntry(entry: TrackedSprite) {
    entry.container.visible = false;
    if (entry.healthBar) entry.healthBar.visible = false;
    entry.selectRing.visible = false;
    EntityHitboxes.delete(entry.key);
  }

  function sortByDepth() {
    container.sortableChildren = true;
    container.sortChildren();
  }

  // ---- Main tick -------------------------------------------------------------
  function tick(
    params: ProjectionParams,
    baseScale: number,
    dt: number,
    playerPos: { x: number; y: number },
    playerHit: boolean,
    enemies: Enemy[],
    activeTargetId: string | null,
    lootDrops: LootDrop[],
    obstacles: Obstacle[],
    hitEffects: HitEffect[],
    hoveredEnemyId?: string | null,
    visibleTiles?: Set<string>,
    exploredTiles?: Set<string>,
  ) {
    activeBaseScale = baseScale;
    const activeKeys = new Set<string>();
    const visibleTilesSet = visibleTiles ?? new Set<string>();
    const exploredTilesSet = exploredTiles ?? new Set<string>();
    const worldStore = useWorldStore.getState();
    const pointLights = extractLights(worldStore.grid);
    const biome = getBiome(worldStore.grid.environment);
    
    const ctx: LightingContext = {
      isTown: worldStore.grid.environment === 'town',
      playerLightRadius: useLightingStore.getState().playerLightRadiusDungeon,
      minBrightness: useLightingStore.getState().minBrightness,
      entityAmbient: biome.entityAmbient,
      ambientBaseline: biome.ambientBaseline,
    };
    
    const hitsMap = new Map<string, HitEffect>();
    for (const h of hitEffects) hitsMap.set(h.targetId, h);

    // --- Player ---
    const playerKey = 'player';
    activeKeys.add(playerKey);
    let playerEntry = tracked.get(playerKey);
    if (!playerEntry) {
      playerEntry = makeEntitySprite('robot', '#e4e4e7', playerKey, ENTITY_Z.player, false);
      tracked.set(playerKey, playerEntry);
    }
    showEntry(playerEntry);
    
    {
      if (playerEntry.currentX === undefined || playerEntry.currentY === undefined) {
        playerEntry.currentX = playerPos.x;
        playerEntry.currentY = playerPos.y;
      }
      
      const targetDistPlayer = Math.max(Math.abs(playerPos.x - playerEntry.currentX), Math.abs(playerPos.y - playerEntry.currentY));
      
      if (targetDistPlayer > 10) {
        playerEntry.currentX = playerPos.x;
        playerEntry.currentY = playerPos.y;
        playerEntry.isDashing = false;
      } else if (targetDistPlayer > 1.2) {
        playerEntry.isDashing = true;
      } else if (targetDistPlayer < 0.1) {
        playerEntry.isDashing = false;
      }

      if (playerEntry.isDashing) {
        const combatState = useCombatStore.getState();
        const isOutOfCombat = !combatState.isInCombat();
        // Base logical speed in tiles per second
        const baseSpeed = isOutOfCombat ? 2.5 : useStatsStore.getState().getStat('MoveSpeed');
        // Visual speed is slightly faster (10%) than logical speed so the sprite smoothly reaches 
        // the tile center just milliseconds before the next logical input is accepted.
        const maxSpeed = baseSpeed * 1.1;
        
        const decay = 20.0;
        let diffX = playerPos.x - playerEntry.currentX;
        let diffY = playerPos.y - playerEntry.currentY;
        
        let velX = diffX * decay;
        let velY = diffY * decay;
        
        const speed = Math.sqrt(velX*velX + velY*velY);
        if (speed > maxSpeed) {
           velX = (velX / speed) * maxSpeed;
           velY = (velY / speed) * maxSpeed;
        }
        
        playerEntry.currentX += velX * dt;
        playerEntry.currentY += velY * dt;
      } else {
        const lf = 1 - Math.exp(-12.0 * dt);
        playerEntry.currentX += (playerPos.x - playerEntry.currentX) * lf;
        playerEntry.currentY += (playerPos.y - playerEntry.currentY) * lf;
      }

    const fracX = Math.abs(playerEntry.currentX - Math.round(playerEntry.currentX));
    const fracY = Math.abs(playerEntry.currentY - Math.round(playerEntry.currentY));
    const progress = Math.max(fracX, fracY) * 2;
    
    const isVerticalOnly = fracX < 0.01 && fracY > 0.01;
    const hopMax = isVerticalOnly ? 50 : 25;

    const hopPlayer = playerEntry.isDashing ? 0 : hopMax * Math.pow(progress, 0.8);

    const projPlayer = projectTileToScreen(playerEntry.currentX, playerEntry.currentY, params);
    projPlayer.zDepth += 100;
    
    // Apply directional hit jitter
    let jitterOffsetX = 0;
    let jitterOffsetY = 0;
    const pHit = hitsMap.get('player');
    if (pHit) {
       const dx = playerEntry.currentX - pHit.sourceX;
       const dy = playerEntry.currentY - pHit.sourceY;
       let len = Math.sqrt(dx*dx + dy*dy);
       if (len === 0) { len = 1; } // fallback
       
       // Jitter pushes the sprite rapidly back and forth along the hit vector
       const lifeLeft = Math.max(0, pHit.expiresAt - Date.now());
       const progress = lifeLeft / 150; // 1.0 to 0.0
       // High frequency sine wave (oscillates rapidly every ~30ms), max distance 0.08 tiles (~5px)
       const jitterFactor = Math.sin(Date.now() / 15) * 0.08 * progress;
       
       // Calculate an isometric screen-space offset
       // dx, dy are in grid space.
       const jitterX = (dx / len) * jitterFactor;
       const jitterY = (dy / len) * jitterFactor;
       
       const jitterProj = projectTileToScreen(playerEntry.currentX + jitterX, playerEntry.currentY + jitterY, params);
       jitterOffsetX = jitterProj.screenX - projPlayer.screenX;
       jitterOffsetY = jitterProj.screenY - projPlayer.screenY;
    }
    
    playerEntry.container.zIndex = projPlayer.zDepth;

    setPosition(playerEntry, projPlayer, hopPlayer, jitterOffsetX, jitterOffsetY, playerEntry.currentX, playerEntry.currentY, playerPos, pointLights, visibleTilesSet, exploredTilesSet, ctx);
    updateFlash(playerEntry, playerKey, playerHit);
    }

    // --- Enemies ---
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const key = `enemy:${enemy.id}`;
      activeKeys.add(key);
      let entry = tracked.get(key);
      if (!entry) {
        // Fallback to 0.85 if scale isn't defined, or use the enemy's defined scale
        const scale = enemy.scale ?? 0.85; 
        entry = makeEntitySprite(enemy.templateId || 'rabbit', '#ef4444', key, ENTITY_Z.enemy, true, scale);
        tracked.set(key, entry);
      }
      if (visibleTiles && !visibleTiles.has(`${enemy.position.x},${enemy.position.y}`)) {
        hideEntry(entry);
        continue;
      }
      showEntry(entry);
      {
      if (entry.currentX === undefined || entry.currentY === undefined) {
        entry.currentX = enemy.position.x;
        entry.currentY = enemy.position.y;
      }
      
      const targetDistEnemy = Math.max(Math.abs(enemy.position.x - entry.currentX), Math.abs(enemy.position.y - entry.currentY));
      
      if (targetDistEnemy > 10) {
        entry.currentX = enemy.position.x;
        entry.currentY = enemy.position.y;
        entry.isDashing = false;
      } else if (targetDistEnemy > 1.2) {
        entry.isDashing = true;
      } else if (targetDistEnemy < 0.1) {
        entry.isDashing = false;
      }

      if (entry.isDashing) {
        const lf = 1 - Math.exp(-20.0 * dt);
        entry.currentX += (enemy.position.x - entry.currentX) * lf;
        entry.currentY += (enemy.position.y - entry.currentY) * lf;
      } else {
        const lf = 1 - Math.exp(-12.0 * dt);
        entry.currentX += (enemy.position.x - entry.currentX) * lf;
        entry.currentY += (enemy.position.y - entry.currentY) * lf;
      }
      
      const fracX = Math.abs(entry.currentX - Math.round(entry.currentX));
      const fracY = Math.abs(entry.currentY - Math.round(entry.currentY));
      const progress = Math.max(fracX, fracY) * 2;
      
      const isVerticalOnly = fracX < 0.01 && fracY > 0.01;
      const hopMax = isVerticalOnly ? 50 : 25;

      const hopEnemy = entry.isDashing ? 0 : hopMax * Math.pow(progress, 0.8); // Less smooth easing

      const projEnemy = projectTileToScreen(entry.currentX, entry.currentY, params);
      
      const eHit = hitsMap.get(enemy.id);
      const isHit = !!eHit;
      
      let jitterOffsetX = 0;
      let jitterOffsetY = 0;
      if (eHit) {
         const dx = entry.currentX - eHit.sourceX;
         const dy = entry.currentY - eHit.sourceY;
         let len = Math.sqrt(dx*dx + dy*dy);
         if (len === 0) len = 1;
         
         const lifeLeft = Math.max(0, eHit.expiresAt - Date.now());
         const progress = lifeLeft / 150;
         const jitterFactor = Math.sin(Date.now() / 15) * 0.08 * progress;
         
         const jitterX = (dx / len) * jitterFactor;
         const jitterY = (dy / len) * jitterFactor;
         
         const jitterProj = projectTileToScreen(entry.currentX + jitterX, entry.currentY + jitterY, params);
         jitterOffsetX = jitterProj.screenX - projEnemy.screenX;
         jitterOffsetY = jitterProj.screenY - projEnemy.screenY;
      }
      
      setPosition(entry, projEnemy, hopEnemy, jitterOffsetX, jitterOffsetY, entry.currentX, entry.currentY, playerPos, pointLights, visibleTilesSet, exploredTilesSet, ctx);
      
      if (eHit) {
        entry.icon.tint = eHit.color;
      }
      entry.flashSprite.tint = 0xffffff;
      updateFlash(entry, key, isHit);

        // Hover and Targeting
        const isTargeted = enemy.id === activeTargetId;
        const isHovered = enemy.id === hoveredEnemyId; // highlight at any time
        const isCharging = !!enemy.activeTelegraph;
        const isRecovering = !!enemy.recoveringUntil && enemy.recoveringUntil > Date.now();
        
        let targetScale = 0.85;
        if (isCharging) {
           // Slower, smoother pulse
           const pulse = Math.sin(Date.now() / 150) * 0.03;
           targetScale = 0.85 + pulse;
           
           entry.flashSprite.visible = true;
           entry.flashSprite.tint = 0xffffff;
           
           const currentHitAlpha = flashAlphas.get(key) ?? 0;
           // Very bright white throbbing glow (0.5 to 1.0)
           const glow = 0.75 + Math.sin(Date.now() / 80) * 0.25;
           entry.flashSprite.alpha = Math.max(glow, currentHitAlpha);
        }
        
        // Handle Hover Tint
        if (isHovered && !isCharging && !isRecovering) {
          const currentHitAlpha = flashAlphas.get(key) ?? 0;
          entry.flashSprite.visible = true;
          entry.flashSprite.alpha = Math.max(0.80, currentHitAlpha); // Uniform 80% opacity
        } else if (!isCharging && !isRecovering) {
          // If neither hovered nor charging, flash is handled by hit tracking (updateFlash)
          // updateFlash handles visibility/alpha directly based on flashAlphas, so we don't interfere
        }
        
        // Use a persistent scale value on the entry to lerp smoothly
        (entry as any).currentScale = (entry as any).currentScale ?? 0.85;
        if (isCharging) {
           // Snap directly to the pulse while charging
           (entry as any).currentScale = targetScale;
        } else {
           // Smoothly interpolate back to normal scale when the charge ends
           (entry as any).currentScale += (targetScale - (entry as any).currentScale) * 0.15;
        }
        
        entry.icon.scale.set((entry as any).currentScale);
        entry.flashSprite.scale.set((entry as any).currentScale);

        // Handle Targeting Reticle
        if (isTargeted) {
          entry.selectRing.visible = true;
          entry.selectRing.clear();

          // Animated Floor Reticle using Camera Perspective
          const time = Date.now();
          
          const ex = entry.currentX;
          const ey = entry.currentY;
          
          // Project the 4 corners of the 1x1 tile the entity is standing on
          const tl = projectTileToScreen(ex - 0.5, ey - 0.5, params);
          const tr = projectTileToScreen(ex + 0.5, ey - 0.5, params);
          const br = projectTileToScreen(ex + 0.5, ey + 0.5, params);
          const bl = projectTileToScreen(ex - 0.5, ey + 0.5, params);
          const center = projectTileToScreen(ex, ey, params);
          
          // Convert to local space of the container
          const toLocal = (pt: ProjectedPoint) => ({
             x: (pt.screenX - center.screenX) / center.scale,
             y: (pt.screenY - center.screenY) / center.scale
          });

          // Pulse slightly
          const bounce = (Math.sin(time / 200) + 1) / 2;
          const exp = 0.75 + bounce * 0.05; // Hug the tile much tighter
          
          const ltl = toLocal(tl);
          const ltr = toLocal(tr);
          const lbr = toLocal(br);
          const lbl = toLocal(bl);
          
          // Expand from center and add a tiny upward offset
          const yOffset = -8;
          const ptTL = { x: ltl.x * exp, y: ltl.y * exp + yOffset };
          const ptTR = { x: ltr.x * exp, y: ltr.y * exp + yOffset };
          const ptBR = { x: lbr.x * exp, y: lbr.y * exp + yOffset };
          const ptBL = { x: lbl.x * exp, y: lbl.y * exp + yOffset };

          // Helper to draw an L-bracket at a corner pointing towards adjacent corners
          const drawBracket = (corner: {x:number, y:number}, adj1: {x:number, y:number}, adj2: {x:number, y:number}) => {
             const arm = 0.20; // arm length is 20% of the edge
             entry.selectRing.moveTo(corner.x + (adj1.x - corner.x) * arm, corner.y + (adj1.y - corner.y) * arm);
             entry.selectRing.lineTo(corner.x, corner.y);
             entry.selectRing.lineTo(corner.x + (adj2.x - corner.x) * arm, corner.y + (adj2.y - corner.y) * arm);
          };
          
          drawBracket(ptTL, ptTR, ptBL);
          drawBracket(ptTR, ptBR, ptTL);
          drawBracket(ptBR, ptBL, ptTR);
          drawBracket(ptBL, ptTL, ptBR);
          
          entry.selectRing.stroke({ color: 0xef4444, width: 4, alpha: 1.0 });

        } else {
          entry.selectRing.visible = false;
        }

        // Health bar (GridHealthBar style)
        if (entry.healthBar) {
          const pct = enemy.health / enemy.stats.maxHealth;
          if (enemy.health < enemy.stats.maxHealth) {
            entry.healthBar.visible = true;
            const hw = HEALTH_BAR_WIDTH / 2;
            entry.healthBar.clear();
            // border
            entry.healthBar.roundRect(-hw - 1, -1, HEALTH_BAR_WIDTH + 2, HEALTH_BAR_HEIGHT + 2, 2);
            entry.healthBar.fill({ color: 0x27272a, alpha: 0.5 });
            // background
            entry.healthBar.roundRect(-hw, 0, HEALTH_BAR_WIDTH, HEALTH_BAR_HEIGHT, 1);
            entry.healthBar.fill({ color: 0x450a0a });
            // fill
            const fillW = Math.max(0, HEALTH_BAR_WIDTH * pct);
            if (fillW > 0) {
              entry.healthBar.roundRect(-hw, 0, fillW, HEALTH_BAR_HEIGHT, 1);
              entry.healthBar.fill({ color: 0xef4444 });
            }
          } else {
            entry.healthBar.visible = false;
          }
        }
      }
    }

    // --- Loot ---
    for (const drop of lootDrops) {
      const key = `loot:${drop.id}`;
      activeKeys.add(key);
      let bestIcon = drop.items[0]?.icon ?? 'leg_armor';
      let bestRarity = 'Normal';
      const rv = { Normal: 0, Magic: 1, Rare: 2, Epic: 3, Legendary: 4, Unique: 5 } as Record<string, number>;
      for (const item of drop.items) {
        if ((rv[item.rarity] ?? 0) > (rv[bestRarity] ?? 0)) {
          bestRarity = item.rarity;
          bestIcon = item.icon ?? 'leg_armor';
        }
      }
      const color = RARITY_COLORS[bestRarity] ?? '#a1a1aa';
      let entry = tracked.get(key);
      if (!entry) {
        entry = makeEntitySprite(bestIcon, color, key, ENTITY_Z.loot, false, 0.6); // Shrink floor loot
      }
      if (visibleTiles && !visibleTiles.has(`${drop.position.x},${drop.position.y}`)) {
        hideEntry(entry);
        continue;
      }
      showEntry(entry);
      {
        const projLoot = projectTileToScreen(drop.position.x, drop.position.y, params);
        setPosition(entry, projLoot, 0, 0, 0, drop.position.x, drop.position.y, playerPos, pointLights, visibleTilesSet, exploredTilesSet, ctx);

        const time = Date.now();
        const floatY = Math.sin(time / 400 + drop.position.x) * 4;
        entry.icon.y = floatY; // Bob the item sprite up and down
        
        if (entry.glowBase && entry.glowBeam) {
          const hexColor = parseInt(color.replace('#', '0x'), 16);
          const rarityVal = rv[bestRarity] ?? 0;
          
          entry.glowBase.tint = hexColor;
          entry.glowBeam.tint = hexColor;
          
          const pulseNorm = (Math.sin(time / 400) + 1) / 2; // 0 to 1
          
          // Base scales up based on rarity
          const scaleMultiplier = 1.0 + (rarityVal * 0.1); 
          const baseScale = entry.icon.scale.x; 
          
          const glowScaleX = baseScale * scaleMultiplier;
          // Base sits flat on ground
          entry.glowBase.scale.set(glowScaleX, glowScaleX * 0.5);
          entry.glowBase.alpha = 0.4 + (pulseNorm * 0.2); 
          
          // Beam stands upright
          // Base height for Common is 1.2. Adds +0.15 height per rarity level.
          const heightMultiplier = 1.2 + (rarityVal * 0.15) + (pulseNorm * 0.15);
          entry.glowBeam.scale.set(glowScaleX * 0.75, baseScale * heightMultiplier);
          entry.glowBeam.alpha = 0.7 + (pulseNorm * 0.3);
        }
      }
    }

    // --- Obstacles ---
    for (const obs of obstacles) {
      const key = `obstacle:${obs.type}:${obs.x},${obs.y}`;
      activeKeys.add(key);
      let entry = tracked.get(key);
      if (!entry) {
        let kind = 'mountain';
        let color = '#71717a';
        let scale = 0.85;
        if (obs.type === 'tree') kind = 'trees';
        else if (obs.type === 'rock') { kind = 'stone'; scale = 0.65; }
        else if (obs.type === 'npc_guide') { kind = 'accessibility'; color = '#3b82f6'; }
        else if (obs.type === 'dungeon_entrance') { kind = 'cave_entrance'; color = '#ef4444'; }
        else if (obs.type === 'torch') { kind = 'candle'; color = '#fbbf24'; scale = 0.55; }
        else if (obs.type === 'campfire') { kind = 'campfire'; color = '#ffffff'; scale = 0.8; }
        
        entry = makeEntitySprite(kind, color, key, ENTITY_Z.obstacle, false, scale);
      }
      if (exploredTilesSet && !exploredTilesSet.has(`${obs.x},${obs.y}`)) {
        hideEntry(entry);
        continue;
      }
      showEntry(entry);
      {
        const projObs = projectTileToScreen(obs.x, obs.y, params);
        setPosition(entry, projObs, 0, 0, 0, obs.x, obs.y, playerPos, pointLights, visibleTilesSet, exploredTilesSet, ctx);
      }
    }

    // --- Remove stale ---
    for (const [key, entry] of tracked) {
      if (!activeKeys.has(key)) {
        hideEntry(entry);
        flashAlphas.delete(key);
      }
    }

    sortByDepth();
  }

  function getPlayerVisualPosition() {
    const p = tracked.get('player');
    if (p && p.currentX !== undefined && p.currentY !== undefined) {
      return { x: p.currentX, y: p.currentY, isDashing: p.isDashing ?? false };
    }
    return null;
  }

  return { container, uiContainer, update: tick, getPlayerVisualPosition };
}
