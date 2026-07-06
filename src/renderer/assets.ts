import { Texture } from 'pixi.js';

// ---- Constants ---------------------------------------------------------------
const TEXTURE_SIZE = 128;
const PADDING = 6;
const DRAW_SIZE = TEXTURE_SIZE - PADDING * 2;
const SCALE = DRAW_SIZE / 24; // 24 is the SVG viewBox size

export type IconPathDef = {
  paths: string[];
  scale?: number;
};

// ---- Icon SVG path data (from lucide-react v1.22.0, ISC license) --------------
export const ICON_PATHS: Record<string, IconPathDef | string[]> = {
  // ---- Custom Hand-drawn Icons ----
  human: [
    'M12 2a3 3 0 1 0 0 6 3 3 0 1 0 0-6Z', // Head
    'M12 8v8', // Torso
    'M8 10l4 2 4-2', // Arms
    'M8 22l4-6 4 6' // Legs
  ],
  chest_armor: [
    'M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0',
  ],
  helmet: [
    'M10 10V5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5',
    'M14 6a6 6 0 0 1 6 6v3',
    'M4 15v-3a6 6 0 0 1 6-6',
    'M 3 15 H 21 A 1 1 0 0 1 22 16 V 18 A 1 1 0 0 1 21 19 H 3 A 1 1 0 0 1 2 18 V 16 A 1 1 0 0 1 3 15 Z'
  ],
  amulet: [
    'M 12 21 A 6 6 0 1 1 12 9 A 6 6 0 1 1 12 21', // Circle
    'M18 3A6 6 0 0 1 6 3' // Horns
  ],
  staff: [
    'M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z'
  ],
  gloves: {
    paths: [
      'M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5',
      'M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5',
      'M14 5.5a1.5 1.5 0 0 1 3 0v6.5',
      'M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47'
    ],
    scale: 0.85
  },
  boots: [
    'M4 6h5.426a1 1 0 0 1 .863 .496l1.064 1.823a3 3 0 0 0 1.896 1.407l4.677 1.114a4 4 0 0 1 3.074 3.89v2.27a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1',
    'M14 13l1 -2',
    'M8 18v-1a4 4 0 0 0 -4 -4h-1',
    'M10 12l1.5 -3',
  ],
  ring: [
    'M 12 19 A 7 7 0 1 1 12 5 A 7 7 0 1 1 12 19'
  ],
  leg_armor: [
    'M 7 4 L 17 4 L 20 21 L 14 21 L 12 10 L 10 21 L 4 21 Z'
  ],

  // ---- Entities (Lucide / Tabler) ----
  robot: [
    'M6 6a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -4',
    'M9 12v9',
    'M15 12v9',
    'M5 16l4 -2',
    'M15 14l4 2',
    'M9 18h6',
    'M10 8v.01',
    'M14 8v.01',
  ],
  bat: {
    paths: [
      'M17 16c.74 -2.286 2.778 -3.762 5 -3c-.173 -2.595 .13 -5.314 -2 -7.5c-1.708 2.648 -3.358 2.557 -5 2.5v-4l-3 2l-3 -2v4c-1.642 .057 -3.292 .148 -5 -2.5c-2.13 2.186 -1.827 4.905 -2 7.5c2.222 -.762 4.26 .714 5 3c2.593 0 3.889 .952 5 4c1.111 -3.048 2.407 -4 5 -4',
      'M9 8a3 3 0 0 0 6 0',
    ],
    scale: 0.8
  },
  rabbit: [
    'M13 16a3 3 0 0 1 2.24 5',
    'M18 12h.01',
    'M18 21h-8a4 4 0 0 1-4-4 7 7 0 0 1 7-7h.2L9.6 6.4a1 1 0 1 1 2.8-2.8L15.8 7h.2c3.3 0 6 2.7 6 6v1a2 2 0 0 1-2 2h-1a3 3 0 0 0-3 3',
    'M20 8.54V4a2 2 0 1 0-4 0v3',
    'M7.612 12.524a3 3 0 1 0-1.6 4.3',
  ],
  bird: [
    'M16 7h.01',
    'M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20',
    'm20 7 2 .5-2 .5',
    'M10 18v3',
    'M14 17.75V21',
    'M7 18a6 6 0 0 0 3.84-10.61',
  ],
  trees: [
    'M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0Z',
    'M7 16v6',
    'M13 19v3',
    'M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7L13 3l-1.4 1.5',
  ],
  mountain: [
    'm8 3 4 8 5-5 5 15H2L8 3z',
  ],
  // ---- Item icons ------------------------------------------------------
  Sword: [
    'M14.5 17.5 3 6V3h3l11.5 11.5',
    'M13 19l6-6',
    'M16 16l4 4',
    'M19 21l2-2',
  ],
  Shield: [
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  ],
  Crown: [
    'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z',
  ],
  Shirt: [
    'M15 4l6 2v5h-3v8a1 1 0 0 1 -1 1h-10a1 1 0 0 1 -1 -1v-8h-3v-5l6 -2a3 3 0 0 0 6 0'
  ],
  Hand: [
    'M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5',
    'M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5',
    'M14 5.5a1.5 1.5 0 0 1 3 0v6.5',
    'M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47'
  ],
  Footprints: [
    'M4 6h5.426a1 1 0 0 1 .863 .496l1.064 1.823a3 3 0 0 0 1.896 1.407l4.677 1.114a4 4 0 0 1 3.074 3.89v2.27a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10a1 1 0 0 1 1 -1',
    'M14 13l1 -2',
    'M8 18v-1a4 4 0 0 0 -4 -4h-1',
    'M10 12l1.5 -3'
  ],
  Layers: [
    'M8 6a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8',
    'M4 10a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -8'
  ],
  Book: [
    'M3 19a9 9 0 0 1 9 0a9 9 0 0 1 9 0',
    'M3 6a9 9 0 0 1 9 0a9 9 0 0 1 9 0',
    'M3 6l0 13',
    'M12 6l0 13',
    'M21 6l0 13'
  ],
  Wand: [
    'M6 21l15 -15l-3 -3l-15 15l3 3',
    'M15 6l3 3',
    'M9 3a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2',
    'M19 13a2 2 0 0 0 2 2a2 2 0 0 0 -2 2a2 2 0 0 0 -2 -2a2 2 0 0 0 2 -2'
  ],
  Flame: [
    'M12 10.941c2.333 -3.308 .167 -7.823 -1 -8.941c0 3.395 -2.235 5.299 -3.667 6.706c-1.43 1.408 -2.333 3.294 -2.333 5.588c0 3.704 3.134 6.706 7 6.706c3.866 0 7 -3.002 7 -6.706c0 -1.712 -1.232 -4.403 -2.333 -5.588c-2.084 3.353 -3.257 3.353 -4.667 2.235'
  ],
  Crosshair: [
    'M17 3h4v4',
    'M21 3l-15 15',
    'M3 18h3v3',
    'M16.5 20c1.576 -1.576 2.5 -4.095 2.5 -6.5c0 -4.81 -3.69 -8.5 -8.5 -8.5c-2.415 0 -4.922 .913 -6.5 2.5l12.5 12.5'
  ],
  Circle: [
    'M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0 -12'
  ],
  Disc: [
    'M12 6a6 6 0 1 0 0 12a6 6 0 1 0 0 -12'
  ],
  Gem: [
    'M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z'
  ],
  Hexagon: [
    'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z',
  ],
  ShieldAlert: [
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
    'M12 8v4',
    'M12 16h.01',
  ],
  squirrel: [
    'M15.236 22a3 3 0 0 0-2.2-5',
    'M16 20a3 3 0 0 1 3-3h1a2 2 0 0 0 2-2v-2a4 4 0 0 0-4-4V4',
    'M18 13h.01',
    'M18 6a4 4 0 0 0-4 4 7 7 0 0 0-7 7c0-5 4-5 4-10.5a4.5 4.5 0 1 0-9 0 2.5 2.5 0 0 0 5 0C7 10 3 11 3 17c0 2.8 2.2 5 5 5h10'
  ],
  ArrowUpCircle: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
    'm16 12-4-4-4 4',
    'M12 16V8',
  ],
};

