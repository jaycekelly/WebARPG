import { type ProjectionParams } from '../../engine/world/screenProjection';
import { useWorldStore } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useCombatStore } from '../../store/useCombatStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useAppStore } from '../../store/useAppStore';
import { InputHandler } from '../../engine/input/InputHandler';
import { SKILLS } from '../../data/skills';

// ---- Types -------------------------------------------------------------------

export interface WorldPoint {
  gx: number;
  gy: number;
  sx?: number;
  sy?: number;
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

export const EntityHitboxes = new Map<string, { x: number, y: number, scale: number, zDepth: number, templateId: string }>();

export function getClickTarget(gx: number, gy: number, sx?: number, sy?: number, params?: ProjectionParams): ClickTarget {
  const world = useWorldStore.getState();

  let enemyId: string | null = null;

  if (sx !== undefined && sy !== undefined && params !== undefined) {
    let bestZ = -Infinity;
    
    world.enemies.forEach(e => {
      if (e.isDead) return;
      
      const data = EntityHitboxes.get(`enemy:${e.id}`);
      if (data) {
         // The base texture is 128x128, but icons only occupy the center ~70%.
         // Anchor is at (0.5, 0.85). Lower the center to encompass the shadow.
         let hitBoxHalfWidth = 35 * data.scale;
         let hitBoxHalfHeight = 35 * data.scale;
         let visualCenterY = data.y - (35 * data.scale);
         
         const dx = Math.abs(sx - data.x);
         const dy = Math.abs(sy - visualCenterY);
         
         if (dx <= hitBoxHalfWidth + 20 && dy <= hitBoxHalfHeight + 20) {
            if (data.zDepth > bestZ) {
               bestZ = data.zDepth;
               enemyId = e.id;
            }
         }
      }
    });
  } else {
    const enemy = world.enemies.find(e => e.position.x === gx && e.position.y === gy && !e.isDead);
    if (enemy) enemyId = enemy.id;
  }

  const loot = world.lootDrops.find(d => d.position.x === gx && d.position.y === gy);
  const obstacle = world.grid.obstacles.find(o => o.x === gx && o.y === gy);

  return {
    tile: { gx, gy },
    enemyId: enemyId,
    lootId: loot?.id ?? null,
    isObstacle: !!obstacle,
  };
}

// ---- Action handlers ---------------------------------------------------------

function handleTileClick(target: ClickTarget) {
  const player = usePlayerStore.getState();
  const combat = useCombatStore.getState();
  const app = useAppStore.getState();

  // Only handle clicks when in dungeon or town
  if (app.location !== 'dungeon' && app.location !== 'town') return;

  const { gx, gy } = target.tile;
  const dist = Math.max(Math.abs(player.position.x - gx), Math.abs(player.position.y - gy));

  // ---- Targeting mode: skill target selection ----
  if (combat.targetingSkillId) {
    const skill = SKILLS[combat.targetingSkillId];
    const isStrictTargeting = skill && skill.targeting === 'Single';

    // Clicking an enemy while targeting: target that enemy specifically ONLY if it's a Single-target spell
    if (target.enemyId && dist <= 99 && isStrictTargeting) {
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
    // Clicking any tile (or an enemy with a ground/area spell): use as static ground target
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

  // ---- Obstacle click or empty tile: clear target ----
  player.setTarget(null, true);
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

  const getWorldPos = (e: PointerEvent): WorldPoint | null => {
    const rect = canvas.getBoundingClientRect();
    // Convert page coords to canvas pixel coords (accounting for devicePixelRatio)
    const sx = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const sy = ((e.clientY - rect.top) / rect.height) * canvas.height;
    const pos = unprojectScreenToWorld(sx, sy, getProjectionParams());
    if (!pos) return null;
    return { gx: pos.gx, gy: pos.gy, sx, sy };
  };

  let pointerDownStartX = 0;
  let pointerDownStartY = 0;

  const onPointerDown = (e: PointerEvent) => {
    pointerDown = true;
    pointerMoved = false;
    pointerDownStartX = e.clientX;
    pointerDownStartY = e.clientY;
  };

  const onPointerMove = (e: PointerEvent) => {
    currentClientX = e.clientX;
    currentClientY = e.clientY;

    if (pointerDown) {
      const dx = e.clientX - pointerDownStartX;
      const dy = e.clientY - pointerDownStartY;
      if (Math.abs(dx) > 15 || Math.abs(dy) > 15) {
        pointerMoved = true;
      }
    }

    // Cursor update: crosshair when targeting, pointer over enemies/loot
    const combat = useCombatStore.getState();
    const pos = getWorldPos(e);
    if (pos && combat.targetingSkillId) {
      canvas.style.cursor = '';
    } else if (pos) {
      const target = getClickTarget(pos.gx, pos.gy, pos.sx, pos.sy, getProjectionParams());
      canvas.style.cursor = target.enemyId || target.lootId ? 'pointer' : '';
    } else {
      canvas.style.cursor = '';
    }

    if (callbacks?.onHover) {
      callbacks.onHover(pos);
    }

    // Tooltip: show when hovering over loot
    if (pos) {
      const target = getClickTarget(pos.gx, pos.gy, pos.sx, pos.sy, getProjectionParams());
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

    const target = getClickTarget(pos.gx, pos.gy, pos.sx, pos.sy, getProjectionParams());
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
