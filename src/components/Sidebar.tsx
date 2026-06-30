import { useState } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { InventoryPanel } from './InventoryPanel';
import { CharacterSheet } from './CharacterSheet';

export function Sidebar() {
  const { skillPoints } = usePlayerStore();
  const { setSkillTreeOpen } = useAppStore();
  
  const [activeTab, setActiveTab] = useState<'inventory' | 'stats'>('inventory');

  return (
    <div className="w-80 h-full bg-zinc-900 border-r border-zinc-800 flex flex-col z-20 shadow-xl overflow-hidden">
      
      {/* Top Half Spacer */}
      <div className="flex-1 flex-shrink-0" />

      {/* Bottom Half: Tabs */}
      <div className="h-[60%] flex flex-col overflow-hidden">
        {/* Tab Headers */}
        <div className="flex justify-between items-end border-b border-zinc-800 px-4 h-14 bg-zinc-900/50">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'inventory' ? 'text-cyan-500 border-cyan-500' : 'text-zinc-100 border-transparent hover:text-white'}`}
            >
              Inventory
            </button>
            <button 
              onClick={() => setActiveTab('stats')}
              className={`text-sm font-bold pb-2 border-b-2 transition-colors ${activeTab === 'stats' ? 'text-cyan-500 border-cyan-500' : 'text-zinc-100 border-transparent hover:text-white'}`}
            >
              Stats
            </button>
            <button 
              onClick={() => setSkillTreeOpen(true)}
              className={`text-sm font-bold pb-2 border-b-2 transition-colors text-zinc-100 border-transparent hover:text-white flex items-center gap-1.5`}
            >
              Skills
              {skillPoints > 0 && <span className="bg-red-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[9px] animate-pulse">{skillPoints}</span>}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'inventory' && (
            <InventoryPanel />
          )}

          {activeTab === 'stats' && (
            <CharacterSheet />
          )}
        </div>
      </div>

    </div>
  );
}
