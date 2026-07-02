/**
 * EffectsScene.ts — Manages floating combat text.
 *
 * Each FloatingText from the combat store gets a PixiJS Text object.
 * Its worldZ increases over time so the perspective engine places it
 * higher on screen as it ages — rising naturally above the entity.
 */

import { Container, Text, TextStyle } from 'pixi.js';
import { SPRITE_Z_CHAR, tileHeight } from '../perspMath';
import type { FloatingText } from '../../store/useCombatStore';

const FLOAT_DURATION = 800; // ms — must match addFloatingText's expiresAt offset
const FLOAT_RISE_Z   = 70;  // world units risen over the lifetime

/** Map a Tailwind text-colour class to a hex number. */
function twToHex(color: string): number {
  const map: Record<string, number> = {
    'text-red-500': 0xef4444,
    'text-red-400': 0xf87171,
    'text-red-300': 0xfca5a5,
    'text-yellow-400': 0xfbbf24,
    'text-yellow-300': 0xfde047,
    'text-emerald-400': 0x34d399,
    'text-emerald-300': 0x6ee7b7,
    'text-blue-400': 0x60a5fa,
    'text-orange-400': 0xfb923c,
    'text-cyan-400': 0x22d3ee,
    'text-white': 0xffffff,
    'text-zinc-300': 0xd4d4d8,
  };
  // Also accept raw hex strings like '#ff0000'
  if (color.startsWith('#')) {
    return parseInt(color.slice(1), 16);
  }
  return map[color] ?? 0xffffff;
}

interface FtEntry {
  textObj:   Text;
  expiresAt: number;
  startTime: number;
  gridX:     number;
  gridY:     number;
}

export class EffectsScene {
  private container = new Container();
  private entries   = new Map<string, FtEntry>();

  constructor(parent: Container) {
    parent.addChild(this.container);
  }

  update(floatingTexts: FloatingText[]): void {
    const now      = Date.now();
    const activeIds = new Set(floatingTexts.map(ft => ft.id));

    // Remove stale entries
    for (const [id, entry] of this.entries) {
      if (!activeIds.has(id) || now >= entry.expiresAt) {
        this.container.removeChild(entry.textObj);
        entry.textObj.destroy();
        this.entries.delete(id);
      }
    }

    // Add new entries; update position + alpha for all active ones
    for (const ft of floatingTexts) {
      if (!this.entries.has(ft.id)) {
        const style = new TextStyle({
          fontSize: 13,
          fontWeight: 'bold',
          fill: twToHex(ft.color),
          dropShadow: {
            alpha: 0.7,
            blur: 3,
            distance: 1,
            color: 0x000000,
          },
        });
        const textObj = new Text({ text: ft.text, style });
        textObj.anchor.set(0.5, 1);
        this.container.addChild(textObj);
        this.entries.set(ft.id, {
          textObj,
          expiresAt: ft.expiresAt,
          startTime: ft.expiresAt - FLOAT_DURATION,
          gridX: ft.x,
          gridY: ft.y,
        });
      }

      const entry    = this.entries.get(ft.id)!;
      const elapsed  = now - entry.startTime;
      const progress = Math.min(1, elapsed / FLOAT_DURATION);
      const worldZ   = SPRITE_Z_CHAR + 20 + progress * FLOAT_RISE_Z;
      const proj     = tileHeight(entry.gridX, entry.gridY, worldZ);

      entry.textObj.position.set(proj.sx, proj.sy);
      entry.textObj.alpha = 1 - progress * 0.9; // fade to 10% at end
    }
  }

  destroy(): void {
    for (const [, entry] of this.entries) {
      entry.textObj.destroy();
    }
    this.entries.clear();
    this.container.destroy();
  }
}
