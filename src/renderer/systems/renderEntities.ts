import { Container, Sprite, Graphics } from 'pixi.js';
import { getEntityTexture } from '../assets';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams, ProjectedPoint } from '../../engine/world/screenProjection';
import type { Enemy, LootDrop, Obstacle } from '../../store/useWorldStore';

// ---- Constants ---------------------------------------------------------------
const HEALTH_BAR_WIDTH = 20;
const HEALTH_BAR_HEIGHT = 6;
const HEALTH_BAR_OFFSET_Y = -16;

const SHADOW_WIDTH = 100; // wide oval shadow
const SHADOW_HEIGHT = 62; // ~62% of width = oval

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
  flashOverlay: Graphics;
  key: string;
  kind: keyof typeof ENTITY_Z;
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
  ) => void;
}

// ---- Factory ----------------------------------------------------------------
export function createEntityRenderer(): EntityRenderer {
  const container = new Container();
  const tracked = new Map<string, TrackedSprite>();

  // ---- Sub-graphics factories -----------------------------------------------
  function makeShadow(): Graphics {
    const g = new Graphics();
    g.ellipse(0, 0, SHADOW_WIDTH / 2, SHADOW_HEIGHT / 2);
    g.fill({ color: 0x000000, alpha: 0.35 });
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
    g.rect(-72, -115, 144, 144);
    g.stroke({ color: 0xef4444, alpha: 0.75, width: 5 });
    g.visible = false;
    return g;
  }

  function makeFlashOverlay(): Graphics {
    const g = new Graphics();
    g.circle(0, 0, 16);
    g.fill({ color: 0xffffff, alpha: 0.5 });
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

    // Shadow first (bottom of container)
    const shadow = makeShadow();
    c.addChild(shadow);

    // Icon above shadow
    const texture = getEntityTexture(kind, color);
    const icon = new Sprite(texture);
    icon.anchor.set(0.5, 0.85);
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

    // Flash overlay (above everything, hidden by default)
    const flashOverlay = makeFlashOverlay();
    c.addChild(flashOverlay);

    const entry: TrackedSprite = {
      container: c,
      icon,
      shadow,
      healthBar,
      selectRing,
      flashOverlay,
      key,
      kind: kind as keyof typeof ENTITY_Z,
    };

    container.addChild(c);
    tracked.set(key, entry);
    return entry;
  }

  let activeBaseScale = 1;

  // Hit shake: random 3px jitter to sell impact, decays each frame
  function hitJitter(): number {
    return (Math.random() - 0.5) * 6;
  }

  function setPosition(
    entry: TrackedSprite,
    projected: ProjectedPoint,
    shake = false,
  ) {
    const sx = projected.screenX + (shake ? hitJitter() : 0);
    const sy = projected.screenY + (shake ? hitJitter() : 0);
    entry.container.position.set(sx, sy);
    entry.container.scale.set(projected.scale * activeBaseScale);
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
  ) {
    activeBaseScale = baseScale;
    const activeKeys = new Set<string>();

    // --- Player ---
    const playerKey = 'player';
    activeKeys.add(playerKey);
    let playerEntry = tracked.get(playerKey);
    if (!playerEntry) {
      playerEntry = makeEntitySprite('rabbit', '#10b981', playerKey, ENTITY_Z.player, false);
    }
    showEntry(playerEntry);
    {
      const proj = projectTileToScreen(playerPos.x, playerPos.y, params);
      setPosition(playerEntry, proj, playerHit);
      playerEntry.icon.tint = playerHit ? 0xffffff : 0xffffff;
      playerEntry.flashOverlay.visible = playerHit;
    }

    // --- Enemies ---
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const key = `enemy:${enemy.id}`;
      activeKeys.add(key);
      let entry = tracked.get(key);
      if (!entry) {
        entry = makeEntitySprite('bird', '#ef4444', key, ENTITY_Z.enemy, true);
      }
      showEntry(entry);
      {
        const proj = projectTileToScreen(enemy.position.x, enemy.position.y, params);
        const isHit = hitEffectIds.has(enemy.id);
        setPosition(entry, proj, isHit);
        entry.icon.tint = isHit ? 0xffffff : 0xffffff;
        entry.flashOverlay.visible = isHit;

        // Targeting ring
        entry.selectRing.visible = enemy.id === activeTargetId;

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
        setPosition(entry, proj);
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
        setPosition(entry, proj);
      }
    }

    // --- Remove stale ---
    for (const [key, entry] of tracked) {
      if (!activeKeys.has(key)) {
        hideEntry(entry);
      }
    }

    sortByDepth();
  }

  return { container, update: tick };
}
