import { Container, Sprite, Text, TextStyle } from 'pixi.js';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { useCombatStore } from '../../store/useCombatStore';
import { useAppStore } from '../../store/useAppStore';
import { useWorldStore } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { getEntityTexture } from '../assets';

// ===============================================================================
// "Scrolling combat log" floating damage text.
// -------------------------------------------------------------------------------
// Constant-speed upward scroll (like a mini combat log ticking up from the hit
// point) that only fades out right at the end of its lifetime. Any real skill
// cast (executor.ts) renders its skill icon to the left of the number and is
// drawn slightly larger than plain auto-attack damage text (useGameEngine.ts's
// weapon-swing path, which never sets skillIcon/isSkillDamage).
//
// TO REVERT: restore renderFloatingTexts.ts from renderFloatingTexts.ts.bak
// (the original file, saved alongside this one) and remove the skillIcon/
// isSkillDamage fields + executor.ts wiring if desired.
// ===============================================================================

// ---- Constants ---------------------------------------------------------------

const FLOAT_DISTANCE = 60; // Total upward pixels over lifetime
const RISE_DURATION_MS = 800; // Time spent in the initial fast-rise phase
const FADE_DURATION_MS = 250; // Fades out only in the final portion of its lifetime
const STAGGER_OFFSET_PX = 10; // How far a newer overlapping hit is nudged down/behind
const STAGGER_WINDOW_MS = 350; // Hits at the same tile within this window get staggered
const ICON_SIZE_PX = 30; // On-screen icon size (before camera/tile scaling)
const ICON_GAP_PX = 4; // Gap between icon and text
// Matches the skill hotbar's icon color (text-sky-400 in CombatOverlay.tsx) so the
// floating combat text icon reads as "the same icon" the player just saw light up.
const SKILL_ICON_COLOR = '#38bdf8';

// Tailwind → hex color mapping
const COLOR_MAP: Record<string, string> = {
  'text-zinc-100': '#f4f4f5',
  'text-zinc-200': '#e4e4e7',
  'text-stone-300': '#d6d3d1',
  'text-orange-400': '#fb923c',
  'text-orange-500': '#f97316',
  'text-blue-300': '#93c5fd',
  'text-blue-400': '#60a5fa',
  'text-yellow-400': '#facc15',
  'text-purple-400': '#c084fc',
  'text-purple-500': '#a855f7',
  'text-red-400': '#f87171',
  'text-green-400': '#4ade80',
  'text-amber-400': '#fbbf24',
};

function resolveColor(colorClass: string): string {
  return COLOR_MAP[colorClass] ?? '#f4f4f5';
}

// ---- Resolution-aware text creation -----------------------------------------

// One-time read: text resolution for crisp rendering on high-DPI screens.
// Clamped to [2, 3] — 1x is blurry, >3x wastes texture memory for imperceptible gain.
const TEXT_RESOLUTION = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

function makeTextStyle(fillColor: string, isNumeric: boolean, isCrit: boolean, isSkillDamage: boolean, isGold: boolean): TextStyle {
  const baseSize = isNumeric ? 24 : 22;
  // Skill damage renders a notch larger than plain auto-attack damage, so skill
  // hits read as slightly more impactful in the scrolling log at a glance.
  const skillBumpedSize = isSkillDamage ? baseSize + 4 : baseSize;
  let size = isCrit ? skillBumpedSize * 1.55 : skillBumpedSize;
  if (isGold) size = 32; // Make gold large and satisfying
  
  return new TextStyle({
    fontFamily: isNumeric ? 'Rajdhani, sans-serif' : 'Noto Sans, sans-serif',
    fontSize: size,
    fontWeight: isNumeric ? 'normal' : 'bold',
    fill: fillColor,
    padding: 10,
    dropShadow: isGold 
        ? { alpha: 0.8, color: '#d97706', blur: 6, distance: 0 } 
        : { alpha: 1.0, color: '#000000', blur: 1, distance: 2 },
  });
}

