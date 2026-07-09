import { useWorldStore, type GridMap } from '../../store/useWorldStore';
import { useLightingStore } from '../../store/useLightingStore';

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

export function getTileLighting(
  x: number,
  y: number,
  playerPos: { x: number; y: number },
  pointLights: PointLight[]
): TileLighting {
  const isTown = useWorldStore.getState().grid.environment === 'town';
  const lighting = useLightingStore.getState();
  const playerLightRadius = lighting.playerLightRadiusDungeon;

  let totalIntensity = 0;
  
  // Base white light (Player + Ambient)
  let whiteIntensity = 0;

  // 1. Player Light (White)
  const distToPlayer = Math.sqrt(Math.pow(x - playerPos.x, 2) + Math.pow(y - playerPos.y, 2));
  const playerNorm = Math.max(0, 1.0 - (distToPlayer / playerLightRadius));
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
  if (isTown) {
    const ambient = 0.45;
    totalIntensity = Math.max(totalIntensity, ambient);
    whiteIntensity = Math.max(whiteIntensity, ambient);
  }

  // Calculate Entity Tint
  const ent = Math.min(1.0, whiteIntensity);
  const { minBrightness } = lighting;
  
  // Interpolate between minBrightness and the received light
  const finalVal = minBrightness + (1.0 - minBrightness) * ent;
  const rgb = Math.floor(finalVal * 255);

  const entityTint = (rgb << 16) | (rgb << 8) | rgb;

  return {
    intensity: Math.min(1.0, totalIntensity),
    entityTint
  };
}
