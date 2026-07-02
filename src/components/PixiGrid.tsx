/**
 * PixiGrid.tsx — React shell for the PixiJS perspective renderer.
 *
 * StrictMode double-mount guard uses a generation counter stored in a ref.
 * Each effect invocation increments the counter. Any async initialisation
 * that was started by an older effect will find the counter has moved past
 * its captured value and will abort + destroy itself cleanly.
 */

import { useEffect, useRef, memo } from 'react';
import { Application }             from 'pixi.js';
import { GameScene }               from '../pixi/GameScene';

export const PixiGrid = memo(function PixiGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef       = useRef<Application | null>(null);
  const sceneRef     = useRef<GameScene   | null>(null);
  /** Monotonically increasing. Only the run that set genRef.current proceeds. */
  const genRef       = useRef(0);

  useEffect(() => {
    // Claim this effect's generation slot
    const myGen = ++genRef.current;

    (async () => {
      // -----------------------------------------------------------------------
      // Phase 1: init the PixiJS Application
      // -----------------------------------------------------------------------
      const app = new Application();
      await app.init({
        resizeTo:    containerRef.current!,
        background:  0x09090b,   // zinc-950
        antialias:   true,
        resolution:  window.devicePixelRatio || 1,
        autoDensity: true,
      });

      // Abort if a newer effect started (StrictMode test-unmount, or true unmount)
      if (genRef.current !== myGen) {
        app.destroy(true, { children: true, texture: true });
        return;
      }

      // Mount canvas
      const canvas = app.canvas as HTMLCanvasElement;
      canvas.style.width  = '100%';
      canvas.style.height = '100%';
      containerRef.current!.appendChild(canvas);

      // -----------------------------------------------------------------------
      // Phase 2: init the GameScene
      // -----------------------------------------------------------------------
      const scene = new GameScene(app);
      await scene.init();

      // Re-check after the second async yield (cleanup may have fired)
      if (genRef.current !== myGen) {
        scene.destroy();
        canvas.remove();
        app.destroy(true, { children: true, texture: true });
        return;
      }

      // Both inits succeeded and we're still the active generation — go live
      appRef.current   = app;
      sceneRef.current = scene;
      app.ticker.add((ticker) => scene.update(ticker));
    })();

    // -------------------------------------------------------------------------
    // Cleanup — runs on unmount (and on StrictMode's synthetic test-unmount)
    // -------------------------------------------------------------------------
    return () => {
      // Destroy the currently live app+scene (if any). The generation counter
      // is NOT reset here; it only ever increases, so in-flight async will
      // still detect the mismatch and abort.
      sceneRef.current?.destroy();
      sceneRef.current = null;
      if (appRef.current) {
        appRef.current.destroy(true, { children: true, texture: true });
        appRef.current = null;
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Pointer / wheel events — forwarded to GameScene as canvas-relative coords
  // ---------------------------------------------------------------------------
  const getXY = (e: React.PointerEvent | React.WheelEvent) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 w-full h-full select-none"
      style={{ touchAction: 'none' }}
      onPointerMove={(e) => {
        const { x, y } = getXY(e);
        sceneRef.current?.handlePointerMove(x, y);
      }}
      onPointerDown={(e) => {
        const { x, y } = getXY(e);
        sceneRef.current?.handlePointerDown(x, y, e.button);
      }}
      onWheel={(e) => {
        sceneRef.current?.handleWheel(e.deltaY);
      }}
    />
  );
});
