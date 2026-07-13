import { getBiome } from '../../data/biomes';
import type { GridMap, Obstacle, Enemy, LootDrop } from '../../store/useWorldStore';

// ---------------------------------------------------------------------------
// Shared minimap/overlay-map rendering. Pure canvas-2D — deliberately NOT part
// of the PixiJS world renderer: the minimap uses a flat top-down orthographic
// projection (unrelated to screenProjection.ts's isometric 2.5D camera math),
// and spinning up a second PixiJS/WebGL context just to draw a handful of
// flat squares would be wasteful. Both the corner Minimap and the full-screen
// MapOverlay call this same function so behavior/appearance always match —
// they only differ in canvas size and `mode`.
// ---------------------------------------------------------------------------

export interface MinimapEntities {
  grid: GridMap;
  exploredTiles: Set<string>;
  visibleTiles: Set<string>;
  playerPos: { x: number; y: number };
  enemies: Enemy[];
  lootDrops: LootDrop[];
}

export interface MinimapDrawOptions {
  canvasWidth: number;
  canvasHeight: number;
  /** Tiles shown from center to edge — the single "zoom" knob. Same concept, same formula,
   *  for both the corner minimap and the full overlay: lower = zoomed in (bigger tiles, less
   *  area, pans/follows the player once the grid doesn't fit); higher = zoomed out (more of
   *  the grid visible, smaller tiles). When the grid is smaller than the resulting view
   *  window on an axis, that axis just centers the whole grid instead of panning. */
  radiusTiles?: number;
  /** Draw small text labels above points of interest (used by the full overlay, omitted on the small corner map to stay uncluttered). */
  showLabels?: boolean;
  /** Overall opacity of the drawn map (0-1). Applied via ctx.globalAlpha so the live game
   *  behind the canvas actually shows through — a background div's own opacity has no effect
   *  here since every pixel drawn below is fully opaque otherwise. */
  alpha?: number;
}

const RARITY_DOT_COLORS: Record<string, string> = {
  Normal: '#a1a1aa',
  Magic: '#3b82f6',
  Rare: '#eab308',
  Epic: '#a855f7',
  Legendary: '#38bdf8',
  Unique: '#f59e0b',
};

export const MINIMAP_LEGEND_COLORS = {
  player: '#10b981', // emerald-500 — Player UI token
  enemy: '#ef4444', // red-500 — Enemy UI token
  boss: '#f87171',
  npc: '#38bdf8', // sky-400 / accent
  exit: '#f59e0b', // amber-500
};

const VOID_COLOR = '#0a0a0c';

function hexToRgb(hex: number) {
  return { r: (hex >> 16) & 0xff, g: (hex >> 8) & 0xff, b: hex & 0xff };
}

