import type { GridMap } from '../../store/useWorldStore';

// Keyed by grid object identity (a WeakMap), not by a derived string like
// `${width}x${height}:${obstacles.length}`. useWorldStore.setGrid() always
// replaces `grid` with a brand new object on regen and never mutates
// `obstacles` in place, so identity is a correct and free invalidation
// signal - no risk of a stale cache surviving an obstacle-count coincidence,
// and no per-frame string concatenation.
const cache = new WeakMap<GridMap, Set<string>>();

/**
 * Returns a cached Set of "x,y" tile keys for every obstacle in the grid.
 * Shared by pathfinding, vision, and lighting extraction so the grid only
 * gets scanned once per load rather than once per consumer.
 */
export function getObstacleSet(grid: GridMap): Set<string> {
  let set = cache.get(grid);
  if (!set) {
    set = new Set<string>();
    for (const o of grid.obstacles) {
      set.add(`${o.x},${o.y}`);
    }
    cache.set(grid, set);
  }
  return set;
}
