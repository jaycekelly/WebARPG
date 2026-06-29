import { useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { EnemySpawner } from '../engine/enemies/EnemySpawner';
import { Ghost, User } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Grid() {
  const { position, move, setTarget, activeTargetId, level } = usePlayerStore();
  const { gridSize, getEnemyAt, enemies } = useWorldStore();
  const { addLog } = useCombatStore();

  useEffect(() => {
    // Initial Spawn
    if (enemies.length === 0) {
      EnemySpawner.spawn('goblin', { x: 8, y: 5 }, level);
      EnemySpawner.spawn('orc', { x: 3, y: 8 }, level);
    }
  }, [enemies.length, level]);

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
        if (newX >= 0 && newX < gridSize.width && newY >= 0 && newY < gridSize.height) {
          const enemy = getEnemyAt(newX, newY);
          if (enemy) {
            // Target enemy instead of moving into them
            if (activeTargetId !== enemy.id) {
              setTarget(enemy.id);
              addLog(`You target ${enemy.name}.`, 'system');
            }
          } else {
            move(dx, dy);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [position, gridSize, move, getEnemyAt, setTarget, activeTargetId, addLog]);

  const cells = [];
  for (let y = 0; y < gridSize.height; y++) {
    for (let x = 0; x < gridSize.width; x++) {
      const isPlayer = position.x === x && position.y === y;
      const enemy = getEnemyAt(x, y);
      const isTargeted = enemy && enemy.id === activeTargetId;

      cells.push(
        <div
          key={`${x}-${y}`}
          className={cn(
            'aspect-square border border-zinc-800/40 flex items-center justify-center transition-colors',
            'bg-zinc-900/20',
            enemy && 'text-red-500 hover:bg-red-500/10 cursor-pointer',
            isPlayer && 'text-emerald-400 bg-emerald-500/10',
            isTargeted && 'ring-2 ring-red-500 ring-inset bg-red-500/20'
          )}
          onClick={() => {
            if (enemy) {
              setTarget(enemy.id);
              addLog(`You target ${enemy.name}.`, 'system');
            } else if (isPlayer) {
              setTarget(null);
            }
          }}
        >
          {isPlayer && <User className="w-3/5 h-3/5 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]" />}
          {enemy && <Ghost className={cn("w-3/5 h-3/5 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]", isTargeted && 'animate-pulse')} />}
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
        style={{ gridTemplateColumns: `repeat(${gridSize.width}, minmax(0, 1fr))` }}
      >
        {cells}
      </div>
    </div>
  );
}