function createText(content: string, colorClass: string, isCrit: boolean, isSkillDamage: boolean, isGold: boolean): Text {
  const isNumeric = /^[-+0-9.,]+$/.test(content) || content.includes('Crit'); // treat "Crit!" as numeric font style
  return new Text({
    text: content,
    style: makeTextStyle(resolveColor(colorClass), isNumeric, isCrit, isSkillDamage, isGold),
    resolution: TEXT_RESOLUTION,
  });
}

// ---- Types -------------------------------------------------------------------

interface TrackedText {
  container: Container;
  text: Text;
  icon: Sprite | null;
  id: string;
  spawnTime: number;
  screenX: number;
  screenY: number;
  iconScale: number;
  isPlayer: boolean;
  isCrit: boolean;
  staggerPx: number; // Extra downward offset so near-simultaneous hits don't overlap
  isGold?: boolean;
  vx?: number;
  vy?: number;
}

export interface FloatingTextRenderer {
  container: Container;
  update: (params: ProjectionParams) => void;
}

// ---- Factory ----------------------------------------------------------------

export function createFloatingTextRenderer(): FloatingTextRenderer {
  const container = new Container();
  container.zIndex = 9999; // Always on top
  const tracked = new Map<string, TrackedText>();
  // Per-tile spawn history used purely for the overlap stagger calculation below.
  const recentSpawnsByTile = new Map<string, number[]>();

  function tick(params: ProjectionParams) {
    const now = useAppStore.getState().getGameTime();
    const texts = useCombatStore.getState().floatingTexts;
    const activeIds = new Set<string>();

    for (const ft of texts) {
      activeIds.add(ft.id);

      let entry = tracked.get(ft.id);
      if (!entry) {
        let colorClass = ft.color;
        if (ft.isCrit) colorClass = 'text-yellow-500';
        
        const isSkillDamage = !!ft.isSkillDamage;
        const isGold = !!ft.isGold;
        const text = createText(ft.text, colorClass, !!ft.isCrit, isSkillDamage, isGold);
        text.anchor.set(0, 0.5);

        let icon: Sprite | null = null;
        if (isGold) {
          const texture = getEntityTexture('Circle', '#fbbf24', true); // Golden coin icon
          icon = new Sprite(texture);
          icon.anchor.set(0, 0.5);
          icon.width = 24;
          icon.height = 24;
        } else if (ft.skillIcon) {
          const texture = getEntityTexture(ft.skillIcon, SKILL_ICON_COLOR);
          icon = new Sprite(texture);
          icon.anchor.set(0, 0.5);
          icon.width = ICON_SIZE_PX;
          icon.height = ICON_SIZE_PX;
        }

        // Lay out icon + text left-to-right inside a wrapper container, then anchor
        // that wrapper so the whole group is horizontally centered on the tile.
        const group = new Container();
        let cursorX = 0;
        if (icon) {
          icon.position.set(cursorX, 0);
          group.addChild(icon);
          cursorX += ICON_SIZE_PX + ICON_GAP_PX;
        }
        text.position.set(cursorX, 0);
        group.addChild(text);

        const totalWidth = cursorX + text.width;
        group.pivot.set(totalWidth / 2, 0);
        container.addChild(group);

        let iconScale = 0.85; // default
        let isPlayer = false;
        const player = usePlayerStore.getState();
        if (player.position.x === ft.x && player.position.y === ft.y) {
          iconScale = 0.85;
          isPlayer = true;
        } else {
          const enemy = useWorldStore.getState().enemies.find(e => e.position.x === ft.x && e.position.y === ft.y);
          if (enemy && enemy.scale) {
            iconScale = enemy.scale;
          }
        }

        // Overlap stagger: if another hit spawned on this approximate tile very recently,
        // nudge this newer one down a bit so it doesn't sit directly on top of the
        // still-scrolling earlier hit - it'll catch up visually as it scrolls past.
        const tileKey = `${Math.round(ft.x)},${Math.round(ft.y)}`;
        const recent = (recentSpawnsByTile.get(tileKey) || []).filter(t => now - t < STAGGER_WINDOW_MS);
        const staggerCount = recent.length;
        const staggerPx = staggerCount * STAGGER_OFFSET_PX;
        const delayMs = staggerCount * 100; // Add 100ms delay per overlap level
        recentSpawnsByTile.set(tileKey, [...recent, now]);

        entry = {
          container: group,
          text,
          icon,
          id: ft.id,
          spawnTime: now + delayMs,
          screenX: 0,
          screenY: 0,
          iconScale,
          isPlayer,
          isCrit: !!ft.isCrit,
          staggerPx,
          isGold,
          vx: isGold ? (Math.random() - 0.5) * 120 : 0, // Pixels per second horizontal spread
          vy: isGold ? -200 - Math.random() * 80 : 0    // Upward initial velocity for bounce
        };
        tracked.set(ft.id, entry);
      }

      // Re-project screen position every frame so text follows entity as camera moves
      const projected = projectTileToScreen(ft.x, ft.y, params);

      // Compute lifetime progress
      const baseIconSize = 32 * (params.tileSize / (72 * 0.55));
      const activeBaseScale = baseIconSize / 128;
      const cameraScale = activeBaseScale * projected.scale;

      const elapsed = now - entry.spawnTime;
      
      if (elapsed < 0) {
        entry.container.alpha = 0;
        entry.container.visible = false;
        continue; // Wait until delay finishes to start rendering/moving
      }
      
      entry.container.visible = true;

      const duration = ft.expiresAt - entry.spawnTime;
      const progress = Math.min(1.0, elapsed / Math.max(1, duration));

      let distancePx = 0;
      let physicsXOffset = 0;

      if (entry.isGold && entry.vx !== undefined && entry.vy !== undefined) {
         // Gravity arc physics for coins
         const t = elapsed / 1000.0; // Seconds
         const gravity = 500; // Pixels per second squared
         physicsXOffset = entry.vx * t;
         distancePx = -(entry.vy * t + 0.5 * gravity * t * t);
      } else {
         // Fast rise initially, then slow drift for the remainder of its lifetime
         let verticalProgress = 0;
         if (elapsed <= RISE_DURATION_MS) {
            // Fast rise: 70% of distance in the initial phase
            verticalProgress = 0.7 * (elapsed / RISE_DURATION_MS);
         } else {
            // Slow drift: remaining 30% over the rest of the lifetime
            const driftElapsed = elapsed - RISE_DURATION_MS;
            const driftDuration = Math.max(1, duration - RISE_DURATION_MS);
            verticalProgress = 0.7 + (0.3 * Math.min(1.0, driftElapsed / driftDuration));
         }
         distancePx = FLOAT_DISTANCE * verticalProgress;
      }

      const fadeStartProgress = Math.max(0, 1 - (FADE_DURATION_MS / Math.max(1, duration)));
      let alpha = 1.0;
      if (progress > fadeStartProgress) {
         const fadeProgress = (progress - fadeStartProgress) / (1 - fadeStartProgress);
         alpha = 1.0 - fadeProgress;
      }
      
      // Base spawn Y coordinate relative to entity feet. Uses the same anchor-derived
      // formula as the sprite renderer's health bar offset (renderEntities.ts) so floating
      // text lines up consistently across all enemy scales, not just the one it happened to
      // be tuned against.
      const baseOffset = entry.isPlayer 
        ? -60 // Center-ish of the player
        : -(95 * entry.iconScale) - 15;
        
      const rawYOffset = baseOffset - distancePx;
      const dynamicYOffset = (rawYOffset * cameraScale) + entry.staggerPx;
      
      entry.screenX = projected.screenX + (physicsXOffset * cameraScale);
      entry.screenY = projected.screenY + dynamicYOffset;

      entry.container.position.set(entry.screenX, entry.screenY);
      entry.container.alpha = Math.max(0, alpha);
    }

    // Remove expired texts
    for (const [id, entry] of tracked) {
      if (!activeIds.has(id)) {
        entry.container.destroy({ children: true });
        container.removeChild(entry.container);
        tracked.delete(id);
      }
    }
  }

  return { container, update: tick };
}
