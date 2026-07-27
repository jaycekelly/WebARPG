import type { GridMap, LootDrop } from '../../store/useWorldStore';
import type { HitEffect } from '../../store/useCombatStore';

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

export function extractLights(
  grid: GridMap,
  hitEffects?: HitEffect[],
  lootDrops?: LootDrop[]
): PointLight[] {
  const lights: PointLight[] = [];
  const time = Date.now();

  const getFlicker = (x: number, y: number) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const n1 = Math.sin(time * 0.0015 + ix * 7.3 + iy * 13.1) * 0.02;
    const n2 = Math.cos(time * 0.002 + ix * 3.7 - iy * 11.3) * 0.015;
    return n1 + n2;
  };

  for (const obs of grid.obstacles) {
    const flicker = getFlicker(obs.x, obs.y);
    if (obs.type === 'torch') {
      lights.push({
        x: obs.x,
        y: obs.y,
        color: 0xffa500, // Warm orange torch light
        radius: 3.5,
        intensity: Math.max(0.7, 0.85 + flicker),
      });
    } else if (obs.type === 'npc_guide') {
      lights.push({
        x: obs.x,
        y: obs.y,
        color: 0x60a5fa, // Blue mystic aura
        radius: 3.5,
        intensity: 0.85 + Math.sin(time * 0.0015) * 0.03,
      });
    } else if (obs.type === 'campfire') {
      lights.push({
        x: obs.x,
        y: obs.y,
        color: 0xff7700, // Fire orange-red
        radius: 5.5,
        intensity: Math.max(0.8, 0.9 + flicker * 0.5),
      });
    }
  }

  // Skill cast light flashes from active hit effects
  if (hitEffects && hitEffects.length > 0) {
    const now = Date.now();
    for (const h of hitEffects) {
      const remaining = h.expiresAt - now;
      if (remaining > 0) {
        const progress = remaining / 250; // fast light decay
        lights.push({
          x: h.sourceX,
          y: h.sourceY,
          color: h.color ?? 0xffffff,
          radius: 3.5 * progress,
          intensity: 0.85 * progress,
        });
      }
    }
  }

  // Loot drop rarity point lights
  if (lootDrops && lootDrops.length > 0) {
    const rv = { Normal: 0, Magic: 1, Rare: 2, Epic: 3, Legendary: 4, Unique: 5 } as Record<string, number>;
    const rColors: Record<string, number> = {
      Magic: 0x3b82f6,
      Rare: 0xeab308,
      Epic: 0xa855f7,
      Legendary: 0xf97316,
      Unique: 0xfacc15,
    };
    for (const drop of lootDrops) {
      let bestRarity = 'Normal';
      for (const item of drop.items) {
        if ((rv[item.rarity] ?? 0) > (rv[bestRarity] ?? 0)) bestRarity = item.rarity;
      }
      const hex = rColors[bestRarity];
      if (hex) {
        const rVal = rv[bestRarity] ?? 1;
        const pulse = (Math.sin(time * 0.004 + drop.position.x) + 1) * 0.1;
        lights.push({
          x: drop.position.x,
          y: drop.position.y,
          color: hex,
          radius: 1.8 + rVal * 0.4,
          intensity: 0.4 + rVal * 0.1 + pulse,
        });
      }
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
  let whiteIntensity = 0;

  const tileX = Math.round(x);
  const tileY = Math.round(y);
  const pTileX = Math.round(playerPos.x);
  const pTileY = Math.round(playerPos.y);

  // 1. Player Light (Soft, non-flashlight ambient glow)
  const distToPlayer = Math.hypot(tileX - pTileX, tileY - pTileY);
  const playerNorm = Math.max(0, 1.0 - (distToPlayer / ctx.playerLightRadius));
  const pIntensity = Math.pow(playerNorm, 2.2) * 0.75;
  
  if (pIntensity > 0) {
    whiteIntensity = Math.max(whiteIntensity, pIntensity);
    totalIntensity = Math.max(totalIntensity, pIntensity);
  }
  
  for (const light of pointLights) {
    const dist = Math.hypot(tileX - light.x, tileY - light.y);
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
  const ent = ctx.minBrightness + (1.0 - ctx.minBrightness) * Math.min(1.0, whiteIntensity);
  const minR = ctx.entityAmbient.r;
  const minG = ctx.entityAmbient.g;
  const minB = ctx.entityAmbient.b;

  const finalR = Math.floor(minR + (255 - minR) * ent);
  const finalG = Math.floor(minG + (255 - minG) * ent);
  const finalB = Math.floor(minB + (255 - minB) * ent);

  const entityTint = (finalR << 16) | (finalG << 8) | finalB;

  return {
    intensity: Math.min(1.0, totalIntensity),
    entityTint
  };
}
