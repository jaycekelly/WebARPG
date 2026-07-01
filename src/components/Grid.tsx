import { useEffect, useState, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { InputHandler } from '../engine/input/InputHandler';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { useTooltipStore } from '../store/useTooltipStore';
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

export function Grid() {
  const { position, move, setTarget, activeTargetId } = usePlayerStore();
  const { grid, getEnemyAt, lootDrops, removeLootDrop } = useWorldStore();
  const { addLog, floatingTexts, targetingSkillId, hoveredSkillId, setTargetingSkill } = useCombatStore();
  const { lootItem } = useInventoryStore();
  const [selectedLootDropId, setSelectedLootDropId] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<Point | null>(null);

  // We no longer manually spawn in Grid, LevelGenerator handles it.

  const pressedKeys = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      pressedKeys.current.add(key);
      
      let dx = 0;
      let dy = 0;
      
      // Check dedicated diagonal keys
      if (pressedKeys.current.has('q')) { dx = -1; dy = -1; }
      else if (pressedKeys.current.has('e')) { dx = 1; dy = -1; }
      else if (pressedKeys.current.has('z')) { dx = -1; dy = 1; }
      else if (pressedKeys.current.has('c')) { dx = 1; dy = 1; }
      else {
        // Check cardinals (combinations form diagonals)
        if (pressedKeys.current.has('arrowup') || pressedKeys.current.has('w')) dy -= 1;
        if (pressedKeys.current.has('arrowdown') || pressedKeys.current.has('s')) dy += 1;
        if (pressedKeys.current.has('arrowleft') || pressedKeys.current.has('a')) dx -= 1;
        if (pressedKeys.current.has('arrowright') || pressedKeys.current.has('d')) dx += 1;
      }
      
      // Cap at -1 and 1
      dx = Math.max(-1, Math.min(1, dx));
      dy = Math.max(-1, Math.min(1, dy));

      if (dx !== 0 || dy !== 0) {
        const newX = position.x + dx;
        const newY = position.y + dy;

        // Check boundaries
        if (newX >= 0 && newX < grid.width && newY >= 0 && newY < grid.height) {
          // Check obstacles
          const obstacle = grid.obstacles.find(o => o.x === newX && o.y === newY);
          
          if (!obstacle) {
            const enemy = getEnemyAt(newX, newY);
            if (enemy) {
              // Target enemy instead of moving into them
              if (activeTargetId !== enemy.id) {
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
  }, [position, grid, move, getEnemyAt, setTarget, activeTargetId, addLog]);

  // Calculate Previews
  let previewTiles: Point[] = [];
  const activePreviewId = targetingSkillId || hoveredSkillId;
  
  if (activePreviewId) {
    const skill = SKILLS[activePreviewId];
    if (skill) {
      if (skill.targeting === 'Self' && skill.aoeParams) {
        // Self-AoEs always preview around the player
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
      } else if (skill.targeting === 'Single' && skill.range > 0 && !targetingSkillId) {
        // Range preview for targeted spells when hovering the hotbar
        previewTiles = getAoETiles(
          position,
          null,
          'square', // use square for range check to match chebyshev
          skill.range,
          false,
          () => false,
          grid.width,
          grid.height
        );
      } else if (targetingSkillId && hoveredCell && (skill.targeting === 'Ground' || skill.targeting === 'Directional' || skill.targeting === 'Area')) {
        // If we are aiming a ground/directional skill, preview it at the mouse
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
          previewTiles = getAoETiles(
            center,
            target,
            skill.aoeParams.shape,
            skill.aoeParams.radius,
            skill.aoeParams.respectWalls || false,
            isSolid,
            grid.width,
            grid.height
          );
        } else {
          // If a ground skill doesn't have an AoE param (e.g. summon), just highlight the tile
          previewTiles = [hoveredCell];
        }
      }
    }
  }

  const cells = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const isPlayer = position.x === x && position.y === y;
      const enemy = getEnemyAt(x, y);
      const isTargeted = enemy && enemy.id === activeTargetId;
      const lootDrop = lootDrops.find(l => l.position.x === x && l.position.y === y);
      const obstacle = grid.obstacles.find(o => o.x === x && o.y === y);
      const cellFloatingTexts = floatingTexts.filter(ft => ft.x === x && ft.y === y);
      const isPreview = previewTiles.some(pt => pt.x === x && pt.y === y);
      
      let isOutOfRange = false;
      if (targetingSkillId) {
        const targetingSkill = SKILLS[targetingSkillId];
        if (targetingSkill && targetingSkill.range > 0) {
           const dist = Math.max(Math.abs(position.x - x), Math.abs(position.y - y));
           if (dist > targetingSkill.range) isOutOfRange = true;
        }
      }
      
      let cursorClass = enemy ? 'cursor-pointer' : '';
      if (targetingSkillId) {
         cursorClass = isOutOfRange ? 'cursor-not-allowed' : 'cursor-crosshair';
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          onMouseEnter={() => setHoveredCell({x, y})}
          className={cn(
            'relative aspect-square border border-zinc-800/40 flex items-center justify-center transition-colors',
            'bg-zinc-900/20',
            obstacle && 'bg-zinc-950', // darker for obstacles
            enemy && !targetingSkillId && 'text-red-500 hover:bg-red-500/10',
            isPlayer && 'text-emerald-400 bg-emerald-500/10',
            isTargeted && 'ring-2 ring-red-500 ring-inset bg-red-500/20',
            isPreview && !isOutOfRange && 'bg-cyan-500/30 ring-1 ring-cyan-500/50 ring-inset',
            isPreview && isOutOfRange && 'bg-cyan-700/40 ring-1 ring-cyan-600/40 ring-inset opacity-80',
            !isPreview && isOutOfRange && 'bg-zinc-950/80 opacity-50',
            cursorClass
          )}
          onClick={() => {
            if (targetingSkillId) {
              if (isOutOfRange) {
                 addLog("Target area is out of range.", 'system');
                 return;
              }
              const targetingSkill = SKILLS[targetingSkillId];
              if (targetingSkill && targetingSkill.range > 0) {
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
            
            if (enemy) {
              setTarget(enemy.id);
            } else if (lootDrop) {
              const dist = Math.max(Math.abs(position.x - x), Math.abs(position.y - y));
              if (dist <= 1) {
                useTooltipStore.getState().setContent(null);
                if (lootDrop.items.length === 1) {
                  lootItem(lootDrop.items[0]);
                  removeLootDrop(lootDrop.id);
                } else {
                  setSelectedLootDropId(lootDrop.id);
                }
              } else {
                 addLog("You must get closer to loot that.", 'system');
              }
            } else if (isPlayer) {
              setTarget(null);
            }
          }}
        >
          {obstacle?.type === 'tree' && <Trees className="w-4/5 h-4/5 text-zinc-800/80 absolute z-10" />}
          {obstacle?.type === 'rock' && <Mountain className="w-4/5 h-4/5 text-zinc-800/80 absolute z-10" />}
          {isPlayer && <User className="w-3/5 h-3/5 text-emerald-500 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] z-20 absolute" />}
          {enemy && <Ghost className={cn("w-3/5 h-3/5 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] z-20 absolute", isTargeted && 'animate-pulse')} />}
          {!enemy && !isPlayer && !obstacle && lootDrop && <LootPile items={lootDrop.items} />}
          
          {/* Health Bar Overlay */}
          {enemy && (
            <GridHealthBar currentHealth={enemy.health} maxHealth={enemy.stats.maxHealth} />
          )}
          
          {/* Floating Combat Text */}
          {cellFloatingTexts.map(ft => (
            <div 
              key={ft.id} 
              className={cn("absolute top-0 left-1/2 -translate-x-1/2 text-[10px] font-black z-40 animate-float-up pointer-events-none text-shadow-sm", ft.color)}
              style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              {ft.text}
            </div>
          ))}
        </div>
      );
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center p-8 bg-zinc-950 relative">
      {/* Decorative background grid effect */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      
      <div 
        className="relative grid gap-px bg-zinc-800 w-full max-w-4xl border border-zinc-700/50 rounded-xl overflow-hidden shadow-2xl z-0" 
        style={{ gridTemplateColumns: `repeat(${grid.width}, minmax(0, 1fr))` }}
      >
        {cells}
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
