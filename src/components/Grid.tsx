import { useEffect, useState, useRef, memo, useCallback, useLayoutEffect, useMemo } from 'react';
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
import { Rabbit, Bird, Trees, Mountain, Flower2, Sprout } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BASE_TILE_SIZE = 72;
const BASE_GAP_SIZE = 1;

const FLOOR_PERSPECTIVE_PX = 1400;
const FLOOR_TILT_DEG = 50;
const FLOOR_COUNTER_TILT = `rotateX(-${FLOOR_TILT_DEG}deg)`;
const ICON_BILLBOARD = `translate(-50%, -50%) ${FLOOR_COUNTER_TILT} translateY(-50%)`;

function hashTile(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >>> 13)) * 1274126177;
  return (h ^ (h >>> 16)) >>> 0;
}

const TILE_DECOR = [
  { icon: Flower2, color: 'text-pink-400/50' },
  { icon: Sprout,  color: 'text-emerald-500/50' },
] as const;
const TILE_DECOR_CHANCE = 0;

const DEADZONE_RADIUS    = 2.0;
const DEADZONE_MANHATTAN = 3.0;

const BASE_ICON_SIZE = 32;
const REF_TILE_SIZE = BASE_TILE_SIZE * 0.55;

function shadowStyle(iconSize: number): React.CSSProperties {
  const w = iconSize * 1.0;
  const h = w * 0.65;
  return {
    position: 'absolute',
    bottom: -h * 0.35,
    left: '50%',
    width: w,
    height: h,
    borderRadius: '50%',
    background: 'rgba(0,0,0,0.3)',
    transform: 'translate(-50%, 0)',
    pointerEvents: 'none' as const,
  };
}

// ---------------------------------------------------------------------------
// Flat overlay sub-components (crisp 2D rendering)
// ---------------------------------------------------------------------------

const FlatEntity = memo(({ x, y, is, zi, pi, cl, onClick, children }:
  { x: number; y: number; is: number; zi: number; pi: 'auto' | 'none'; cl?: string; onClick?: () => void; children: React.ReactNode }) => (
  <div
    style={{
      position: 'absolute', left: x, top: y,
      transform: 'translate(-50%, -100%)', width: is, height: is,
      zIndex: zi, pointerEvents: pi,
    }}
    className={cl}
    onClick={onClick}
  >
    <div style={shadowStyle(is)} />
    {children}
  </div>
));

const FlatPlayer = memo(({ pos, is, setTarget }: { pos: { x: number; y: number }; is: number; setTarget: (id: null) => void }) => {
  const hitEffect = useCombatStore(useCallback(state => state.hitEffects.some(h => h.targetId === 'player'), []));
  return (
    <FlatEntity x={pos.x} y={pos.y} is={is} zi={2000} pi="auto" cl={hitEffect ? 'animate-shake' : ''} onClick={() => setTarget(null)}>
      <Rabbit size={is} className={cn('text-emerald-500', hitEffect && 'text-white brightness-200')}
              style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />
    </FlatEntity>
  );
});

const FlatEnemy = memo(({ eid, pos, is, setTarget }: { eid: string; pos: { x: number; y: number }; is: number; setTarget: (id: string) => void }) => {
  const isTargeted = usePlayerStore(useCallback(state => state.activeTargetId === eid, [eid]));
  const ts = useCombatStore(state => state.targetingSkillId);
  const enemy = useWorldStore(useCallback(state => state.enemies.find(e => e.id === eid), [eid]));
  const hitEffect = useCombatStore(useCallback(state => state.hitEffects.some(h => h.targetId === eid), [eid]));
  if (!enemy || enemy.isDead) return null;
  return (
    <FlatEntity x={pos.x} y={pos.y} is={is} zi={2000} pi="auto"
                cl={cn(ts ? 'cursor-crosshair' : 'cursor-pointer', isTargeted && 'ring-2 ring-red-500 bg-red-500/20', hitEffect && 'animate-shake')}
                onClick={() => { if (!ts) setTarget(eid); }}>
      <GridHealthBar currentHealth={enemy.health} maxHealth={enemy.stats.maxHealth} />
      <Bird size={is} className={cn('text-red-500', isTargeted && 'animate-pulse', hitEffect && 'text-white brightness-200')}
            style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />
    </FlatEntity>
  );
});

