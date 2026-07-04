import { Container, Sprite, Graphics } from 'pixi.js';
import { getEntityTexture } from '../assets';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams, ProjectedPoint } from '../../engine/world/screenProjection';
import type { Enemy, LootDrop, Obstacle } from '../../store/useWorldStore';

// ---- Constants ---------------------------------------------------------------
const HEALTH_BAR_WIDTH = 90;
const HEALTH_BAR_HEIGHT = 10;
const HEALTH_BAR_OFFSET_Y = -110;

const SHADOW_WIDTH = 110; // wide oval shadow
const SHADOW_HEIGHT = 65; // ~62% of width = oval

const ENTITY_Z = {
  obstacle: 0,
  loot: 1,
  enemy: 2,
  player: 3,
} as const;

const RARITY_COLORS: Record<string, string> = {
  Normal: '#a1a1aa',
  Magic: '#60a5fa',
  Rare: '#fde047',
  Epic: '#c084fc',
  Legendary: '#fb923c',
  Unique: '#d97706',
};

// ---- Types ------------------------------------------------------------------
interface TrackedSprite {
  container: Container;
  icon: Sprite;
  shadow: Graphics;
  healthBar: Graphics | null;
  selectRing: Graphics;
  flashSprite: Sprite;
  lootGlow: Graphics | null;
  key: string;
  kind: keyof typeof ENTITY_Z;
  currentX?: number;
  currentY?: number;
  isDashing?: boolean;
}

export interface EntityRenderer {
  container: Container;
  update: (
    params: ProjectionParams,
    baseScale: number,
    playerPos: { x: number; y: number },
    playerHit: boolean,
    enemies: Enemy[],
    activeTargetId: string | null,
    lootDrops: LootDrop[],
    obstacles: Obstacle[],
    hitEffectIds: Set<string>,
    hoveredEnemyId?: string | null,
    showHoverRing?: boolean,
  ) => void;
}

