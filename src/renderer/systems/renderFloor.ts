import { Container, Graphics } from 'pixi.js';
import type { GridMap, GroundZone } from '../../store/useWorldStore';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';

const FLOOR_PERSPECTIVE_PX = 1400;
const FLOOR_TILT_DEG = 50;
const BASE_TILE_SIZE = 72;

const COLOR_FLOOR_BG = 0x18181b;
const COLOR_GRID_LINE = 0x27272a;

// Zone element → hex color
const ZONE_ELEMENT_COLORS: Record<string, number> = {
  Fire: 0xf97316,
  Cold: 0x60a5fa,
  Lightning: 0xfacc15,
  Strike: 0x71717a,
  Pierce: 0x71717a,
};

export interface FloorRenderer {
  container: Container;
  rebuild: (grid: GridMap) => void;
  update: (
    panX: number,
    panY: number,
    viewportW: number,
    viewportH: number,
    grid: GridMap,
    tileSize: number,
    zones: GroundZone[],
    focusWorldY: number,
  ) => void;
}

export function createFloorRenderer(): FloorRenderer {
  const container = new Container();

  // Layer 0: floor background fill
  const bgLayer = new Container();
  // Layer 1: zone effects
  const zoneLayer = new Container();
  // Layer 2: grid lines
  const gridLines = new Graphics();

  container.addChild(bgLayer);
  container.addChild(zoneLayer);
  container.addChild(gridLines);

  let lastPanKey = '';

  // ---- Depth tint helpers ----------------------------------------------------
  function depthFactor(zDepth: number): number {
    const raw = Math.max(-800, Math.min(0, zDepth)) / -800;
    return 0.05 + raw * 0.35;
  }

  function dimColor(hex: number, factor: number): number {
    const r = Math.round(((hex >> 16) & 0xff) * (1 - factor));
    const g = Math.round(((hex >> 8) & 0xff) * (1 - factor));
    const b = Math.round((hex & 0xff) * (1 - factor));
    return (r << 16) | (g << 8) | b;
  }

  // ---- Rebuild: nothing to do, floor is drawn fresh each frame ---------------
  function rebuild(_g: GridMap) {
    lastPanKey = '';
  }

  // ---- Draw perspective-correct grid lines -----------------------------------
  function drawGrid(
    params: ProjectionParams,
    g: GridMap,
  ) {
    gridLines.clear();
    const gridAlpha = 0.3;

    // Helper: project a tile corner to screen
    function projCorner(col: number, row: number) {
      return projectTileToScreen(col - 0.5, row - 0.5, params);
    }

    // Draw horizontal grid lines (one per row boundary)
    for (let row = 0; row <= g.height; row++) {
      gridLines.moveTo(
        projCorner(0, row).screenX,
        projCorner(0, row).screenY,
      );
      for (let col = 1; col <= g.width; col++) {
        const p = projCorner(col, row);
        gridLines.lineTo(p.screenX, p.screenY);
      }
      // Average zDepth for this row to compute tint
      const midP = projectTileToScreen(g.width / 2, row - 0.5, params);
      const dim = depthFactor(midP.zDepth);
      const color = dimColor(COLOR_GRID_LINE, dim);
      gridLines.stroke({ color, alpha: gridAlpha, width: 1 });
    }

    // Draw vertical grid lines (one per column boundary)
    for (let col = 0; col <= g.width; col++) {
      gridLines.moveTo(
        projCorner(col, 0).screenX,
        projCorner(col, 0).screenY,
      );
      for (let row = 1; row <= g.height; row++) {
        const p = projCorner(col, row);
        gridLines.lineTo(p.screenX, p.screenY);
      }
      const midP = projectTileToScreen(col - 0.5, g.height / 2, params);
      const dim = depthFactor(midP.zDepth);
      const color = dimColor(COLOR_GRID_LINE, dim);
      gridLines.stroke({ color, alpha: gridAlpha, width: 1 });
    }
  }

  // ---- Draw floor background fills (one per row for depth tint) --------------
  function drawFloorBg(
    params: ProjectionParams,
    g: GridMap,
  ) {
    bgLayer.removeChildren();

    // Draw one filled quad per row of tiles for depth-based coloring
    for (let row = 0; row < g.height; row++) {
      const tl = projectTileToScreen(-0.5, row - 0.5, params);
      const tr = projectTileToScreen(g.width - 0.5, row - 0.5, params);
      const br = projectTileToScreen(g.width - 0.5, row + 0.5, params);
      const bl = projectTileToScreen(-0.5, row + 0.5, params);

      const gr = new Graphics();
      gr.moveTo(tl.screenX, tl.screenY);
      gr.lineTo(tr.screenX, tr.screenY);
      gr.lineTo(br.screenX, br.screenY);
      gr.lineTo(bl.screenX, bl.screenY);
      gr.closePath();

      const mid = projectTileToScreen(g.width / 2, row, params);
      const dim = depthFactor(mid.zDepth);
      gr.fill({ color: dimColor(COLOR_FLOOR_BG, dim) });

      bgLayer.addChild(gr);
    }
  }

  // ---- Per-frame update -----------------------------------------------------
  function update(
    panX: number,
    panY: number,
    viewportW: number,
    viewportH: number,
    g: GridMap,
    tileSize: number,
    zones: GroundZone[],
    focusWorldY: number,
  ) {
    const panKey = `${panX},${panY},${viewportW},${viewportH},${tileSize}`;
    if (panKey === lastPanKey) return;
    lastPanKey = panKey;

    const sizeRatio = tileSize / BASE_TILE_SIZE;
    const params: ProjectionParams = {
      gridWidth: g.width,
      gridHeight: g.height,
      tileSize,
      viewportWidth: viewportW,
      viewportHeight: viewportH,
      panX,
      panY,
      focusWorldY,
      perspectivePx: FLOOR_PERSPECTIVE_PX,
      floorTiltDeg: FLOOR_TILT_DEG,
    };

    // Floor background
    drawFloorBg(params, g);

    // Zone effects
    zoneLayer.removeChildren();
    for (const zone of zones) {
      const p = projectTileToScreen(zone.position.x, zone.position.y, params);
      const zoneColor = ZONE_ELEMENT_COLORS[zone.element ?? 'Strike'] ?? ZONE_ELEMENT_COLORS['Strike'];
      const gr = new Graphics();
      const half = (tileSize / 2) * sizeRatio;
      gr.roundRect(-half + 2, -half + 2, tileSize * sizeRatio - 4, tileSize * sizeRatio - 4, 4);
      gr.fill({ color: zoneColor, alpha: 0.25 });
      gr.position.set(p.screenX, p.screenY);
      gr.scale.set(p.scale);
      zoneLayer.addChild(gr);
    }

    // Grid lines
    drawGrid(params, g);
  }

  return { container, rebuild, update };
}
