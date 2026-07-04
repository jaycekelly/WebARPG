import { useRef, useEffect } from 'react';
import { createElement } from 'react';
import { Container, Graphics } from 'pixi.js';
import { getPixiApp, destroyPixiApp } from './pixiApp';
import { createCamera } from './camera';
import { createFloorRenderer } from './systems/renderFloor';
import { createEntityRenderer } from './systems/renderEntities';
import { createFloatingTextRenderer } from './systems/renderFloatingTexts';
import { createTargetingOverlayRenderer } from './systems/renderTargetingOverlay';
import { setupCanvasInput, getClickTarget } from './input/canvasInput';
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
const DEFAULT_ZOOM = 1.2;
const BASE_ICON_SIZE = 32;
const REF_TILE_SIZE = BASE_TILE_SIZE * 0.55;
const TEXTURE_SIZE = 128;

const FLOOR_PERSPECTIVE_PX = 2500;
const FLOOR_TILT_DEG = 52;

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

      let hasMovementKeys = false;
      const movementKeys = ['w','a','s','d','q','e','z','c','arrowup','arrowdown','arrowleft','arrowright'];
      if (movementKeys.includes(key)) hasMovementKeys = true;
      // We no longer trigger movement here to allow continuous sliding when skills are pressed.
      // Movement is now requested every frame in the ticker.
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

        // Targeting range overlay (dims tiles outside effective range)
        const targetingOverlay = createTargetingOverlayRenderer();
        gameLayer.addChild(targetingOverlay.container);

        // Floating text in screen space (not affected by world/camera transforms)
        const floatingTexts = createFloatingTextRenderer();
        app.stage.addChild(floatingTexts.container);

        // Pause overlay — blue tint with pulsing ring, shown during tactical pause
        const pauseOverlay = new Graphics();
        pauseOverlay.visible = false;
        pauseOverlay.zIndex = 9000; // above game, below floating text (9999)
        app.stage.addChild(pauseOverlay);

        // Canvas pointer input — click/hover on entities and tiles
        const world = useWorldStore.getState();
        const cam = createCamera();

        // Per-frame state: which enemy is the mouse currently over
        let hoveredEnemyId: string | null = null;
        let hoveredTile: { x: number, y: number } | null = null;
        let hoveredLootId: string | null = null;

        canvasInputCleanupRef.current = setupCanvasInput(
          canvas,
          () => projParamsRef.current!,
          {
            onHover: (tile: WorldPoint | null) => {
              // Track hovered enemy for target ring display
              if (tile) {
                const target = getClickTarget(tile.gx, tile.gy);
                hoveredEnemyId = target.enemyId;
                hoveredTile = { x: tile.gx, y: tile.gy };
              } else {
                hoveredEnemyId = null;
                hoveredTile = null;
              }
            },
            onHoverLoot: (_tile: WorldPoint, lootId: string) => {
              hoveredLootId = lootId;
              const drop = useWorldStore.getState().lootDrops.find(d => d.id === lootId);
              if (drop && drop.items.length > 0) {
                useTooltipStore.getState().setContent(
                  createElement(ItemTooltip, { item: drop.items[0] }),
                );
              }
            },
            onHoverLootEnd: () => {
              hoveredLootId = null;
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

          if (a.location !== 'dungeon') {
            entities.container.visible = false;
            floor.container.visible = false;
            targetingOverlay.container.visible = false;
            floatingTexts.container.visible = false;
            pauseOverlay.visible = false;
            return;
          }

          // If we were hovering loot, check if it still exists
          if (hoveredLootId) {
            const stillExists = w.lootDrops.some(d => d.id === hoveredLootId);
            if (!stillExists) {
              hoveredLootId = null;
              useTooltipStore.getState().setContent(null);
            }
          }

          // Process held movement keys
          if (!a.isPaused) {
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
              const newX = p.position.x + dx;
              const newY = p.position.y + dy;
              if (newX >= 0 && newX < w.grid.width && newY >= 0 && newY < w.grid.height) {
                const obstacle = w.grid.obstacles.find(o => o.x === newX && o.y === newY);
                if (!obstacle) {
                  const enemy = w.getEnemyAt(newX, newY);
                  if (enemy && !enemy.isDead) {
                    if (p.activeTargetId !== enemy.id) p.setTarget(enemy.id);
                  } else {
                    InputHandler.requestAction({ type: 'move', dx, dy });
                  }
                }
              }
            }
          }

          // All game layers visible in dungeon (even during pause — frozen world)
          entities.container.visible = true;
          floor.container.visible = true;
          targetingOverlay.container.visible = true;
          floatingTexts.container.visible = true;

          // Grid rebuild (skip during pause — grid doesn't change while frozen)
          if (!a.isPaused) {
            const gridKey2 = `${w.grid.width}x${w.grid.height}:${w.grid.obstacles.length}`;
            if (gridKey2 !== lastGridKey) {
              floor.rebuild(w.grid);
              lastGridKey = gridKey2;
            }
          }

          // Camera + projection (safe during pause — purely reactive to player pos)
          const cssHeight = app.renderer.height / (window.devicePixelRatio || 1);
          const resScale = cssHeight / 720;
          const gameScale = 1.0 * resScale;
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

          const iconSize = BASE_ICON_SIZE * (tileSize / REF_TILE_SIZE);
          const baseScale = iconSize / TEXTURE_SIZE;

          // Show hover target ring during targeting mode or tactical pause
          const showHoverRing = !!c.targetingSkillId || a.isPaused;

          if (a.isPaused) {
            // Blue tint over frozen game world — very subtle
            const { width, height } = app.renderer;
            const ringAlpha = 0.15 + 0.15 * (Math.sin(Date.now() / 1200) + 1) / 2;
            pauseOverlay.visible = true;
            pauseOverlay.clear();
            pauseOverlay.rect(0, 0, width, height);
            pauseOverlay.fill({ color: 0x0e3a5c, alpha: 0.06 });
            const rw = 8;
            pauseOverlay.rect(rw / 2, rw / 2, width - rw, height - rw);
            pauseOverlay.fill({ color: 0x0ea5e9, alpha: ringAlpha * 0.15 });
            pauseOverlay.rect(rw / 2, rw / 2, width - rw, height - rw);
            pauseOverlay.stroke({ color: 0x0ea5e9, alpha: ringAlpha, width: rw });

            // Render entities (frozen) with hover target ring support
            entities.update(
              projParams,
              baseScale,
              p.position,
              false, // no player hit effect during pause
              w.enemies,
              p.activeTargetId,
              w.lootDrops,
              w.grid.obstacles,
              new Set(), // no hit effects during pause
              hoveredEnemyId,
              true, // showHoverRing during pause
            );

            // Targeting overlay: still works during pause for skill aiming
            targetingOverlay.update(projParams, p.position, c.targetingSkillId, hoveredTile, w.grid.obstacles);

            // No floating text update during pause
            return;
          }

          pauseOverlay.visible = false;

          const hitEffectIds = new Set<string>(c.hitEffects.map(h => h.targetId));
          const playerHit = c.hitEffects.some(h => h.targetId === 'player');

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
            hoveredEnemyId,
            showHoverRing,
          );

          // Targeting overlay: dim tiles outside effective range
          targetingOverlay.update(projParams, p.position, c.targetingSkillId, hoveredTile, w.grid.obstacles);

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

      // Clear any lingering tooltips from canvas hover
      useTooltipStore.getState().setContent(null);

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
