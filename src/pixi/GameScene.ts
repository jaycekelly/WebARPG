/**
 * GameScene.ts — Root orchestrator for the PixiJS perspective grid.
 *
 * Reads Zustand store state on every ticker tick (via getState()) and:
 *   1. Updates the perspective camera (dead-zone tracking the player)
 *   2. Rebuilds the floor when the grid changes
 *   3. Redraws all entities (Y-sorted standees)
 *   4. Computes & passes AoE preview tiles to FloorScene
 *   5. Updates floating combat text via EffectsScene
 *
 * Keyboard input is handled here; click / hover interaction is handled in
 * PixiGrid.tsx which forwards normalised canvas-local coordinates via
 * handlePointerDown / handlePointerMove.
 */

import { Application, Container, type Ticker } from 'pixi.js';
import { FloorScene }  from './scenes/FloorScene';
import { EntityScene } from './scenes/EntityScene';
import { EffectsScene } from './scenes/EffectsScene';
import {
  tileFloor, screenToGrid, setWorldPivotX, TILE_W,
} from './perspMath';

import { usePlayerStore }    from '../store/usePlayerStore';
import { useWorldStore }     from '../store/useWorldStore';
import { useCombatStore }    from '../store/useCombatStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useAppStore }       from '../store/useAppStore';
import { InputHandler }      from '../engine/input/InputHandler';
import { SKILLS }            from '../data/skills';
import { getAoETiles, hasLineOfSight } from '../engine/world/gridMath';
import type { Point } from '../engine/world/gridMath';

const DEADZONE      = 2.0;
const DEADZONE_MAN  = 3.0;
const ZOOM_DEFAULT  = 0.55;
const ZOOM_MIN      = 0.10;   // allow zooming way out
const ZOOM_MAX      = 1.50;
const ZOOM_STEP     = 0.05;

export class GameScene {
  // PixiJS objects
  private worldContainer = new Container();
  private floorScene!:    FloorScene;
  private entityScene!:   EntityScene;
  private effectsScene!:  EffectsScene;

  // Camera
  private cameraFocus = { x: 5, y: 5 };
  private zoom        = ZOOM_DEFAULT;

  // Interaction state
  private hoveredCell: Point | null = null;
  private prevGridKey = '';          // detects grid changes
  private pressedKeys = new Set<string>();

  private app: Application;
  constructor(app: Application) { this.app = app; }

  // ---------------------------------------------------------------------------
  async init(): Promise<void> {
    this.app.stage.addChild(this.worldContainer);

    this.floorScene  = new FloorScene(this.worldContainer);
    this.entityScene = new EntityScene(this.worldContainer);
    this.effectsScene = new EffectsScene(this.worldContainer);

    // Camera to player start
    const grid = useWorldStore.getState().grid;
    this.floorScene.setGrid(grid); // store grid data for per-frame rebuild

    const pos = usePlayerStore.getState().position;
    this.cameraFocus = { x: pos.x, y: pos.y };

    this.attachKeyboard();
  }

