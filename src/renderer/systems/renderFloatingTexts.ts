import { Container, Text, TextStyle } from 'pixi.js';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { useCombatStore } from '../../store/useCombatStore';
import { useAppStore } from '../../store/useAppStore';

// ---- Constants ---------------------------------------------------------------

const FLOAT_DURATION_MS = 800;
const FADE_START_MS = 500; // Start fading after 500ms
const FLOAT_DISTANCE = 40; // Total upward pixels over lifetime
const FLOAT_OFFSET_Y = -128; // Vertical offset from entity at spawn

// Tailwind → hex color mapping
const COLOR_MAP: Record<string, string> = {
  'text-zinc-100': '#f4f4f5',
  'text-orange-500': '#f97316',
  'text-blue-400': '#60a5fa',
  'text-yellow-400': '#facc15',
  'text-purple-400': '#c084fc',
  'text-red-400': '#f87171',
  'text-green-400': '#4ade80',
};

function resolveColor(colorClass: string): string {
  return COLOR_MAP[colorClass] ?? '#f4f4f5';
}

// ---- Resolution-aware text creation -----------------------------------------

// One-time read: text resolution for crisp rendering on high-DPI screens.
// Clamped to [2, 3] — 1x is blurry, >3x wastes texture memory for imperceptible gain.
const TEXT_RESOLUTION = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

function makeTextStyle(fillColor: string, isNumeric: boolean): TextStyle {
  return new TextStyle({
    fontFamily: isNumeric ? 'Rajdhani, sans-serif' : 'Noto Sans, sans-serif',
    fontSize: 22,
    fontWeight: 'bold',
    fill: fillColor,
    padding: 4,
  });
}

function createText(content: string, colorClass: string): Text {
  const isNumeric = /^[-+0-9.,]+$/.test(content);
  return new Text({
    text: content,
    style: makeTextStyle(resolveColor(colorClass), isNumeric),
    resolution: TEXT_RESOLUTION,
  });
}

// ---- Types -------------------------------------------------------------------

interface TrackedText {
  text: Text;
  id: string;
  spawnTime: number;
  screenX: number;
  screenY: number;
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

  function tick(params: ProjectionParams) {
    const now = useAppStore.getState().getGameTime();
    const texts = useCombatStore.getState().floatingTexts;
    const activeIds = new Set<string>();

    for (const ft of texts) {
      activeIds.add(ft.id);

      let entry = tracked.get(ft.id);
      if (!entry) {
        const text = createText(ft.text, ft.color);
        text.anchor.set(0.5, 0.5);
        container.addChild(text);

        entry = {
          text,
          id: ft.id,
          spawnTime: now,
          screenX: 0,
          screenY: 0,
        };
        tracked.set(ft.id, entry);
      }

      // Re-project screen position every frame so text follows entity as camera moves
      const projected = projectTileToScreen(ft.x, ft.y, params);

      // Compute lifetime progress
      // Calculate base scale exactly like renderEntities does so it perfectly tracks
      const baseIconSize = 32 * (params.tileSize / (72 * 0.55));
      const activeBaseScale = baseIconSize / 128;

      const elapsed = now - entry.spawnTime;
      const progress = Math.min(1.0, elapsed / FLOAT_DURATION_MS);
      
      const rawOffset = FLOAT_OFFSET_Y - (FLOAT_DISTANCE * progress);
      const dynamicOffset = rawOffset * (activeBaseScale / 0.9) * projected.scale;
      
      entry.screenX = projected.screenX;
      entry.screenY = projected.screenY + dynamicOffset;

      // Fade out in last portion of lifetime
      let alpha = 1;
      if (elapsed > FADE_START_MS) {
        const fadeProgress = (elapsed - FADE_START_MS) / (FLOAT_DURATION_MS - FADE_START_MS);
        alpha = Math.max(0, 1 - fadeProgress);
      }

      entry.text.position.set(entry.screenX, entry.screenY);
      entry.text.alpha = alpha;
    }

    // Remove expired texts
    for (const [id, entry] of tracked) {
      if (!activeIds.has(id)) {
        entry.text.destroy();
        container.removeChild(entry.text);
        tracked.delete(id);
      }
    }
  }

  return { container, update: tick };
}
