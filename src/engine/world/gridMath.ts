export type Point = { x: number; y: number };

/**
 * Chebyshev distance (8-way grid movement).
 * Distance is 1 for all adjacent tiles (including diagonals).
 */
export const getChebyshevDistance = (p1: Point, p2: Point) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

/**
 * Manhattan distance (4-way grid movement).
 * Distance is 2 for diagonal tiles.
 */
const getManhattanDistance = (p1: Point, p2: Point) => {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
};

/**
 * Traces a line from p0 to p1 using Bresenham's Line Algorithm.
 * Returns an array of Points including start and end.
 */
const getBresenhamLine = (p0: Point, p1: Point): Point[] => {
  const points: Point[] = [];
  let x = p0.x;
  let y = p0.y;
  const dx = Math.abs(p1.x - p0.x);
  const dy = -Math.abs(p1.y - p0.y);
  const sx = p0.x < p1.x ? 1 : -1;
  const sy = p0.y < p1.y ? 1 : -1;
  let err = dx + dy;

  while (true) {
    points.push({ x, y });
    if (x === p1.x && y === p1.y) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return points;
};

/**
 * Checks if a diagonal interaction between p1 and p2 is blocked by walls.
 * If BOTH shared cardinal tiles are solid, the corner is blocked.
 * If at least one is free, the interaction is allowed.
 * Returns TRUE if blocked, FALSE if allowed.
 */
export const checkCornerBlock = (p1: Point, p2: Point, isSolid: (x: number, y: number) => boolean): boolean => {
  // If not diagonal, no corner block possible
  if (p1.x === p2.x || p1.y === p2.y) return false;
  
  // Find the two adjacent cardinal tiles that form the bounding box
  const corner1 = { x: p1.x, y: p2.y };
  const corner2 = { x: p2.x, y: p1.y };
  
  // Blocked ONLY if both corners are solid
  return isSolid(corner1.x, corner1.y) && isSolid(corner2.x, corner2.y);
};

/**
 * Checks Line of Sight using Bresenham's. 
 * Traces the line and checks if any intermediate tile is solid.
 */
export const hasLineOfSight = (p0: Point, p1: Point, isSolid: (x: number, y: number) => boolean): boolean => {
  const line = getBresenhamLine(p0, p1);
  
  for (let i = 1; i < line.length; i++) {
    const prev = line[i - 1];
    const curr = line[i];

    // Check if the ray is trying to squeeze through a diagonal gap between two solids
    if (checkCornerBlock(prev, curr, isSolid)) {
      return false;
    }
    
    // Exclude the end target (p1) from blocking itself.
    if (i < line.length - 1) {
      if (isSolid(curr.x, curr.y)) {
        return false; // Path blocked
      }
    }
  }
  
  return true;
};

export type AoeShape = 'square' | 'diamond' | 'cross' | 'line' | 'cone' | 'tshape' | 'rect' | 'ring';

/**
 * Computes the 3 tiles behind a target, relative to the attacker's position, forming a
 * "T" shape facing away from the attacker.
 *
 * - Cardinal attack direction (attacker directly N/S/E/W of target): the "behind" tile
 *   continues straight past the target, flanked by the two tiles diagonally behind it.
 * - Diagonal attack direction (attacker directly NE/NW/SE/SW of target): the "behind" tile
 *   continues the diagonal past the target, flanked by the two CARDINAL tiles adjacent to
 *   the target that sit between the target and the diagonal "behind" tile - this reads much
 *   more naturally on a square grid than a further diagonal offset would.
 *
 * Used by skills like Shield Break's Sunder-triggered explosion.
 */
export const getTShapeTiles = (
  attackerPos: Point,
  targetPos: Point,
  gridWidth: number,
  gridHeight: number
): Point[] => {
  const dx = targetPos.x - attackerPos.x;
  const dy = targetPos.y - attackerPos.y;
  const mag = Math.max(Math.abs(dx), Math.abs(dy));
  if (mag === 0) return [];

  // Normalized direction (rounded to the nearest of the 8 grid directions)
  const ndx = Math.sign(dx);
  const ndy = Math.sign(dy);

  // The tile directly behind the target, continuing the attack direction
  const behind = { x: targetPos.x + ndx, y: targetPos.y + ndy };

  const isDiagonalAttack = ndx !== 0 && ndy !== 0;

  let flank1: Point;
  let flank2: Point;

  if (isDiagonalAttack) {
     // The two cardinal neighbors of the target that lie "between" the target and the
     // diagonal behind-tile (e.g. attacking from the NW: behind is SE of target, flanks
     // are the tile directly S and the tile directly E of the target).
     flank1 = { x: targetPos.x + ndx, y: targetPos.y };
     flank2 = { x: targetPos.x, y: targetPos.y + ndy };
  } else {
     // Cardinal attack: flank the behind-tile diagonally, same as before.
     const perpX = -ndy;
     const perpY = ndx;
     flank1 = { x: behind.x + perpX, y: behind.y + perpY };
     flank2 = { x: behind.x - perpX, y: behind.y - perpY };
  }

  const tiles = [behind, flank1, flank2];
  return tiles.filter(pt => pt.x >= 0 && pt.x < gridWidth && pt.y >= 0 && pt.y < gridHeight);
};

/**
 * Generates an array of Points representing an Area of Effect.
 */
export const getAoETiles = (
  center: Point, 
  target: Point | null, // Required for directional shapes (line, cone)
  shape: AoeShape, 
  radius: number, 
  respectWalls: boolean,
  isSolid: (x: number, y: number) => boolean,
  gridWidth: number,
  gridHeight: number
): Point[] => {
  const tiles: Point[] = [];
  
  // 1. Gather all potential tiles in bounding box
  for (let x = center.x - radius; x <= center.x + radius; x++) {
    for (let y = center.y - radius; y <= center.y + radius; y++) {
      if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) continue;
      
      const pt = { x, y };
      let inShape = false;
      
      switch (shape) {
        case 'square':
          inShape = getChebyshevDistance(center, pt) <= radius;
          break;
        case 'ring':
          inShape = getChebyshevDistance(center, pt) <= radius && getChebyshevDistance(center, pt) > 0;
          break;
        case 'diamond':
          inShape = getManhattanDistance(center, pt) <= radius;
          break;
        case 'cross':
          inShape = (center.x === x || center.y === y) && getChebyshevDistance(center, pt) <= radius;
          break;
        case 'line':
          // Handled separately below
          break;
        case 'cone':
          if (!target) { 
            inShape = getChebyshevDistance(center, pt) <= radius; // Fallback to square
            break; 
          } 
          const dx = pt.x - center.x;
          const dy = pt.y - center.y;

          // Melee AoE Rule: snap the facing to the nearest cardinal (N/S/E/W) instead of the
          // raw (possibly diagonal) direction to target, so the cone is always a consistent
          // straight 3-wide wedge no matter which way the target actually is from the caster.
          const rawTdx = target.x - center.x;
          const rawTdy = target.y - center.y;
          let tdx = 0;
          let tdy = 0;
          if (Math.abs(rawTdx) >= Math.abs(rawTdy)) {
             tdx = rawTdx !== 0 ? Math.sign(rawTdx) : 1;
          } else {
             tdy = Math.sign(rawTdy);
          }
          
          const dot = (dx * tdx + dy * tdy);
          const len1 = Math.sqrt(dx * dx + dy * dy);
          const len2 = Math.sqrt(tdx * tdx + tdy * tdy);
          
          if (len1 === 0) { inShape = true; } // Center
          else if (len2 === 0) { inShape = getChebyshevDistance(center, pt) <= radius; } 
          else {
            // roughly 90 degree cone (cos 45 = 0.707)
            const cosAngle = dot / (len1 * len2);
            inShape = cosAngle >= 0.707 && getChebyshevDistance(center, pt) <= radius;
          }
          break;
      }
      
      if (inShape && shape !== 'line') {
        tiles.push(pt);
      }
    }
  }

  // Handle Line specifically
  if (shape === 'line' && target) {
      const dx = target.x - center.x;
      const dy = target.y - center.y;
      const mag = Math.max(Math.abs(dx), Math.abs(dy));
      if (mag > 0) {
          const targetEdge = {
              x: Math.round(center.x + (dx / mag) * radius),
              y: Math.round(center.y + (dy / mag) * radius)
          };
          const line = getBresenhamLine(center, targetEdge);
          for (const pt of line) {
              if (pt.x >= 0 && pt.x < gridWidth && pt.y >= 0 && pt.y < gridHeight) {
                  tiles.push(pt);
              }
          }
      }
  } else if (shape === 'line' && !target) {
      tiles.push(center); // fallback if no target
  }

  // Handle Rect specifically (e.g. Ground Slam: 3 tiles wide x `radius` tiles deep,
  // anchored one tile in front of `center` (the player) and extending further outward
  // along the direction towards `target`). Diagonal attack angles are snapped to the
  // nearest cardinal (N/S/E/W) axis before building the rect - true 8-directional
  // diagonal rects end up "corner-thin" (each row only touches the next at a single
  // corner instead of a full edge), which reads as broken/gappy on a square grid.
  // Anchoring at the player (not the target's tile) keeps this reading as a slam that
  // radiates outward from the caster, regardless of where the target actually stands.
  if (shape === 'rect') {
      const ref = target || center;
      const dx = ref.x - center.x;
      const dy = ref.y - center.y;

      // Snap to the dominant cardinal axis instead of using the raw (possibly diagonal) direction
      let ndx = 0;
      let ndy = 0;
      if (Math.abs(dx) >= Math.abs(dy)) {
         ndx = dx !== 0 ? Math.sign(dx) : 1;
      } else {
         ndy = Math.sign(dy);
      }

      // Perpendicular axis used to give each row width 3 (row center +/- 1 tile)
      const perpX = -ndy;
      const perpY = ndx;

      for (let depth = 1; depth <= radius; depth++) {
          const rowCenter = { x: center.x + ndx * depth, y: center.y + ndy * depth };
          const rowTiles = [
              rowCenter,
              { x: rowCenter.x + perpX, y: rowCenter.y + perpY },
              { x: rowCenter.x - perpX, y: rowCenter.y - perpY }
          ];
          rowTiles.forEach(pt => {
              if (pt.x >= 0 && pt.x < gridWidth && pt.y >= 0 && pt.y < gridHeight) {
                  tiles.push(pt);
              }
          });
      }
  }

  // 2. Wall Interaction Cull
  if (respectWalls) {
    return tiles.filter(pt => {
       if (pt.x === center.x && pt.y === center.y) return true;
       return hasLineOfSight(center, pt, isSolid) && !isSolid(pt.x, pt.y);
    });
  }

  return tiles;
};
