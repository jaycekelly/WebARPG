export interface CameraResult {
  panX: number;
  panY: number;
  focusX: number;
  focusY: number;
}

export interface CameraInstance {
  update: (playerPos: { x: number; y: number }, viewportW: number, viewportH: number, tileSize: number, totalTileSize: number) => CameraResult;
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
  ): CameraResult {
    const targetFocusX = playerPos.x;
    const targetFocusY = playerPos.y;

    if (currentFocusX === null || currentFocusY === null) {
      currentFocusX = targetFocusX;
      currentFocusY = targetFocusY;
    } else {
      currentFocusX += (targetFocusX - currentFocusX) * 0.025;
      currentFocusY += (targetFocusY - currentFocusY) * 0.025;
    }

    const focusPixelX = currentFocusX * totalTileSize + tileSize / 2;
    const focusPixelY = currentFocusY * totalTileSize + tileSize / 2;

    const panX = (viewportW / 2) - focusPixelX;
    const panY = (viewportH / 2) - focusPixelY;

    return { panX, panY, focusX: currentFocusX, focusY: currentFocusY };
  }

  return { update };
}
