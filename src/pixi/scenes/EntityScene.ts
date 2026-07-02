/**
 * EntityScene.ts — Renders player, enemies, loot drops, and decorative props
 * as perspective-correct "standees": rectangles rising vertically from the floor.
 *
 * All entities are drawn into a single Graphics that is cleared + redrawn every
 * frame in back-to-front (Y-sorted) order, so nearer entities always overlap
 * farther ones correctly.
 */

import { Container, Graphics } from 'pixi.js';
import {
  tileFloor, tileHeight,
  SPRITE_Z_CHAR, SPRITE_Z_LOOT, SPRITE_Z_OBS, SPRITE_Z_DECOR,
  TILE_W,
  type Projected,
} from '../perspMath';
import type { Enemy, LootDrop } from '../../store/useWorldStore';

// Entity colour palette
const C_PLAYER       = 0x059669; // emerald-600
const C_PLAYER_RING  = 0x34d399; // emerald-400
const C_ENEMY        = 0x991b1b; // red-800
const C_ENEMY_TARGET = 0xef4444; // red-500
const C_LOOT         = 0xb45309; // amber-700
const C_OBSTACLE_T   = 0x14532d; // dark-green (tree)
const C_OBSTACLE_R   = 0x374151; // gray-700   (rock)
const C_DECOR_FLOWER = 0x86198f; // purple-700
const C_DECOR_SPROUT = 0x166534; // green-800
const C_HIT          = 0xffffff; // white flash

// Cheap deterministic hash for decorative scatter
function hashTile(x: number, y: number): number {
  let h = (x * 2654435769) ^ (y * 1234567891);
  h ^= h >>> 16; h *= 0x45d9f3b; h ^= h >>> 16;
  return Math.abs(h);
}

const DECOR_CHANCE = 8; // percent of empty tiles that get decor

export interface ObstacleInfo { x: number; y: number; type: 'tree' | 'wall' | 'rock' }

interface UpdateParams {
  playerPos:     { x: number; y: number };
  playerHit:     boolean;
  enemies:       Enemy[];
  lootDrops:     LootDrop[];
  obstacles:     ObstacleInfo[];
  targetedId:    string | null;
  hitIds:        Set<string>;
  gridW:         number;
  gridH:         number;
}

export class EntityScene {
  private gfx: Graphics;

  constructor(parent: Container) {
    this.gfx = new Graphics();
    parent.addChild(this.gfx);
  }

