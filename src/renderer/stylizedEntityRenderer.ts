// Frame of Reference & Bulletproof 2-Pass White Cutout Renderer
// Features 100% static obstacles, calmed 280ms wobble speed, & uniform y = 0 feet baseline

export type BabaBlobType =
  | 'warrior_champion'  // Champion Is Baba: Bulletproof 5.0px White Outline Royal Sapphire Knight
  | 'keke_ghost'        // Keke: Bulletproof 5.0px White Outline Pink Ghost
  | 'jiji_slime'        // Jiji: Bulletproof 5.0px White Outline Mint Slime
  | 'me_bot'            // Me: Bulletproof 5.0px White Outline Boxy Bot
  | 'obstacle_mountain' // Flat Color Mountain Peak (Static, No Outline)
  | 'obstacle_rock';     // Flat Color Dungeon Rock (Static, No Outline)

export interface BabaEntityConfig {
  id: string;
  name: string;
  blobType: BabaBlobType;
  primaryColor: string;   // Main fill color
  secondaryColor: string; // Secondary facet color
  eyeColor: string;       // Eye / visor / highlight color
  accentColor?: string;   // Plume / accent color
  wobbleAmount: number;   // Edge wobble intensity
  scale: number;
  hoverHeight?: number;
}

// 5.0px exact uniform white outline width for all character entities
const OUTLINE_PADDING = 5.0;

// All core character entities use native scale = 1.0
export const BABA_PRESETS: BabaEntityConfig[] = [
  {
    id: 'warrior_champion',
    name: 'Champion Is Baba (Royal Sapphire Knight)',
    blobType: 'warrior_champion',
    primaryColor: '#3b82f6',   // Royal Sapphire Blue
    secondaryColor: '#1e293b', // Dark Visor / Feet
    eyeColor: '#38bdf8',       // Sky Blue Visor Glow
    accentColor: '#ef4444',    // Bright Red Plume
    wobbleAmount: 1.0,
    scale: 1.0,
  },
  {
    id: 'keke_ghost',
    name: 'Keke (Pink Ghost)',
    blobType: 'keke_ghost',
    primaryColor: '#f43f5e',   // Vibrant Pink
    secondaryColor: '#be123c', // Dark Pink Base
    eyeColor: '#0f172a',       // Hollow Dark Eye Sockets
    wobbleAmount: 1.2,
    scale: 1.0,
  },
  {
    id: 'jiji_slime',
    name: 'Jiji (Slime Blob)',
    blobType: 'jiji_slime',
    primaryColor: '#4ade80',   // Mint Green
    secondaryColor: '#15803d', // Dark Green Base
    eyeColor: '#0f172a',       // Dark Eyes
    wobbleAmount: 1.5,
    scale: 1.0,
  },
  {
    id: 'me_bot',
    name: 'Me (Boxy Bot Blob)',
    blobType: 'me_bot',
    primaryColor: '#38bdf8',   // Sky Blue
    secondaryColor: '#0284c7', // Deep Blue
    eyeColor: '#ffffff',       // White Screen Eyes
    wobbleAmount: 0.8,
    scale: 1.0,
  },
  {
    id: 'obstacle_mountain',
    name: 'Flat Color Mountain Peak',
    blobType: 'obstacle_mountain',
    primaryColor: '#475569',   // Slate Ridge
    secondaryColor: '#334155', // Shadow Base
    eyeColor: '#64748b',       // Ridge Highlight
    accentColor: '#94a3b8',    // Peak Cap
    wobbleAmount: 0.0,         // Static obstacle (No Wobble)
    scale: 1.0,
  },
  {
    id: 'obstacle_rock',
    name: 'Flat Color Dungeon Rock',
    blobType: 'obstacle_rock',
    primaryColor: '#475569',   // Dark Stone Body
    secondaryColor: '#334155', // Shadow Crevice
    eyeColor: '#64748b',       // Highlight Facet
    accentColor: '#94a3b8',    // Mineral Accent
    wobbleAmount: 0.0,         // Static obstacle (No Wobble)
    scale: 1.0,
  },
];

