import { useAppStore } from '../store/useAppStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { ItemGenerator } from '../engine/items/ItemGenerator';
import { PlusCircle, ArrowLeft, Database } from 'lucide-react';

export function DataEditorView() {
  const { setLocation } = useAppStore();
  const { level } = usePlayerStore();
  const { lootItem } = useInventoryStore();

  return (
    <div className="flex-1 bg-zinc-950 p-8 flex flex-col h-screen overflow-hidden">
      <div className="flex items-center gap-4 border-b border-zinc-800 pb-4 mb-8">
        <button 
          onClick={() => setLocation('town')}
          className="text-zinc-500 hover:text-white transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Game
        </button>
        <div className="h-6 w-px bg-zinc-800 mx-2" />
        <Database className="w-6 h-6 text-emerald-500" />
        <h1 className="text-2xl font-bold text-white tracking-tight">Game Data Editor</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Debug Spawner */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-zinc-100 mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-cyan-500" />
              Debug Item Spawner
            </h2>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                   const item = ItemGenerator.generateLoot('rusty_sword', level);
                   if (item) lootItem(item);
                }}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 py-3 px-4 rounded-lg text-zinc-300 transition-colors font-medium border border-zinc-700 hover:border-cyan-500/50"
              >
                <PlusCircle className="w-4 h-4" /> Loot 1H Sword
              </button>
              <button 
                onClick={() => {
                   const item = ItemGenerator.generateLoot('iron_greatsword', level);
                   if (item) lootItem(item);
                }}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 py-3 px-4 rounded-lg text-zinc-300 transition-colors font-medium border border-zinc-700 hover:border-cyan-500/50"
              >
                <PlusCircle className="w-4 h-4" /> Loot 2H Sword
              </button>
              <button 
                onClick={() => {
                   const item = ItemGenerator.generateLoot('leather_tunic', level);
                   if (item) lootItem(item);
                }}
                className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 py-3 px-4 rounded-lg text-zinc-300 transition-colors font-medium border border-zinc-700 hover:border-cyan-500/50"
              >
                <PlusCircle className="w-4 h-4" /> Loot Armor
              </button>
            </div>
            <p className="text-sm text-zinc-500 mt-4">
              These items are pushed directly to your inventory (or ground if full). They scale to your current level ({level}).
            </p>
          </section>

          {/* Placeholder for future tools */}
          <section className="bg-zinc-900/50 border border-zinc-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center h-48 text-zinc-600">
            <Database className="w-8 h-8 mb-2 opacity-50" />
            <p>More data editing tools will be added here (e.g., Enemy Tuner, Item Creator, Skill Tuner).</p>
          </section>

        </div>
      </div>
    </div>
  );
}
