import { useWorldStore } from '../store/useWorldStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { X, Sword, Shield, Circle, CircleDashed } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Item } from '../engine/items/types';
import { ItemTooltip } from './ItemTooltip';
import { useTooltipStore } from '../store/useTooltipStore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RARITY_COLORS = {
  Normal: 'text-zinc-100',
  Magic: 'text-blue-400',
  Rare: 'text-yellow-400',
  Epic: 'text-purple-400',
  Legendary: 'text-orange-400',
  Unique: 'text-amber-500'
};

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'Sword': return Sword;
    case 'Shield': return Shield;
    case 'Circle': return Circle;
    default: return CircleDashed;
  }
};

interface Props {
  dropId: string;
  onClose: () => void;
}

export function LootPopup({ dropId, onClose }: Props) {
  const { lootDrops, removeLootItem, removeLootDrop } = useWorldStore();
  const { lootItem } = useInventoryStore();
  const setContent = useTooltipStore(state => state.setContent);
  
  const drop = lootDrops.find(d => d.id === dropId);
  
  // Auto-close if empty
  if (!drop || drop.items.length === 0) {
    onClose();
    return null;
  }

  const handleLootAll = () => {
    drop.items.forEach(item => {
      lootItem(item);
    });
    removeLootDrop(dropId);
    onClose();
  };

  const handleLootSingle = (item: Item) => {
    lootItem(item);
    removeLootItem(dropId, item.id);
    if (drop.items.length <= 1) {
      onClose(); // Last item was just looted
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl w-full max-w-sm flex flex-col max-h-[80vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-100 tracking-tight">Loot Nearby</h2>
          <button onClick={onClose} className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {drop.items.map((item) => {
            const Icon = getIcon(item.icon);
            return (
              <div 
                key={item.id}
                onClick={() => {
                  handleLootSingle(item);
                  setContent(null); // clear tooltip when looting
                }}
                onMouseEnter={() => setContent(<ItemTooltip item={item} />)}
                onMouseLeave={() => setContent(null)}
                className="flex items-center gap-4 p-3 bg-zinc-800/30 border border-zinc-700/50 rounded-lg cursor-pointer hover:bg-zinc-800/80 transition-colors relative group"
              >
                <div className="w-10 h-10 rounded-md bg-black/40 flex items-center justify-center border border-zinc-700">
                  <Icon className={cn("w-6 h-6", RARITY_COLORS[item.rarity])} />
                </div>
                <div className="flex-1">
                  <div className={cn("font-bold text-sm", RARITY_COLORS[item.rarity])}>{item.name}</div>
                  <div className="text-xs text-zinc-400 uppercase tracking-widest mt-0.5">Level {item.iLvl} • {item.itemType}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <button 
            onClick={handleLootAll}
            className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-bold rounded-lg transition-colors border border-zinc-700 hover:border-zinc-600"
          >
            Loot All
          </button>
        </div>
      </div>
    </div>
  );
}
