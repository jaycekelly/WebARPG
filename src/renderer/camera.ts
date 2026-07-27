export interface CameraResult {
  panX: number;
  panY: number;
  focusX: number;
  focusY: number;
  shakeX: number;
  shakeY: number;
}

export interface CameraInstance {
  update: (playerPos: { x: number; y: number }, viewportW: number, viewportH: number, tileSize: number, totalTileSize: number, dt: number, isOutOfCombat?: boolean) => CameraResult;
  addTrauma: (amount: number) => void;
}

export function createCamera(): CameraInstance {
  let currentFocusX: number | null = null;
  let currentFocusY: number | null = null;
  let trauma = 0;

  function addTrauma(amount: number) {
    trauma = Math.min(1.0, trauma + amount);
  }

  function update(
    playerPos: { x: number; y: number },
    viewportW: number,
    viewportH: number,
    tileSize: number,
    _totalTileSize: number,
    dt: number,
    _isOutOfCombat = false,
  ): CameraResult {
    const targetFocusX = playerPos.x;
    const targetFocusY = playerPos.y;

    if (currentFocusX === null || currentFocusY === null) {
      currentFocusX = targetFocusX;
      currentFocusY = targetFocusY;
    } else {
      const distSq = (targetFocusX - currentFocusX)**2 + (targetFocusY - currentFocusY)**2;
      
      if (distSq > 100) {
        currentFocusX = targetFocusX;
        currentFocusY = targetFocusY;
      } else {
        const decay = 25.0; // Responsive camera tracking locked to player visual position
        const lerpFactor = 1 - Math.exp(-decay * dt);

        currentFocusX += (targetFocusX - currentFocusX) * lerpFactor;
        currentFocusY += (targetFocusY - currentFocusY) * lerpFactor;

        if (distSq < 0.00001) {
          currentFocusX = targetFocusX;
          currentFocusY = targetFocusY;
        }
      }
    }

    if (trauma > 0) {
      trauma = Math.max(0, trauma - dt * 3.0); // smooth decay over ~280ms
    }

    const shakePower = Math.pow(trauma, 1.8);
    const time = Date.now();
    const shakeX = (Math.sin(time * 0.075) * 6.5 + (Math.random() - 0.5) * 3.0) * shakePower;
    const shakeY = (Math.cos(time * 0.085) * 5.5 + (Math.random() - 0.5) * 2.5) * shakePower;

    const focusPixelX = (currentFocusX + 0.5) * tileSize;
    const focusPixelY = (currentFocusY + 0.5) * tileSize;

    const panX = (viewportW / 2) - focusPixelX;
    const panY = (viewportH / 2) - focusPixelY;

    return { panX, panY, focusX: currentFocusX, focusY: currentFocusY, shakeX, shakeY };
  }

  return { update, addTrauma };
}