function shadeColor(hex: number, factor: number): string {
  const { r, g, b } = hexToRgb(hex);
  const cr = Math.min(255, Math.round(r * factor));
  const cg = Math.min(255, Math.round(g * factor));
  const cb = Math.min(255, Math.round(b * factor));
  return `rgb(${cr},${cg},${cb})`;
}

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  entities: MinimapEntities,
  options: MinimapDrawOptions
) {
  const { grid, exploredTiles, visibleTiles, playerPos, enemies, lootDrops } = entities;
  const { canvasWidth, canvasHeight, radiusTiles = 9, showLabels = false, alpha = 1 } = options;

  ctx.save();
  ctx.globalAlpha = alpha;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.fillStyle = VOID_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  if (!grid || grid.width <= 0 || grid.height <= 0) {
    ctx.restore();
    return;
  }

  const biome = getBiome(grid.environment);
  const wallColorInt = biome.wallColor ?? 0x27272a;

  // Single zoom knob for both the corner minimap and the full overlay: tileSize is derived
  // straight from radiusTiles and the canvas's own pixel size.
  const tileSize = Math.max(4, Math.floor(Math.min(canvasWidth, canvasHeight) / (radiusTiles * 2 + 1)));
  const gridPxW = tileSize * grid.width;
  const gridPxH = tileSize * grid.height;

  // Camera origin computed directly in pixel space (not fractional tile-center space) so
  // edge clamping is exact — no half-tile misalignment when the camera is pinned against
  // any of the grid's 4 edges. Ideally the player's tile sits centered in the canvas;
  // clamped so the grid never shows blank space past its own edges. When the grid is
  // smaller than the canvas on an axis, the clamp range collapses to a single value that
  // perfectly centers the whole grid on that axis (ignoring player position there).
  const idealOriginX = canvasWidth / 2 - (playerPos.x + 0.5) * tileSize;
  const idealOriginY = canvasHeight / 2 - (playerPos.y + 0.5) * tileSize;
  const originX =
    gridPxW <= canvasWidth
      ? Math.round((canvasWidth - gridPxW) / 2)
      : Math.round(Math.min(0, Math.max(canvasWidth - gridPxW, idealOriginX)));
  const originY =
    gridPxH <= canvasHeight
      ? Math.round((canvasHeight - gridPxH) / 2)
      : Math.round(Math.min(0, Math.max(canvasHeight - gridPxH, idealOriginY)));

  const toScreen = (gx: number, gy: number) => ({
    px: originX + gx * tileSize,
    py: originY + gy * tileSize,
  });

  const obstacleAt = new Map<string, Obstacle>();
  for (const o of grid.obstacles) obstacleAt.set(`${o.x},${o.y}`, o);

  const pois: { x: number; y: number; type: Obstacle['type'] }[] = [];

  for (let gy = 0; gy < grid.height; gy++) {
    for (let gx = 0; gx < grid.width; gx++) {
      const key = `${gx},${gy}`;
      if (!exploredTiles.has(key)) continue; // fog of war — unexplored stays blank
      const isVisible = visibleTiles.has(key);
      const obstacle = obstacleAt.get(key);
      const { px, py } = toScreen(gx, gy);

      if (obstacle && (obstacle.type === 'wall' || obstacle.type === 'rock' || obstacle.type === 'tree')) {
        // Blocking terrain reads as dark/blank so walkable floor stands out clearly
        ctx.fillStyle = shadeColor(wallColorInt, isVisible ? 0.55 : 0.28);
        ctx.fillRect(px, py, tileSize, tileSize);
        continue;
      }

      // Walkable floor, tinted with the current biome so the minimap matches the world
      ctx.fillStyle = shadeColor(biome.floorColor, isVisible ? 1.9 : 0.75);
      ctx.fillRect(px, py, tileSize, tileSize);

      if (obstacle && (obstacle.type === 'npc_guide' || obstacle.type === 'dungeon_entrance')) {
        pois.push({ x: gx, y: gy, type: obstacle.type });
      }
    }
  }

  // Points of interest (NPCs, dungeon exits) — always shown once explored, they don't move
  for (const poi of pois) {
    const { px, py } = toScreen(poi.x, poi.y);
    const cx = px + tileSize / 2;
    const cy = py + tileSize / 2;
    const s = Math.max(3, tileSize * 0.64);
    ctx.fillStyle = poi.type === 'dungeon_entrance' ? MINIMAP_LEGEND_COLORS.exit : MINIMAP_LEGEND_COLORS.npc;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);

    if (showLabels) {
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(poi.type === 'dungeon_entrance' ? 'EXIT' : 'NPC', cx, py - 4);
    }
  }

  // Loot — entity radar only reveals what's currently in vision, matching the world renderer's fog rules
  for (const drop of lootDrops) {
    const key = `${drop.position.x},${drop.position.y}`;
    if (!visibleTiles.has(key)) continue;
    let bestRarity = 'Normal';
    const rv: Record<string, number> = { Normal: 0, Magic: 1, Rare: 2, Epic: 3, Legendary: 4, Unique: 5 };
    for (const item of drop.items) {
      if ((rv[item.rarity] ?? 0) > (rv[bestRarity] ?? 0)) bestRarity = item.rarity;
    }
    const { px, py } = toScreen(drop.position.x, drop.position.y);
    const cx = px + tileSize / 2;
    const cy = py + tileSize / 2;
    const s = Math.max(2.5, tileSize * 0.36);
    ctx.fillStyle = RARITY_DOT_COLORS[bestRarity] ?? RARITY_DOT_COLORS.Normal;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }

  // Enemies — live radar blips, only while actually visible (no wallhacks)
  for (const enemy of enemies) {
    if (enemy.isDead) continue;
    const key = `${Math.round(enemy.position.x)},${Math.round(enemy.position.y)}`;
    if (!visibleTiles.has(key)) continue;
    const { px, py } = toScreen(enemy.position.x, enemy.position.y);
    const isBoss = enemy.rarity === 'Boss';
    const cx = px + tileSize / 2;
    const cy = py + tileSize / 2;
    const s = Math.max(2.5, tileSize * (isBoss ? 0.68 : 0.44));
    ctx.fillStyle = isBoss ? MINIMAP_LEGEND_COLORS.boss : MINIMAP_LEGEND_COLORS.enemy;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }

  // Player — always on top, always known
  {
    const { px, py } = toScreen(playerPos.x, playerPos.y);
    const cx = px + tileSize / 2;
    const cy = py + tileSize / 2;
    const s = Math.max(3, tileSize * 0.6);
    ctx.fillStyle = MINIMAP_LEGEND_COLORS.player;
    ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
  }

  ctx.restore();
}