/**
 * Main Render Function
 */
export function renderBabaEntity(
  ctx: CanvasRenderingContext2D,
  config: BabaEntityConfig,
  width: number,
  height: number,
  timeMs: number = 0
) {
  ctx.clearRect(0, 0, width, height);

  const cx = width / 2;
  const cy = height * 0.78;
  const scale = config.scale || 1.0;
  const hoverY = -(config.hoverHeight || 0);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);

  const isObstacle = config.blobType === 'obstacle_mountain' || config.blobType === 'obstacle_rock';

  // Ground Drop Shadow Disc (Aligned under y = 0 feet baseline)
  ctx.save();
  ctx.scale(1, 0.45);
  const shadowRadius = isObstacle ? 34 : 24;
  const shadowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, shadowRadius);
  shadowGrad.addColorStop(0, 'rgba(15, 23, 42, 0.65)');
  shadowGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(0, 0, shadowRadius + 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.translate(0, hoverY);

  // Calmed 280ms wobble frame calculation for character entities (Obstacles do NOT wobble)
  const wobbleFrame = isObstacle ? 0 : Math.floor(timeMs / 280) % 3;
  const wobble = isObstacle
    ? 0
    : (config.wobbleAmount || 1.0) * (wobbleFrame === 1 ? 1.5 : wobbleFrame === 2 ? -1.5 : 0);

  const pCol = config.primaryColor;
  const sCol = config.secondaryColor;
  const eCol = config.eyeColor;
  const aCol = config.accentColor || '#ef4444';

  if (!isObstacle) {
    // --- BULLETPROOF 2-PASS WHITE CUTOUT RENDER ---
    // Pass 1: Paper Shadow
    ctx.save();
    ctx.translate(0, 2.5);
    renderCharacterGeometry(ctx, config.blobType, pCol, sCol, eCol, aCol, wobble, 'shadow');
    ctx.restore();

    // Pass 2: Exact Uniform Pure White Cutout Base
    renderCharacterGeometry(ctx, config.blobType, pCol, sCol, eCol, aCol, wobble, 'outline');

    // Pass 3: Inner Character Colors & Details
    renderCharacterGeometry(ctx, config.blobType, pCol, sCol, eCol, aCol, wobble, 'fill');
  } else {
    // Obstacles render 100% static flat colors with zero white outline
    if (config.blobType === 'obstacle_mountain') {
      drawMountainFlat(ctx, pCol, sCol, eCol, aCol, 0);
    } else {
      drawDungeonRockFlat(ctx, pCol, sCol, eCol, aCol, 0);
    }
  }

  ctx.restore();
}

/**
 * Universal Character Geometry Switcher (Pass Mode: 'shadow' | 'outline' | 'fill')
 */
function renderCharacterGeometry(
  ctx: CanvasRenderingContext2D,
  type: BabaBlobType,
  pCol: string,
  sCol: string,
  eCol: string,
  aCol: string,
  wobble: number,
  mode: 'shadow' | 'outline' | 'fill'
) {
  switch (type) {
    case 'warrior_champion':
      drawWarriorChampionGeometry(ctx, pCol, sCol, eCol, aCol, wobble, mode);
      break;
    case 'keke_ghost':
      drawKekeGhostGeometry(ctx, pCol, eCol, wobble, mode);
      break;
    case 'jiji_slime':
      drawJijiSlimeGeometry(ctx, pCol, eCol, wobble, mode);
      break;
    case 'me_bot':
      drawMeBotGeometry(ctx, pCol, sCol, eCol, wobble, mode);
      break;
  }
}

/**
 * 1. Champion Is Baba (Knight Helmet & Plume - Feet Uniformly Placed at y = 0)
 */
