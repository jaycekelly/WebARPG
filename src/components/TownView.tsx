import { useAppStore } from '../store/useAppStore';
import { Map, ArrowRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { LevelGenerator } from '../engine/world/LevelGenerator';

export function TownView() {
  const { setLocation } = useAppStore();

  const handleEnterDungeon = () => {
    LevelGenerator.initializeDungeon(40, 40, usePlayerStore.getState().level);
    setLocation('dungeon');
  };

  return (
    <main className="absolute inset-0 flex items-center justify-center bg-zinc-950 z-0">
       <button 
         onClick={handleEnterDungeon}
         className="flex items-center gap-4 p-8 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-2xl transition-colors group"
       >
         <div className="flex flex-col text-left">
           <div className="flex items-center gap-2 text-red-500 font-black text-3xl mb-1 uppercase tracking-widest">
             <Map className="w-8 h-8" />
             Enter Dungeon
           </div>
           <div className="text-red-500/60 font-bold uppercase tracking-widest">
             Fight monsters and find loot.
           </div>
         </div>
         <ArrowRight className="w-10 h-10 text-red-500 group-hover:translate-x-2 transition-transform" />
       </button>
    </main>
  );
}
