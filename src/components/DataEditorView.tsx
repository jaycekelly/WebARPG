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
    <div className="flex-1 bg-surface-deep p-8 flex flex-col h-screen overflow-hidden">
      <div className="flex items-center gap-4 border-b border-border-subtle pb-4 mb-8">
        <button 
          onClick={() => setLocation('town')}
          className="text-text-secondary hover:text-text-primary transition-colors flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Game
        </button>
        <div className="h-6 w-px bg-border-subtle mx-2" />
        <Database className="w-6 h-6 text-accent" />
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Game Data Editor</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Debug Spawner */}
          <section className="bg-surface-base border border-border-subtle rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-accent" />
              Debug Item Spawner
            </h2>
            <div className="flex gap-4">
              <button 
                onClick={() => {
                   const item = ItemGenerator.generateLoot('rusty_sword', level);
                   if (item) lootItem(item);
                 }}
                className="flex items-center justify-center gap-2 bg-surface-base hover:bg-surface-raised py-3 px-4 rounded-lg text-text-primary transition-colors font-medium border border-border-subtle hover:border-accent/50"
              >
                <PlusCircle className="w-4 h-4" /> Loot 1H Sword
              </button>
              <button 
                onClick={() => {
                   const item = ItemGenerator.generateLoot('iron_greatsword', level);
                   if (item) lootItem(item);
                 }}
                className="flex items-center justify-center gap-2 bg-surface-base hover:bg-surface-raised py-3 px-4 rounded-lg text-text-primary transition-colors font-medium border border-border-subtle hover:border-accent/50"
              >
                <PlusCircle className="w-4 h-4" /> Loot 2H Sword
              </button>
              <button 
                onClick={() => {
                   const item = ItemGenerator.generateLoot('leather_tunic', level);
                   if (item) lootItem(item);
                 }}
                className="flex items-center justify-center gap-2 bg-surface-base hover:bg-surface-raised py-3 px-4 rounded-lg text-text-primary transition-colors font-medium border border-border-subtle hover:border-accent/50"
              >
                <PlusCircle className="w-4 h-4" /> Loot Armor
              </button>
            </div>
            <p className="text-sm text-text-secondary mt-4">
              These items are pushed directly to your inventory (or ground if full). They scale to your current level ({level}).
            </p>
          </section>

          {/* Placeholder for future tools */}
          <section className="bg-surface-base/50 border border-border-subtle border-dashed rounded-xl p-6 flex flex-col items-center justify-center h-48 text-text-muted">
            <Database className="w-8 h-8 mb-2 opacity-50" />
            <p>More data editing tools will be added here (e.g., Enemy Tuner, Item Creator, Skill Tuner).</p>
          </section>

        </div>
      </div>
    </div>
  );
}