const FlatEnemyLayer = memo(({ positions, iconSize, setTarget }: { positions: Record<string, { x: number; y: number; s: number }>; iconSize: number; setTarget: (id: string) => void }) => {
  const eids = useWorldStore(useShallow(state => state.enemies.map(e => e.id)));
  return <>{eids.map(eid => { const pos = positions[`enemy:${eid}`]; if (!pos) return null; return <FlatEnemy key={`fe-${eid}`} eid={eid} pos={pos} is={iconSize * pos.s} setTarget={setTarget} />; })}</>;
});

const FlatObstacleLayer = memo(({ positions, iconSize }: { positions: Record<string, { x: number; y: number; s: number }>; iconSize: number }) => {
  const obs = useWorldStore(useShallow(state => state.grid.obstacles));
  return <>{obs.map(o => { const pos = positions[`obstacle:${o.x},${o.y}`]; if (!pos) return null; const is = iconSize * pos.s; return (
    <FlatEntity key={`fo-${o.x}-${o.y}`} x={pos.x} y={pos.y} is={is} zi={1000} pi="none">
      {o.type === 'tree' && <Trees size={is} className="text-zinc-600" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />}
      {o.type === 'rock' && <Mountain size={is} className="text-zinc-600" style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)' }} />}
    </FlatEntity>
  ); })}</>;
});

const FlatLootLayer = memo(({ positions, iconSize, onLootClick }: { positions: Record<string, { x: number; y: number; s: number }>; iconSize: number; onLootClick: (id: string) => void }) => {
  const drops = useWorldStore(useShallow(state => state.lootDrops));
  return <>{drops.map(d => { const pos = positions[`loot:${d.id}`]; if (!pos) return null; const is = iconSize * pos.s; return (
    <FlatEntity key={`fl-${d.id}`} x={pos.x} y={pos.y} is={is} zi={1000} pi="auto" cl="cursor-pointer" onClick={() => onLootClick(d.id)}>
      <LootPile items={d.items} />
    </FlatEntity>
  ); })}</>;
});

const FlatFloatingTextLayer = memo(({ positions, iconSize }: { positions: Record<string, { x: number; y: number }>; iconSize: number }) => {
  const texts = useCombatStore(useShallow(state => state.floatingTexts.map(t => t.id)));
  const getTexts = useCombatStore.getState;
  return <>{texts.map(id => { const pos = positions[`ft:${id}`]; if (!pos) return null; const t = getTexts().floatingTexts.find(x => x.id === id); if (!t) return null; return (
    <div key={`fft-${id}`} className="pointer-events-none"
         style={{
           position: 'absolute', left: pos.x, top: pos.y,
           transform: `translate(-50%, -100%) translateY(-${iconSize * 1.1}px)`,
           zIndex: 3000,
         }}>
      <div className={cn('text-[10px] font-black animate-float-up', t.color)}
           style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}>{t.text}</div>
    </div>
  ); })}</>;
});

// ---------------------------------------------------------------------------
// Main Grid component
// ---------------------------------------------------------------------------

