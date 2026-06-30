import { useEffect, useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { InputHandler } from '../engine/input/InputHandler';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { LootPile } from './LootPile';
import { LootPopup } from './LootPopup';
import { Ghost, User, Trees, Mountain } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Grid() {
  const { position, move, setTarget, activeTargetId } = usePlayerStore();
  const { grid, getEnemyAt, lootDrops, removeLootDrop } = useWorldStore();
  const { addLog } = useCombatStore();
  const { lootItem } = useInventoryStore();
  const [selectedLootDropId, setSelectedLootDropId] = useState<string | null>(null);

  // We no longer manually spawn in Grid, LevelGenerator handles it.

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowUp' || e.key === 'w') dy = -1;
      if (e.key === 'ArrowDown' || e.key === 's') dy = 1;
      if (e.key === 'ArrowLeft' || e.key === 'a') dx = -1;
      if (e.key === 'ArrowRight' || e.key === 'd') dx = 1;

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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, grid, move, getEnemyAt, setTarget, activeTargetId, addLog]);

  const cells = [];
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const isPlayer = position.x === x && position.y === y;
      const enemy = getEnemyAt(x, y);
      const isTargeted = enemy && enemy.id === activeTargetId;
      const lootDrop = lootDrops.find(l => l.position.x === x && l.position.y === y);
      const obstacle = grid.obstacles.find(o => o.x === x && o.y === y);

      cells.push(
        <div
          key={`${x}-${y}`}
          className={cn(
            'relative aspect-square border border-zinc-800/40 flex items-center justify-center',
            'bg-zinc-900/20',
            obstacle && 'bg-zinc-950', // darker for obstacles
            enemy && 'text-red-500 hover:bg-red-500/10 cursor-pointer',
            isPlayer && 'text-emerald-400 bg-emerald-500/10',
            isTargeted && 'ring-2 ring-red-500 ring-inset bg-red-500/20'
          )}
          onClick={() => {
            if (obstacle) return;
            
            if (enemy) {
              setTarget(enemy.id);
            } else if (lootDrop) {
              const dist = Math.max(Math.abs(position.x - x), Math.abs(position.y - y));
              if (dist <= 1) {
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
          {isPlayer && <User className="w-3/5 h-3/5 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] z-20 absolute" />}
          {enemy && <Ghost className={cn("w-3/5 h-3/5 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)] z-20 absolute", isTargeted && 'animate-pulse')} />}
          {!enemy && !isPlayer && !obstacle && lootDrop && <LootPile items={lootDrop.items} />}
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
