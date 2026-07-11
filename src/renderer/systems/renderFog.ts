import { Container, Graphics, BlurFilter } from 'pixi.js';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import type { GridMap } from '../../store/useWorldStore';
import { useLightingStore } from '../../store/useLightingStore';
import { getTileLighting, type PointLight } from '../utils/lighting';
import { getBiome } from '../../data/biomes';

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
    pointLights: PointLight[]
  ) => void;
}

export function createFogRenderer(): FogRenderer {
  const container = new Container();
  const fogGraphics = new Graphics();
  // We keep a slight blur so the tile diamonds aren't razor sharp
  fogGraphics.filters = [new BlurFilter({ strength: 4 })];
  container.addChild(fogGraphics);

  const voidFrameGraphics = new Graphics();
  container.addChild(voidFrameGraphics);

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
    pointLights: PointLight[]
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
    voidFrameGraphics.clear();
    const voidColor = getBiome(grid.environment).voidColor;
    const { ambientDarkness, memoryFogOpacity } = useLightingStore.getState();

    // Draw the void frame to perfectly hide the expanded fog and floor, 
    // seamlessly matching the canvas background without performance-killing PixiJS masks!
    const tl = projectTileToScreen(-0.5, -0.5, params);
    const tr = projectTileToScreen(grid.width - 0.5, -0.5, params);
    const br = projectTileToScreen(grid.width - 0.5, grid.height - 0.5, params);
    const bl = projectTileToScreen(-0.5, grid.height - 0.5, params);

    const L = -9999, R = 9999, T = -9999, B = 9999;
    
    // Draw the massive outer area in fogGraphics so the BlurFilter has solid pixels to blur against
    // at the map edge (-0.5), preventing the transparent bleed-through that causes the glowing floor seam.
    fogGraphics.poly([L, T, R, T, tr.screenX, tr.screenY, tl.screenX, tl.screenY]);
    fogGraphics.fill({ color: voidColor });
    fogGraphics.poly([R, T, R, B, br.screenX, br.screenY, tr.screenX, tr.screenY]);
    fogGraphics.fill({ color: voidColor });
    fogGraphics.poly([R, B, L, B, bl.screenX, bl.screenY, br.screenX, br.screenY]);
    fogGraphics.fill({ color: voidColor });
    fogGraphics.poly([L, B, L, T, tl.screenX, tl.screenY, bl.screenX, bl.screenY]);
    fogGraphics.fill({ color: voidColor });

    // Draw the exact same frame in voidFrameGraphics (which has NO blur filter) to guarantee 
    // a razor-sharp cutoff outside the map, masking any remaining blur artifacts completely.
    voidFrameGraphics.poly([L, T, R, T, tr.screenX, tr.screenY, tl.screenX, tl.screenY]);
    voidFrameGraphics.fill({ color: voidColor });
    voidFrameGraphics.poly([R, T, R, B, br.screenX, br.screenY, tr.screenX, tr.screenY]);
    voidFrameGraphics.fill({ color: voidColor });
    voidFrameGraphics.poly([R, B, L, B, bl.screenX, bl.screenY, br.screenX, br.screenY]);
    voidFrameGraphics.fill({ color: voidColor });
    voidFrameGraphics.poly([L, B, L, T, tl.screenX, tl.screenY, bl.screenX, bl.screenY]);
    voidFrameGraphics.fill({ color: voidColor });

    const isTown = grid.environment === 'town';
    const ctx = {
      isTown,
      playerLightRadius: useLightingStore.getState().playerLightRadiusDungeon,
      minBrightness: useLightingStore.getState().minBrightness,
      entityAmbient: getBiome(grid.environment).entityAmbient,
    };

    for (let y = 0; y < grid.height; y++) {
      for (let x = 0; x < grid.width; x++) {

        const key = `${x},${y}`;
        const isVisible = visibleTiles.has(key);
        const isExplored = exploredTiles.has(key);

        // If completely unexplored, draw opaque void color
        if (!isVisible && !isExplored) {
          drawTilePolygon(fogGraphics, x, y, params, voidColor, 1.0);
          continue;
        }

        if (!isVisible && isExplored) {
          drawTilePolygon(fogGraphics, x, y, params, voidColor, memoryFogOpacity);
          continue;
        }

        // If visible, calculate grid-based lighting intensity and color
        const lighting = getTileLighting(x, y, playerPos, pointLights, ctx);

        // Map intensity 1.0 -> alpha 0.0 (fully lit)
        // Map intensity 0.0 -> alpha ambientDarkness
        const fogAlpha = ambientDarkness * (1.0 - lighting.intensity);

        if (fogAlpha > 0.05) { // Skip drawing nearly-invisible fog
          drawTilePolygon(fogGraphics, x, y, params, 0x000000, fogAlpha);
        }
      }
    }
  }

  function drawTilePolygon(graphics: Graphics, x: number, y: number, params: ProjectionParams, color: number, alpha: number) {
    const tl = projectTileToScreen(x - 0.5, y - 0.5, params);
    const tr = projectTileToScreen(x + 0.5, y - 0.5, params);
    const br = projectTileToScreen(x + 0.5, y + 0.5, params);
    const bl = projectTileToScreen(x - 0.5, y + 0.5, params);

    graphics.moveTo(tl.screenX, tl.screenY);
    graphics.lineTo(tr.screenX, tr.screenY);
    graphics.lineTo(br.screenX, br.screenY);
    graphics.lineTo(bl.screenX, bl.screenY);
    graphics.lineTo(tl.screenX, tl.screenY);
    graphics.fill({ color, alpha });
  }

  return { container, rebuild, update };
}
