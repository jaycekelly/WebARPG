export interface CameraResult {
  panX: number;
  panY: number;
  focusX: number;
  focusY: number;
}

export interface CameraInstance {
  update: (playerPos: { x: number; y: number }, viewportW: number, viewportH: number, tileSize: number, totalTileSize: number, dt: number, isOutOfCombat?: boolean) => CameraResult;
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
    isOutOfCombat = false,
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
        // Exponential decay lerp for framerate-independent, professional smoothing.
        // Out-of-combat: higher decay keeps the camera locked to the player during
        // fast OOC movement, preventing the lag that causes motion sickness.
        // In-combat: lower decay gives the soft, weighted follow that looks great.
        const decay = isOutOfCombat ? 10.0 : 6.0;
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
