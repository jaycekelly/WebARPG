import { Texture } from 'pixi.js';

// ---- Constants ---------------------------------------------------------------
const TEXTURE_SIZE = 128;
const PADDING = 6;
const DRAW_SIZE = TEXTURE_SIZE - PADDING * 2;
const SCALE = DRAW_SIZE / 24; // 24 is the SVG viewBox size

// ---- Icon SVG path data (from lucide-react v1.22.0, ISC license) --------------
const ICON_PATHS: Record<string, string[]> = {
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
  // ---- Item icons (Lucide) ------------------------------------------------------
  Sword: [
    'M14.5 17.5 3 6V3h3l11.5 11.5',
    'M13 19l6-6',
    'M16 16l4 4',
    'M19 21l2-2',
  ],
  Wand: [
    'M15 4V2',
    'M15 16v-2',
    'M8 9h2',
    'M20 9h2',
    'M17.8 11.8 19 13',
    'M15 9h.01',
    'M17.8 6.2 19 5',
    'M3 21l9-9',
  ],
  Flame: [
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.434-2.256 1-3.2.544-.907 1.405-1.728 2-2.8',
  ],
  Crosshair: [
    'M22 12h-4',
    'M6 12H2',
    'M12 2v4',
    'M12 22v-4',
    'M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20',
  ],
  Crown: [
    'M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7z',
  ],
  Shirt: [
    'M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z',
  ],
  Layers: [
    'M12 2 2 7l10 5 10-5-10-5Z',
    'M2 17l10 5 10-5',
    'M2 12l10 5 10-5',
  ],
  Hand: [
    'M18 11V6a2 2 0 0 0-4 0v1',
    'M14 10V4a2 2 0 0 0-4 0v6',
    'M10 10.5V6a2 2 0 0 0-4 0v8',
    'M18 8a2 2 0 0 1 4 0v6a8 8 0 0 1-8 8h-2c-2.21 0-4.21-.9-5.66-2.34l-.48-.48A2 2 0 0 1 2 17.76V12a2 2 0 0 1 2-2h4',
  ],
  Footprints: [
    'M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z',
    'M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z',
    'M16 17h4',
    'M4 13h4',
  ],
  Shield: [
    'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
  ],
  Book: [
    'M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20',
  ],
  Circle: [
    'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20',
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
  const paths = ICON_PATHS[kind];
  if (!paths) {
    drawPlaceholder(ctx, kind, color);
    return;
  }

  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);

  ctx.save();
  ctx.translate(PADDING, PADDING);
  ctx.scale(SCALE, SCALE);

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

export function clearTextureCache() {
  cache.forEach(e => e.texture.destroy());
  cache.clear();
}