  // ---------------------------------------------------------------------------
  update(ticker: Ticker): void {
    const dt = ticker.deltaTime;
    void dt; // not used for discrete grid movement but available for animations

    const playerState  = usePlayerStore.getState();
    const worldState   = useWorldStore.getState();
    const combatState  = useCombatStore.getState();
    const appState     = useAppStore.getState();
    const { grid }     = worldState;

    // -- Update grid if it changed --------------------------------------------
    const gridKey = `${grid.width}x${grid.height}:${grid.obstacles.length}`;
    if (gridKey !== this.prevGridKey) {
      this.prevGridKey = gridKey;
      this.floorScene.setGrid(grid);
    }

    // -- Camera dead-zone tracking --------------------------------------------
    if (playerState.cameraMode === 'auto') {
      const pp = playerState.position;
      let { x: fx, y: fy } = this.cameraFocus;
      const dx = pp.x - fx, dy = pp.y - fy;
      if (Math.abs(dx) > DEADZONE) fx += Math.sign(dx) * (Math.abs(dx) - DEADZONE);
      if (Math.abs(dy) > DEADZONE) fy += Math.sign(dy) * (Math.abs(dy) - DEADZONE);
      const excess = (Math.abs(pp.x - fx) + Math.abs(pp.y - fy)) - DEADZONE_MAN;
      if (excess > 0) {
        const ndx = pp.x - fx, ndy = pp.y - fy;
        fx += Math.sign(ndx) * (excess / 2);
        fy += Math.sign(ndy) * (excess / 2);
      }
      this.cameraFocus = { x: fx, y: fy };
    }

    // -- Set perspective pivot to camera centre (MUST happen before any projection) --
    setWorldPivotX((this.cameraFocus.x + 0.5) * TILE_W);

    // -- Apply camera + zoom --------------------------------------------------
    this.worldContainer.scale.set(this.zoom);
    // After setting the pivot, tileFloor(cameraFocus) returns sx=0 (pivot = camera)
    const focus = tileFloor(this.cameraFocus.x, this.cameraFocus.y);
    const vpW   = this.app.screen.width;
    const vpH   = this.app.screen.height;
    this.worldContainer.x = vpW * 0.50;          // focus.sx is always 0, so centre = vpW/2
    // 0.30: horizon appears ~30% from top; player appears below the midpoint
    this.worldContainer.y = vpH * 0.30 - focus.sy * this.zoom;

    // -- Rebuild floor (must happen after pivot is set) -----------------------
    this.floorScene.rebuild();

    // -- AoE preview ----------------------------------------------------------
    let previewIn:  Point[] = [];
    let previewOut: Point[] = [];
    const { targetingSkillId, hoveredSkillId } = combatState;
    const activeId = targetingSkillId || hoveredSkillId;
    if (activeId && SKILLS[activeId]) {
      const skill    = SKILLS[activeId];
      const pp       = playerState.position;
      const isSolid  = (x: number, y: number) =>
        x < 0 || x >= grid.width || y < 0 || y >= grid.height ||
        grid.obstacles.some(o => o.x === x && o.y === y);

      if (skill.targeting === 'Self' && skill.aoeParams) {
        previewIn = getAoETiles(pp, null, skill.aoeParams.shape, skill.aoeParams.radius,
          skill.aoeParams.respectWalls ?? false, isSolid, grid.width, grid.height);
      } else if (this.hoveredCell) {
        const hc  = this.hoveredCell;
        const eff = skill.range > 0
          ? skill.range
          : (useInventoryStore.getState().equipment['weapon1']?.weaponRange ?? 1);
        const inRange = Math.max(Math.abs(pp.x - hc.x), Math.abs(pp.y - hc.y)) <= eff;

        if (inRange) {
          let center: Point = hc, target: Point | null = null;
          if (skill.targeting === 'Directional') { center = pp; target = hc; }
          previewIn = skill.aoeParams
            ? getAoETiles(center, target, skill.aoeParams.shape, skill.aoeParams.radius,
                skill.aoeParams.respectWalls ?? false, isSolid, grid.width, grid.height)
            : [hc];
        } else {
          previewOut = getAoETiles(pp, null, 'square', eff, false, () => false, grid.width, grid.height);
        }
      }
    }

    this.floorScene.updateHighlights(previewIn, previewOut);
    if (this.hoveredCell) this.floorScene.highlightHovered(this.hoveredCell.x, this.hoveredCell.y);

    // -- Entities -------------------------------------------------------------
    const now       = Date.now();
    const hitIds    = new Set(
      combatState.hitEffects.filter(h => h.expiresAt > now).map(h => h.targetId)
    );
    const playerHit = hitIds.has('player');

    this.entityScene.update({
      playerPos:  playerState.position,
      playerHit,
      enemies:    worldState.enemies,
      lootDrops:  worldState.lootDrops,
      obstacles:  grid.obstacles,
      targetedId: playerState.activeTargetId,
      hitIds,
      gridW:      grid.width,
      gridH:      grid.height,
    });

    // -- Floating text --------------------------------------------------------
    this.effectsScene.update(combatState.floatingTexts);

    // -- Paused overlay (dim the world container) -----------------------------
    this.worldContainer.alpha = appState.isPaused ? 0.5 : 1;
  }

  // ---------------------------------------------------------------------------
  // Interaction — called from PixiGrid event handlers
  // ---------------------------------------------------------------------------

