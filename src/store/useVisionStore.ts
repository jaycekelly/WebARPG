import { create } from 'zustand';
import { useWorldStore } from './useWorldStore';
import { hasLineOfSight } from '../engine/world/gridMath';

interface VisionState {
  exploredTiles: Set<string>;
  visibleTiles: Set<string>;
  visionRadius: number;
  
  updateVision: (playerPos: { x: number, y: number }) => void;
  resetVision: () => void;
}

export const useVisionStore = create<VisionState>((set, get) => ({
  exploredTiles: new Set(),
  visibleTiles: new Set(),
  visionRadius: 8,

  updateVision: (playerPos) => {
    const grid = useWorldStore.getState().grid;
    if (!grid) return;

    const { visionRadius, exploredTiles } = get();
    const newVisibleTiles = new Set<string>();
    const newExploredTiles = new Set(exploredTiles);

    const isSolid = (x: number, y: number) => {
      if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return true;
      return grid.obstacles.some(o => o.x === x && o.y === y);
    };

    // Simple brute-force over the bounding box of the vision radius
    const minX = Math.max(0, Math.floor(playerPos.x - visionRadius));
    const maxX = Math.min(grid.width - 1, Math.ceil(playerPos.x + visionRadius));
    const minY = Math.max(0, Math.floor(playerPos.y - visionRadius));
    const maxY = Math.min(grid.height - 1, Math.ceil(playerPos.y + visionRadius));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const dx = x - playerPos.x;
        const dy = y - playerPos.y;
        
        // Use a circle for vision radius rather than square
        if (dx * dx + dy * dy <= visionRadius * visionRadius) {
          if (hasLineOfSight(playerPos, { x, y }, isSolid)) {
            const key = `${x},${y}`;
            newVisibleTiles.add(key);
            newExploredTiles.add(key);
          }
        }
      }
    }

    set({ visibleTiles: newVisibleTiles, exploredTiles: newExploredTiles });
  },

  resetVision: () => {
    set({ exploredTiles: new Set(), visibleTiles: new Set() });
  }
}));
