/**
 * perspMath.ts — Perspective projection utilities
 *
 * Formula:  scale = P_DIST / (P_DIST - rotatedZ)
 *   Near tiles (large worldDepth) → large rotatedZ → denominator shrinks → scale > 1
 *   Far  tiles (small worldDepth) → small rotatedZ → denominator ≈ P_DIST  → scale ≈ 1
 *
 * WORLD_PIVOT_X must be set EVERY FRAME before any projection is computed.
 * Call setWorldPivotX((cameraFocus.x + 0.5) * TILE_W) in GameScene.update().
 * This makes the perspective vanishing-point track the camera center, exactly
 * like CSS perspective-origin: 50% on a div centred on the viewport.
 */

export const P_DIST   = 3000;  // larger = less extreme near-tile magnification
export const TILT_DEG = 50;
export const TILT_RAD = (TILT_DEG * Math.PI) / 180;
export const COS_TILT = Math.cos(TILT_RAD); // ≈ 0.6428
export const SIN_TILT = Math.sin(TILT_RAD); // ≈ 0.7660

export const TILE_W = 72;
export const TILE_H = 72;

/** World-space Z heights for standing objects. */
export const SPRITE_Z_CHAR  = 100; // player / enemy  (~40px body at mid-grid)
export const SPRITE_Z_OBS   = 130; // tree / rock — taller than characters
export const SPRITE_Z_LOOT  =  55; // loot pile
export const SPRITE_Z_DECOR =  30; // floor decoration (flower / sprout)

/** The camera's world-X this frame. Updated by setWorldPivotX() each frame. */
let WORLD_PIVOT_X = 0;

/** Call every frame with the camera-focus worldX before projecting anything. */
export function setWorldPivotX(worldX: number): void {
  WORLD_PIVOT_X = worldX;
}

export interface Projected {
  sx: number;    // canvas-local X (relative to worldContainer, centred on pivot)
  sy: number;    // canvas-local Y
  scale: number; // perspective scale (>1 = near camera)
}

/**
 * Project a 3D world point into 2D canvas-local space.
 * @param worldX     — horizontal (col * TILE_W)
 * @param worldDepth — depth into scene (row * TILE_H); larger = closer to camera
 * @param worldZ     — height above floor (0 = on floor, positive = upward)
 *
 * Going UP (worldZ > 0) is equivalent to moving BACKWARD in CSS-Y (less depth).
 * CSS rotateX(θ) maps cssY → scale via cssY*SIN; so subtracting worldZ from the
 * effective depth before rotating replicates the CSS counter-rotation billboard.
 */
export function projectLocal(worldX: number, worldDepth: number, worldZ: number): Projected {
  // Effective depth: height above floor reduces depth (objects appear higher up + less magnified)
  const effDepth = worldDepth - worldZ;

  const rotatedY = effDepth * COS_TILT;
  const rotatedZ = effDepth * SIN_TILT;
  const pZ       = P_DIST - rotatedZ;
  const scale    = pZ > 1 ? P_DIST / pZ : P_DIST;

  // Centre sx on the camera pivot so the vanishing point tracks the camera
  const cx = worldX - WORLD_PIVOT_X;
  return { sx: cx * scale, sy: rotatedY * scale, scale };
}


/** Project a tile's floor-level centre. */
export function tileFloor(gridX: number, gridY: number): Projected {
  return projectLocal((gridX + 0.5) * TILE_W, (gridY + 0.5) * TILE_H, 0);
}

/** Project a point worldZ units above a tile's centre. */
export function tileHeight(gridX: number, gridY: number, worldZ: number): Projected {
  return projectLocal((gridX + 0.5) * TILE_W, (gridY + 0.5) * TILE_H, worldZ);
}

/** Four floor corners of a tile (TL / TR / BR / BL). */
export function tileCorners(gridX: number, gridY: number) {
  return {
    tl: projectLocal( gridX      * TILE_W,  gridY      * TILE_H, 0),
    tr: projectLocal((gridX + 1) * TILE_W,  gridY      * TILE_H, 0),
    br: projectLocal((gridX + 1) * TILE_W, (gridY + 1) * TILE_H, 0),
    bl: projectLocal( gridX      * TILE_W, (gridY + 1) * TILE_H, 0),
  };
}

/**
 * Inverse: canvas-local (sx, sy) → grid tile at floor level.
 * Returns null when the point maps to sky.
 */
export function screenToGrid(sx: number, sy: number): { x: number; y: number } | null {
  // worldDepth = sy * P_DIST / (COS_TILT * P_DIST + sy * SIN_TILT)
  const denom = COS_TILT * P_DIST + sy * SIN_TILT;
  if (denom <= 0.001) return null;
  const worldDepth = (sy * P_DIST) / denom;
  if (worldDepth < 0) return null;

  const pZ     = P_DIST - worldDepth * SIN_TILT;
  const cx     = (sx * pZ) / P_DIST;
  const worldX = cx + WORLD_PIVOT_X;

  return {
    x: Math.floor(worldX / TILE_W),
    y: Math.floor(worldDepth / TILE_H),
  };
}
