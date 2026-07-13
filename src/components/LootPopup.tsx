import { useWorldStore } from '../store/useWorldStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { X, CircleDashed } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Item } from '../engine/items/types';
import { ItemTooltip } from './ItemTooltip';
import { useTooltipStore } from '../store/useTooltipStore';
import { ICONS } from './IconLibrary';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RARITY_COLORS: Record<string, string> = {
  Normal: 'text-zinc-400',
  Magic: 'text-blue-500',
  Rare: 'text-yellow-500',
  Epic: 'text-purple-500',
  Legendary: 'text-orange-500',
  Unique: 'text-yellow-300'
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
    setContent(null);
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
    setContent(null);
    lootItem(item);
    removeLootItem(dropId, item.id);
    if (drop.items.length <= 1) {
      handleClose(); // Last item was just looted
    }
  };

  // Clear tooltip when popup closes or unmounts
  const handleClose = () => {
    setContent(null);
    onClose();
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-surface-deep/93 backdrop-blur-md shadow-2xl w-full max-w-sm flex flex-col max-h-[28.125rem] overflow-hidden rounded-none border-none">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle/40 bg-surface-base/93 backdrop-blur-md">
          <h2 className="text-lg font-bold text-text-primary tracking-tight">Loot Nearby</h2>
          <button onClick={handleClose} className="p-1 hover:bg-surface-overlay rounded-none text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {drop.items.map((item) => {
            const Icon = ICONS[item.icon] || CircleDashed;
            return (
              <div 
                key={item.id}
                onClick={() => {
                  handleLootSingle(item);
                  setContent(null); // clear tooltip when looting
                }}
                onMouseEnter={() => setContent(<ItemTooltip item={item} />)}
                onMouseLeave={() => setContent(null)}
                className="flex items-center gap-4 p-3 bg-surface-base rounded-none hover:bg-surface-overlay transition-colors relative group border-none"
              >
                <div className="w-10 h-10 rounded-none bg-black/40 flex items-center justify-center border border-border-subtle/50">
                  <Icon className={cn("w-6 h-6", RARITY_COLORS[item.rarity])} />
                </div>
                <div className="flex-1">
                  <div className={cn("font-bold text-sm", RARITY_COLORS[item.rarity])}>{item.name}</div>
                  <div className="text-xs text-text-secondary uppercase tracking-widest mt-0.5">Level {item.iLvl} • {item.itemType}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-subtle/40 bg-surface-base/93 backdrop-blur-md">
          <button 
            onClick={handleLootAll}
            className="w-full py-3 bg-surface-base hover:bg-surface-overlay text-text-primary font-bold rounded-none transition-colors border border-border-subtle/50"
          >
            Loot All
          </button>
        </div>
      </div>
    </div>
  );
}
