import { Container, Graphics } from 'pixi.js';
import type { GridMap } from '../../store/useWorldStore';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { getTileLighting, type PointLight } from '../utils/lighting';
import { useLightingStore } from '../../store/useLightingStore';

const FLOOR_PERSPECTIVE_PX = 2500;
const FLOOR_TILT_DEG = 52;
const WALL_HEIGHT_SCREEN_PX = 100; // Shorter boundary walls

export interface BoundaryWallRenderer {
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
    playerPos: { x: number; y: number },
    pointLights: PointLight[],
    visibleTiles: Set<string>,
    exploredTiles: Set<string>
  ) => void;
}

export function createBoundaryWallRenderer(): BoundaryWallRenderer {
  const container = new Container();
  const wallsGraphics = new Graphics();
  container.addChild(wallsGraphics);

  let lastPanX = -9999;
  let lastPanY = -9999;
  let lastVisCount = -1;
  let lastExpCount = -1;

  function rebuild(_grid: GridMap) {
    // Force rebuild on grid change
    lastPanX = -9999;
  }

  function update(
    panX: number,
    panY: number,
    viewportW: number,
    viewportH: number,
    grid: GridMap,
    tileSize: number,
    focusWorldY: number,
    playerPos: { x: number; y: number },
    pointLights: PointLight[],
    visibleTiles: Set<string>,
    exploredTiles: Set<string>
  ) {
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

    const now = Date.now();
    // Pulse every ~3.7 seconds (0.75 +/- 0.25)
    container.alpha = 0.75 + 0.25 * Math.sin(now / 600);

    // Skip expensive geometry rebuild if camera and vision hasn't moved
    if (panX === lastPanX && panY === lastPanY && visibleTiles.size === lastVisCount && exploredTiles.size === lastExpCount) {
      return;
    }

    lastPanX = panX;
    lastPanY = panY;
    lastVisCount = visibleTiles.size;
    lastExpCount = exploredTiles.size;

    wallsGraphics.clear();

    const w = grid.width;
    const h = grid.height;

    const applyLighting = (baseColor: number, brightness: number) => {
      const r = Math.floor(((baseColor >> 16) & 0xff) * brightness);
      const g = Math.floor(((baseColor >> 8) & 0xff) * brightness);
      const b = Math.floor((baseColor & 0xff) * brightness);
      return (r << 16) | (g << 8) | b;
    };

    const getBrightness = (x: number, y: number) => {
      // For boundaries, if they are adjacent to a visible tile, they are visible.
      // Easiest is to check the tile itself or clamp to grid
      const clampX = Math.max(0, Math.min(w - 1, Math.floor(x)));
      const clampY = Math.max(0, Math.min(h - 1, Math.floor(y)));
      
      const isVisible = visibleTiles.has(`${clampX},${clampY}`);
      const isExplored = exploredTiles.has(`${clampX},${clampY}`);
      
      if (isVisible) {
         const lighting = getTileLighting(clampX, clampY, playerPos, pointLights);
         const { ambientDarkness } = useLightingStore.getState();
         const fogAlpha = ambientDarkness * (1.0 - lighting.intensity);
          return { brightness: Math.max(0, 1.0 - fogAlpha) };
      }
      
      if (isExplored) {
         const { memoryFogOpacity } = useLightingStore.getState();
         return { brightness: Math.max(0, 1.0 - memoryFogOpacity) };
      }
      
      return { brightness: 0.0 };
    };

    const drawWallPlane = (x1: number, y1: number, x2: number, y2: number) => {
      const b1 = projectTileToScreen(x1 - 0.5, y1 - 0.5, params);
      const b2 = projectTileToScreen(x2 - 0.5, y2 - 0.5, params);
      const t1 = { x: b1.screenX, y: b1.screenY - WALL_HEIGHT_SCREEN_PX * b1.scale };
      const t2 = { x: b2.screenX, y: b2.screenY - WALL_HEIGHT_SCREEN_PX * b2.scale };

      const lightResult = getBrightness(Math.min(x1, x2), Math.min(y1, y2));
      let brightness = lightResult.brightness;
      // South edges (x=w or y=h) overlap the floor in screen space, so dim them to be less intrusive
      if (x1 === w || y1 === h) {
        brightness *= 0.67;
      }

      // Mix the natural wall color with the light color, maintaining brightness
      const basePlane = 0x0c4a6e;
      const planeColor = applyLighting(basePlane, brightness);

      const baseGlow = 0x0284c7;
      const glowColor = applyLighting(baseGlow, brightness);

      // Plane
      wallsGraphics.moveTo(b1.screenX, b1.screenY);
      wallsGraphics.lineTo(b2.screenX, b2.screenY);
      wallsGraphics.lineTo(t2.x, t2.y);
      wallsGraphics.lineTo(t1.x, t1.y);
      wallsGraphics.closePath();
      wallsGraphics.fill({ color: planeColor, alpha: 0.45 }); 

      // Bottom perimeter line
      wallsGraphics.setStrokeStyle({ color: glowColor, alpha: 0.2, width: 2 });
      wallsGraphics.moveTo(b1.screenX, b1.screenY);
      wallsGraphics.lineTo(b2.screenX, b2.screenY);
      wallsGraphics.stroke();
    };

    const drawVerticalLine = (x: number, y: number, res1: { brightness: number }, res2: { brightness: number }) => {
      let brightness = Math.max(res1.brightness, res2.brightness);
      
      if (x === w || y === h) {
        brightness *= 0.67;
      }

      const baseLine = 0x38bdf8;
      const lineColor = applyLighting(baseLine, brightness);
      
      const base = projectTileToScreen(x - 0.5, y - 0.5, params);
      const top = { x: base.screenX, y: base.screenY - WALL_HEIGHT_SCREEN_PX * base.scale };
      
      wallsGraphics.setStrokeStyle({ color: lineColor, alpha: 0.15, width: 2 });
      wallsGraphics.moveTo(base.screenX, base.screenY);
      wallsGraphics.lineTo(top.x, top.y);
      wallsGraphics.stroke();
    };

    // Draw the boundary wall planes tile-by-tile
    for (let x = 0; x < w; x++) {
      drawWallPlane(x, 0, x + 1, 0); // Top
      drawWallPlane(x, h, x + 1, h); // Bottom
    }
    for (let y = 0; y < h; y++) {
      drawWallPlane(0, y, 0, y + 1); // Left
      drawWallPlane(w, y, w, y + 1); // Right
    }

    const def = { brightness: 0.1 };
    // Draw vertical lines exactly once per vertex
    for (let x = 0; x <= w; x++) {
      const bLeft = x > 0 ? getBrightness(x - 1, 0) : def;
      const bRight = x < w ? getBrightness(x, 0) : def;
      drawVerticalLine(x, 0, bLeft, bRight);
      
      const bLeftH = x > 0 ? getBrightness(x - 1, h) : def;
      const bRightH = x < w ? getBrightness(x, h) : def;
      drawVerticalLine(x, h, bLeftH, bRightH);
    }
    
    for (let y = 0; y <= h; y++) {
      if (y === 0 || y === h) continue; // Skip corners (already drawn by x loop)
      const bUp = y > 0 ? getBrightness(0, y - 1) : def;
      const bDown = y < h ? getBrightness(0, y) : def;
      drawVerticalLine(0, y, bUp, bDown);
      
      const bUpW = y > 0 ? getBrightness(w, y - 1) : def;
      const bDownW = y < h ? getBrightness(w, y) : def;
      drawVerticalLine(w, y, bUpW, bDownW);
    }
  }

  return {
    container,
    rebuild,
    update
  };
}
