import { useState } from 'react';
import { useStatsStore } from '../store/useStatsStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { ItemGenerator } from '../engine/items/ItemGenerator';
import { Shield, Sword, PlusCircle, Sparkles } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { InventoryPanel } from './InventoryPanel';

export function Sidebar() {
  const { getStat } = useStatsStore();
  const { lootItem } = useInventoryStore();
  const { skillPoints, level } = usePlayerStore();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'stats'>('inventory');

  return (
    <div className="w-80 bg-zinc-900 border-r border-zinc-800 flex flex-col z-20 shadow-xl overflow-hidden">
      
      {/* Top Half: Debug Actions (For now) */}
      <div className="p-4 border-b border-zinc-800 bg-zinc-950/30">
         <h3 className="text-sm font-semibold uppercase text-zinc-500 mb-3 tracking-wider">Debug Actions</h3>
         <div className="flex flex-col gap-2">
           <button 
             onClick={() => {
                const item = ItemGenerator.generateLoot('rusty_sword', level);
                if (item) lootItem(item);
             }}
             className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs py-2 px-1 rounded text-zinc-300 transition-colors"
           >
             <PlusCircle className="w-3 h-3 flex-shrink-0" /> Loot 1H Sword
           </button>
           <button 
             onClick={() => {
                const item = ItemGenerator.generateLoot('iron_greatsword', level);
                if (item) lootItem(item);
             }}
             className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs py-2 px-1 rounded text-zinc-300 transition-colors"
           >
             <PlusCircle className="w-3 h-3 flex-shrink-0" /> Loot 2H Sword
           </button>
           <button 
             onClick={() => {
                const item = ItemGenerator.generateLoot('leather_tunic', level);
                if (item) lootItem(item);
             }}
             className="flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-xs py-2 rounded text-zinc-300 transition-colors"
           >
             <PlusCircle className="w-3 h-3" /> Loot Armor
           </button>
         </div>
      </div>

      {/* Bottom Half: Tabs */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-zinc-800 px-4 pt-4 gap-4">
          <button 
            onClick={() => setActiveTab('inventory')}
            className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'inventory' ? 'text-orange-400 border-orange-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Inventory
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'stats' ? 'text-orange-400 border-orange-400' : 'text-zinc-500 border-transparent hover:text-zinc-300'}`}
          >
            Stats
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'inventory' && (
            <InventoryPanel />
          )}

          {activeTab === 'stats' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase text-zinc-500 mb-3 tracking-wider flex justify-between items-center">
                Combat Stats
                {skillPoints > 0 && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex items-center gap-1"><Sparkles className="w-3 h-3"/> {skillPoints} pts</span>}
              </h3>
              <div className="bg-zinc-950/50 rounded-lg border border-zinc-800/50 p-3 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-zinc-400"><Sword className="w-4 h-4" /> Damage</span>
                  <span className="font-medium">{getStat('Damage').toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2 text-zinc-400"><Sword className="w-4 h-4" /> Attack Speed</span>
                  <span className="font-medium">{getStat('AttackSpeed').toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-sm mt-4">
                  <span className="flex items-center gap-2 text-zinc-400"><Shield className="w-4 h-4" /> Armor</span>
                  <span className="font-medium">{getStat('Armor')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
