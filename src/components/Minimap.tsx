import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useWorldStore } from '../store/useWorldStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useVisionStore } from '../store/useVisionStore';
import { drawMinimap } from '../renderer/utils/minimapDraw';

const CORNER_SIZE_PX = 320;
const FOLLOW_RADIUS_TILES = 8;
const CORNER_ALPHA = 0.93;

/**
 * Top-right corner minimap. Decoupled from the PixiJS world renderer — reads the
 * same stores (world/player/vision) every animation frame and draws a flat,
 * top-down snapshot via drawMinimap(). Clicking it opens the full MapOverlay.
 */
export function Minimap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });
  const mapOverlayOpen = useAppStore((s) => s.mapOverlayOpen);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = container.clientWidth;
      const h = container.clientHeight;
      sizeRef.current = { w, h };
      if (w <= 0 || h <= 0) return;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);

    let rafId = 0;
    const tick = () => {
      const appState = useAppStore.getState();
      const { w, h } = sizeRef.current;
      if (
        !appState.mapOverlayOpen &&
        (appState.location === 'dungeon' || appState.location === 'town') &&
        w > 0 &&
        h > 0
      ) {
        const world = useWorldStore.getState();
        const player = usePlayerStore.getState();
        const vision = useVisionStore.getState();
        drawMinimap(
          ctx,
          {
            grid: world.grid,
            exploredTiles: vision.exploredTiles,
            visibleTiles: vision.visibleTiles,
            playerPos: player.position,
            enemies: world.enemies,
            lootDrops: world.lootDrops,
          },
          {
            canvasWidth: w,
            canvasHeight: h,
            radiusTiles: FOLLOW_RADIUS_TILES,
            alpha: CORNER_ALPHA,
          }
        );
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      ro.disconnect();
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={() => useAppStore.getState().setMapOverlayOpen(true)}
      className={`absolute top-3 right-3 z-40 pointer-events-auto focus:outline-none ${mapOverlayOpen ? 'hidden' : ''}`}
    >
      <div
        ref={containerRef}
        className="relative shadow-[0_4px_12px_rgba(0,0,0,0.6)] overflow-hidden"
        style={{ width: CORNER_SIZE_PX, height: CORNER_SIZE_PX }}
      >
        <canvas ref={canvasRef} className="block" />
        {/* Soft vignette so the flat tile grid doesn't read as a harsh square against the game view */}
        <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_18px_10px_rgba(10,10,12,0.55)]" />
      </div>
    </button>
  );
}
