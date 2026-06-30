import { Sparkles, Package } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Item } from '../engine/items/types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RARITY_COLORS = {
  Normal: 'text-zinc-300 drop-shadow-[0_0_8px_rgba(212,212,216,0.5)]',
  Magic: 'text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.5)]',
  Rare: 'text-yellow-300 drop-shadow-[0_0_8px_rgba(253,224,71,0.5)]',
  Epic: 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.5)]',
  Legendary: 'text-orange-400 drop-shadow-[0_0_8px_rgba(251,146,60,0.5)]',
  Unique: 'text-amber-600 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]'
};

const RARITY_VALUES = {
  Normal: 0,
  Magic: 1,
  Rare: 2,
  Epic: 3,
  Legendary: 4,
  Unique: 5
};

interface Props {
  items: Item[];
}

export function LootPile({ items }: Props) {
  if (items.length === 0) return null;

  const highestRarityItem = items.reduce((prev, curr) => {
    return RARITY_VALUES[curr.rarity] > RARITY_VALUES[prev.rarity] ? curr : prev;
  });

  const glowColor = RARITY_COLORS[highestRarityItem.rarity];
  const isMultiple = items.length > 1;

  return (
    <div className="w-full h-full flex items-center justify-center animate-bounce [animation-iteration-count:1] z-10">
      {isMultiple ? (
        <Package className={cn("w-3/5 h-3/5", glowColor)} />
      ) : (
        <Sparkles className={cn("w-3/5 h-3/5", glowColor)} />
      )}
    </div>
  );
}
