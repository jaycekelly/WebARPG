import { Container, Graphics } from 'pixi.js';
import type { GridMap, GroundZone } from '../../store/useWorldStore';
import { getBiome } from '../../data/biomes';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams, ProjectedPoint } from '../../engine/world/screenProjection';

const FLOOR_PERSPECTIVE_PX = 2500;
const FLOOR_TILT_DEG = 52;
const BASE_TILE_SIZE = 72;

// const COLOR_FLOOR_BG = 0x282828; // Greyscale

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
    playerPos: { x: number; y: number }
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
    g: GridMap,
    playerPos: { x: number; y: number },
    projCorner: (col: number, row: number) => ProjectedPoint
  ) {
    const gridAlpha = 0.3;

    // Helper removed, using passed projCorner

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

    // Determine visible bounds
    const viewRadius = 15;
    const minRow = Math.max(0, Math.floor(playerPos.y - viewRadius));
    const maxRow = Math.min(g.height, Math.ceil(playerPos.y + viewRadius));
    const minCol = Math.max(0, Math.floor(playerPos.x - viewRadius));
    const maxCol = Math.min(g.width, Math.ceil(playerPos.x + viewRadius));

    // Draw horizontal grid lines and vertical segments per row boundary
    for (let row = minRow; row <= maxRow; row++) {
      const gl = rowGridLines[row];

      // Horizontal line (skip top and bottom edges)
      if (row > 0 && row < g.height) {
        gl.moveTo(
          projCorner(minCol, row).screenX,
          projCorner(minCol, row).screenY,
        );
        for (let col = minCol + 1; col <= maxCol; col++) {
          const p = projCorner(col, row);
          gl.lineTo(p.screenX, p.screenY);
        }
      }

      // Vertical line segments going downwards (skip left and right edges)
      if (row < g.height && row < maxRow) {
        for (let col = minCol; col <= maxCol; col++) {
          if (col === 0 || col === g.width) continue;
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
    g: GridMap,
    playerPos: { x: number; y: number },
    projCorner: (col: number, row: number) => ProjectedPoint
  ) {
    bgLayer.clear();

    const tl = projCorner(0, 0);
    const tr = projCorner(g.width, 0);
    const br = projCorner(g.width, g.height);
    const bl = projCorner(0, g.height);

    bgLayer.poly([
      tl.screenX, tl.screenY,
      tr.screenX, tr.screenY,
      br.screenX, br.screenY,
      bl.screenX, bl.screenY
    ]);
    const biome = getBiome(g.environment);
    bgLayer.fill({ color: biome.floorColor });

    if (g.environment === 'town') {
      const dirtTiles = new Set(g.dirtTiles ?? []);
      const dirtColor = biome.dirtColor !== undefined ? biome.dirtColor : 0x4a3b32; // Lighter dirt color
      
      const viewRadius = 15;
      const minRow = Math.max(0, Math.floor(playerPos.y - viewRadius));
      const maxRow = Math.min(g.height, Math.ceil(playerPos.y + viewRadius));
      const minCol = Math.max(0, Math.floor(playerPos.x - viewRadius));
      const maxCol = Math.min(g.width, Math.ceil(playerPos.x + viewRadius));

      for (let y = minRow; y < maxRow; y++) {
        for (let x = minCol; x < maxCol; x++) {
          if (dirtTiles.has(`${x},${y}`)) {
            const p1 = projCorner(x, y);
            const p2 = projCorner(x + 1, y);
            const p3 = projCorner(x + 1, y + 1);
            const p4 = projCorner(x, y + 1);
            
            // Build a single complex path instead of hundreds of individual polygons
            bgLayer.moveTo(p1.screenX, p1.screenY);
            bgLayer.lineTo(p2.screenX, p2.screenY);
            bgLayer.lineTo(p3.screenX, p3.screenY);
            bgLayer.lineTo(p4.screenX, p4.screenY);
            bgLayer.closePath();
          }
        }
      }
      
      // Execute a single fill operation for all dirt tiles simultaneously.
      // This reduces draw calls and geometry rebuild time drastically!
      bgLayer.fill({ color: dirtColor });
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
    playerPos: { x: number; y: number }
  ) {
    // We must use EXACT panX and panY for projection to maintain perfect 3D perspective
    // sync with the entities layer. Using a 2D container offset on a 3D perspective 
    // causes mathematical judder during sub-pixel movement.
    container.position.set(0, 0);

    const panKey = `${panX},${panY},${viewportW},${viewportH},${tileSize},${playerPos.x},${playerPos.y}`;
    if (panKey === lastPanKey) return;
    lastPanKey = panKey;

    const sizeRatio = tileSize / BASE_TILE_SIZE;
    const params: ProjectionParams = {
      gridWidth: g.width,
      gridHeight: g.height,
      tileSize,
      viewportWidth: viewportW,
      viewportHeight: viewportH,
      panX: panX,
      panY: panY,
      focusWorldY,
      perspectivePx: FLOOR_PERSPECTIVE_PX,
      floorTiltDeg: FLOOR_TILT_DEG,
    };

    const projCache = new Map<string, ProjectedPoint>();
    const projCorner = (col: number, row: number) => {
      const k = `${col},${row}`;
      let p = projCache.get(k);
      if (!p) {
        p = projectTileToScreen(col - 0.5, row - 0.5, params);
        projCache.set(k, p);
      }
      return p;
    };

    // Floor background
    drawFloorBg(g, playerPos, projCorner);

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
    drawGrid(g, playerPos, projCorner);
  }

  return { container, rebuild, update };
}
