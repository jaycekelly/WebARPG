import type { Item, Rarity } from '../engine/items/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePlayerStore } from '../store/usePlayerStore';
import { useStatsStore } from '../store/useStatsStore';
import { formatStatName } from '../engine/stats/StatFormatter';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const RARITY_COLORS: Record<Rarity, string> = {
  Normal: 'text-zinc-400',
  Magic: 'text-blue-500',
  Rare: 'text-yellow-500',
  Epic: 'text-purple-500',
  Legendary: 'text-sky-400',
  Unique: 'text-amber-500'
};

interface Props {
  item: Item;
}

export function ItemTooltip({ item }: Props) {
  const { level } = usePlayerStore();
  const { getStat } = useStatsStore();
  
  return (
    <div className="bg-zinc-900/95 border border-zinc-700 shadow-2xl rounded-lg pt-2 pb-3 px-3 w-64 backdrop-blur-md text-sm flex flex-col gap-2">
      <div className={cn("font-bold text-base tracking-tight", RARITY_COLORS[item.rarity])}>
        {item.name}
      </div>
      
      <div className="flex justify-between items-center text-xs text-zinc-400 border-b border-zinc-800 pb-2 uppercase tracking-widest">
        <span>{item.itemType.replace('weapon-', 'Weapon (').replace('1h', '1H)').replace('2h', '2H)')}</span>
        <span>iLvl {item.iLvl}</span>
      </div>

      {item.baseStats.length > 0 && (
        <div className="space-y-1">
          {item.baseStats.map((stat, i) => {
            const sign = stat.value > 0 ? '+' : '';
            let suffix = stat.type === 'increased' ? '%' : '';
            
            if (stat.stat === 'Damage') {
              const min = Math.floor(stat.value * 0.75);
              const max = Math.ceil(stat.value * 1.25);
              return (
                <div key={i}>
                  <div className="text-zinc-400">
                    {min} - {max} Damage
                  </div>
                  {item.weaponAttackSpeed && (
                    <div className="text-zinc-400">
                      {item.weaponAttackSpeed.toFixed(2)} APS
                    </div>
                  )}
                </div>
              );
            }
            
            let displayName = formatStatName(stat.stat);
            if (displayName.startsWith('% ')) {
                displayName = displayName.substring(2);
                if (suffix === '') suffix = '%'; // fallback if they forgot type='increased'
            }

            return (
              <div key={i} className="text-zinc-400">
                {sign}{stat.value}{suffix} {displayName}
              </div>
            );
          })}
        </div>
      )}

      {item.affixes.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-zinc-800/50">
          {item.affixes.map((affix) => (
            <div key={affix.id} className="text-blue-500">
              {affix.description}
            </div>
          ))}
        </div>
      )}
      
      {item.requirements && (
        <div className="pt-2 border-t border-zinc-800/50 text-xs space-y-1">
           <div className="text-zinc-400 font-bold">Requires:</div>
           {item.requirements.level && (
              <div className={level >= item.requirements.level ? 'text-zinc-400' : 'text-red-500'}>
                 Level {item.requirements.level}
              </div>
           )}
           {item.requirements.strength && (
              <div className={getStat('Strength') >= item.requirements.strength ? 'text-zinc-400' : 'text-red-500'}>
                 {item.requirements.strength} Strength
              </div>
           )}
           {item.requirements.dexterity && (
              <div className={getStat('Dexterity') >= item.requirements.dexterity ? 'text-zinc-400' : 'text-red-500'}>
                 {item.requirements.dexterity} Dexterity
              </div>
           )}
           {item.requirements.intelligence && (
              <div className={getStat('Intelligence') >= item.requirements.intelligence ? 'text-zinc-400' : 'text-red-500'}>
                 {item.requirements.intelligence} Intelligence
              </div>
           )}
           {item.requirements.vitality && (
              <div className={getStat('Vitality') >= item.requirements.vitality ? 'text-zinc-400' : 'text-red-500'}>
                 {item.requirements.vitality} Vitality
              </div>
           )}
        </div>
      )}
      
      {item.value > 0 && (
        <div className="pt-2 border-t border-zinc-800/50 text-xs text-yellow-500/70 font-semibold flex justify-between">
          <span>Sell Value</span>
          <span>{item.value} Gold</span>
        </div>
      )}
    </div>
  );
}