  // ---------------------------------------------------------------------------
  // update — full redraw each frame, sorted back-to-front by screen Y
  // ---------------------------------------------------------------------------
  update(p: UpdateParams): void {
    this.gfx.clear();

    // Collect draw-item functions with their sort key (feet screen Y)
    const items: Array<{ sy: number; fn: () => void }> = [];

    // Obstacles (trees / rocks) — static but sorted with entities
    for (const obs of p.obstacles) {
      const feet = tileFloor(obs.x, obs.y);
      const head = tileHeight(obs.x, obs.y, SPRITE_Z_OBS);
      const col  = obs.type === 'tree' ? C_OBSTACLE_T : C_OBSTACLE_R;
      items.push({ sy: feet.sy, fn: () => this.drawStandee(feet, head, col, 0.85) });
    }

    // Decorative scatter on non-obstacle, non-entity tiles
    const occupiedSet = new Set([
      ...p.enemies.filter(e => !e.isDead).map(e => `${e.position.x},${e.position.y}`),
      ...p.lootDrops.map(l => `${l.position.x},${l.position.y}`),
      ...p.obstacles.map(o => `${o.x},${o.y}`),
      `${p.playerPos.x},${p.playerPos.y}`,
    ]);
    for (let y = 0; y < p.gridH; y++) {
      for (let x = 0; x < p.gridW; x++) {
        if (occupiedSet.has(`${x},${y}`)) continue;
        const h = hashTile(x, y);
        if (h % 100 < DECOR_CHANCE) {
          const col  = (h >> 4) % 2 === 0 ? C_DECOR_FLOWER : C_DECOR_SPROUT;
          const feet = tileFloor(x, y);
          const head = tileHeight(x, y, SPRITE_Z_DECOR);
          items.push({ sy: feet.sy, fn: () => this.drawStandee(feet, head, col, 0.6) });
        }
      }
    }

    // Loot drops
    for (const drop of p.lootDrops) {
      const feet = tileFloor(drop.position.x, drop.position.y);
      const head = tileHeight(drop.position.x, drop.position.y, SPRITE_Z_LOOT);
      items.push({ sy: feet.sy, fn: () => {
        this.drawStandee(feet, head, C_LOOT, 0.9);
        // Sparkle ring
        this.gfx.circle(feet.sx, feet.sy - (feet.sy - head.sy) * 0.5, 6 * feet.scale)
          .stroke({ color: 0xfbbf24, width: 1.2, alpha: 0.8 });
      }});
    }

    // Enemies
    for (const enemy of p.enemies) {
      if (enemy.isDead) continue;
      const { x, y } = enemy.position;
      const feet = tileFloor(x, y);
      const head = tileHeight(x, y, SPRITE_Z_CHAR);
      const isTarget = p.targetedId === enemy.id;
      const isHit    = p.hitIds.has(enemy.id);
      const col      = isHit ? C_HIT : C_ENEMY;

      items.push({ sy: feet.sy, fn: () => {
        if (isTarget) {
          this.gfx.circle(feet.sx, feet.sy, 14 * feet.scale)
            .stroke({ color: C_ENEMY_TARGET, width: 1.5, alpha: 0.9 });
        }
        this.drawStandee(feet, head, col, 0.9);
        this.drawHealthBar(head, enemy.health / enemy.stats.maxHealth);
      }});
    }

    // Player (always drawn on top of everything at same tile)
    {
      const { x, y } = p.playerPos;
      const feet = tileFloor(x, y);
      const head = tileHeight(x, y, SPRITE_Z_CHAR);
      const col  = p.playerHit ? C_HIT : C_PLAYER;

      items.push({ sy: feet.sy + 0.001, fn: () => { // +0.001 ensures player wins ties
        this.gfx.circle(feet.sx, feet.sy, 14 * feet.scale)
          .stroke({ color: C_PLAYER_RING, width: 1.5, alpha: 0.9 });
        this.drawStandee(feet, head, col, 0.95);
        // Player head dot
        this.gfx.circle(head.sx, head.sy - 3 * head.scale, 4 * head.scale)
          .fill({ color: C_PLAYER_RING });
      }});
    }

    // Sort back-to-front (lower sy = farther from camera = draw first)
    items.sort((a, b) => a.sy - b.sy);
    items.forEach(item => item.fn());
  }

  // ---------------------------------------------------------------------------
  // Private draw helpers
  // ---------------------------------------------------------------------------

  private drawStandee(feet: Projected, head: Projected, color: number, alpha: number): void {
    // 50% of tile width — fills roughly half the tile footprint
    const bodyW = TILE_W * 0.50 * feet.scale;
    const bodyH = feet.sy - head.sy;

    // Floor shadow
    this.gfx.ellipse(feet.sx, feet.sy, TILE_W * 0.36 * feet.scale, 5 * feet.scale)
      .fill({ color: 0x000000, alpha: 0.50 });

    if (bodyH > 0.5) {
      this.gfx.rect(feet.sx - bodyW / 2, head.sy, bodyW, bodyH)
        .fill({ color, alpha });
      // Subtle lighter top-cap so blocks read as solid objects
      this.gfx.rect(feet.sx - bodyW / 2, head.sy, bodyW, Math.min(bodyH * 0.15, 4 * head.scale))
        .fill({ color: 0xffffff, alpha: alpha * 0.12 });
    }
  }


  private drawHealthBar(head: Projected, pct: number): void {
    const barW = 28 * head.scale;
    const barH = Math.max(2, 3 * head.scale);
    const bx   = head.sx - barW / 2;
    const by   = head.sy - 9 * head.scale;
    const fill = pct > 0.5 ? 0xdc2626 : pct > 0.25 ? 0xea580c : 0xef4444;

    this.gfx.rect(bx, by, barW, barH).fill({ color: 0x27272a });
    this.gfx.rect(bx, by, barW * Math.max(0, pct), barH).fill({ color: fill });
  }

  destroy(): void {
    this.gfx.destroy();
  }
}
