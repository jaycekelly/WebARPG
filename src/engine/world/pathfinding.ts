import type { Point } from './gridMath';

export function findPath(
  start: Point,
  goal: Point,
  isSolid: (x: number, y: number) => boolean,
  maxDepth: number = 500
): Point[] | null {
  // Simple BFS for finding shortest path
  // Since our map is small and movement is orthogonal, BFS is perfect.
  const queue: { pos: Point; path: Point[] }[] = [];
  const visited = new Set<string>();

  queue.push({ pos: start, path: [] });
  visited.add(`${start.x},${start.y}`);

  let iterations = 0;

  while (queue.length > 0 && iterations < maxDepth) {
    iterations++;
    const current = queue.shift()!;
    
    if (current.pos.x === goal.x && current.pos.y === goal.y) {
      return current.path;
    }

    // Check all 8 adjacent tiles (orthogonal + diagonal)
    const neighbors = [
      { x: current.pos.x, y: current.pos.y - 1 },     // up
      { x: current.pos.x + 1, y: current.pos.y - 1 }, // up-right
      { x: current.pos.x + 1, y: current.pos.y },     // right
      { x: current.pos.x + 1, y: current.pos.y + 1 }, // down-right
      { x: current.pos.x, y: current.pos.y + 1 },     // down
      { x: current.pos.x - 1, y: current.pos.y + 1 }, // down-left
      { x: current.pos.x - 1, y: current.pos.y },     // left
      { x: current.pos.x - 1, y: current.pos.y - 1 }  // up-left
    ];

    for (const neighbor of neighbors) {
      const key = `${neighbor.x},${neighbor.y}`;
      if (!visited.has(key)) {
        visited.add(key);
        // We only check isSolid for intermediate tiles, not necessarily the goal tile.
        if (!isSolid(neighbor.x, neighbor.y) || (neighbor.x === goal.x && neighbor.y === goal.y)) {
          queue.push({ pos: neighbor, path: [...current.path, neighbor] });
        }
      }
    }
  }

  return null; // No path found or max depth reached
}
