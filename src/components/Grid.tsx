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
import { Ghost, User, Trees, Mountain } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BASE_TILE_SIZE = 64; // px
const BASE_GAP_SIZE = 1; // px

const DEADZONE_RADIUS = 2.0;
const DEADZONE_MANHATTAN = 3.0; // Crops the corners of the square deadzone

// --- Sub-Components to isolate re-renders ---

const PlayerSprite = memo(() => {
  const position = usePlayerStore(state => state.position);
  const setTarget = usePlayerStore(state => state.setTarget);
  const hitEffect = useCombatStore(state => state.hitEffects.find(h => h.targetId === 'player'));

  return (
    <div 
      style={{ gridColumn: position.x + 1, gridRow: position.y + 1 }} 
      className={cn("relative flex items-center justify-center z-20 pointer-events-auto cursor-pointer bg-emerald-500/10 text-emerald-400", hitEffect && "animate-shake")}
      onClick={() => setTarget(null)}
    >
      <User key={hitEffect?.id || 'idle'} className={cn("w-3/5 h-3/5 text-emerald-500 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] absolute", hitEffect && "text-white drop-shadow-none brightness-200")} />
    </div>
  );
});

const EnemySprite = memo(({ id }: { id: string }) => {
  const enemy = useWorldStore(useCallback(state => state.enemies.find(e => e.id === id), [id]));
  const isTargeted = usePlayerStore(state => state.activeTargetId === id);
  const setTarget = usePlayerStore(state => state.setTarget);
  const targetingSkillId = useCombatStore(state => state.targetingSkillId);
  const hitEffect = useCombatStore(state => state.hitEffects.find(h => h.targetId === id));

  if (!enemy || enemy.isDead) return null;

  let cursorClass = 'cursor-pointer';
  if (targetingSkillId) cursorClass = 'cursor-crosshair'; // Overridden by Grid if out of range, but good fallback

  return (
    <div 
      style={{ gridColumn: enemy.position.x + 1, gridRow: enemy.position.y + 1 }} 
      className={cn("relative flex items-center justify-center z-20 pointer-events-auto", cursorClass, isTargeted && 'ring-2 ring-red-500 ring-inset bg-red-500/20', hitEffect && "animate-shake")}
      onClick={() => {
        if (!targetingSkillId) {
          setTarget(id);
        }
      }}
    >
      <Ghost key={hitEffect?.id || 'idle'} className={cn("w-3/5 h-3/5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] absolute", isTargeted && 'animate-pulse', hitEffect && "text-white drop-shadow-none brightness-200")} />
      <GridHealthBar currentHealth={enemy.health} maxHealth={enemy.stats.maxHealth} />
    </div>
  );
});

const EnemyLayer = memo(() => {
  // Only re-renders when the array of enemies changes (e.g. spawn or death), NOT when their stats/health change!
  const enemies = useWorldStore(useShallow(state => state.enemies.map(e => e.id)));
  return (
    <>
      {enemies.map(id => <EnemySprite key={id} id={id} />)}
    </>
  );
});

const LootSprite = memo(({ dropId, onClick }: { dropId: string, onClick: () => void }) => {
  const drop = useWorldStore(useCallback(state => state.lootDrops.find(l => l.id === dropId), [dropId]));
  if (!drop) return null;

  return (
    <div 
      style={{ gridColumn: drop.position.x + 1, gridRow: drop.position.y + 1 }} 
      className="relative flex items-center justify-center z-10 pointer-events-auto cursor-pointer"
      onClick={onClick}
    >
      <LootPile items={drop.items} />
    </div>
  );
});

const LootLayer = memo(({ onLootClick }: { onLootClick: (dropId: string) => void }) => {
  const drops = useWorldStore(useShallow(state => state.lootDrops.map(l => l.id)));
  return (
    <>
      {drops.map(id => <LootSprite key={id} dropId={id} onClick={() => onLootClick(id)} />)}
    </>
  );
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
        className={cn("absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-black animate-float-up text-shadow-sm", ft.color)}
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
      >
        {ft.text}
      </div>
    </div>
  );
});

const FloatingTextLayer = memo(() => {
  const textIds = useCombatStore(useShallow(state => state.floatingTexts.map(f => f.id)));
  return (
    <>
      {textIds.map(id => <FloatingTextSprite key={id} id={id} />)}
    </>
  );
});

// --- Main Grid Component ---