function drawWarriorChampionGeometry(
  ctx: CanvasRenderingContext2D,
  pCol: string,
  sCol: string,
  eCol: string,
  aCol: string,
  wobble: number,
  mode: 'shadow' | 'outline' | 'fill'
) {
  ctx.save();

  if (mode === 'shadow' || mode === 'outline') {
    const isShadow = mode === 'shadow';
    ctx.fillStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.strokeStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.lineWidth = OUTLINE_PADDING * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    // Feet (Centered flush at y = 0 baseline)
    ctx.arc(-9 + wobble * 0.3, 0, 5.5, 0, Math.PI * 2);
    ctx.arc(9 - wobble * 0.3, 0, 5.5, 0, Math.PI * 2);
    // Helmet Body
    ctx.arc(0, -24 + wobble * 0.3, 22, Math.PI, 0);
    ctx.rect(-22, -24 + wobble * 0.3, 44, 24);
    // Plume
    ctx.moveTo(0, -46 + wobble * 0.3);
    ctx.quadraticCurveTo(-22 - wobble, -64, -30, -42);
    ctx.quadraticCurveTo(-14, -50, 0, -42 + wobble * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // FILL PASS: Inner Art
  // Feet (Flush at y = 0 baseline)
  ctx.fillStyle = sCol;
  ctx.beginPath();
  ctx.arc(-9 + wobble * 0.3, 0, 5.5, 0, Math.PI * 2);
  ctx.arc(9 - wobble * 0.3, 0, 5.5, 0, Math.PI * 2);
  ctx.fill();

  // Royal Sapphire Blue Body
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.arc(0, -24 + wobble * 0.3, 22, Math.PI, 0);
  ctx.rect(-22, -24 + wobble * 0.3, 44, 24);
  ctx.fill();

  // Red Feather Plume
  ctx.fillStyle = aCol;
  ctx.beginPath();
  ctx.moveTo(0, -46 + wobble * 0.3);
  ctx.quadraticCurveTo(-22 - wobble, -64, -30, -42);
  ctx.quadraticCurveTo(-14, -50, 0, -42 + wobble * 0.3);
  ctx.closePath();
  ctx.fill();

  // Dark Visor Slit
  ctx.fillStyle = sCol;
  ctx.fillRect(-15, -26 + wobble * 0.3, 30, 8);

  // Visor Cyan Glow
  ctx.fillStyle = eCol;
  ctx.fillRect(-11, -24 + wobble * 0.3, 22, 3.5);

  ctx.restore();
}

/**
 * 2. Keke (Pink Ghost - Skirt Hem Flush at y = 0)
 */
function drawKekeGhostGeometry(
  ctx: CanvasRenderingContext2D,
  pCol: string,
  eCol: string,
  wobble: number,
  mode: 'shadow' | 'outline' | 'fill'
) {
  ctx.save();

  if (mode === 'shadow' || mode === 'outline') {
    const isShadow = mode === 'shadow';
    ctx.fillStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.strokeStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.lineWidth = OUTLINE_PADDING * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.quadraticCurveTo(-27 + wobble, -45, 0, -50 + wobble);
    ctx.quadraticCurveTo(27 - wobble, -45, 22, 0);
    ctx.quadraticCurveTo(14, -6 + wobble, 7, 0);
    ctx.quadraticCurveTo(0, -6 - wobble, -7, 0);
    ctx.quadraticCurveTo(-14, -6 + wobble, -22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // FILL PASS: Inner Art
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.quadraticCurveTo(-27 + wobble, -45, 0, -50 + wobble);
  ctx.quadraticCurveTo(27 - wobble, -45, 22, 0);
  ctx.quadraticCurveTo(14, -6 + wobble, 7, 0);
  ctx.quadraticCurveTo(0, -6 - wobble, -7, 0);
  ctx.quadraticCurveTo(-14, -6 + wobble, -22, 0);
  ctx.closePath();
  ctx.fill();

  // Eye Sockets
  ctx.fillStyle = eCol;
  ctx.beginPath();
  ctx.roundRect(-13 + wobble * 0.2, -33, 8, 11, 3);
  ctx.roundRect(5 + wobble * 0.2, -33, 8, 11, 3);
  ctx.fill();

  ctx.restore();
}

/**
 * 3. Jiji (Mint Slime - Puddle Base Flush at y = 0)
 */
function drawJijiSlimeGeometry(
  ctx: CanvasRenderingContext2D,
  pCol: string,
  eCol: string,
  wobble: number,
  mode: 'shadow' | 'outline' | 'fill'
) {
  ctx.save();

  if (mode === 'shadow' || mode === 'outline') {
    const isShadow = mode === 'shadow';
    ctx.fillStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.strokeStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.lineWidth = OUTLINE_PADDING * 2;
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(-29 + wobble, 0);
    ctx.quadraticCurveTo(-34, -21 - wobble, -11, -26);
    ctx.quadraticCurveTo(0, -31 + wobble, 16, -24);
    ctx.quadraticCurveTo(34, -19, 29 - wobble, 0);
    ctx.quadraticCurveTo(0, 4, -29 + wobble, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // FILL PASS: Inner Art
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.moveTo(-29 + wobble, 0);
  ctx.quadraticCurveTo(-34, -21 - wobble, -11, -26);
  ctx.quadraticCurveTo(0, -31 + wobble, 16, -24);
  ctx.quadraticCurveTo(34, -19, 29 - wobble, 0);
  ctx.quadraticCurveTo(0, 4, -29 + wobble, 0);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = eCol;
  ctx.beginPath();
  ctx.arc(-8 + wobble * 0.4, -17, 4, 0, Math.PI * 2);
  ctx.arc(8 + wobble * 0.4, -17, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 4. Me (Boxy Bot - Body Base Flush at y = 0)
 */
function drawMeBotGeometry(
  ctx: CanvasRenderingContext2D,
  pCol: string,
  sCol: string,
  eCol: string,
  wobble: number,
  mode: 'shadow' | 'outline' | 'fill'
) {
  ctx.save();

  if (mode === 'shadow' || mode === 'outline') {
    const isShadow = mode === 'shadow';
    ctx.fillStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.strokeStyle = isShadow ? 'rgba(15, 23, 42, 0.35)' : '#ffffff';
    ctx.lineWidth = OUTLINE_PADDING * 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Antenna Outer Stroke
    ctx.beginPath();
    ctx.moveTo(0, -42);
    ctx.lineTo(0, -54 + wobble);
    ctx.stroke();
    ctx.arc(0, -54 + wobble, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Body Outer Stroke (Flush at y = 0)
    ctx.beginPath();
    ctx.roundRect(-21 + wobble * 0.3, -42, 42, 42, 9);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    return;
  }

  // FILL PASS: Inner Art
  // Antenna
  ctx.strokeStyle = sCol;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -42);
  ctx.lineTo(0, -54 + wobble);
  ctx.stroke();

  ctx.fillStyle = sCol;
  ctx.beginPath();
  ctx.arc(0, -54 + wobble, 4, 0, Math.PI * 2);
  ctx.fill();

  // Inner Body
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.roundRect(-21 + wobble * 0.3, -42, 42, 42, 9);
  ctx.fill();

  // Screen
  ctx.fillStyle = sCol;
  ctx.beginPath();
  ctx.roundRect(-15 + wobble * 0.3, -35, 30, 24, 6);
  ctx.fill();

  // Eyes
  ctx.fillStyle = eCol;
  ctx.beginPath();
  ctx.arc(-7 + wobble * 0.3, -23, 3.5, 0, Math.PI * 2);
  ctx.arc(7 + wobble * 0.3, -23, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

/**
 * 5. Flat Color Mountain Peak (100% Static Obstacle - NO WOBBLE, NO OUTLINE)
 */
function drawMountainFlat(
  ctx: CanvasRenderingContext2D,
  pCol: string,
  sCol: string,
  eCol: string,
  aCol: string,
  _wobble: number
) {
  ctx.save();

  // Shadow Base Facet
  ctx.fillStyle = sCol;
  ctx.beginPath();
  ctx.moveTo(-36, 0);
  ctx.lineTo(-24, -22);
  ctx.quadraticCurveTo(0, -62, 0, -62);
  ctx.quadraticCurveTo(24, -22, 36, 0);
  ctx.closePath();
  ctx.fill();

  // Main Mountain Ridge Facet
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.moveTo(-31, 0);
  ctx.quadraticCurveTo(-20, -29, 0, -58);
  ctx.quadraticCurveTo(20, -29, 31, 0);
  ctx.closePath();
  ctx.fill();

  // Highlight Ridge Facet
  ctx.fillStyle = eCol;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.quadraticCurveTo(10, -29, 31, 0);
  ctx.quadraticCurveTo(7, -14, 0, -29);
  ctx.closePath();
  ctx.fill();

  // Snow/Peak Cap
  ctx.fillStyle = aCol;
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.lineTo(-9, -42);
  ctx.lineTo(-3, -40);
  ctx.lineTo(4, -44);
  ctx.lineTo(10, -41);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * 6. Flat Color Dungeon Rock (100% Static Obstacle - NO WOBBLE, NO OUTLINE)
 */
function drawDungeonRockFlat(
  ctx: CanvasRenderingContext2D,
  pCol: string,
  sCol: string,
  eCol: string,
  _aCol: string,
  _wobble: number
) {
  ctx.save();

  // Base Crevice Shadow Facet
  ctx.fillStyle = sCol;
  ctx.beginPath();
  ctx.moveTo(-34, 0);
  ctx.quadraticCurveTo(-39, -22, -18, -39);
  ctx.quadraticCurveTo(0, -48, 21, -39);
  ctx.quadraticCurveTo(39, -22, 34, 0);
  ctx.closePath();
  ctx.fill();

  // Main Boulder Body
  ctx.fillStyle = pCol;
  ctx.beginPath();
  ctx.moveTo(-30, 0);
  ctx.quadraticCurveTo(-33, -18, -15, -34);
  ctx.quadraticCurveTo(0, -44, 17, -34);
  ctx.quadraticCurveTo(33, -18, 30, 0);
  ctx.closePath();
  ctx.fill();

  // Highlight Stone Facet
  ctx.fillStyle = eCol;
  ctx.beginPath();
  ctx.moveTo(-12, -28);
  ctx.quadraticCurveTo(0, -40, 15, -30);
  ctx.quadraticCurveTo(5, -22, -5, -22);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * Generator Helper for Random Frame of Reference Entities
 */
export function generateRandomBaba(seed?: number): BabaEntityConfig {
  const s = seed !== undefined ? seed : Math.random();
  const rand = (min: number, max: number, offset: number = 0) => {
    const x = Math.sin(s * 9999 + offset) * 10000;
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min;
  };

  const types: BabaBlobType[] = [
    'warrior_champion',
    'keke_ghost',
    'jiji_slime',
    'me_bot',
    'obstacle_mountain',
    'obstacle_rock',
  ];

  const palettes = [
    { p: '#3b82f6', s: '#1e293b', e: '#38bdf8', a: '#ef4444', name: 'Royal Sapphire Knight' },
    { p: '#f43f5e', s: '#be123c', e: '#0f172a', a: '#fda4af', name: 'Keke Pink Ghost' },
    { p: '#4ade80', s: '#15803d', e: '#0f172a', a: '#86efac', name: 'Jiji Mint Slime' },
    { p: '#38bdf8', s: '#0284c7', e: '#ffffff', a: '#7dd3fc', name: 'Me Sky Bot' },
    { p: '#475569', s: '#334155', e: '#64748b', a: '#94a3b8', name: 'Flat Mountain' },
    { p: '#475569', s: '#334155', e: '#64748b', a: '#94a3b8', name: 'Flat Dungeon Rock' },
  ];

  const type = types[rand(0, types.length - 1, 1)];
  const pal = palettes[rand(0, palettes.length - 1, 2)];

  return {
    id: `baba_${Math.floor(s * 100000)}`,
    name: `${pal.name} #${rand(1, 99, 3)}`,
    blobType: type,
    primaryColor: pal.p,
    secondaryColor: pal.s,
    eyeColor: pal.e,
    accentColor: pal.a,
    wobbleAmount: type.startsWith('obstacle') ? 0 : 1.0 + (rand(0, 10, 4) / 10),
    scale: 1.0,
  };
}
