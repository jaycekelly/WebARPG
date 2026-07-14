import type { Item, Rarity } from '../engine/items/types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { usePlayerStore } from '../store/usePlayerStore';
import { useStatsStore } from '../store/useStatsStore';
import { formatStatName } from '../engine/stats/StatFormatter';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DAMAGE_TYPE_COLORS: Record<string, string> = {
  Strike: 'text-zinc-200',
  Pierce: 'text-stone-300',
  Fire: 'text-orange-500',
  Cold: 'text-blue-300',
  Lightning: 'text-purple-500'
};

const RARITY_COLORS: Record<Rarity, string> = {
  Normal: 'text-zinc-400',
  Magic: 'text-blue-500',
  Rare: 'text-yellow-500',
  Epic: 'text-purple-500',
  Legendary: 'text-orange-500',
  Unique: 'text-yellow-300',
};

interface Props {
  item: Item;
}

export function ItemTooltip({ item }: Props) {
  const { level } = usePlayerStore();
  const { getStat } = useStatsStore();
  
  return (
    <div className="w-60 bg-surface-deep/95 backdrop-blur-md border border-transparent shadow-depth-md rounded-none px-2 py-1.5 text-left pointer-events-none">
      <div className={cn("font-bold text-sm mb-1 tracking-tight", RARITY_COLORS[item.rarity])}>
        {item.name}
      </div>
      
      <div className="flex justify-between items-center text-[0.625rem] text-text-secondary border-b border-border-subtle/40 pb-1 mb-1 uppercase tracking-widest">
        <span>{item.itemType.replace('weapon-', 'Weapon (').replace('1h', '1H)').replace('2h', '2H)')}</span>
        <span>iLvl {item.iLvl}</span>
      </div>

      {item.itemType.startsWith('weapon-') && (
        <div className="flex justify-between items-center text-[0.625rem] text-text-secondary border-b border-border-subtle/40 pb-1 mb-1 uppercase tracking-widest">
           <span className={DAMAGE_TYPE_COLORS[item.damageType || 'Strike'] || 'text-zinc-200'}>{item.damageType || 'Strike'}</span>
           <span>{item.weaponRange !== undefined && item.weaponRange > 1 ? `Range ${item.weaponRange}` : 'Melee'}</span>
        </div>
      )}

      {item.baseBlockChance !== undefined && item.itemType === 'shield' && (
        <div className="mb-1">
          <div className="text-xs text-text-secondary">
            {item.baseBlockChance}% Block Chance
          </div>
        </div>
      )}

      {item.baseStats.length > 0 && (
        <div className="space-y-0.5 mb-1">
          {item.baseStats.map((stat, i) => {
            let finalValue = stat.value;
            let isUpgraded = false;
            
            for (const affix of item.affixes) {
              if (affix.stat && affix.stat.stat === stat.stat) {
                const isPercentStat = stat.stat.includes('Percent') || stat.stat.includes('Chance');
                if (affix.stat.type === 'flat' || affix.stat.type === stat.type || isPercentStat) {
                  finalValue += affix.stat.value;
                  isUpgraded = true;
                }
              }
            }

            let suffix = stat.type === 'increased' ? '%' : '';
            
            if (stat.stat === 'WeaponDamage') {
              const min = Math.floor(finalValue * 0.75);
              const max = Math.ceil(finalValue * 1.25);
              return (
                <div key={i}>
                  <div className={cn("text-xs", isUpgraded ? "text-blue-500 font-bold" : "text-text-secondary")}>
                    {min} - {max} Damage
                  </div>
                  {item.weaponAttackSpeed && (
                    <div className="text-xs text-text-secondary">
                      {parseFloat(item.weaponAttackSpeed.toFixed(2))} APS
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
              <div key={i} className={cn("text-xs", isUpgraded ? "text-blue-500 font-bold" : "text-text-secondary")}>
                {finalValue}{suffix} {displayName}
              </div>
            );
          })}
        </div>
      )}

      {item.affixes.length > 0 && (
        <div className="space-y-0.5 mt-1 pt-1 border-t border-border-subtle/40">
          {item.affixes.map((affix) => (
            <div key={affix.id} className="text-xs text-blue-500">
              {affix.description}
            </div>
          ))}
        </div>
      )}
      
      {item.requirements && (
        <div className="mt-1 pt-1 border-t border-border-subtle/40 space-y-0.5">
           <div className="text-[0.625rem] text-text-secondary font-bold uppercase tracking-widest">Requires:</div>
           {item.requirements.level && (
              <div className={cn("text-xs", level >= item.requirements.level ? 'text-text-secondary' : 'text-red-500')}>
                 Level {item.requirements.level}
              </div>
           )}
           {item.requirements.strength && (
              <div className={cn("text-xs", getStat('Strength') >= item.requirements.strength ? 'text-text-secondary' : 'text-red-500')}>
                 {item.requirements.strength} Strength
              </div>
           )}
           {item.requirements.dexterity && (
              <div className={cn("text-xs", getStat('Dexterity') >= item.requirements.dexterity ? 'text-text-secondary' : 'text-red-500')}>
                 {item.requirements.dexterity} Dexterity
              </div>
           )}
           {item.requirements.intelligence && (
              <div className={cn("text-xs", getStat('Intelligence') >= item.requirements.intelligence ? 'text-text-secondary' : 'text-red-500')}>
                 {item.requirements.intelligence} Intelligence
              </div>
           )}
           {item.requirements.vitality && (
              <div className={cn("text-xs", getStat('Vitality') >= item.requirements.vitality ? 'text-text-secondary' : 'text-red-500')}>
                 {item.requirements.vitality} Vitality
              </div>
           )}
        </div>
      )}
    </div>
  );
}

