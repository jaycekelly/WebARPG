import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Map, ArrowRight, X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useCombatStore } from '../store/useCombatStore';
import { LevelGenerator } from '../engine/world/LevelGenerator';
import { setRunState } from '../store/storage';
import { DUNGEON_BIOMES, getBiome } from '../data/biomes';
import { useWorldStore } from '../store/useWorldStore';

export function TownView() {
  const { setLocation, dungeonSelectOpen, setDungeonSelectOpen } = useAppStore();
  const playerPos = usePlayerStore(state => state.position);

  useEffect(() => {
    if (dungeonSelectOpen) {
      const entrance = useWorldStore.getState().grid.obstacles.find(o => o.type === 'dungeon_entrance');
      if (entrance) {
        const dist = Math.max(Math.abs(playerPos.x - entrance.x), Math.abs(playerPos.y - entrance.y));
        if (dist > 1) {
          setDungeonSelectOpen(false);
        }
      }
    }
  }, [playerPos, dungeonSelectOpen, setDungeonSelectOpen]);

  const handleEnterDungeon = (biomeId: string) => {
    setRunState('dungeon');
    useCombatStore.getState().resetCombo();
    LevelGenerator.initializeDungeon(40, 40, usePlayerStore.getState().level, biomeId);
    setDungeonSelectOpen(false);
    setLocation('dungeon');
  };

  if (!dungeonSelectOpen) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-[calc(49%-8.55rem)] pointer-events-none flex justify-center z-40">
      <div className="relative w-[15rem] h-[17.1rem] pointer-events-auto transition-transform duration-[400ms] ease-in-out">
        {/* Main Window */}
        <div className="absolute inset-0 rounded-none z-40 overflow-hidden shadow-depth-lg">
          {/* Background layer */}
          <div className="absolute inset-0 bg-surface-deep/93 backdrop-blur-[2px] z-10" />
          
          {/* Content layer */}
          <div className="absolute inset-0 z-20 flex flex-col pb-2">
            {/* Header */}
            <div className="flex items-center justify-between bg-surface-base flex-shrink-0 relative h-[1.375rem] select-none border-b border-border-subtle/20 px-3">
              <span className="text-[10px] uppercase tracking-widest font-black text-text-secondary">Dungeon Select</span>
              <button onClick={() => setDungeonSelectOpen(false)} className="text-text-muted hover:text-text-primary transition-colors flex items-center justify-center">
                 <X className="w-3 h-3" />
              </button>
            </div>
            
            {/* Body */}
            <div className="flex-1 overflow-y-auto">
               <div className="flex flex-col w-full px-2 pt-2 gap-1">
               {DUNGEON_BIOMES.map((biomeId) => {
                  const biome = getBiome(biomeId);
                  return (
                    <button 
                      key={biomeId}
                      onClick={() => handleEnterDungeon(biomeId)}
                      className="flex items-center gap-2 py-1 px-1.5 pr-2 transition-all w-full text-left shrink-0 rounded-none ring-1 ring-inset bg-surface-raised/45 ring-transparent hover:ring-accent hover:bg-surface-overlay hover:text-text-primary group"
                    >
                      <div className="w-9 h-9 shrink-0 flex items-center justify-center border bg-surface-raised border-white/5">
                         <Map className="w-5 h-5 text-zinc-500" />
                      </div>
                      <div className="flex flex-col overflow-hidden min-w-0 flex-1">
                         <span className="text-[14px] font-bold uppercase tracking-wider text-text-muted leading-none">
                           Level {usePlayerStore.getState().level} Area
                         </span>
                         <span className="text-[16px] font-semibold truncate leading-tight mt-0.5 text-text-secondary group-hover:text-text-primary transition-colors">
                           {biome.name}
                         </span>
                      </div>
                      <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all mr-1" />
                    </button>
                  );
               })}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
