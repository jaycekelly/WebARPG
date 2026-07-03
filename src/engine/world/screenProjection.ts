export interface ProjectionParams {
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  viewportWidth: number;
  viewportHeight: number;
  panX: number;
  panY: number;
  perspectivePx: number;
  floorTiltDeg: number;
}

export interface ProjectedPoint {
  screenX: number;
  screenY: number;
  scale: number;
  zDepth: number;
}

export function projectTileToScreen(
  gx: number,
  gy: number,
  params: ProjectionParams,
): ProjectedPoint {
  const {
    gridWidth: _gridWidth,
    gridHeight,
    tileSize,
    viewportWidth,
    viewportHeight,
    panX,
    panY,
    perspectivePx,
    floorTiltDeg,
  } = params;

  const tiltRad = (floorTiltDeg * Math.PI) / 180;
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);

  const floorH = gridHeight * tileSize;

  const fx = (gx + 0.5) * tileSize;
  const fy = (gy + 0.5) * tileSize;

  const ry = fy - floorH / 2;

  const x3d = fx + panX;
  const y3d = floorH / 2 + ry * cosTilt + panY;
  const z3d = ry * sinTilt;

  const originX = viewportWidth * 0.5;
  const originY = viewportHeight * 0.1;

  const scale = perspectivePx / (perspectivePx - z3d);

  const screenX = originX + (x3d - originX) * scale;
  const screenY = originY + (y3d - originY) * scale;

  return { screenX, screenY, scale, zDepth: z3d };
}
