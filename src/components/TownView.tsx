import { useAppStore } from '../store/useAppStore';
import { Map, ArrowRight, X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useCombatStore } from '../store/useCombatStore';
import { LevelGenerator } from '../engine/world/LevelGenerator';
import { setRunState } from '../store/storage';
import { DUNGEON_BIOMES, getBiome } from '../data/biomes';

export function TownView() {
  const { setLocation, dungeonSelectOpen, setDungeonSelectOpen } = useAppStore();

  const handleEnterDungeon = (biomeId: string) => {
    setRunState('dungeon');
    useCombatStore.getState().resetCombo();
    LevelGenerator.initializeDungeon(40, 40, usePlayerStore.getState().level, biomeId);
    setDungeonSelectOpen(false);
    setLocation('dungeon');
  };

//   const handleEnterPlaygroundCave = () => {
//     setRunState('dungeon');
//     useCombatStore.getState().resetCombo();
//     LevelGenerator.initializePlaygroundCave(usePlayerStore.getState().level);
//     setDungeonSelectOpen(false);
//     setLocation('dungeon');
//   };

  if (!dungeonSelectOpen) {
    return null;
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/20 backdrop-blur-[1px]">
       <div className="bg-surface-deep/93 backdrop-blur-[1px] shadow-2xl w-96 relative flex flex-col overflow-hidden rounded-none border border-transparent">
          <div className="h-10 border-b border-border-subtle/40 flex items-center px-4 justify-between bg-transparent">
             <div className="text-text-primary font-bold tracking-widest text-sm uppercase">Dungeon Select</div>
             <button onClick={() => setDungeonSelectOpen(false)} className="text-text-muted hover:text-text-primary transition-colors">
                <X className="w-5 h-5" />
             </button>
          </div>
          
          <div className="p-4 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
             {DUNGEON_BIOMES.map((biomeId) => {
                const biome = getBiome(biomeId);
                return (
                  <button 
                    key={biomeId}
                    onClick={() => handleEnterDungeon(biomeId)}
                    className="flex items-center gap-4 p-4 border border-transparent bg-surface-raised hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent rounded-none active:scale-[0.98] transition-all group text-left shrink-0"
                  >
                    <div className="bg-red-500/10 p-3 rounded-none border border-red-500/20 group-hover:border-red-500/40 transition-colors">
                       <Map className="w-6 h-6 text-red-500" />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="text-text-primary font-bold uppercase tracking-wider text-sm">
                        {biome.name}
                      </div>
                      <div className="text-text-muted text-xs uppercase tracking-widest">
                        Level {usePlayerStore.getState().level} Area
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-muted group-hover:text-accent group-hover:translate-x-1 transition-all" />
                  </button>
                );
             })}
          </div>
       </div>
    </div>
  );
}
