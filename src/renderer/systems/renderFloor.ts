import { Container, Graphics } from 'pixi.js';
import type { GridMap, GroundZone } from '../../store/useWorldStore';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';

const FLOOR_PERSPECTIVE_PX = 2500;
const FLOOR_TILT_DEG = 52;
const BASE_TILE_SIZE = 72;

const COLOR_FLOOR_BG = 0x18181b;

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
  const bgLayer = new Graphics();
  // Layer 1: zone effects
  const zoneLayer = new Container();
  // Layer 2: grid lines
  const gridLinesContainer = new Container();
  const rowGridLines: Graphics[] = [];

  container.addChild(bgLayer);
  container.addChild(zoneLayer);
  container.addChild(gridLinesContainer);

  let lastPanKey = '';

  // ---- Rebuild: nothing to do, floor is drawn fresh each frame ---------------
  function rebuild(_g: GridMap) {
    lastPanKey = '';
  }

  // ---- Draw perspective-correct grid lines -----------------------------------
  function drawGrid(
    params: ProjectionParams,
    g: GridMap,
  ) {
    const gridAlpha = 0.3;

    // Helper: project a tile corner to screen
    function projCorner(col: number, row: number) {
      return projectTileToScreen(col - 0.5, row - 0.5, params);
    }

    // Ensure we have a Graphics object for each row + 1 for the bottom edge
    while (rowGridLines.length <= g.height) {
      const gl = new Graphics();
      gridLinesContainer.addChild(gl);
      rowGridLines.push(gl);
    }

    // Clear all existing grid lines first (in case we downsized from a larger map)
    for (let i = 0; i < rowGridLines.length; i++) {
      rowGridLines[i].clear();
    }

    // Draw horizontal grid lines and vertical segments per row boundary
    for (let row = 0; row <= g.height; row++) {
      const gl = rowGridLines[row];

      // Horizontal line
      gl.moveTo(
        projCorner(0, row).screenX,
        projCorner(0, row).screenY,
      );
      for (let col = 1; col <= g.width; col++) {
        const p = projCorner(col, row);
        gl.lineTo(p.screenX, p.screenY);
      }

      // Vertical line segments going downwards (only if not the last row)
      if (row < g.height) {
        for (let col = 0; col <= g.width; col++) {
          const p1 = projCorner(col, row);
          const p2 = projCorner(col, row + 1);
          gl.moveTo(p1.screenX, p1.screenY);
          gl.lineTo(p2.screenX, p2.screenY);
        }
      }

      const color = 0x3f3f46; // Static dark gray
      gl.stroke({ color, alpha: gridAlpha, width: 1 });
    }
  }

  // ---- Draw floor background fills -------------------------------------------
  function drawFloorBg(
    params: ProjectionParams,
    g: GridMap,
  ) {
    bgLayer.clear();

    const tl = projectTileToScreen(-0.5, -0.5, params);
    const tr = projectTileToScreen(g.width - 0.5, -0.5, params);
    const br = projectTileToScreen(g.width - 0.5, g.height - 0.5, params);
    const bl = projectTileToScreen(-0.5, g.height - 0.5, params);

    bgLayer.poly([
      tl.screenX, tl.screenY,
      tr.screenX, tr.screenY,
      br.screenX, br.screenY,
      bl.screenX, bl.screenY
    ]);
    const bgColor = g.environment === 'town' ? 0x1f3d23 : COLOR_FLOOR_BG;
    bgLayer.fill({ color: bgColor });

    if (g.environment === 'town') {
      const dirtTiles = new Set([
        // Around campfire (2, 6)
        '1,5', '2,5', '3,5',
        '1,6', '2,6', '3,6',
        '1,7', '2,7', '3,7',
        // Around spawn (6, 6)
        '5,5', '6,5', '7,5',
        '5,6', '6,6', '7,6',
        '5,7', '6,7', '7,7',
        // Connections & Path to dungeon (10, 6)
        '4,6', '8,6', '9,6', '10,6'
      ]);
      const dirtColor = 0x4a3b32; // Lighter dirt color
      
      for (let y = 0; y < g.height; y++) {
        for (let x = 0; x < g.width; x++) {
          if (dirtTiles.has(`${x},${y}`)) {
            const p1 = projectTileToScreen(x - 0.5, y - 0.5, params);
            const p2 = projectTileToScreen(x + 0.5, y - 0.5, params);
            const p3 = projectTileToScreen(x + 0.5, y + 0.5, params);
            const p4 = projectTileToScreen(x - 0.5, y + 0.5, params);
            bgLayer.poly([
              p1.screenX, p1.screenY,
              p2.screenX, p2.screenY,
              p3.screenX, p3.screenY,
              p4.screenX, p4.screenY
            ]);
            bgLayer.fill({ color: dirtColor });
          }
        }
      }
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
