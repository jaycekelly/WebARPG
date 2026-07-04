import type { LootDrop } from '../../store/useWorldStore';

// Set ambient darkness much higher (0.9) so far away tiles are actually dark
export const AMBIENT_DARKNESS = 0.9; 
export const PLAYER_LIGHT_RADIUS = 12.0; // tighter radius so it gets darker closer

/**
 * Calculates the light intensity for a given tile coordinate (0.0 to 1.0).
 */
export function getTileLightIntensity(
  x: number,
  y: number,
  playerPos: { x: number; y: number },
  lootDrops: LootDrop[],
  visibleTiles: Set<string>
): number {
  let lightIntensity = 0;

  // 1. Player Light (Non-linear falloff so it drops off faster)
  const distToPlayer = Math.sqrt(Math.pow(x - playerPos.x, 2) + Math.pow(y - playerPos.y, 2));
  const playerNorm = Math.max(0, 1.0 - (distToPlayer / PLAYER_LIGHT_RADIUS));
  lightIntensity += Math.pow(playerNorm, 1.5); // 1.5 exponent steepens the curve



  return Math.min(1.0, lightIntensity);
}

/**
 * Converts a light intensity (0.0 to 1.0) into a PIXI tint color (e.g. 0xffffff).
 */
export function getEntityTint(intensity: number): number {
  // Make the drop-off much more aggressive so lighting changes are obvious
  // minBrightness of 0.1 (10%) when intensity is 0 to match 0.9 ambient darkness.
  const minBrightness = 0.1;
  const brightness = minBrightness + (1.0 - minBrightness) * intensity;
  
  const v = Math.floor(brightness * 255);
  return (v << 16) | (v << 8) | v;
}
