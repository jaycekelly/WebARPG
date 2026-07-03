import { useRef, useEffect } from 'react';
import { createElement } from 'react';
import { Container } from 'pixi.js';
import { getPixiApp, destroyPixiApp } from './pixiApp';
import { createCamera } from './camera';
import { createFloorRenderer } from './systems/renderFloor';
import { createEntityRenderer } from './systems/renderEntities';
import { createFloatingTextRenderer } from './systems/renderFloatingTexts';
import { setupCanvasInput } from './input/canvasInput';
import { useWorldStore } from '../store/useWorldStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useCombatStore } from '../store/useCombatStore';
import { useAppStore } from '../store/useAppStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { ItemTooltip } from '../components/ItemTooltip';
import { InputHandler } from '../engine/input/InputHandler';
import type { ProjectionParams } from '../engine/world/screenProjection';
import type { WorldPoint } from './input/canvasInput';

const BASE_TILE_SIZE = 72;
const BASE_GAP_SIZE = 1;
const DEFAULT_ZOOM = 0.65;
const BASE_ICON_SIZE = 32;
const REF_TILE_SIZE = BASE_TILE_SIZE * 0.55;
const TEXTURE_SIZE = 128;

const FLOOR_PERSPECTIVE_PX = 1400;
const FLOOR_TILT_DEG = 50;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountCountRef = useRef(0);
  const setupDoneRef = useRef(false);
  const pressedKeys = useRef<Set<string>>(new Set());
  const projParamsRef = useRef<ProjectionParams | null>(null);
  const canvasInputCleanupRef = useRef<(() => void) | null>(null);

  // ---- Keyboard input (WASD movement, targeting) -----------------------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const appState = useAppStore.getState();
      // Don't handle movement keys when paused (Space toggles pause in App)
      if (appState.location !== 'dungeon') return;

      const key = e.key.toLowerCase();
      pressedKeys.current.add(key);

      // Skip movement if paused
      if (appState.isPaused) {
        const movementKeys = ['w','a','s','d','q','e','z','c','arrowup','arrowdown','arrowleft','arrowright'];
        if (movementKeys.includes(key)) return;
      }

      let dx = 0, dy = 0;
      if (pressedKeys.current.has('w') || pressedKeys.current.has('arrowup'))    dy -= 1;
      if (pressedKeys.current.has('s') || pressedKeys.current.has('arrowdown'))  dy += 1;
      if (pressedKeys.current.has('a') || pressedKeys.current.has('arrowleft'))  dx -= 1;
      if (pressedKeys.current.has('d') || pressedKeys.current.has('arrowright')) dx += 1;
      if (pressedKeys.current.has('q')) { dx -= 1; dy -= 1; }
      if (pressedKeys.current.has('e')) { dx += 1; dy -= 1; }
      if (pressedKeys.current.has('z')) { dx -= 1; dy += 1; }
      if (pressedKeys.current.has('c')) { dx += 1; dy += 1; }

      dx = Math.sign(dx);
      dy = Math.sign(dy);

      if (dx !== 0 || dy !== 0) {
        const player = usePlayerStore.getState();
        const world = useWorldStore.getState();
        const newX = player.position.x + dx;
        const newY = player.position.y + dy;
        if (newX >= 0 && newX < world.grid.width && newY >= 0 && newY < world.grid.height) {
          const obstacle = world.grid.obstacles.find(o => o.x === newX && o.y === newY);
          if (obstacle) return;
          const enemy = world.getEnemyAt(newX, newY);
          if (enemy && !enemy.isDead) {
            if (player.activeTargetId !== enemy.id) player.setTarget(enemy.id);
          } else {
            InputHandler.requestAction({ type: 'move', dx, dy });
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key.toLowerCase());
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // ---- PixiJS setup ---------------------------------------------------------
  useEffect(() => {
    mountCountRef.current++;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
      }
    };
    syncSize();

    let cancelled = false;

    getPixiApp(canvas)
      .then((app) => {
        if (cancelled) return;
        if (setupDoneRef.current) return;
        setupDoneRef.current = true;

        app.renderer.resize(canvas.width, canvas.height);

        const ro = new ResizeObserver(() => {
          syncSize();
          if (canvas.width > 0 && canvas.height > 0) {
            app.renderer.resize(canvas.width, canvas.height);
          }
        });
        ro.observe(container);

        // Wrapping container for screen shake on player hit
        const gameLayer = new Container();
        app.stage.addChild(gameLayer);

        const floor = createFloorRenderer();
        gameLayer.addChild(floor.container);

        const entities = createEntityRenderer();
        gameLayer.addChild(entities.container);

        // Floating text in screen space (not affected by world/camera transforms)
        const floatingTexts = createFloatingTextRenderer();
        app.stage.addChild(floatingTexts.container);

        // Canvas pointer input — click/hover on entities and tiles
        const world = useWorldStore.getState();
        const cam = createCamera();

        canvasInputCleanupRef.current = setupCanvasInput(
          canvas,
          () => projParamsRef.current!,
          {
            onHoverLoot: (_tile: WorldPoint, lootId: string) => {
              const drop = useWorldStore.getState().lootDrops.find(d => d.id === lootId);
              if (drop && drop.items.length > 0) {
                useTooltipStore.getState().setContent(
                  createElement(ItemTooltip, { item: drop.items[0] }),
                );
              }
            },
            onHoverLootEnd: () => {
              useTooltipStore.getState().setContent(null);
            },
          },
        );
        floor.rebuild(world.grid);
        const gridKey = `${world.grid.width}x${world.grid.height}:${world.grid.obstacles.length}`;
        let lastGridKey = gridKey;

        app.ticker.add(() => {
          const w = useWorldStore.getState();
          const p = usePlayerStore.getState();
          const c = useCombatStore.getState();
          const a = useAppStore.getState();

          if (a.location !== 'dungeon' || a.isPaused) {
            entities.container.visible = false;
            floor.container.visible = false;
            floatingTexts.container.visible = false;
            return;
          }

          entities.container.visible = true;
          floor.container.visible = true;
          floatingTexts.container.visible = true;

          const gridKey2 = `${w.grid.width}x${w.grid.height}:${w.grid.obstacles.length}`;
          if (gridKey2 !== lastGridKey) {
            floor.rebuild(w.grid);
            lastGridKey = gridKey2;
          }

          // Reference-resolution scaling: 720p is the baseline.
          // At 1440p you get 2× the pixels for the same world view.
          // TODO: future options menu will let the player pick from preset zoom levels.
          const cssHeight = app.renderer.height / (window.devicePixelRatio || 1);
          const resScale = cssHeight / 720;
          const gameScale = 1.0 * resScale; // locked to default zoom for now

          const tileSize = BASE_TILE_SIZE * gameScale * DEFAULT_ZOOM;
          const totalTileSize = tileSize + BASE_GAP_SIZE;

          const camResult = cam.update(
            p.position,
            app.renderer.width,
            app.renderer.height,
            tileSize,
            totalTileSize,
          );

          const focusWorldY = (camResult.focusY + 0.5) * tileSize;

          floor.update(
            camResult.panX,
            camResult.panY,
            app.renderer.width,
            app.renderer.height,
            w.grid,
            tileSize,
            w.zones,
            focusWorldY,
          );

          const projParams: ProjectionParams = {
            gridWidth: w.grid.width,
            gridHeight: w.grid.height,
            tileSize,
            viewportWidth: app.renderer.width,
            viewportHeight: app.renderer.height,
            panX: camResult.panX,
            panY: camResult.panY,
            focusWorldY,
            perspectivePx: FLOOR_PERSPECTIVE_PX,
            floorTiltDeg: FLOOR_TILT_DEG,
          };
          projParamsRef.current = projParams;

          const hitEffectIds = new Set<string>(c.hitEffects.map(h => h.targetId));
          const playerHit = c.hitEffects.some(h => h.targetId === 'player');

          // No global screen shake — entities shake individually on hit

          const iconSize = BASE_ICON_SIZE * (tileSize / REF_TILE_SIZE);
          const baseScale = iconSize / TEXTURE_SIZE;

          entities.update(
            projParams,
            baseScale,
            p.position,
            playerHit,
            w.enemies,
            p.activeTargetId,
            w.lootDrops,
            w.grid.obstacles,
            hitEffectIds,
          );

          floatingTexts.update(projParams);
        });
      })
      .catch((err: any) => {
        if (err?.message !== 'Pixi init superseded' && err?.message !== 'Pixi init superseded — canvas changed') {
          console.error('[pixi] init failed:', err);
        }
      });

    return () => {
      cancelled = true;
      mountCountRef.current--;

      // Clean up canvas input listeners
      if (canvasInputCleanupRef.current) {
        canvasInputCleanupRef.current();
        canvasInputCleanupRef.current = null;
      }

      const countBeforeTimeout = mountCountRef.current;
      setTimeout(() => {
        if (mountCountRef.current === countBeforeTimeout && mountCountRef.current <= 0) {
          setupDoneRef.current = false;
          destroyPixiApp();
        }
      }, 0);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        background: '#09090b',
      }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{ display: 'block' }}
      />
    </div>
  );
}
