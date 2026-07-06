import type { ProjectionParams } from '../../engine/world/screenProjection';
import { useWorldStore } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useCombatStore } from '../../store/useCombatStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useAppStore } from '../../store/useAppStore';
import { InputHandler } from '../../engine/input/InputHandler';

// ---- Types -------------------------------------------------------------------

export interface WorldPoint {
  gx: number;
  gy: number;
}

export interface ClickTarget {
  /** The grid tile clicked (always set if within bounds) */
  tile: WorldPoint;
  /** Enemy on this tile, if any and alive */
  enemyId: string | null;
  /** Loot drop on this tile, if any */
  lootId: string | null;
  /** Whether this tile has an obstacle */
  isObstacle: boolean;
}

// ---- Reverse projection ------------------------------------------------------

/**
 * Convert screen pixel coordinates back to world grid coordinates.
 * Reverses the perspective projection from projectTileToScreen.
 * Returns null if the point is outside the grid or can't be resolved.
 */
export function unprojectScreenToWorld(
  screenX: number,
  screenY: number,
  params: ProjectionParams,
): WorldPoint | null {
  const {
    gridWidth,
    gridHeight,
    tileSize,
    viewportWidth,
    viewportHeight,
    panX,
    panY,
    focusWorldY,
    perspectivePx,
    floorTiltDeg,
  } = params;

  const tiltRad = (floorTiltDeg * Math.PI) / 180;
  const cosTilt = Math.cos(tiltRad);
  const sinTilt = Math.sin(tiltRad);

  const originX = viewportWidth * 0.5;
  const originY = viewportHeight * 0.1;

  const dY = screenY - originY;

  // Solve for ry: ry = P * (dY - A) / (dY * sinT + P * cosT)
  // where A = focusWorldY + panY - originY (matches forward projection)
  const A = focusWorldY + panY - originY;
  const denominator = dY * sinTilt + perspectivePx * cosTilt;

  // Prevent division by zero (would mean we're looking edge-on — shouldn't happen)
  if (Math.abs(denominator) < 0.001) return null;

  const ry = (perspectivePx * (dY - A)) / denominator;

  // Compute scale at this depth
  const z3d = ry * sinTilt;
  const denomZ = perspectivePx - z3d;
  if (Math.abs(denomZ) < 0.001) return null;
  const scale = perspectivePx / denomZ;

  // Solve for fx (x-axis in world space)
  const dX = screenX - originX;
  const fx = dX / scale + originX - panX;

  // Convert world-space back to grid coords
  const gxFrac = fx / tileSize - 0.5;
  const gyFrac = (ry + focusWorldY) / tileSize - 0.5;

  const gx = Math.round(gxFrac);
  const gy = Math.round(gyFrac);

  // Clamp to grid bounds — use floor/ceil to check actual extent
  if (gx < -0.5 || gx > gridWidth - 0.5 || gy < -0.5 || gy > gridHeight - 0.5) {
    return null;
  }

  // Snap into valid range
  const clampedX = Math.max(0, Math.min(gridWidth - 1, gx));
  const clampedY = Math.max(0, Math.min(gridHeight - 1, gy));

  return { gx: clampedX, gy: clampedY };
}

// ---- Hit testing -------------------------------------------------------------

export function getClickTarget(gx: number, gy: number): ClickTarget {
  const world = useWorldStore.getState();

  const enemy = world.enemies.find(e => e.position.x === gx && e.position.y === gy && !e.isDead);
  const loot = world.lootDrops.find(d => d.position.x === gx && d.position.y === gy);
  const obstacle = world.grid.obstacles.find(o => o.x === gx && o.y === gy);

  return {
    tile: { gx, gy },
    enemyId: enemy?.id ?? null,
    lootId: loot?.id ?? null,
    isObstacle: !!obstacle,
  };
}

// ---- Action handlers ---------------------------------------------------------