// ---- Cache -------------------------------------------------------------------
interface CacheEntry {
  texture: Texture;
}

const cache = new Map<string, CacheEntry>();

function makeKey(kind: string, color: string): string {
  return `${kind}|${color}`;
}

function createCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

// ---- Draw icon paths directly with Path2D ------------------------------------
function drawIcon(
  ctx: CanvasRenderingContext2D,
  kind: string,
  color: string,
) {
  const def = ICON_PATHS[kind];
  if (!def) {
    drawPlaceholder(ctx, kind, color);
    return;
  }

  const isArray = Array.isArray(def);
  const paths = isArray ? def : def.paths;
  const scaleOpt = isArray ? 1 : (def.scale || 1);

  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  ctx.save();
  ctx.translate(PADDING, PADDING);
  ctx.scale(SCALE, SCALE);

  if (scaleOpt !== 1) {
    ctx.translate(12, 12);
    ctx.scale(scaleOpt, scaleOpt);
    ctx.translate(-12, -12);
  }

  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const d of paths) {
    const p = new Path2D(d);
    ctx.stroke(p);
  }

  ctx.restore();
}

// ---- Placeholder for kinds without SVG paths --------------------------------
function drawPlaceholder(
  ctx: CanvasRenderingContext2D,
  kind: string,
  color: string,
) {
  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  if (kind === 'loot') {
    // Diamond shape
    const cx = TEXTURE_SIZE / 2;
    const cy = TEXTURE_SIZE / 2;
    const s = DRAW_SIZE / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s);
    ctx.lineTo(cx + s, cy);
    ctx.lineTo(cx, cy + s);
    ctx.lineTo(cx - s, cy);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  } else {
    // Circle for unknown entities
    const cx = TEXTURE_SIZE / 2;
    const cy = TEXTURE_SIZE / 2;
    const r = DRAW_SIZE / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// ---- Public API --------------------------------------------------------------
export function getEntityTexture(kind: string, color: string): Texture {
  const key = makeKey(kind, color);

  const cached = cache.get(key);
  if (cached) return cached.texture;

  const [canvas, ctx] = createCanvas();
  drawIcon(ctx, kind, color);

  const texture = Texture.from(canvas);
  const entry: CacheEntry = { texture };
  cache.set(key, entry);

  return texture;
}

const glowCache = new Map<string, CacheEntry>();

export function getEntityGlowTexture(kind: string, color: string): Texture {
  const key = makeKey(kind, color);

  const cached = glowCache.get(key);
  if (cached) return cached.texture;

  const [canvas, ctx] = createCanvas();
  const def = ICON_PATHS[kind];
  if (def) {
    const isArray = Array.isArray(def);
    const paths = isArray ? def : def.paths;
    const scaleOpt = isArray ? 1 : (def.scale || 1);

    ctx.save();
    ctx.translate(PADDING, PADDING);
    ctx.scale(SCALE, SCALE);
    if (scaleOpt !== 1) {
      ctx.translate(12, 12);
      ctx.scale(scaleOpt, scaleOpt);
      ctx.translate(-12, -12);
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 4; // Thicker base for glow
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;

    for (const d of paths) {
      const p = new Path2D(d);
      ctx.stroke(p);
      ctx.stroke(p); // Stroke twice for intense center core glow!
    }
    ctx.restore();
  } else {
    drawPlaceholder(ctx, kind, color);
  }

  const texture = Texture.from(canvas);
  const entry: CacheEntry = { texture };
  glowCache.set(key, entry);

  return texture;
}

export function clearTextureCache() {
  cache.forEach(e => e.texture.destroy());
  cache.clear();
  glowCache.forEach(e => e.texture.destroy());
  glowCache.clear();
}
