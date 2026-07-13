import type { GridMap } from '../../store/useWorldStore';

export interface PointLight {
  x: number;
  y: number;
  color: number;
  radius: number;
  intensity: number;
}

export interface TileLighting {
  intensity: number;      // 0.0 to 1.0 (for fog visibility calculation)
  entityTint: number;     // RGB hex, final tint applied to entities
}

export function extractLights(grid: GridMap): PointLight[] {
  const lights: PointLight[] = [];
  for (const obs of grid.obstacles) {
    if (obs.type === 'torch') {
      lights.push({
        x: obs.x,
        y: obs.y,
        color: 0xffffff,
        radius: 3.0,
        intensity: 0.9,
      });
    } else if (obs.type === 'npc_guide') {
      lights.push({
        x: obs.x,
        y: obs.y,
        color: 0xffffff,
        radius: 3.0,
        intensity: 0.9,
      });
    } else if (obs.type === 'campfire') {
      lights.push({
        x: obs.x,
        y: obs.y,
        color: 0xffffff,
        radius: 5.0,
        intensity: 0.9,
      });
    }
  }
  return lights;
}

export interface LightingContext {
  isTown: boolean;
  playerLightRadius: number;
  minBrightness: number;
  entityAmbient: { r: number; g: number; b: number };
  ambientBaseline?: number;
}

export function getTileLighting(
  x: number,
  y: number,
  playerPos: { x: number; y: number },
  pointLights: PointLight[],
  ctx: LightingContext
): TileLighting {
  let totalIntensity = 0;
  
  // Base white light (Player + Ambient)
  let whiteIntensity = 0;

  // 1. Player Light (White)
  const distToPlayer = Math.sqrt(Math.pow(x - playerPos.x, 2) + Math.pow(y - playerPos.y, 2));
  const playerNorm = Math.max(0, 1.0 - (distToPlayer / ctx.playerLightRadius));
  const pIntensity = Math.pow(playerNorm, 1.2) * 1.0;
  
  if (pIntensity > 0) {
    whiteIntensity = Math.max(whiteIntensity, pIntensity);
    totalIntensity = Math.max(totalIntensity, pIntensity);
  }
  
  for (const light of pointLights) {
    const dist = Math.sqrt(Math.pow(x - light.x, 2) + Math.pow(y - light.y, 2));
    const norm = Math.max(0, 1.0 - (dist / light.radius));
    if (norm > 0) {
      const lIntensity = Math.pow(norm, 1.2) * light.intensity;
      totalIntensity = Math.max(totalIntensity, lIntensity);
      whiteIntensity = Math.max(whiteIntensity, lIntensity);
    }
  }

  // 3. Ambient Baseline
  const ambient = ctx.ambientBaseline !== undefined ? ctx.ambientBaseline : (ctx.isTown ? 0.45 : 0.0);
  if (ambient > 0) {
    totalIntensity = Math.max(totalIntensity, ambient);
    whiteIntensity = Math.max(whiteIntensity, ambient);
  }

  // Calculate Entity Tint
  // Interpolate light level between minBrightness and 1.0 to guarantee a minimum visible ambient color
  const ent = ctx.minBrightness + (1.0 - ctx.minBrightness) * Math.min(1.0, whiteIntensity);
  const minR = ctx.entityAmbient.r;
  const minG = ctx.entityAmbient.g;
  const minB = ctx.entityAmbient.b;

  // Interpolate between the ambient color and pure white light
  const finalR = Math.floor(minR + (255 - minR) * ent);
  const finalG = Math.floor(minG + (255 - minG) * ent);
  const finalB = Math.floor(minB + (255 - minB) * ent);

  const entityTint = (finalR << 16) | (finalG << 8) | finalB;

  return {
    intensity: Math.min(1.0, totalIntensity),
    entityTint
  };
}