function handleTileClick(target: ClickTarget) {
  const player = usePlayerStore.getState();
  const combat = useCombatStore.getState();
  const app = useAppStore.getState();

  // Only handle clicks when in dungeon
  if (app.location !== 'dungeon') return;

  const { gx, gy } = target.tile;
  const dist = Math.max(Math.abs(player.position.x - gx), Math.abs(player.position.y - gy));

  // ---- Targeting mode: skill target selection ----
  if (combat.targetingSkillId) {
    // Clicking an enemy while targeting: target that enemy specifically
    if (target.enemyId && dist <= 99) {
      // Range check is handled inside executeAction
      InputHandler.requestAction({
        type: 'skill',
        skillId: combat.targetingSkillId,
        targetPos: { x: gx, y: gy },
        targetId: target.enemyId,
      });
      combat.setTargetingSkill(null);
      return;
    }
    // Clicking any tile: use as ground target
    InputHandler.requestAction({
      type: 'skill',
      skillId: combat.targetingSkillId,
      targetPos: { x: gx, y: gy },
    });
    combat.setTargetingSkill(null);
    return;
  }

  // ---- Enemy click: target it ----
  if (target.enemyId) {
    if (player.activeTargetId !== target.enemyId) {
      player.setTarget(target.enemyId);
    } else {
      // Clicking already-targeted enemy: untarget
      player.setTarget(null, true);
    }
    return;
  }

  // ---- Loot click: pick up if adjacent ----
  if (target.lootId) {
    const drop = useWorldStore.getState().lootDrops.find(l => l.id === target.lootId);
    if (drop && dist <= 1) {
      const inventory = useInventoryStore.getState();
      const { removeLootDrop } = useWorldStore.getState();
      if (drop.items.length === 1) {
        inventory.lootItem(drop.items[0]);
        removeLootDrop(drop.id);
      } else {
        useAppStore.getState().setSelectedLootDropId(target.lootId);
      }
    } else if (drop && dist > 1) {
      combat.addLog('You must get closer to loot that.', 'system');
    }
    return;
  }

  // ---- Obstacle click or empty tile: ignore ----
}

// ---- Canvas event binding ----------------------------------------------------

let currentClientX: number | null = null;
let currentClientY: number | null = null;

export function getCurrentPointerClientCoords() {
  return { x: currentClientX, y: currentClientY };
}

export interface CanvasInputCallbacks {
  /** Called when a click lands on a valid grid tile */
  onClick?: (target: ClickTarget) => void;
  /** Called when the pointer moves and hovers over a grid tile */
  onHover?: (tile: WorldPoint | null) => void;
  /** Called when hovering over a loot tile with the item data */
  onHoverLoot?: (tile: WorldPoint, lootId: string) => void;
  /** Called when no longer hovering over any loot */
  onHoverLootEnd?: () => void;
}

/**
 * Attach pointer event listeners to the PixiJS canvas.
 * Returns a cleanup function that removes the listeners.
 */
export function setupCanvasInput(
  canvas: HTMLCanvasElement,
  getProjectionParams: () => ProjectionParams,
  callbacks?: CanvasInputCallbacks,
): () => void {
  let pointerDown = false;
  let pointerMoved = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  const getWorldPos = (e: PointerEvent): WorldPoint | null => {
    const rect = canvas.getBoundingClientRect();
    // Convert page coords to canvas pixel coords (accounting for devicePixelRatio)
    const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return unprojectScreenToWorld(sx, sy, getProjectionParams());
  };

  const onPointerDown = (e: PointerEvent) => {
    pointerDown = true;
    pointerMoved = false;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
  };

  const onPointerMove = (e: PointerEvent) => {
    currentClientX = e.clientX;
    currentClientY = e.clientY;

    if (pointerDown) {
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        pointerMoved = true;
      }
    }

    // Cursor update: crosshair when targeting, pointer over enemies/loot
    const combat = useCombatStore.getState();
    const pos = getWorldPos(e);
    if (pos && combat.targetingSkillId) {
      canvas.style.cursor = '';
    } else if (pos) {
      const target = getClickTarget(pos.gx, pos.gy);
      canvas.style.cursor = target.enemyId || target.lootId ? 'pointer' : '';
    } else {
      canvas.style.cursor = '';
    }

    if (callbacks?.onHover) {
      callbacks.onHover(pos);
    }

    // Tooltip: show when hovering over loot
    if (pos) {
      const target = getClickTarget(pos.gx, pos.gy);
      if (target.lootId && callbacks?.onHoverLoot) {
        callbacks.onHoverLoot(pos, target.lootId);
      } else if (callbacks?.onHoverLootEnd) {
        callbacks.onHoverLootEnd();
      }
    } else if (callbacks?.onHoverLootEnd) {
      callbacks.onHoverLootEnd();
    }
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!pointerDown) return;
    pointerDown = false;

    // Only treat as click if pointer didn't move much
    if (pointerMoved) return;

    const pos = getWorldPos(e);
    if (!pos) return;

    const target = getClickTarget(pos.gx, pos.gy);
    if (callbacks?.onClick) {
      callbacks.onClick(target);
    } else {
      handleTileClick(target);
    }
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);

  return () => {
    canvas.removeEventListener('pointerdown', onPointerDown);
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerup', onPointerUp);
  };
}