  handleWheel(deltaY: number): void {
    this.zoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, this.zoom - Math.sign(deltaY) * ZOOM_STEP));
  }

  handlePointerMove(screenX: number, screenY: number): void {
    const local = this.screenToLocal(screenX, screenY);
    const grid  = screenToGrid(local.x, local.y);
    const { width, height } = useWorldStore.getState().grid;
    if (grid && grid.x >= 0 && grid.x < width && grid.y >= 0 && grid.y < height) {
      this.hoveredCell = grid;
    } else {
      this.hoveredCell = null;
    }
  }

  handlePointerDown(screenX: number, screenY: number, button: number): void {
    if (button !== 0) return; // left-click only
    const local = this.screenToLocal(screenX, screenY);
    const grid  = screenToGrid(local.x, local.y);
    if (!grid) return;

    const { grid: map, enemies, lootDrops, removeLootDrop } = useWorldStore.getState();
    const { setTarget, activeTargetId }                     = usePlayerStore.getState();
    const { targetingSkillId, setTargetingSkill, addLog }   = useCombatStore.getState();
    const { x, y } = grid;

    if (x < 0 || x >= map.width || y < 0 || y >= map.height) return;

    // Skill targeting click
    if (targetingSkillId) {
      const skill  = SKILLS[targetingSkillId];
      const pp     = usePlayerStore.getState().position;
      const eff    = skill?.range > 0
        ? skill.range
        : (useInventoryStore.getState().equipment['weapon1']?.weaponRange ?? 1);
      if (skill && Math.max(Math.abs(pp.x - x), Math.abs(pp.y - y)) > eff) {
        addLog('Target area is out of range.', 'system');
        return;
      }
      const isSolid = (sx: number, sy: number) =>
        sx < 0 || sx >= map.width || sy < 0 || sy >= map.height ||
        map.obstacles.some(o => o.x === sx && o.y === sy);
      if (skill && !hasLineOfSight(pp, { x, y }, isSolid)) {
        addLog('Target is not in line of sight.', 'system');
        return;
      }
      InputHandler.requestAction({ type: 'skill', skillId: targetingSkillId, targetPos: { x, y } });
      setTargetingSkill(null);
      return;
    }

    // Enemy click
    const enemy = enemies.find(e => e.position.x === x && e.position.y === y && !e.isDead);
    if (enemy) {
      if (activeTargetId !== enemy.id) setTarget(enemy.id);
      return;
    }

    // Loot click
    const drop = lootDrops.find(l => l.position.x === x && l.position.y === y);
    if (drop) {
      const pp = usePlayerStore.getState().position;
      if (Math.abs(pp.x - x) <= 1 && Math.abs(pp.y - y) <= 1) {
        // Auto-collect all items from this drop
        const { lootItem } = usePlayerStore.getState() as any;
        for (const item of drop.items) {
          if (typeof lootItem === 'function') lootItem(item);
          else useInventoryStore.getState().lootItem(item);
        }
        removeLootDrop(drop.id);
        addLog(`Picked up ${drop.items.length} item(s).`, 'system');
      } else {
        addLog('Move closer to pick up items.', 'system');
      }
      return;
    }

    // Empty tile click — deselect target
    if (!map.obstacles.find(o => o.x === x && o.y === y)) {
      setTarget(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Keyboard
  // ---------------------------------------------------------------------------
  private attachKeyboard(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toLowerCase();
      this.pressedKeys.add(key);

      if (useAppStore.getState().isPaused) {
        const move = ['w','a','s','d','q','e','z','c','arrowup','arrowdown','arrowleft','arrowright'];
        if (move.includes(key)) return;
      }

      // Zoom shortcuts (= / + to zoom in, - to zoom out)
      if (key === '=' || key === '+') {
        this.zoom = Math.min(ZOOM_MAX, this.zoom + ZOOM_STEP);
        return;
      }
      if (key === '-') {
        this.zoom = Math.max(ZOOM_MIN, this.zoom - ZOOM_STEP);
        return;
      }

      let dx = 0, dy = 0;

      if (this.pressedKeys.has('w') || this.pressedKeys.has('arrowup'))    dy -= 1;
      if (this.pressedKeys.has('s') || this.pressedKeys.has('arrowdown'))  dy += 1;
      if (this.pressedKeys.has('a') || this.pressedKeys.has('arrowleft'))  dx -= 1;
      if (this.pressedKeys.has('d') || this.pressedKeys.has('arrowright')) dx += 1;
      if (this.pressedKeys.has('q')) { dx -= 1; dy -= 1; }
      if (this.pressedKeys.has('e')) { dx += 1; dy -= 1; }
      if (this.pressedKeys.has('z')) { dx -= 1; dy += 1; }
      if (this.pressedKeys.has('c')) { dx += 1; dy += 1; }
      dx = Math.sign(dx); dy = Math.sign(dy);

      if (dx !== 0 || dy !== 0) {
        const { position, setTarget } = usePlayerStore.getState();
        const { grid }                = useWorldStore.getState();
        const nx = position.x + dx, ny = position.y + dy;
        if (nx >= 0 && nx < grid.width && ny >= 0 && ny < grid.height) {
          const obstacle = grid.obstacles.find(o => o.x === nx && o.y === ny);
          if (!obstacle) {
            const enemy = useWorldStore.getState().getEnemyAt(nx, ny);
            if (enemy && !enemy.isDead) {
              if (usePlayerStore.getState().activeTargetId !== enemy.id) setTarget(enemy.id);
            } else {
              InputHandler.requestAction({ type: 'move', dx, dy });
            }
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => this.pressedKeys.delete(e.key.toLowerCase());
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    // Store cleanup refs on the instance for destroy()
    (this as any)._onKeyDown = onKeyDown;
    (this as any)._onKeyUp   = onKeyUp;
  }

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------
  private screenToLocal(screenX: number, screenY: number) {
    return {
      x: (screenX - this.worldContainer.x) / this.zoom,
      y: (screenY - this.worldContainer.y) / this.zoom,
    };
  }

  setZoom(z: number): void { this.zoom = z; }

  destroy(): void {
    window.removeEventListener('keydown', (this as any)._onKeyDown);
    window.removeEventListener('keyup',   (this as any)._onKeyUp);
    this.floorScene.destroy();
    this.entityScene.destroy();
    this.effectsScene.destroy();
    this.worldContainer.destroy({ children: true });
  }
}