// ---- Factory ----------------------------------------------------------------
export function createEntityRenderer(): EntityRenderer {
  const container = new Container();
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
  ): TrackedSprite {
    const c = new Container();
    c.zIndex = zIdx;

    const isObstacle = kind === 'trees' || kind === 'mountain';

    // Shadow first (bottom of container)
    const shadow = makeShadow();
    if (isObstacle) {
      shadow.scale.set(1.15, 1.15); // Widen obstacle shadows
    } else {
      shadow.scale.set(0.85, 0.85); // Shrink others to match icon
    }
    c.addChild(shadow);

    // Icon above shadow
    const texture = getEntityTexture(kind, color);
    const icon = new Sprite(texture);
    icon.anchor.set(0.5, 0.85);
    if (!isObstacle) {
      icon.scale.set(0.85, 0.85); // Shrink non-obstacle icons
    }
    c.addChild(icon);

    // Health bar above icon
    const healthBar = hasHealthBar ? makeHealthBar() : null;
    if (healthBar) {
      healthBar.y = HEALTH_BAR_OFFSET_Y;
      healthBar.visible = false;
      c.addChild(healthBar);
    }

    // Select ring (topmost)
    const selectRing = makeSelectRing();
    c.addChild(selectRing);

    // Flash sprite (same texture, white color)
    const flashTexture = getEntityTexture(kind, '#ffffff');
    const flashSprite = new Sprite(flashTexture);
    flashSprite.anchor.set(0.5, 0.85);
    if (!isObstacle) {
      flashSprite.scale.set(0.85, 0.85); // Shrink flash to match icon
    }
    flashSprite.visible = false;
    c.addChild(flashSprite);

    // Glow ring for loot (behind icon, above shadow)
    const lootGlow: Graphics | null = kind === 'loot' ? new Graphics() : null;
    if (lootGlow) {
      c.addChildAt(lootGlow, 1); // Insert after shadow (index 0)
    }

    const entry: TrackedSprite = {
      container: c,
      icon,
      shadow,
      healthBar,
      selectRing,
      flashSprite,
      lootGlow,
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

  // Hit shake: random 3px jitter to sell impact, decays each frame
  function hitJitter(): number {
    return (Math.random() - 0.5) * 6;
  }

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
    shake = false,
    hopOffset = 0,
    viewportWidth = 800,
  ) {
    const sx = projected.screenX + (shake ? hitJitter() : 0);
    const sy = projected.screenY + (shake ? hitJitter() : 0);
    entry.container.position.set(sx, sy);
    entry.container.scale.set(projected.scale * activeBaseScale);
    
    entry.icon.skew.x = 0;
    entry.flashSprite.skew.x = 0;
    
    // Apply hop ONLY to the physical body sprites, not the shadow/floor rings
    entry.icon.y = -hopOffset;
    entry.flashSprite.y = -hopOffset;
    if (entry.healthBar) {
      entry.healthBar.y = HEALTH_BAR_OFFSET_Y - hopOffset;
    }
  }

  function showEntry(entry: TrackedSprite) {
    entry.container.visible = true;
  }

  function hideEntry(entry: TrackedSprite) {
    entry.container.visible = false;
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
    hitEffectIds: Set<string>,
    hoveredEnemyId?: string | null,
    showHoverRing?: boolean,
  ) {
    activeBaseScale = baseScale;
    const activeKeys = new Set<string>();

    // --- Player ---
    const playerKey = 'player';
    activeKeys.add(playerKey);
    let playerEntry = tracked.get(playerKey);
    if (!playerEntry) {
      playerEntry = makeEntitySprite('squirrel', '#10b981', playerKey, ENTITY_Z.player, false);
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
    const hopMax = isVerticalOnly ? 80 : 35;

    const hopPlayer = playerEntry.isDashing ? 0 : hopMax * Math.sin((progress * Math.PI) / 2);

    const projPlayer = projectTileToScreen(playerEntry.currentX, playerEntry.currentY, params);
    projPlayer.zDepth += 100; // slightly above enemies
    playerEntry.container.zIndex = projPlayer.zDepth;

    setPosition(playerEntry, projPlayer, playerHit, hopPlayer, params.viewportWidth);
    playerEntry.icon.tint = playerHit ? 0xffaaaa : 0xffffff;
    updateFlash(playerEntry, playerKey, playerHit);
    }

    // --- Enemies ---
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const key = `enemy:${enemy.id}`;
      activeKeys.add(key);
      let entry = tracked.get(key);
      if (!entry) {
        entry = makeEntitySprite('rabbit', '#ef4444', key, ENTITY_Z.enemy, true);
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
      const hopMax = isVerticalOnly ? 80 : 35;

      const hopEnemy = entry.isDashing ? 0 : hopMax * Math.sin((progress * Math.PI) / 2);

      const projEnemy = projectTileToScreen(entry.currentX, entry.currentY, params);
      entry.container.zIndex = projEnemy.zDepth;
      const isHit = hitEffectIds.has(enemy.id);
      setPosition(entry, projEnemy, isHit, hopEnemy, params.viewportWidth);
      entry.icon.tint = isHit ? 0xffaaaa : 0xffffff;
      updateFlash(entry, key, isHit);

        // Targeting ring (pulsing alpha fade)
        const isTargeted = enemy.id === activeTargetId;
        const isHovered = showHoverRing && enemy.id === hoveredEnemyId;
        if (isTargeted || isHovered) {
          entry.selectRing.visible = true;
          const pulseAlpha = isTargeted
            ? 0.4 + 0.5 * (Math.sin(Date.now() / 350) + 1) / 2
            : 0.3 + 0.4 * (Math.sin(Date.now() / 450) + 1) / 2; // slightly different pulse for hover
          const color = isTargeted ? 0xef4444 : 0xf87171; // red-500 vs red-400
          const width = isTargeted ? 4 : 2;
          
          const iconW = entry.icon.width;
          const iconH = entry.icon.height;
          // Sprite anchor is 0.5, 0.85. Center of sprite is -iconH * 0.35
          const centerY = -iconH * 0.35;
          const maxExtent = Math.max(iconW / 2, iconH / 2) + 2; // 2px padding
          
          entry.selectRing.clear();
          entry.selectRing.rect(-maxExtent, centerY - maxExtent, maxExtent * 2, maxExtent * 2);
          entry.selectRing.stroke({ color, alpha: pulseAlpha, width });
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
      let entry = tracked.get(key);
      if (!entry) {
        let bestIcon = drop.items[0]?.icon ?? 'Sword';
        let bestRarity = 'Normal';
        const rv = { Normal: 0, Magic: 1, Rare: 2, Epic: 3, Legendary: 4, Unique: 5 } as Record<string, number>;
        for (const item of drop.items) {
          if ((rv[item.rarity] ?? 0) > (rv[bestRarity] ?? 0)) {
            bestRarity = item.rarity;
            bestIcon = item.icon ?? 'Sword';
          }
        }
        const color = RARITY_COLORS[bestRarity] ?? '#a1a1aa';
        entry = makeEntitySprite(bestIcon, color, key, ENTITY_Z.loot, false);
      }
      showEntry(entry);
      {
        const proj = projectTileToScreen(drop.position.x, drop.position.y, params);
        setPosition(entry, proj, false, 0, params.viewportWidth);

        // Pulsing glow ring for loot
        if (entry.lootGlow) {
          const pulseAlpha = 0.15 + 0.1 * (Math.sin(Date.now() / 800) + 1) / 2;
          entry.lootGlow.clear();
          entry.lootGlow.circle(0, 0, 18);
          entry.lootGlow.fill({ color: 0xfef08a, alpha: pulseAlpha }); // yellow-200 glow
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
        entry = makeEntitySprite(kind, '#71717a', key, ENTITY_Z.obstacle, false);
      }
      showEntry(entry);
      {
        const proj = projectTileToScreen(obs.x, obs.y, params);
        setPosition(entry, proj, false, 0, params.viewportWidth);
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

  return { container, update: tick };
}