export function Grid() {
  const appScale = useAppStore(state => state.scaleFactor);

  let gameScale = appScale;
  if      (window.innerWidth >= 3840) gameScale = appScale * 0.75;
  else if (window.innerWidth >= 2560) gameScale = appScale * 0.90;

  const [zoom, setZoom] = useState(0.55);

  const TILE_SIZE       = BASE_TILE_SIZE * gameScale * zoom;
  const GAP_SIZE        = BASE_GAP_SIZE  * gameScale * zoom;
  const TOTAL_TILE_SIZE = TILE_SIZE + GAP_SIZE;

  const position    = usePlayerStore(useShallow(state => state.position));
  const cameraMode  = usePlayerStore(state => state.cameraMode);

  const grid          = useWorldStore(useShallow(state => state.grid));
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

  const [flatPositions, setFlatPositions] = useState<Record<string, { x: number; y: number; s: number }>>({});

  const enemies = useWorldStore(useShallow(state => state.enemies));
  const lootDrops = useWorldStore(useShallow(state => state.lootDrops));
  const obstacles = useWorldStore(useShallow(state => state.grid.obstacles));
  const floatingTexts = useCombatStore(useShallow(state => state.floatingTexts));

  const posFingerprint = useMemo(() =>
    enemies.map(e => `${e.id}:${e.position.x},${e.position.y}`).join('|') +
    obstacles.map(o => `${o.x},${o.y}`).join('|') +
    lootDrops.map(d => `${d.id}:${d.position.x},${d.position.y}`).join('|') +
    floatingTexts.map(ft => `${ft.id}:${ft.x},${ft.y}`).join('|'),
  [enemies, obstacles, lootDrops, floatingTexts]);

  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const anchors = viewport.querySelectorAll('[data-entity-anchor]');
    const vRect = viewport.getBoundingClientRect();
    const next: Record<string, { x: number; y: number; s: number }> = {};
    const floorH = grid.height * TILE_SIZE;
    const sin50 = Math.sin((FLOOR_TILT_DEG * Math.PI) / 180);
    anchors.forEach(el => {
      const key = el.getAttribute('data-entity-anchor')!;
      const aRect = el.getBoundingClientRect();
      const gy = parseFloat(el.getAttribute('data-anchor-y') ?? '0');
      const fy = (gy + 0.5) * TILE_SIZE;
      const z = (fy - floorH / 2) * sin50;
      next[key] = {
        x: Math.round((aRect.left + aRect.width / 2 - vRect.left) * 10) / 10,
        y: Math.round((aRect.top + aRect.height / 2 - vRect.top) * 10) / 10,
        s: FLOOR_PERSPECTIVE_PX / (FLOOR_PERSPECTIVE_PX - z),
      };
    });
    setFlatPositions(prev => {
      if (Object.keys(next).length !== Object.keys(prev).length) return next;
      for (const k of Object.keys(next)) {
        if (!prev[k] || prev[k].x !== next[k].x || prev[k].y !== next[k].y) return next;
      }
      return prev;
    });
  }, [position.x, position.y, cameraOffset.x, cameraOffset.y, TILE_SIZE, grid.width, grid.height, posFingerprint]);

  // 1. Camera Focus
  useEffect(() => {
    if (cameraMode === 'auto') {
      let newFocusX = cameraFocus.x;
      let newFocusY = cameraFocus.y;

      const dx = position.x - cameraFocus.x;
      const dy = position.y - cameraFocus.y;

      if (Math.abs(dx) > DEADZONE_RADIUS) newFocusX += Math.sign(dx) * (Math.abs(dx) - DEADZONE_RADIUS);
      if (Math.abs(dy) > DEADZONE_RADIUS) newFocusY += Math.sign(dy) * (Math.abs(dy) - DEADZONE_RADIUS);

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

  // 2. Camera Offset
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

  // 3. Scroll zoom
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

  // 4. Keyboard
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

  // 5. AoE previews
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

  // Build tile cells
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
          style={{ gridColumn: x + 1, gridRow: y + 1, transformStyle: 'preserve-3d' }}
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
            'relative flex items-center justify-center transition-colors border border-zinc-800/30',
            'bg-zinc-900',
            obstacle && 'bg-zinc-950',
            isPreview && !isOutOfRange && 'bg-cyan-500/30 ring-1 ring-cyan-500/50 ring-inset z-30',
            isPreview && isOutOfRange  && 'bg-cyan-700/40 ring-1 ring-cyan-600/40 ring-inset opacity-80 z-30',
            !isPreview && isOutOfRange && 'bg-zinc-950/80 opacity-50',
            cursorClass
          )}
        >
          {TileDecor && (
            <>
              <div className="absolute top-1/2 left-1/2 w-4 h-1 bg-black/30 rounded-full pointer-events-none"
                   style={{ transform: 'translate(-50%, -50%)' }} />
              <div
                className="absolute top-1/2 left-1/2 z-[5] pointer-events-none"
                style={{ transform: ICON_BILLBOARD }}
              >
                <TileDecor.icon size={18} className={cn(TileDecor.color)} strokeWidth={1.5} />
              </div>
            </>
          )}
        </div>
      );
    }
  }

  const iconSize = BASE_ICON_SIZE * (TILE_SIZE / REF_TILE_SIZE);

  return (
    <div
      ref={viewportRef}
      className={cn(
        'game-viewport flex-1 overflow-hidden bg-zinc-950 relative select-none',
        cameraMode === 'free' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      )}
      style={{ perspective: `${FLOOR_PERSPECTIVE_PX}px`, perspectiveOrigin: '50% 10%' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <div
        className="absolute top-0 left-0 z-0"
        style={{
          transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
          transformStyle: 'preserve-3d',
        }}
      >
        <div
          className="floor-plane relative grid bg-zinc-950 border border-zinc-700/20 rounded-xl shadow-2xl"
          style={{
            gridTemplateColumns: `repeat(${grid.width}, ${TILE_SIZE}px)`,
            gridAutoRows: `${TILE_SIZE}px`,
            transform: `rotateX(${FLOOR_TILT_DEG}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          <div data-entity-anchor="player"
               data-anchor-y={position.y}
               style={{ gridColumn: position.x + 1, gridRow: position.y + 1, pointerEvents: 'none' }} />
           {cells}
          {useWorldStore.getState().enemies.map((e: any) => (
            <div key={`ea-${e.id}`} data-entity-anchor={`enemy:${e.id}`} data-anchor-y={e.position.y}
                 style={{ gridColumn: e.position.x + 1, gridRow: e.position.y + 1, pointerEvents: 'none' }} />
          ))}
          {useWorldStore.getState().grid.obstacles.map((o: any) => (
            <div key={`oa-${o.x}-${o.y}`} data-entity-anchor={`obstacle:${o.x},${o.y}`} data-anchor-y={o.y}
                 style={{ gridColumn: o.x + 1, gridRow: o.y + 1, pointerEvents: 'none' }} />
          ))}
          {useWorldStore.getState().lootDrops.map((d: any) => (
            <div key={`la-${d.id}`} data-entity-anchor={`loot:${d.id}`} data-anchor-y={d.position.y}
                 style={{ gridColumn: d.position.x + 1, gridRow: d.position.y + 1, pointerEvents: 'none' }} />
          ))}
          {useCombatStore.getState().floatingTexts.map((ft: any) => (
            <div key={`fta-${ft.id}`} data-entity-anchor={`ft:${ft.id}`} data-anchor-y={ft.y}
                 style={{ gridColumn: ft.x + 1, gridRow: ft.y + 1, pointerEvents: 'none' }} />
          ))}
        </div>
      </div>

      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 10 }}>
        {flatPositions['player'] && (
          <FlatPlayer pos={flatPositions['player']} is={iconSize * flatPositions['player'].s} setTarget={setTarget as any} />
        )}
        <FlatEnemyLayer positions={flatPositions} iconSize={iconSize} setTarget={setTarget} />
        <FlatObstacleLayer positions={flatPositions} iconSize={iconSize} />
        <FlatLootLayer positions={flatPositions} iconSize={iconSize} onLootClick={handleLootClick} />
        <FlatFloatingTextLayer positions={flatPositions} iconSize={iconSize} />
      </div>

      {selectedLootDropId && (
        <LootPopup dropId={selectedLootDropId} onClose={() => setSelectedLootDropId(null)} />
      )}
    </div>
  );
}
