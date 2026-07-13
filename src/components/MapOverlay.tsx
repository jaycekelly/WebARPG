import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useWorldStore } from '../store/useWorldStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useVisionStore } from '../store/useVisionStore';
import { drawMinimap } from '../renderer/utils/minimapDraw';

const OVERLAY_WIDTH_PX = 840;
const OVERLAY_HEIGHT_PX = 560;
const OVERLAY_RADIUS_TILES = 16;
const OVERLAY_ALPHA = 0.85;

/**
 * Full-screen map overlay ('M' to toggle, or click the corner minimap).
 * Reuses drawMinimap() so it always stays visually consistent with the corner
 * Minimap — same colors, same fog-of-war rules, same zoom formula. Deliberately
 * bare: just the tile canvas on a translucent panel, no chrome (no header,
 * no footer, no border, no entity labels).
 */
export function MapOverlay() {
  const mapOverlayOpen = useAppStore((s) => s.mapOverlayOpen);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sizeRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    if (!mapOverlayOpen) return;
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
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
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
            showLabels: false,
            radiusTiles: OVERLAY_RADIUS_TILES,
            alpha: OVERLAY_ALPHA,
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
  }, [mapOverlayOpen]);

  if (!mapOverlayOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[9000] flex items-center justify-center animate-in fade-in duration-150 pointer-events-auto"
      onClick={() => useAppStore.getState().setMapOverlayOpen(false)}
    >
      <div
        ref={containerRef}
        className="relative overflow-hidden"
        style={{ width: OVERLAY_WIDTH_PX, height: OVERLAY_HEIGHT_PX }}
        onClick={(e) => e.stopPropagation()}
      >
        <canvas ref={canvasRef} className="block" />
      </div>
    </div>
  );
}
