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
export const getManhattanDistance = (p1: Point, p2: Point) => {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
};

/**
 * Traces a line from p0 to p1 using Bresenham's Line Algorithm.
 * Returns an array of Points including start and end.
 */
export const getBresenhamLine = (p0: Point, p1: Point): Point[] => {
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
  
  // We exclude the start (p0) and end (p1) from being solids that block LOS.
  // E.g., if you are targeting a wall, you can still have LOS to the wall.
  for (let i = 1; i < line.length - 1; i++) {
    const pt = line[i];
    if (isSolid(pt.x, pt.y)) {
      return false; // Path blocked
    }
  }
  
  return true;
};

export type AoeShape = 'square' | 'diamond' | 'cross' | 'line' | 'cone';

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
          const tdx = target.x - center.x;
          const tdy = target.y - center.y;
          
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

  // 2. Wall Interaction Cull
  if (respectWalls) {
    return tiles.filter(pt => {
       if (pt.x === center.x && pt.y === center.y) return true;
       return hasLineOfSight(center, pt, isSolid) && !isSolid(pt.x, pt.y);
    });
  }

  return tiles;
};
