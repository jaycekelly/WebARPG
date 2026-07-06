import { Container, Sprite, Graphics, Texture } from 'pixi.js';
import { getEntityTexture } from '../assets';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams, ProjectedPoint } from '../../engine/world/screenProjection';
import type { Enemy, LootDrop, Obstacle } from '../../store/useWorldStore';
import type { HitEffect } from '../../store/useCombatStore';
import { getTileLightIntensity, getEntityTint } from '../utils/lighting';

// ---- Constants ---------------------------------------------------------------
const HEALTH_BAR_WIDTH = 90;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_OFFSET_Y = -85;

const SHADOW_WIDTH = 110; // wide oval shadow
const SHADOW_HEIGHT = 65; // ~62% of width = oval

const ENTITY_Z = {
  obstacle: 0,
  loot: 1,
  enemy: 2,
  player: 3,
} as const;

let lootGlowTexture: Texture | null = null;
let lootBeamTexture: Texture | null = null;

function getLootVFXTextures() {
  if (!lootGlowTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.3, 'rgba(255, 255, 255, 0.4)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    lootGlowTexture = Texture.from(canvas);
  }
  if (!lootBeamTexture) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0)'); // Top transparent
    grad.addColorStop(1, 'rgba(255, 255, 255, 1)'); // Bottom solid
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 128);
    lootBeamTexture = Texture.from(canvas);
  }
  return { lootGlowTexture, lootBeamTexture };
}

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
  lootGlow?: Sprite | null;
  lootBeam?: Sprite | null;
  key: string;
  kind: keyof typeof ENTITY_Z;
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
    playerPos: { x: number; y: number },
    playerHit: boolean,
    enemies: Enemy[],
    activeTargetId: string | null,
    lootDrops: LootDrop[],
    obstacles: Obstacle[],
    hitEffects: HitEffect[],
    hoveredEnemyId?: string | null,
    visibleTiles?: Set<string>,
  ) => void;
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

    const isObstacle = kind === 'trees' || kind === 'mountain';

    // Shadow first (bottom of container)
    const shadow = makeShadow();
    if (isObstacle) {
      shadow.scale.set(1.15, 1.15); // Widen obstacle shadows
    } else {
      shadow.scale.set(iconScale, iconScale); // Dynamically scale shadow based on entity size
    }
    c.addChild(shadow);
    
    // Icon above shadow
    const texture = getEntityTexture(kind, color);
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

    // Flash sprite (same texture, white color)
    const flashTexture = getEntityTexture(kind, '#ffffff');
    const flashSprite = new Sprite(flashTexture);
    flashSprite.anchor.set(0.5, 0.85);
    if (!isObstacle) {
      flashSprite.scale.set(0.85, 0.85); // Shrink flash to match icon
    }
    flashSprite.visible = false;
    c.addChild(flashSprite);

    // Glow & beam for loot (rendered behind icon so the icon acts as a mask/no-render zone)
    let lootGlow: Sprite | null = null;
    let lootBeam: Sprite | null = null;
    if (key.startsWith('loot:')) {
      const tex = getLootVFXTextures();
      
      lootGlow = new Sprite(tex.lootGlowTexture!);
      lootGlow.anchor.set(0.5, 0.5);
      lootGlow.blendMode = 'add';
      c.addChildAt(lootGlow, 1); // Behind icon
      
      lootBeam = new Sprite(tex.lootBeamTexture!);
      lootBeam.anchor.set(0.5, 1); // Anchor at bottom center
      lootBeam.blendMode = 'add';
      c.addChildAt(lootBeam, 2); // Behind icon
    }

    const entry: TrackedSprite = {
      container: c,
      icon,
      shadow,
      healthBar,
      selectRing,
      flashSprite,
      lootGlow,
      lootBeam,
      key,
      kind: kind as keyof typeof ENTITY_Z,
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
    hopOffset = 0,
    wx: number,
    wy: number,
    playerPos: { x: number; y: number },
    lootDrops: LootDrop[],
    visibleTiles: Set<string>
  ) {
    const sx = projected.screenX;
    const sy = projected.screenY;
    entry.container.position.set(sx, sy);
    entry.container.scale.set(projected.scale * activeBaseScale);
    entry.container.zIndex = projected.zDepth;
    
    // Lighting tint
    const intensity = getTileLightIntensity(wx, wy, playerPos, lootDrops, visibleTiles);
    entry.icon.tint = getEntityTint(intensity);
    entry.flashSprite.tint = getEntityTint(intensity);
    
    entry.icon.skew.x = 0;
    entry.flashSprite.skew.x = 0;
    
    // Apply hop ONLY to the physical body sprites, not the shadow/floor rings
    entry.icon.y = -hopOffset;
    entry.flashSprite.y = -hopOffset;
    if (entry.healthBar) {
      const dynamicOffset = HEALTH_BAR_OFFSET_Y * (activeBaseScale / 0.9) * projected.scale;
      entry.healthBar.position.set(sx, sy + dynamicOffset - hopOffset);
      entry.healthBar.scale.set(projected.scale * activeBaseScale);
    }
    entry.selectRing.position.set(sx, sy);
    entry.selectRing.scale.set(projected.scale * activeBaseScale);
  }

  function showEntry(entry: TrackedSprite) {
    entry.container.visible = true;
  }

  function hideEntry(entry: TrackedSprite) {
    entry.container.visible = false;
    if (entry.healthBar) entry.healthBar.visible = false;
    entry.selectRing.visible = false;
  }

  function sortByDepth() {
    container.sortableChildren = true;
    container.sortChildren();
  }

  // ---- Main tick -------------------------------------------------------------
  function tick(
    params: ProjectionParams,
    baseScale: number,
    playerPos: { x: number; y: number },
    playerHit: boolean,
    enemies: Enemy[],
    activeTargetId: string | null,
    lootDrops: LootDrop[],
    obstacles: Obstacle[],
    hitEffects: HitEffect[],
    hoveredEnemyId?: string | null,
    visibleTiles?: Set<string>,
  ) {
    activeBaseScale = baseScale;
    const activeKeys = new Set<string>();
    const visibleTilesSet = visibleTiles ?? new Set<string>();
    
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
      
      if (targetDistPlayer > 1.2) {
        playerEntry.isDashing = true;
      } else if (targetDistPlayer < 0.1) {
        playerEntry.isDashing = false;
      }

      if (playerEntry.isDashing) {
        playerEntry.currentX += (playerPos.x - playerEntry.currentX) * 0.25;
        playerEntry.currentY += (playerPos.y - playerEntry.currentY) * 0.25;
      } else {
        playerEntry.currentX += (playerPos.x - playerEntry.currentX) * 0.14;
        playerEntry.currentY += (playerPos.y - playerEntry.currentY) * 0.14;
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
       
       // We can just add this to the screen coordinates!
       const jitterProj = projectTileToScreen(playerEntry.currentX + jitterX, playerEntry.currentY + jitterY, params);
       projPlayer.screenX = jitterProj.screenX;
       projPlayer.screenY = jitterProj.screenY;
    }
    
    playerEntry.container.zIndex = projPlayer.zDepth;

    setPosition(playerEntry, projPlayer, hopPlayer, playerEntry.currentX, playerEntry.currentY, playerPos, lootDrops, visibleTilesSet);
    if (pHit) {
      playerEntry.icon.tint = pHit.color; // use the hit's color (e.g. fire/lightning)
    } else {
      playerEntry.icon.tint = 0xe4e4e7;
    }
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
      
      if (targetDistEnemy > 1.2) {
        entry.isDashing = true;
      } else if (targetDistEnemy < 0.1) {
        entry.isDashing = false;
      }

      if (entry.isDashing) {
        entry.currentX += (enemy.position.x - entry.currentX) * 0.25;
        entry.currentY += (enemy.position.y - entry.currentY) * 0.25;
      } else {
        entry.currentX += (enemy.position.x - entry.currentX) * 0.14;
        entry.currentY += (enemy.position.y - entry.currentY) * 0.14;
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
         projEnemy.screenX = jitterProj.screenX;
         projEnemy.screenY = jitterProj.screenY;
      }
      
      setPosition(entry, projEnemy, hopEnemy, entry.currentX, entry.currentY, playerPos, lootDrops, visibleTilesSet);
      
      const intensity = getTileLightIntensity(entry.currentX, entry.currentY, playerPos, lootDrops, visibleTilesSet);
      entry.icon.tint = getEntityTint(intensity);
      if (eHit) {
        entry.icon.tint = eHit.color;
      }
      entry.flashSprite.tint = 0xffffff;
      updateFlash(entry, key, isHit);

        // Hover and Targeting
        const isTargeted = enemy.id === activeTargetId;
        const isHovered = enemy.id === hoveredEnemyId; // highlight at any time
        
        // Handle Hover Tint
        if (isHovered) {
          const currentHitAlpha = flashAlphas.get(key) ?? 0;
          entry.flashSprite.visible = true;
          entry.flashSprite.alpha = Math.max(0.80, currentHitAlpha); // Uniform 80% opacity
          entry.icon.scale.set(0.85);
          entry.flashSprite.scale.set(0.85);
        } else {
          entry.icon.scale.set(0.85);
          entry.flashSprite.scale.set(0.85);
        }

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
        entry = makeEntitySprite(bestIcon, color, key, ENTITY_Z.loot, false, 0.65); // Shrink floor loot
      }
      if (visibleTiles && !visibleTiles.has(`${drop.position.x},${drop.position.y}`)) {
        hideEntry(entry);
        continue;
      }
      showEntry(entry);
      {
        const projLoot = projectTileToScreen(drop.position.x, drop.position.y, params);
        setPosition(entry, projLoot, 0, drop.position.x, drop.position.y, playerPos, lootDrops, visibleTilesSet);

        // Soft procedural VFX for loot
        if (entry.lootGlow && entry.lootBeam) {
          const time = Date.now();
          const floatY = Math.sin(time / 400 + drop.position.x) * 4;
          entry.icon.y = floatY; // Bob the item sprite up and down
          
          // Now that items are filled with a solid color, they act as a perfect mask!
          // We can anchor the beam directly behind the visual center of the item (-12px)
          // and the solid item will completely obscure the base of the beam!
          entry.lootGlow.y = 0;
          entry.lootBeam.y = floatY - 12;

          const hexColor = parseInt(color.replace('#', '0x'), 16);
          const pulseAlpha = 0.5 + 0.3 * Math.sin(time / 500);
          
          entry.lootGlow.tint = hexColor;
          entry.lootGlow.alpha = pulseAlpha;
          entry.lootGlow.scale.set(0.8 + pulseAlpha * 0.2); // Pulse size slightly

          const rarityVal = rv[bestRarity] ?? 0;
          
          const BEAM_SIZES = [
            { h: 90, w: 18 },  // 0: Normal
            { h: 120, w: 18 }, // 1: Magic
            { h: 150, w: 20 }, // 2: Rare
            { h: 180, w: 22 }, // 3: Epic
            { h: 210, w: 24 }, // 4: Legendary
            { h: 210, w: 24 }, // 5: Unique
          ];
          const size = BEAM_SIZES[rarityVal] ?? BEAM_SIZES[0];
          
          entry.lootBeam.tint = hexColor;
          entry.lootBeam.alpha = 0.5 + (pulseAlpha * 0.2);
          entry.lootBeam.height = size.h;
          entry.lootBeam.width = size.w;
        }
      }
    }

    // --- Obstacles ---
    for (const obs of obstacles) {
      const key = `obstacle:${obs.x},${obs.y}`;
      activeKeys.add(key);
      let entry = tracked.get(key);
      if (!entry) {
        const kind = obs.type === 'tree' ? 'trees' : obs.type === 'rock' ? 'mountain' : 'mountain';
        const color = '#71717a';
        entry = makeEntitySprite(kind, color, key, ENTITY_Z.obstacle, false);
      }
      if (visibleTiles && !visibleTiles.has(`${obs.x},${obs.y}`)) {
        hideEntry(entry);
        continue;
      }
      showEntry(entry);
      {
        const projObs = projectTileToScreen(obs.x, obs.y, params);
        setPosition(entry, projObs, 0, obs.x, obs.y, playerPos, lootDrops, visibleTilesSet);
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

  return { container, uiContainer, update: tick };
}
