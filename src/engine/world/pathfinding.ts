import type { Point } from './gridMath';

interface Node {
  pos: Point;
  g: number;
  f: number;
  parent: Node | null;
}

class MinHeap<T> {
  private data: T[] = [];
  private compare: (a: T, b: T) => number;
  constructor(compare: (a: T, b: T) => number) {
    this.compare = compare;
  }
  
  push(val: T) {
    this.data.push(val);
    this.bubbleUp(this.data.length - 1);
  }
  
  pop(): T | undefined {
    if (this.data.length === 0) return undefined;
    const top = this.data[0];
    const bottom = this.data.pop()!;
    if (this.data.length > 0) {
      this.data[0] = bottom;
      this.bubbleDown(0);
    }
    return top;
  }
  
  private bubbleUp(idx: number) {
     while (idx > 0) {
       const p = (idx - 1) >> 1;
       if (this.compare(this.data[idx], this.data[p]) < 0) {
          const t = this.data[idx]; this.data[idx] = this.data[p]; this.data[p] = t;
          idx = p;
       } else break;
     }
  }
  
  private bubbleDown(idx: number) {
     const len = this.data.length;
     while (true) {
        let left = (idx << 1) + 1;
        let right = left + 1;
        let min = idx;
        
        if (left < len && this.compare(this.data[left], this.data[min]) < 0) min = left;
        if (right < len && this.compare(this.data[right], this.data[min]) < 0) min = right;
        
        if (min !== idx) {
           const t = this.data[idx]; this.data[idx] = this.data[min]; this.data[min] = t;
           idx = min;
        } else break;
     }
  }
  
  get length() { return this.data.length; }
}

function heuristic(a: Point, b: Point): number {
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return 10 * (dx + dy) - 6 * Math.min(dx, dy); // Octile distance (10 for straight, 14 for diagonal)
}

export function findPath(
  start: Point,
  goal: Point,
  isSolid: (x: number, y: number) => boolean,
  maxDepth: number = 2000
): Point[] | null {
  const openSet = new MinHeap<Node>((a, b) => a.f - b.f);
  const openSetMap = new Map<string, Node>();
  const closedSet = new Set<string>();
  
  const startNode: Node = { pos: start, g: 0, f: heuristic(start, goal), parent: null };
  openSet.push(startNode);
  openSetMap.set(`${start.x},${start.y}`, startNode);
  
  let iterations = 0;
  
  while (openSet.length > 0 && iterations < maxDepth) {
     iterations++;
     const current = openSet.pop()!;
     const currentKey = `${current.pos.x},${current.pos.y}`;
     
     // Due to re-insertions, we might pop a node we already closed
     if (closedSet.has(currentKey)) continue;
     
     if (current.pos.x === goal.x && current.pos.y === goal.y) {
        const path: Point[] = [];
        let curr: Node | null = current;
        while (curr !== null) {
           path.push(curr.pos);
           curr = curr.parent;
        }
        path.reverse();
        path.shift(); // remove start node
        return path;
     }
     
     openSetMap.delete(currentKey);
     closedSet.add(currentKey);
     
     const neighbors = [
      { x: current.pos.x, y: current.pos.y - 1, cost: 10 },
      { x: current.pos.x + 1, y: current.pos.y, cost: 10 },
      { x: current.pos.x, y: current.pos.y + 1, cost: 10 },
      { x: current.pos.x - 1, y: current.pos.y, cost: 10 },
      { x: current.pos.x + 1, y: current.pos.y - 1, cost: 14 },
      { x: current.pos.x + 1, y: current.pos.y + 1, cost: 14 },
      { x: current.pos.x - 1, y: current.pos.y + 1, cost: 14 },
      { x: current.pos.x - 1, y: current.pos.y - 1, cost: 14 }
     ];
     
     for (const n of neighbors) {
        const nKey = `${n.x},${n.y}`;
        if (closedSet.has(nKey)) continue;
        
        // We only check isSolid for intermediate tiles, not the goal tile
        if (isSolid(n.x, n.y) && !(n.x === goal.x && n.y === goal.y)) continue;
        
        // Prevent cutting corners through walls
        if (n.cost === 14) {
           const isOrth1Solid = isSolid(current.pos.x, n.y) && !(current.pos.x === goal.x && n.y === goal.y);
           const isOrth2Solid = isSolid(n.x, current.pos.y) && !(n.x === goal.x && current.pos.y === goal.y);
           if (isOrth1Solid || isOrth2Solid) continue;
        }
        
        const tentativeG = current.g + n.cost;
        
        let neighborNode = openSetMap.get(nKey);
        if (!neighborNode) {
           neighborNode = { pos: { x: n.x, y: n.y }, g: tentativeG, f: tentativeG + heuristic({x: n.x, y: n.y}, goal), parent: current };
           openSet.push(neighborNode);
           openSetMap.set(nKey, neighborNode);
        } else if (tentativeG < neighborNode.g) {
           neighborNode.g = tentativeG;
           neighborNode.f = tentativeG + heuristic(neighborNode.pos, goal);
           neighborNode.parent = current;
           openSet.push(neighborNode); // Re-insert with lower priority
        }
     }
  }
  
  return null;
}
