import { useEffect, useState, useRef, memo, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlayerStore } from '../store/usePlayerStore';
import { InputHandler } from '../engine/input/InputHandler';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { useAppStore } from '../store/useAppStore';
import { getAoETiles, hasLineOfSight } from '../engine/world/gridMath';
import type { Point } from '../engine/world/gridMath';
import { SKILLS } from '../data/skills';
import { LootPile } from './LootPile';
import { LootPopup } from './LootPopup';
import { GridHealthBar } from './GridHealthBar';
import { Ghost, User, Trees, Mountain, Flower2, Sprout } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BASE_TILE_SIZE = 72; // px
const BASE_GAP_SIZE = 1;  // px

// --- Fake-3D floor perspective ---
// Applied to the `.floor-plane` element only — existing camera math
// (pan, clamp, auto-follow) keeps working in flat screen pixels.
// FLOOR_PERSPECTIVE_PX : lower = more dramatic distortion
// FLOOR_TILT_DEG       : higher = steeper / more top-down floor
const FLOOR_PERSPECTIVE_PX = 1400;
const FLOOR_TILT_DEG = 50;
const FLOOR_COUNTER_TILT = `rotateX(-${FLOOR_TILT_DEG}deg)`;

// --- Decorative tile scatter ---
// Cheap deterministic hash: same (x, y) always produces the same value,
// no state needed.
function hashTile(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

const TILE_DECOR = [
  { icon: Flower2, color: 'text-pink-400/50' },
  { icon: Sprout,  color: 'text-emerald-500/50' },
] as const;
const TILE_DECOR_CHANCE = 10; // out of 100 (≈1-in-10 empty tiles)

const DEADZONE_RADIUS    = 2.0;
const DEADZONE_MANHATTAN = 3.0; // Crops corners of the square deadzone

// ---------------------------------------------------------------------------
// Sub-components — each memo'd to isolate re-renders
// ---------------------------------------------------------------------------

const PlayerSprite = memo(() => {
  const position  = usePlayerStore(state => state.position);
  const setTarget = usePlayerStore(state => state.setTarget);
  const hitEffect = useCombatStore(state => state.hitEffects.find(h => h.targetId === 'player'));

  return (
    <div
      style={{ gridColumn: position.x + 1, gridRow: position.y + 1 }}
      className={cn(
        'relative z-20 pointer-events-auto cursor-pointer bg-emerald-500/10',
        hitEffect && 'animate-shake'
      )}
      onClick={() => setTarget(null)}
    >
      {/* Anchored at the tile's bottom-centre; counter-rotates so sprite stands upright */}
      <div
        className="standing-sprite absolute bottom-0 left-1/2 flex flex-col items-center"
        style={{ transform: `translateX(-50%) ${FLOOR_COUNTER_TILT}` }}
      >
        <User
          key={hitEffect?.id || 'idle'}
          size={38}
          className={cn(
            'text-emerald-500 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]',
            hitEffect && 'text-white drop-shadow-none brightness-200'
          )}
          style={{ transform: 'translateY(-30%)' }}
        />
        {/* Elliptical shadow on the floor — the key to the standee illusion */}
        <div className="w-8 h-2 bg-black/55 rounded-full blur-[3px] -mt-1" />
      </div>
    </div>
  );
});

const EnemySprite = memo(({ id }: { id: string }) => {
  const enemy          = useWorldStore(useCallback(state => state.enemies.find(e => e.id === id), [id]));
  const isTargeted     = usePlayerStore(state => state.activeTargetId === id);
  const setTarget      = usePlayerStore(state => state.setTarget);
  const targetingSkillId = useCombatStore(state => state.targetingSkillId);
  const hitEffect      = useCombatStore(state => state.hitEffects.find(h => h.targetId === id));

  if (!enemy || enemy.isDead) return null;

  const cursorClass = targetingSkillId ? 'cursor-crosshair' : 'cursor-pointer';

  return (
    <div
      style={{ gridColumn: enemy.position.x + 1, gridRow: enemy.position.y + 1 }}
      className={cn(
        'relative z-20 pointer-events-auto',
        cursorClass,
        isTargeted && 'ring-2 ring-red-500 ring-inset bg-red-500/20',
        hitEffect  && 'animate-shake'
      )}
      onClick={() => { if (!targetingSkillId) setTarget(id); }}
    >
      <div
        className="standing-sprite absolute bottom-0 left-1/2 flex flex-col items-center"
        style={{ transform: `translateX(-50%) ${FLOOR_COUNTER_TILT}` }}
      >
        {/* Health bar floats above the sprite */}
        <GridHealthBar currentHealth={enemy.health} maxHealth={enemy.stats.maxHealth} />
        <Ghost
          key={hitEffect?.id || 'idle'}
          size={38}
          className={cn(
            'text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.6)]',
            isTargeted && 'animate-pulse',
            hitEffect  && 'text-white drop-shadow-none brightness-200'
          )}
          style={{ transform: 'translateY(-20%)' }}
        />
        {/* Elliptical shadow on the floor */}
        <div className="w-8 h-2 bg-black/55 rounded-full blur-[3px] -mt-1" />
      </div>
    </div>
  );
});

const EnemyLayer = memo(() => {
  // Only re-renders when the enemy list changes (spawn/death), NOT on stat changes
  const enemies = useWorldStore(useShallow(state => state.enemies.map(e => e.id)));
  return <>{enemies.map(id => <EnemySprite key={id} id={id} />)}</>;
});

const LootSprite = memo(({ dropId, onClick }: { dropId: string; onClick: () => void }) => {
  const drop = useWorldStore(useCallback(state => state.lootDrops.find(l => l.id === dropId), [dropId]));
  if (!drop) return null;

  return (
    <div
      style={{ gridColumn: drop.position.x + 1, gridRow: drop.position.y + 1 }}
      className="relative z-10 pointer-events-auto cursor-pointer"
      onClick={onClick}
    >
      <div
        className="standing-sprite absolute bottom-0 left-1/2 flex flex-col items-center"
        style={{ transform: `translateX(-50%) ${FLOOR_COUNTER_TILT}` }}
      >
        <div style={{ transform: 'translateY(-25%)' }}>
          <LootPile items={drop.items} />
        </div>
        {/* Elliptical shadow on the floor */}
        <div className="w-7 h-1.5 bg-black/50 rounded-full blur-[2px] -mt-1" />
      </div>
    </div>
  );
});

const LootLayer = memo(({ onLootClick }: { onLootClick: (dropId: string) => void }) => {
  const drops = useWorldStore(useShallow(state => state.lootDrops.map(l => l.id)));
  return <>{drops.map(id => <LootSprite key={id} dropId={id} onClick={() => onLootClick(id)} />)}</>;
});

const FloatingTextSprite = memo(({ id }: { id: string }) => {
  const ft = useCombatStore(useCallback(state => state.floatingTexts.find(f => f.id === id), [id]));
  if (!ft) return null;

  return (
    <div
      style={{ gridColumn: ft.x + 1, gridRow: ft.y + 1 }}
      className="relative flex items-center justify-center z-40 pointer-events-none"
    >
      <div
        className="standing-sprite absolute inset-0"
        style={{ transform: FLOOR_COUNTER_TILT }}
      >
        <div
          className={cn('absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-black animate-float-up', ft.color)}
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
        >
          {ft.text}
        </div>
      </div>
    </div>
  );
});

const FloatingTextLayer = memo(() => {
  const textIds = useCombatStore(useShallow(state => state.floatingTexts.map(f => f.id)));
  return <>{textIds.map(id => <FloatingTextSprite key={id} id={id} />)}</>;
});

// ---------------------------------------------------------------------------
// Main Grid component
// ---------------------------------------------------------------------------

export function Grid() {
  const appScale = useAppStore(state => state.scaleFactor);

  // Apply zoom-out thresholds for higher resolutions
  let gameScale = appScale;
  if      (window.innerWidth >= 3840) gameScale = appScale * 0.75; // 4K+
  else if (window.innerWidth >= 2560) gameScale = appScale * 0.90; // 1440p+
  // 1080p: no adjustment

  // Scroll-wheel zoom — independent of the UI/resolution scaleFactor
  const [zoom, setZoom] = useState(0.55);

  const TILE_SIZE       = BASE_TILE_SIZE * gameScale * zoom;
  const GAP_SIZE        = BASE_GAP_SIZE  * gameScale * zoom;
  const TOTAL_TILE_SIZE = TILE_SIZE + GAP_SIZE;

  const position    = usePlayerStore(useShallow(state => state.position));
  const cameraMode  = usePlayerStore(state => state.cameraMode);

  const grid          = useWorldStore(useShallow(state => state.grid)); // changes only on new level
  const setTarget     = usePlayerStore(state => state.setTarget);
  const targetingSkillId = useCombatStore(state => state.targetingSkillId);
  const hoveredSkillId   = useCombatStore(state => state.hoveredSkillId);
  const setTargetingSkill = useCombatStore(state => state.setTargetingSkill);
  const addLog        = useCombatStore(state => state.addLog);

  const lootItem      = useInventoryStore(state => state.lootItem);
  const removeLootDrop = useWorldStore(state => state.removeLootDrop);

  const [selectedLootDropId, setSelectedLootDropId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell]   = useState<Point | null>(null);
  const [cameraFocus, setCameraFocus]   = useState({ x: position.x, y: position.y });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging]     = useState(false);

  const dragStart   = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  // 1. Manage Camera Focus (Deadzone & Target Tracking)
  useEffect(() => {
    if (cameraMode === 'auto') {
      let newFocusX = cameraFocus.x;
      let newFocusY = cameraFocus.y;

      const dx = position.x - cameraFocus.x;
      const dy = position.y - cameraFocus.y;

      if (Math.abs(dx) > DEADZONE_RADIUS) newFocusX += Math.sign(dx) * (Math.abs(dx) - DEADZONE_RADIUS);
      if (Math.abs(dy) > DEADZONE_RADIUS) newFocusY += Math.sign(dy) * (Math.abs(dy) - DEADZONE_RADIUS);

      // Chop the corners of the square deadzone
      const newDx = position.x - newFocusX;
      const newDy = position.y - newFocusY;
      if (Math.abs(newDx) + Math.abs(newDy) > DEADZONE_MANHATTAN) {
        const excess = (Math.abs(newDx) + Math.abs(newDy)) - DEADZONE_MANHATTAN;
        newFocusX += Math.sign(newDx) * (excess / 2);
        newFocusY += Math.sign(newDy) * (excess / 2);
      }

      if (newFocusX !== cameraFocus.x || newFocusY !== cameraFocus.y) {
        setCameraFocus({ x: newFocusX, y: newFocusY });
      }
    }
  }, [position.x, position.y, cameraMode, targetingSkillId, hoveredCell?.x, hoveredCell?.y, cameraFocus.x, cameraFocus.y]);

  // 2. Manage Camera Offset (Map Clamping)
  useEffect(() => {
    if (cameraMode === 'auto' && viewportRef.current) {
      const viewport    = viewportRef.current;
      const focusPixelX = cameraFocus.x * TOTAL_TILE_SIZE + TILE_SIZE / 2;
      const focusPixelY = cameraFocus.y * TOTAL_TILE_SIZE + TILE_SIZE / 2;

      let targetX = (viewport.clientWidth  / 2) - focusPixelX;
      let targetY = (viewport.clientHeight / 2) - focusPixelY;

      const mapWidthPx  = grid.width  * TOTAL_TILE_SIZE;
      const mapHeightPx = grid.height * TOTAL_TILE_SIZE;
      const minX = Math.min(0, viewport.clientWidth  - mapWidthPx);
      const minY = Math.min(0, viewport.clientHeight - mapHeightPx);

      targetX = Math.max(minX, Math.min(0, targetX));
      targetY = Math.max(minY, Math.min(0, targetY));

      setCameraOffset({ x: targetX, y: targetY });
    }
  }, [cameraFocus.x, cameraFocus.y, cameraMode, grid.width, grid.height]);

  // 3. Scroll-wheel zoom
  // React's synthetic onWheel is passive, so we attach a real listener to
  // call preventDefault() and stop the page from scrolling.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(prev => Math.min(1.2, Math.max(0.25, prev - Math.sign(e.deltaY) * 0.05)));
    };
    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (cameraMode === 'free') {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - cameraOffset.x, y: e.clientY - cameraOffset.y };
    }
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && cameraMode === 'free') {
      setCameraOffset({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
    }
  };
  const handleMouseUp = () => { if (cameraMode === 'free') setIsDragging(false); };

  // 4. Keyboard Movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (useAppStore.getState().isPaused) {
        const movementKeys = ['w','a','s','d','q','e','z','c','arrowup','arrowdown','arrowleft','arrowright'];
        if (movementKeys.includes(e.key.toLowerCase())) return;
      }

      const key = e.key.toLowerCase();
      pressedKeys.current.add(key);

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
        const newX = position.x + dx;
        const newY = position.y + dy;
        if (newX >= 0 && newX < grid.width && newY >= 0 && newY < grid.height) {
          const obstacle = grid.obstacles.find(o => o.x === newX && o.y === newY);
          if (!obstacle) {
            const enemy = useWorldStore.getState().getEnemyAt(newX, newY);
            if (enemy && !enemy.isDead) {
              if (usePlayerStore.getState().activeTargetId !== enemy.id) setTarget(enemy.id);
            } else {
              InputHandler.requestAction({ type: 'move', dx, dy });
            }
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => pressedKeys.current.delete(e.key.toLowerCase());

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup',   handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup',   handleKeyUp);
    };
  }, [position, grid, setTarget]);

  // 5. Calculate AoE / range previews
  let previewTiles: Point[] = [];
  const activePreviewId = targetingSkillId || hoveredSkillId;

  if (activePreviewId) {
    const skill = SKILLS[activePreviewId];
    if (skill) {
      const isSolid = (x: number, y: number) => {
        if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return true;
        return grid.obstacles.some(o => o.x === x && o.y === y);
      };

      if (skill.targeting === 'Self' && skill.aoeParams) {
        previewTiles = getAoETiles(position, null, skill.aoeParams.shape, skill.aoeParams.radius, skill.aoeParams.respectWalls || false, isSolid, grid.width, grid.height);
      } else if (skill.targeting === 'Single' && !targetingSkillId) {
        const effRange = skill.range > 0 ? skill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);
        previewTiles = getAoETiles(position, null, 'square', effRange, false, () => false, grid.width, grid.height);
      } else if (targetingSkillId && hoveredCell && (skill.targeting === 'Ground' || skill.targeting === 'Directional' || skill.targeting === 'Area' || skill.targeting === 'Single')) {
        let center = hoveredCell, target = null;
        if (skill.targeting === 'Directional') { center = position; target = hoveredCell; }
        previewTiles = skill.aoeParams
          ? getAoETiles(center, target, skill.aoeParams.shape, skill.aoeParams.radius, skill.aoeParams.respectWalls || false, isSolid, grid.width, grid.height)
          : [hoveredCell];
      }
    }
  }

  // 6. View frustum culling
  const viewportWidth  = viewportRef.current?.clientWidth  || window.innerWidth;
  const viewportHeight = viewportRef.current?.clientHeight || window.innerHeight;

  const actualCenterX = ((viewportWidth  / 2) - cameraOffset.x) / TOTAL_TILE_SIZE;
  const actualCenterY = ((viewportHeight / 2) - cameraOffset.y) / TOTAL_TILE_SIZE;
  const VIEW_RADIUS_X = Math.ceil((viewportWidth  / TOTAL_TILE_SIZE) / 2) + 2;
  const VIEW_RADIUS_Y = Math.ceil((viewportHeight / TOTAL_TILE_SIZE) / 2) + 2;

  const minX = Math.max(0,               Math.floor(actualCenterX) - VIEW_RADIUS_X);
  const maxX = Math.min(grid.width  - 1, Math.floor(actualCenterX) + VIEW_RADIUS_X);
  const minY = Math.max(0,               Math.floor(actualCenterY) - VIEW_RADIUS_Y);
  const maxY = Math.min(grid.height - 1, Math.floor(actualCenterY) + VIEW_RADIUS_Y);

  const obstacleMap = new Map<string, any>();
  grid.obstacles.forEach(o => obstacleMap.set(`${o.x},${o.y}`, o));

  const previewMap = new Set<string>();
  previewTiles.forEach(pt => previewMap.add(`${pt.x},${pt.y}`));

  const handleLootClick = useCallback((dropId: string) => {
    const drop = useWorldStore.getState().lootDrops.find(l => l.id === dropId);
    if (drop) {
      const dist = Math.max(Math.abs(position.x - drop.position.x), Math.abs(position.y - drop.position.y));
      if (dist <= 1) {
        useTooltipStore.getState().setContent(null);
        if (drop.items.length === 1) {
          lootItem(drop.items[0]);
          removeLootDrop(drop.id);
        } else {
          setSelectedLootDropId(drop.id);
        }
      } else {
        addLog('You must get closer to loot that.', 'system');
      }
    }
  }, [position.x, position.y, lootItem, removeLootDrop, addLog]);

  // 7. Build tile cells
  const cells = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key      = `${x},${y}`;
      const obstacle = obstacleMap.get(key);
      const isPreview = previewMap.has(key);

      let isOutOfRange = false;
      if (targetingSkillId) {
        const s = SKILLS[targetingSkillId];
        if (s) {
          const effRange = s.range > 0 ? s.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);
          if (Math.max(Math.abs(position.x - x), Math.abs(position.y - y)) > effRange) isOutOfRange = true;
        }
      }

      const cursorClass = targetingSkillId ? (isOutOfRange ? 'cursor-not-allowed' : 'cursor-crosshair') : '';

      // Decorative scatter on empty tiles only (Flower2 / Sprout)
      let TileDecor: typeof TILE_DECOR[number] | null = null;
      if (!obstacle) {
        const h = hashTile(x, y);
        if (h % 100 < TILE_DECOR_CHANCE) {
          TileDecor = TILE_DECOR[Math.floor(h / 100) % TILE_DECOR.length];
        }
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
          onMouseEnter={() => setHoveredCell({ x, y })}
          onClick={() => {
            if (targetingSkillId) {
              if (isOutOfRange) { addLog('Target area is out of range.', 'system'); return; }
              const s = SKILLS[targetingSkillId];
              if (s) {
                const isSolid = (sx: number, sy: number) => {
                  if (sx < 0 || sx >= grid.width || sy < 0 || sy >= grid.height) return true;
                  return grid.obstacles.some(o => o.x === sx && o.y === sy);
                };
                if (!hasLineOfSight(position, { x, y }, isSolid)) {
                  addLog('Target is not in line of sight.', 'system');
                  return;
                }
              }
              InputHandler.requestAction({ type: 'skill', skillId: targetingSkillId, targetPos: { x, y } });
              setTargetingSkill(null);
              return;
            }
            if (obstacle) return;
            setTarget(null);
          }}
          className={cn(
            'relative flex items-center justify-center transition-colors',
            'bg-zinc-900/20',
            obstacle && 'bg-zinc-950',
            isPreview && !isOutOfRange && 'bg-cyan-500/30 ring-1 ring-cyan-500/50 ring-inset z-30',
            isPreview && isOutOfRange  && 'bg-cyan-700/40 ring-1 ring-cyan-600/40 ring-inset opacity-80 z-30',
            !isPreview && isOutOfRange && 'bg-zinc-950/80 opacity-50',
            cursorClass
          )}
        >
          {/* Obstacle icons — anchored at bottom, standing upright with shadow */}
          {obstacle && (
            <div
              className="standing-sprite absolute bottom-0 left-1/2 flex flex-col items-center z-10 pointer-events-none"
              style={{ transform: `translateX(-50%) ${FLOOR_COUNTER_TILT}` }}
            >
              {obstacle.type === 'tree' && (
                <Trees
                  size={42}
                  className="text-zinc-600 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
                  style={{ transform: 'translateY(-18%)' }}
                />
              )}
              {obstacle.type === 'rock' && (
                <Mountain
                  size={42}
                  className="text-zinc-600 drop-shadow-[0_4px_6px_rgba(0,0,0,0.6)]"
                  style={{ transform: 'translateY(-18%)' }}
                />
              )}
              <div className="w-9 h-2 bg-black/45 rounded-full blur-[3px] -mt-1" />
            </div>
          )}

          {/* Decorative scatter — standing with a small shadow */}
          {TileDecor && (
            <div
              className="standing-sprite absolute bottom-0 left-1/2 flex flex-col items-center z-[5] pointer-events-none"
              style={{ transform: `translateX(-50%) ${FLOOR_COUNTER_TILT}` }}
            >
              <TileDecor.icon
                size={18}
                className={cn('relative', TileDecor.color)}
                strokeWidth={1.5}
                style={{ transform: 'translateY(-40%)' }}
              />
              <div className="w-4 h-1 bg-black/30 rounded-full blur-[1.5px] -mt-0.5" />
            </div>
          )}
        </div>
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div
      ref={viewportRef}
      className={cn(
        'game-viewport flex-1 overflow-hidden bg-zinc-950 relative select-none',
        cameraMode === 'free' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      )}
      // perspective is set inline so FLOOR_PERSPECTIVE_PX stays the single source of truth
      style={{ perspective: `${FLOOR_PERSPECTIVE_PX}px` }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Subtle grid-line background on the viewport itself */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Pan/translate wrapper — preserve-3d so the perspective chain reaches the floor */}
      <div
        className="absolute top-0 left-0 ease-out z-0"
        style={{
          transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
          transformStyle: 'preserve-3d',
          transitionProperty: 'transform',
          transitionDuration: isDragging ? '0ms' : '150ms',
        }}
      >
        {/* Floor plane — tilts toward the horizon */}
        <div
          className="floor-plane relative grid gap-px bg-zinc-800 border border-zinc-700/50 rounded-xl shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${grid.width}, ${TILE_SIZE}px)`,
            gridAutoRows: `${TILE_SIZE}px`,
            transform: `rotateX(${FLOOR_TILT_DEG}deg)`,
          }}
        >
          {/* Base tile cells */}
          {cells}

          {/* Entity layers — CSS grid placement, counter-rotated internally */}
          <PlayerSprite />
          <EnemyLayer />
          <LootLayer onLootClick={handleLootClick} />
          <FloatingTextLayer />
        </div>
      </div>

      {selectedLootDropId && (
        <LootPopup dropId={selectedLootDropId} onClose={() => setSelectedLootDropId(null)} />
      )}
    </div>
  );
}
