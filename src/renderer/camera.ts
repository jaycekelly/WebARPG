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
  function update(
    playerPos: { x: number; y: number },
    viewportW: number,
    viewportH: number,
    tileSize: number,
    totalTileSize: number,
  ): CameraResult {
    // Camera locked exactly to player center — no deadzone, no smoothing
    const focusPixelX = playerPos.x * totalTileSize + tileSize / 2;
    const focusPixelY = playerPos.y * totalTileSize + tileSize / 2;

    const panX = (viewportW / 2) - focusPixelX;
    const panY = (viewportH / 2) - focusPixelY;

    return { panX, panY, focusX: playerPos.x, focusY: playerPos.y };
  }

  return { update };
}
