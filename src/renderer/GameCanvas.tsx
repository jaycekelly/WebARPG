import { useRef, useEffect } from 'react';
import { createElement } from 'react';
import { Container, Graphics } from 'pixi.js';
import { getPixiApp, destroyPixiApp } from './pixiApp';
import { createCamera } from './camera';
import { createFloorRenderer } from './systems/renderFloor';
import { createEntityRenderer } from './systems/renderEntities';
import { createBoundaryWallRenderer } from './systems/renderBoundaryWalls';
import { createFloatingTextRenderer } from './systems/renderFloatingTexts';
import { createTileVfxRenderer } from './systems/renderTileVfx';
import { createParticleRenderer } from './systems/renderParticles';
import { createFogRenderer } from './systems/renderFog';
import { setupCanvasInput, getClickTarget, unprojectScreenToWorld, getCurrentPointerClientCoords } from './input/canvasInput';
import { useWorldStore } from '../store/useWorldStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useCombatStore } from '../store/useCombatStore';
import { useAppStore } from '../store/useAppStore';
import { useVisionStore } from '../store/useVisionStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { ItemTooltip } from '../components/ItemTooltip';
import { InputHandler } from '../engine/input/InputHandler';
import type { ProjectionParams } from '../engine/world/screenProjection';


