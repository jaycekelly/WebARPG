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
    <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
       <div className="bg-[#16171a] shadow-2xl w-96 relative flex flex-col overflow-hidden rounded-none border-none">
          <div className="h-10 border-b border-[#202227]/40 flex items-center px-4 justify-between bg-[#0e0f11]">
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
                    className="flex items-center gap-4 p-4 bg-[#0e0f11] hover:bg-[#202227] rounded-none transition-colors group text-left shrink-0 border-none"
                  >
                    <div className="bg-red-500/20 p-3 rounded-none border border-red-500/30 group-hover:border-red-500/50 transition-colors">
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