export function Grid() {
  const scaleFactor = useAppStore(state => state.scaleFactor);
  const TILE_SIZE = BASE_TILE_SIZE * scaleFactor;
  const GAP_SIZE = BASE_GAP_SIZE * scaleFactor;
  const TOTAL_TILE_SIZE = TILE_SIZE + GAP_SIZE;
  // Use Shallow to prevent re-renders unless these specific properties change
  const position = usePlayerStore(useShallow(state => state.position));
  const cameraMode = usePlayerStore(state => state.cameraMode);
  
  const grid = useWorldStore(useShallow(state => state.grid)); // Only changes on new level
  const setTarget = usePlayerStore(state => state.setTarget);

  const targetingSkillId = useCombatStore(state => state.targetingSkillId);
  const hoveredSkillId = useCombatStore(state => state.hoveredSkillId);
  const setTargetingSkill = useCombatStore(state => state.setTargetingSkill);
  const addLog = useCombatStore(state => state.addLog);
  
  const lootItem = useInventoryStore(state => state.lootItem);
  const removeLootDrop = useWorldStore(state => state.removeLootDrop);

  const [selectedLootDropId, setSelectedLootDropId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<Point | null>(null);

  const [cameraFocus, setCameraFocus] = useState({ x: position.x, y: position.y });
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const pressedKeys = useRef<Set<string>>(new Set());

  // 1. Manage Camera Focus (Deadzone & Target Tracking)
  useEffect(() => {
    if (cameraMode === 'auto') {
      let newFocusX = cameraFocus.x;
      let newFocusY = cameraFocus.y;

      // Deadzone logic
      const dx = position.x - cameraFocus.x;
      const dy = position.y - cameraFocus.y;

      if (Math.abs(dx) > DEADZONE_RADIUS) {
        newFocusX += Math.sign(dx) * (Math.abs(dx) - DEADZONE_RADIUS);
      }
      if (Math.abs(dy) > DEADZONE_RADIUS) {
        newFocusY += Math.sign(dy) * (Math.abs(dy) - DEADZONE_RADIUS);
      }

      // Chop the corners of the deadzone square
      const newDx = position.x - newFocusX;
      const newDy = position.y - newFocusY;
      
      if (Math.abs(newDx) + Math.abs(newDy) > DEADZONE_MANHATTAN) {
         const excess = (Math.abs(newDx) + Math.abs(newDy)) - DEADZONE_MANHATTAN;
         // Pull the camera focus equally along both axes
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
       const viewport = viewportRef.current;
       const focusPixelX = cameraFocus.x * TOTAL_TILE_SIZE + TILE_SIZE / 2;
       const focusPixelY = cameraFocus.y * TOTAL_TILE_SIZE + TILE_SIZE / 2;
       
       let targetX = (viewport.clientWidth / 2) - focusPixelX;
       let targetY = (viewport.clientHeight / 2) - focusPixelY;
       
       // Map Clamping
       const mapWidthPx = grid.width * TOTAL_TILE_SIZE;
       const mapHeightPx = grid.height * TOTAL_TILE_SIZE;
       
       const minX = Math.min(0, viewport.clientWidth - mapWidthPx);
       const minY = Math.min(0, viewport.clientHeight - mapHeightPx);
       
       targetX = Math.max(minX, Math.min(0, targetX));
       targetY = Math.max(minY, Math.min(0, targetY));

       setCameraOffset({ x: targetX, y: targetY });
    }
  }, [cameraFocus.x, cameraFocus.y, cameraMode, grid.width, grid.height]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (cameraMode === 'free') {
       setIsDragging(true);
       dragStart.current = { x: e.clientX - cameraOffset.x, y: e.clientY - cameraOffset.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && cameraMode === 'free') {
       setCameraOffset({
         x: e.clientX - dragStart.current.x,
         y: e.clientY - dragStart.current.y
       });
    }
  };

  const handleMouseUp = () => {
    if (cameraMode === 'free') {
       setIsDragging(false);
    }
  };

  // Keyboard Movement
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input (though we don't have many)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      // Disable movement if game is paused
      if (useAppStore.getState().isPaused) {
         const movementKeys = ['w', 'a', 's', 'd', 'q', 'e', 'z', 'c', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'];
         if (movementKeys.includes(e.key.toLowerCase())) {
             return;
         }
      }

      const key = e.key.toLowerCase();
      pressedKeys.current.add(key);
      
      let dx = 0;
      let dy = 0;
      
      if (pressedKeys.current.has('w') || pressedKeys.current.has('arrowup')) dy -= 1;
      if (pressedKeys.current.has('s') || pressedKeys.current.has('arrowdown')) dy += 1;
      if (pressedKeys.current.has('a') || pressedKeys.current.has('arrowleft')) dx -= 1;
      if (pressedKeys.current.has('d') || pressedKeys.current.has('arrowright')) dx += 1;
      
      // Diagonal dedicated keys
      if (pressedKeys.current.has('q')) { dx -= 1; dy -= 1; }
      if (pressedKeys.current.has('e')) { dx += 1; dy -= 1; }
      if (pressedKeys.current.has('z')) { dx -= 1; dy += 1; }
      if (pressedKeys.current.has('c')) { dx += 1; dy += 1; }

      // Normalize diagonal movement to prevent moving 2 tiles when combining keys
      dx = Math.sign(dx);
      dy = Math.sign(dy);

      if (dx !== 0 || dy !== 0) {
        const newX = position.x + dx;
        const newY = position.y + dy;

        // Check boundaries
        if (newX >= 0 && newX < grid.width && newY >= 0 && newY < grid.height) {
          // Check obstacles
          const obstacle = grid.obstacles.find(o => o.x === newX && o.y === newY);
          
          if (!obstacle) {
             const enemy = useWorldStore.getState().getEnemyAt(newX, newY);
             if (enemy && !enemy.isDead) {
               if (usePlayerStore.getState().activeTargetId !== enemy.id) {
                 setTarget(enemy.id);
               }
             } else {
               InputHandler.requestAction({ type: 'move', dx, dy });
             }
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
  }, [position, grid, setTarget]); // Minimal dependencies

  // Calculate Previews
  let previewTiles: Point[] = [];
  const activePreviewId = targetingSkillId || hoveredSkillId;
  
  if (activePreviewId) {
    const skill = SKILLS[activePreviewId];
    if (skill) {
      if (skill.targeting === 'Self' && skill.aoeParams) {
        previewTiles = getAoETiles(
          position, 
          null, 
          skill.aoeParams.shape, 
          skill.aoeParams.radius, 
          skill.aoeParams.respectWalls || false,
          (x, y) => {
            if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return true;
            return grid.obstacles.some(o => o.x === x && o.y === y);
          },
          grid.width,
          grid.height
        );
      } else if (skill.targeting === 'Single' && !targetingSkillId) {
        const effRange = skill.range > 0 ? skill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);
        previewTiles = getAoETiles(
          position,
          null,
          'square', 
          effRange,
          false,
          () => false,
          grid.width,
          grid.height
        );
      } else if (targetingSkillId && hoveredCell && (skill.targeting === 'Ground' || skill.targeting === 'Directional' || skill.targeting === 'Area' || skill.targeting === 'Single')) {
        const isSolid = (x: number, y: number) => {
          if (x < 0 || x >= grid.width || y < 0 || y >= grid.height) return true;
          return grid.obstacles.some(o => o.x === x && o.y === y);
        };
        
        let center = hoveredCell;
        let target = null;
        
        if (skill.targeting === 'Directional') {
          center = position;
          target = hoveredCell;
        }

        if (skill.aoeParams) {
          previewTiles = getAoETiles(center, target, skill.aoeParams.shape, skill.aoeParams.radius, skill.aoeParams.respectWalls || false, isSolid, grid.width, grid.height);
        } else {
          previewTiles = [hoveredCell];
        }
      }
    }
  }

  // View Culling Bounds (Frustum)
  const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
  const viewportHeight = viewportRef.current?.clientHeight || window.innerHeight;
  
  const actualCenterX = ((viewportWidth / 2) - cameraOffset.x) / TOTAL_TILE_SIZE;
  const actualCenterY = ((viewportHeight / 2) - cameraOffset.y) / TOTAL_TILE_SIZE;

  const VIEW_RADIUS_X = Math.ceil((viewportWidth / TOTAL_TILE_SIZE) / 2) + 2;
  const VIEW_RADIUS_Y = Math.ceil((viewportHeight / TOTAL_TILE_SIZE) / 2) + 2;
  
  const minX = Math.max(0, Math.floor(actualCenterX) - VIEW_RADIUS_X);
  const maxX = Math.min(grid.width - 1, Math.floor(actualCenterX) + VIEW_RADIUS_X);
  const minY = Math.max(0, Math.floor(actualCenterY) - VIEW_RADIUS_Y);
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
           addLog("You must get closer to loot that.", 'system');
        }
     }
  }, [position.x, position.y, lootItem, removeLootDrop, addLog]);

  const cells = [];
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const key = `${x},${y}`;
      const obstacle = obstacleMap.get(key);
      const isPreview = previewMap.has(key);
      
      let isOutOfRange = false;
      if (targetingSkillId) {
        const targetingSkill = SKILLS[targetingSkillId];
        if (targetingSkill) {
           const effRange = targetingSkill.range > 0 ? targetingSkill.range : ((useInventoryStore.getState().equipment['weapon1'] as any)?.range || 1);
           const dist = Math.max(Math.abs(position.x - x), Math.abs(position.y - y));
           if (dist > effRange) isOutOfRange = true;
        }
      }
      
      let cursorClass = '';
      if (targetingSkillId) {
         cursorClass = isOutOfRange ? 'cursor-not-allowed' : 'cursor-crosshair';
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          style={{ gridColumn: x + 1, gridRow: y + 1 }}
          onMouseEnter={() => setHoveredCell({x, y})}
          onClick={() => {
            if (targetingSkillId) {
              if (isOutOfRange) {
                 addLog("Target area is out of range.", 'system');
                 return;
              }
              const targetingSkill = SKILLS[targetingSkillId];
              if (targetingSkill) {
                 const isSolid = (sx: number, sy: number) => {
                    if (sx < 0 || sx >= grid.width || sy < 0 || sy >= grid.height) return true;
                    return grid.obstacles.some(o => o.x === sx && o.y === sy);
                 };
                 if (!hasLineOfSight(position, {x, y}, isSolid)) {
                    addLog("Target is not in line of sight.", 'system');
                    return;
                 }
              }
              InputHandler.requestAction({ type: 'skill', skillId: targetingSkillId, targetPos: {x, y} });
              setTargetingSkill(null);
              return;
            }
            
            if (obstacle) return;
            setTarget(null); // Clicked empty ground
          }}
          className={cn(
            'relative flex items-center justify-center transition-colors',
            'bg-zinc-900/20',
            obstacle && 'bg-zinc-950', // darker for obstacles
            isPreview && !isOutOfRange && 'bg-cyan-500/30 ring-1 ring-cyan-500/50 ring-inset z-30',
            isPreview && isOutOfRange && 'bg-cyan-700/40 ring-1 ring-cyan-600/40 ring-inset opacity-80 z-30',
            !isPreview && isOutOfRange && 'bg-zinc-950/80 opacity-50',
            cursorClass
          )}
        >
          {obstacle?.type === 'tree' && <Trees className="w-4/5 h-4/5 text-zinc-800/80 absolute z-10 pointer-events-none" />}
          {obstacle?.type === 'rock' && <Mountain className="w-4/5 h-4/5 text-zinc-800/80 absolute z-10 pointer-events-none" />}
        </div>
      );
    }
  }

  return (
    <div 
      ref={viewportRef}
      className={cn(
        "flex-1 overflow-hidden bg-zinc-950 relative select-none",
        cameraMode === 'free' ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      <div 
        className="absolute top-0 left-0 ease-out z-0"
        style={{ 
          transform: `translate(${cameraOffset.x}px, ${cameraOffset.y}px)`,
          transitionProperty: 'transform',
          transitionDuration: isDragging ? '0ms' : '150ms' 
        }}
      >
        <div 
          className="relative grid gap-px bg-zinc-800 border border-zinc-700/50 rounded-xl overflow-hidden shadow-2xl" 
          style={{ 
            gridTemplateColumns: `repeat(${grid.width}, ${TILE_SIZE}px)`,
            gridAutoRows: `${TILE_SIZE}px` 
          }}
        >
          {/* Base Grid Cells */}
          {cells}
          
          {/* Entities overlaid using CSS Grid placement */}
          <PlayerSprite />
          <EnemyLayer />
          <LootLayer onLootClick={handleLootClick} />
          <FloatingTextLayer />
        </div>
      </div>
      
      {selectedLootDropId && (
        <LootPopup 
          dropId={selectedLootDropId} 
          onClose={() => setSelectedLootDropId(null)} 
        />
      )}
    </div>
  );
}
