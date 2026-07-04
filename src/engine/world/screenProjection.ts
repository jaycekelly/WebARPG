export interface ProjectionParams {
  gridWidth: number;
  gridHeight: number;
  tileSize: number;
  viewportWidth: number;
  viewportHeight: number;
  panX: number;
  panY: number;
  /** World Y (pixels) of the camera focus — perspective center follows the camera */
  focusWorldY: number;
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
    gridHeight: _gridH,
    tileSize,
    viewportWidth,
    viewportHeight,
    panX,
    panY,
    focusWorldY,
    perspectivePx,
    floorTiltDeg,
  } = params;

  const tiltRad = (floorTiltDeg * Math.PI) / 180;
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);

  const fx = (gx + 0.5) * tileSize;
  const fy = (gy + 0.5) * tileSize;

  // Perspective centered on camera focus, not floor center — keeps visible
  // area consistent regardless of where the player is on the map.
  let ry = fy - focusWorldY;

  // Near-plane clipping: prevent objects from projecting behind the camera lens
  // which causes negative scales and inverted rendering coordinates.
  const maxRy = (perspectivePx * 0.999) / sinTilt;
  if (ry > maxRy) {
    ry = maxRy;
  }

  const x3d = fx + panX;
  const y3d = focusWorldY + ry * cosTilt + panY;
  const z3d = ry * sinTilt;

  const originX = viewportWidth * 0.5;
  const originY = viewportHeight * 0.1;

  const scale = perspectivePx / (perspectivePx - z3d);

  const screenX = originX + (x3d - originX) * scale;
  const screenY = originY + (y3d - originY) * scale;

  return { screenX, screenY, scale, zDepth: z3d };
}
