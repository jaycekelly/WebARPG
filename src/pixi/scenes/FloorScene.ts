/**
 * FloorScene.ts — Perspective-projected floor tiles and AoE highlights.
 *
 * The floor is rebuilt EVERY FRAME because the perspective pivot (vanishing
 * point) follows the camera. Rebuilding 225 quads/frame is cheap in WebGL.
 */

import { Container, Graphics } from 'pixi.js';
import { tileCorners } from '../perspMath';
import type { GridMap } from '../../store/useWorldStore';
import type { Point } from '../../engine/world/gridMath';

const C_FLOOR_A  = 0x18181b; // zinc-900  even tiles
const C_FLOOR_B  = 0x1c1c1e; // slightly lighter odd tiles
const C_OBSTACLE = 0x0d0d0f; // near-black walls
const C_BORDER   = 0x27272a; // zinc-800 grid lines
const C_PREV_IN  = 0x164e63; // AoE preview fill (cyan-900)
const C_PREV_BDR = 0x22d3ee; // AoE preview border (cyan-400)
const C_PREV_OUT = 0x0a1a24; // out-of-range fill

export class FloorScene {
  private floorGfx     = new Graphics();
  private highlightGfx = new Graphics();
  private grid: GridMap | null = null;
  private obsSet: Set<string> = new Set();

  constructor(parent: Container) {
    parent.addChild(this.floorGfx);
    parent.addChild(this.highlightGfx);
  }

  // ---------------------------------------------------------------------------
  // setGrid — call when the dungeon changes; stores data for per-frame rebuild
  // ---------------------------------------------------------------------------
  setGrid(grid: GridMap): void {
    this.grid = grid;
    this.obsSet = new Set(grid.obstacles.map(o => `${o.x},${o.y}`));
  }

  // ---------------------------------------------------------------------------
  // rebuild — call EVERY FRAME, after updating the perspective pivot
  // ---------------------------------------------------------------------------
  rebuild(): void {
    if (!this.grid) return;
    this.floorGfx.clear();

    for (let y = 0; y < this.grid.height; y++) {
      for (let x = 0; x < this.grid.width; x++) {
        const isObs = this.obsSet.has(`${x},${y}`);
        const fill  = isObs
          ? C_OBSTACLE
          : (x + y) % 2 === 0 ? C_FLOOR_A : C_FLOOR_B;

        const { tl, tr, br, bl } = tileCorners(x, y);
        this.floorGfx
          .poly([tl.sx, tl.sy, tr.sx, tr.sy, br.sx, br.sy, bl.sx, bl.sy], true)
          .fill({ color: fill })
          .stroke({ color: C_BORDER, width: 0.5, alpha: 0.5 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // updateHighlights — clear + redraw AoE / hover overlays every frame
  // ---------------------------------------------------------------------------
  updateHighlights(inRangeTiles: Point[], outOfRangeTiles: Point[]): void {
    this.highlightGfx.clear();

    for (const pt of outOfRangeTiles) {
      const { tl, tr, br, bl } = tileCorners(pt.x, pt.y);
      this.highlightGfx
        .poly([tl.sx, tl.sy, tr.sx, tr.sy, br.sx, br.sy, bl.sx, bl.sy], true)
        .fill({ color: C_PREV_OUT, alpha: 0.45 });
    }

    for (const pt of inRangeTiles) {
      const { tl, tr, br, bl } = tileCorners(pt.x, pt.y);
      this.highlightGfx
        .poly([tl.sx, tl.sy, tr.sx, tr.sy, br.sx, br.sy, bl.sx, bl.sy], true)
        .fill({ color: C_PREV_IN, alpha: 0.55 })
        .stroke({ color: C_PREV_BDR, width: 1.5, alpha: 0.9 });
    }
  }

  highlightHovered(gx: number, gy: number): void {
    const { tl, tr, br, bl } = tileCorners(gx, gy);
    this.highlightGfx
      .poly([tl.sx, tl.sy, tr.sx, tr.sy, br.sx, br.sy, bl.sx, bl.sy], true)
      .stroke({ color: 0x71717a, width: 1, alpha: 0.7 });
  }

  destroy(): void {
    this.floorGfx.destroy();
    this.highlightGfx.destroy();
  }
}
