import { Container, Text, TextStyle } from 'pixi.js';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { useCombatStore } from '../../store/useCombatStore';
import { useAppStore } from '../../store/useAppStore';
import { useWorldStore } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';

// ---- Constants ---------------------------------------------------------------

const FLOAT_DURATION_MS = 1300;
const FLOAT_DISTANCE = 60; // Total upward pixels over lifetime
const LANE_OFFSET_PX = 32;

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
};

function resolveColor(colorClass: string): string {
  return COLOR_MAP[colorClass] ?? '#f4f4f5';
}

// ---- Resolution-aware text creation -----------------------------------------

// One-time read: text resolution for crisp rendering on high-DPI screens.
// Clamped to [2, 3] — 1x is blurry, >3x wastes texture memory for imperceptible gain.
const TEXT_RESOLUTION = Math.min(3, Math.max(2, window.devicePixelRatio || 2));

function makeTextStyle(fillColor: string, isNumeric: boolean, isCrit: boolean): TextStyle {
  const baseSize = isNumeric ? 22 : 20;
  const size = isCrit ? baseSize * 1.55 : baseSize;
  
  return new TextStyle({
    fontFamily: isNumeric ? 'Rajdhani, sans-serif' : 'Noto Sans, sans-serif',
    fontSize: size,
    fontWeight: 'bold',
    fill: fillColor,
    padding: 10,
  });
}

function createText(content: string, colorClass: string, isCrit: boolean): Text {
  const isNumeric = /^[-+0-9.,]+$/.test(content) || content.includes('Crit'); // treat "Crit!" as numeric font style
  return new Text({
    text: content,
    style: makeTextStyle(resolveColor(colorClass), isNumeric, isCrit),
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
  iconScale: number;
  isPlayer: boolean;
  laneOffset: number;
  isCrit: boolean;
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
        let laneOffset = 0;
        if (ft.lane === 'left') laneOffset = -LANE_OFFSET_PX;
        else if (ft.lane === 'right') laneOffset = LANE_OFFSET_PX;
        
        let colorClass = ft.color;
        if (ft.isCrit) colorClass = 'text-yellow-400';
        
        const text = createText(ft.text, colorClass, !!ft.isCrit);
        text.anchor.set(0.5, 0.5);
        container.addChild(text);

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

        entry = {
          text,
          id: ft.id,
          spawnTime: now,
          screenX: 0,
          screenY: 0,
          iconScale,
          isPlayer,
          laneOffset,
          isCrit: !!ft.isCrit
        };
        tracked.set(ft.id, entry);
      }

      // Re-project screen position every frame so text follows entity as camera moves
      const projected = projectTileToScreen(ft.x, ft.y, params);

      // Compute lifetime progress
      const baseIconSize = 32 * (params.tileSize / (72 * 0.55));
      const activeBaseScale = baseIconSize / 128;

      const elapsed = now - entry.spawnTime;
      const progress = Math.min(1.0, elapsed / FLOAT_DURATION_MS);
      
      // Easing implementation
      let verticalProgress = 0;
      let scaleMult = 1.0;
      let alpha = 1.0;
      
      // Phase 2: Primary rise (10% - 40%)
      if (progress >= 0.1 && progress <= 0.4) {
         const riseProgress = (progress - 0.1) / 0.3;
         // Linear movement
         verticalProgress = riseProgress * 0.9;
      }
      
      // Phase 3 & 4: Trailing drift & Fade (40% - 100%)
      if (progress > 0.4) {
         const driftProgress = (progress - 0.4) / 0.6;
         verticalProgress = 0.9 + (driftProgress * 0.1);
      }
      
      // Fade starts at 55%
      if (progress > 0.55) {
         const fadeProgress = (progress - 0.55) / 0.45;
         alpha = 1.0 - fadeProgress;
      }
      
      // Base spawn Y coordinate relative to entity feet
      const baseOffset = entry.isPlayer 
        ? -60 // Center-ish of the player
        : -(70 * entry.iconScale) - 30; // Closer to center for enemies
        
      const rawYOffset = baseOffset - (FLOAT_DISTANCE * verticalProgress);
      const dynamicYOffset = rawYOffset * activeBaseScale * projected.scale;
      
      // Horizontal lane shift: spawn close to middle (87.5%), drift outwards slightly to 95%
      const startHorizontalOffset = entry.laneOffset * 0.875;
      const horizontalDriftTotal = entry.laneOffset * 0.075;
      const rawXOffset = startHorizontalOffset + (horizontalDriftTotal * verticalProgress);
      const dynamicXOffset = rawXOffset * activeBaseScale * projected.scale;
      
      entry.screenX = projected.screenX + dynamicXOffset;
      entry.screenY = projected.screenY + dynamicYOffset;

      entry.text.position.set(entry.screenX, entry.screenY);
      entry.text.scale.set(scaleMult);
      entry.text.alpha = Math.max(0, alpha);
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
