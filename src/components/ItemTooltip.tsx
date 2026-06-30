import type { Item, Rarity } from '../engine/items/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RARITY_COLORS: Record<Rarity, string> = {
  Normal: 'text-zinc-400',
  Magic: 'text-blue-500',
  Rare: 'text-yellow-500',
  Epic: 'text-purple-500',
  Legendary: 'text-orange-500',
  Unique: 'text-amber-500'
};

interface Props {
  item: Item;
}

export function ItemTooltip({ item }: Props) {
  return (
    <div className="bg-zinc-950/95 border border-zinc-700 shadow-2xl rounded-lg p-4 w-64 backdrop-blur-md text-sm">
      <div className={cn("font-bold text-base tracking-tight mb-1", RARITY_COLORS[item.rarity])}>
        {item.name}
      </div>
      
      <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-2 mb-2 uppercase tracking-widest">
        <span>{item.itemType}</span>
        <span>iLvl {item.iLvl}</span>
      </div>

      {item.baseStats.length > 0 && (
        <div className="space-y-1 mb-3">
          {item.baseStats.map((stat, i) => {
            const sign = stat.value > 0 ? '+' : '';
            const suffix = stat.type === 'increased' ? '%' : '';
            return (
              <div key={i} className="text-zinc-400">
                {sign}{stat.value}{suffix} {stat.stat}
              </div>
            );
          })}
        </div>
      )}

      {item.affixes.length > 0 && (
        <div className="space-y-1 mb-2 pt-2 border-t border-zinc-800/50">
          {item.affixes.map((affix) => (
            <div key={affix.id} className="text-blue-500">
              {affix.description}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-widest text-center">
        Left Click to interact
      </div>
    </div>
  );
}
