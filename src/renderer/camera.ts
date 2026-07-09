export interface CameraResult {
  panX: number;
  panY: number;
  focusX: number;
  focusY: number;
}

export interface CameraInstance {
  update: (playerPos: { x: number; y: number }, viewportW: number, viewportH: number, tileSize: number, totalTileSize: number, dt: number) => CameraResult;
}

export function createCamera(): CameraInstance {
  let currentFocusX: number | null = null;
  let currentFocusY: number | null = null;

  function update(
    playerPos: { x: number; y: number },
    viewportW: number,
    viewportH: number,
    tileSize: number,
    totalTileSize: number,
    dt: number,
  ): CameraResult {
    const targetFocusX = playerPos.x;
    const targetFocusY = playerPos.y;

    if (currentFocusX === null || currentFocusY === null) {
      currentFocusX = targetFocusX;
      currentFocusY = targetFocusY;
    } else {
      const distSq = (targetFocusX - currentFocusX)**2 + (targetFocusY - currentFocusY)**2;
      
      // If the target is very far (e.g. level transition or teleport), snap immediately
      if (distSq > 100) {
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
      } else {
        // Exponential decay lerp for framerate-independent, professional smoothing
        const decay = 6.0; // Lowered from 12.0 for a softer, slower follow
        const lerpFactor = 1 - Math.exp(-decay * dt);

        currentFocusX += (targetFocusX - currentFocusX) * lerpFactor;
        currentFocusY += (targetFocusY - currentFocusY) * lerpFactor;

        // Snap to target if very close to prevent sub-pixel creeping
        if (distSq < 0.00001) {
          currentFocusX = targetFocusX;
          currentFocusY = targetFocusY;
        }
      }
    }

    const focusPixelX = currentFocusX * totalTileSize + tileSize / 2;
    const focusPixelY = currentFocusY * totalTileSize + tileSize / 2;

    const panX = (viewportW / 2) - focusPixelX;
    const panY = (viewportH / 2) - focusPixelY;

    return { panX, panY, focusX: currentFocusX, focusY: currentFocusY };
  }

  return { update };
}