const BASE_TILE_SIZE = 72;
const BASE_GAP_SIZE = 0;
const DEFAULT_ZOOM = 1.0;
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
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(cw * dpr);
      const h = Math.round(ch * dpr);
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w;
        canvas.height = h;
        canvas.style.width = cw + 'px';
        canvas.style.height = ch + 'px';
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

        const fog = createFogRenderer();
        gameLayer.addChild(fog.container);

        const boundaryWalls = createBoundaryWallRenderer();
        gameLayer.addChild(boundaryWalls.container);

        const entities = createEntityRenderer();
        gameLayer.addChild(entities.container);

        const tileVfx = createTileVfxRenderer();
        gameLayer.addChild(tileVfx.container);

        // Entity UI layer (health bars, target rings) on top of lighting/overlays
        gameLayer.addChild(entities.uiContainer);

        const particles = createParticleRenderer();
        gameLayer.addChild(particles.container);

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
        );
        floor.rebuild(world.grid);
        boundaryWalls.rebuild(world.grid);
        const gridKey = `${world.grid.width}x${world.grid.height}:${world.grid.obstacles.length}`;
        let lastGridKey = gridKey;
        
        let processedHitIds = new Set<string>();

        app.ticker.add((ticker) => {
          const w = useWorldStore.getState();
          const p = usePlayerStore.getState();
          const c = useCombatStore.getState();
          const a = useAppStore.getState();

          if (a.location !== 'dungeon') {
            entities.container.visible = false;
            floor.container.visible = false;
            boundaryWalls.container.visible = false;
            tileVfx.container.visible = false;
            fog.container.visible = false;
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
          boundaryWalls.container.visible = true;
          tileVfx.container.visible = true;
          fog.container.visible = true;
          floatingTexts.container.visible = true;

          // Grid rebuild (skip during pause — grid doesn't change while frozen)
          if (!a.isPaused) {
            const gridKey2 = `${w.grid.width}x${w.grid.height}:${w.grid.obstacles.length}`;
            if (gridKey2 !== lastGridKey) {
              floor.rebuild(w.grid);
              boundaryWalls.rebuild(w.grid);
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
            ticker.deltaMS / 1000,
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

          // Re-evaluate mouse position with current camera to keep targeting tight even if mouse doesn't move
          const ptr = getCurrentPointerClientCoords();
          if (ptr.x !== null && ptr.y !== null) {
            const rect = canvas.getBoundingClientRect();
            const sx = ((ptr.x - rect.left) / rect.width) * canvas.width;
            const sy = ((ptr.y - rect.top) / rect.height) * canvas.height;
            const worldPos = unprojectScreenToWorld(sx, sy, projParams);
            if (worldPos) {
              hoveredTile = { x: worldPos.gx, y: worldPos.gy };
              const target = getClickTarget(worldPos.gx, worldPos.gy);
              hoveredEnemyId = target.enemyId;
              
              if (target.lootId !== hoveredLootId) {
                hoveredLootId = target.lootId;
                if (hoveredLootId) {
                  const drop = w.lootDrops.find(d => d.id === hoveredLootId);
                  if (drop && drop.items.length > 0) {
                    useTooltipStore.getState().setContent(
                      createElement(ItemTooltip, { item: drop.items[0] })
                    );
                  } else {
                    useTooltipStore.getState().setContent(null);
                  }
                } else {
                  useTooltipStore.getState().setContent(null);
                }
              }

              if (c.targetingSkillId) {
                canvas.style.cursor = '';
              } else {
                canvas.style.cursor = (target.enemyId || target.lootId) ? 'pointer' : '';
              }
            } else {
              hoveredTile = null;
              hoveredEnemyId = null;
              if (hoveredLootId !== null) {
                hoveredLootId = null;
                useTooltipStore.getState().setContent(null);
              }
              canvas.style.cursor = '';
            }
          } else {
             if (hoveredLootId !== null) {
                hoveredLootId = null;
                useTooltipStore.getState().setContent(null);
             }
          }

          const vs = useVisionStore.getState();
          fog.update(
            projParams.panX,
            projParams.panY,
            canvas.width,
            canvas.height,
            w.grid,
            tileSize,
            focusWorldY,
            vs.exploredTiles,
            vs.visibleTiles,
            p.position,
            w.lootDrops
          );
          boundaryWalls.update(
            projParams.panX,
            projParams.panY,
            canvas.width,
            canvas.height,
            w.grid,
            tileSize,
            focusWorldY,
            p.position,
            w.lootDrops,
            vs.visibleTiles
          );

          const iconSize = BASE_ICON_SIZE * (tileSize / REF_TILE_SIZE);
          const baseScale = iconSize / TEXTURE_SIZE;

          if (a.isPaused) {
            // Cinematic "Time Freeze" overlay
            const { width, height } = app.renderer;
            pauseOverlay.visible = true;
            pauseOverlay.clear();
            
            // Very subtle dark blue tint to freeze the world (clearer visibility)
            pauseOverlay.rect(0, 0, width, height);
            pauseOverlay.fill({ color: 0x05131e, alpha: 0.25 });

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
              [], // no hit effects during pause
              hoveredEnemyId,
              vs.visibleTiles,
            );

            // Targeting overlay: still works during pause for skill aiming
            tileVfx.update(projParams, p.position, c.targetingSkillId, hoveredTile, w.grid.obstacles);

            // No floating text update during pause
            return;
          }

          pauseOverlay.visible = false;

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
            c.hitEffects,
            hoveredEnemyId,
            vs.visibleTiles,
          );

          // Targeting overlay: dim tiles outside effective range
          tileVfx.update(projParams, p.position, c.targetingSkillId, hoveredTile, w.grid.obstacles);

          // Particles
          const currentHitIds = new Set<string>();
          for (const h of c.hitEffects) {
             currentHitIds.add(h.id);
             if (!processedHitIds.has(h.id)) {
                processedHitIds.add(h.id);
                // Spawn particles at target location
                let tx = 0, ty = 0;
                if (h.targetId === 'player') {
                   tx = p.position.x; ty = p.position.y;
                } else {
                   const enemy = w.enemies.find(e => e.id === h.targetId);
                   if (enemy) { tx = enemy.position.x; ty = enemy.position.y; }
                }
                
                const pType = h.damageType ? h.damageType.toLowerCase() : 'physical';
                particles.spawn(tx, ty, 0, h.color, pType, 1, h.targetId, h.sourceX, h.sourceY);
             }
          }
          // Clean up old hit ids
          for (const id of processedHitIds) {
             if (!currentHitIds.has(id)) processedHitIds.delete(id);
          }
          
          particles.update(projParams);

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
        background: '#000000',
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
