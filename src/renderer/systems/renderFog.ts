import { Container, Graphics, BlurFilter } from 'pixi.js';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import type { GridMap, LootDrop } from '../../store/useWorldStore';
import { getTileLightIntensity, AMBIENT_DARKNESS } from '../utils/lighting';

const FLOOR_PERSPECTIVE_PX = 2500;
const FLOOR_TILT_DEG = 52;

export interface FogRenderer {
  container: Container;
  rebuild: (grid: GridMap) => void;
  update: (
    panX: number,
    panY: number,
    viewportW: number,
    viewportH: number,
    grid: GridMap,
    tileSize: number,
    focusWorldY: number,
    exploredTiles: Set<string>,
    visibleTiles: Set<string>,
    playerPos: { x: number, y: number },
    lootDrops: LootDrop[]
  ) => void;
}

export function createFogRenderer(): FogRenderer {
  const container = new Container();
  const fogGraphics = new Graphics();
  // We keep a slight blur so the tile diamonds aren't razor sharp
  fogGraphics.filters = [new BlurFilter({ strength: 4 })];
  container.addChild(fogGraphics);

  let lastPanKey = '';

  function rebuild(_g: GridMap) {
    lastPanKey = '';
  }

  function update(
    panX: number,
    panY: number,
    viewportW: number,
    viewportH: number,
    grid: GridMap,
    tileSize: number,
    focusWorldY: number,
    exploredTiles: Set<string>,
    visibleTiles: Set<string>,
    playerPos: { x: number, y: number },
    lootDrops: LootDrop[]
  ) {
    const panKey = `${panX},${panY},${viewportW},${viewportH},${tileSize},${exploredTiles.size},${visibleTiles.size},${playerPos.x},${playerPos.y}`;
    if (panKey === lastPanKey) return;
    lastPanKey = panKey;

    const params: ProjectionParams = {
      gridWidth: grid.width,
      gridHeight: grid.height,
      tileSize,
      viewportWidth: viewportW,
      viewportHeight: viewportH,
      panX,
      panY,
      focusWorldY,
      perspectivePx: FLOOR_PERSPECTIVE_PX,
      floorTiltDeg: FLOOR_TILT_DEG,
    };

    fogGraphics.clear();

    // Expand bounds by 2 to prevent blur filter from leaking at the grid edges
    for (let y = -2; y < grid.height + 2; y++) {
      for (let x = -2; x < grid.width + 2; x++) {
        // Draw opaque pitch-black fog for out-of-bounds tiles
        if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) {
          drawTileFog(x, y, params, 0x000000, 1.0);
          continue;
        }

        const key = `${x},${y}`;
        const isVisible = visibleTiles.has(key);
        const isExplored = exploredTiles.has(key);

        // If completely unexplored, draw opaque black
        if (!isVisible && !isExplored) {
          drawTileFog(x, y, params, 0x000000, 1.0);
          continue;
        }

        // If explored but not currently visible (Memory)
        if (!isVisible && isExplored) {
          drawTileFog(x, y, params, 0x000000, 0.85);
          continue;
        }

        // If visible, calculate grid-based lighting intensity
        const lightIntensity = getTileLightIntensity(x, y, playerPos, lootDrops, visibleTiles);

        // Map intensity 1.0 -> alpha 0.0 (fully lit)
        // Map intensity 0.0 -> alpha AMBIENT_DARKNESS
        const fogAlpha = AMBIENT_DARKNESS * (1.0 - lightIntensity);

        if (fogAlpha > 0.05) { // Skip drawing nearly-invisible fog
          drawTileFog(x, y, params, 0x000000, fogAlpha);
        }
      }
    }
  }

  function drawTileFog(x: number, y: number, params: ProjectionParams, color: number, alpha: number) {
    const tl = projectTileToScreen(x - 0.5, y - 0.5, params);
    const tr = projectTileToScreen(x + 0.5, y - 0.5, params);
    const br = projectTileToScreen(x + 0.5, y + 0.5, params);
    const bl = projectTileToScreen(x - 0.5, y + 0.5, params);

    fogGraphics.moveTo(tl.screenX, tl.screenY);
    fogGraphics.lineTo(tr.screenX, tr.screenY);
    fogGraphics.lineTo(br.screenX, br.screenY);
    fogGraphics.lineTo(bl.screenX, bl.screenY);
    fogGraphics.lineTo(tl.screenX, tl.screenY);
    fogGraphics.fill({ color, alpha });
  }

  return { container, rebuild, update };
}
