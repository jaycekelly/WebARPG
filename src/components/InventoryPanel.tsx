import { useInventoryStore } from '../store/useInventoryStore';
import type { EquipmentSlot, Item, Rarity } from '../engine/items/types';
import { Sword, Shield, Circle, PackageOpen, HelpCircle } from 'lucide-react';

const SLOT_ICONS: Record<string, React.ElementType> = {
  'helm': HelpCircle, // Add proper icons later
  'chest': Shield,
  'gloves': HelpCircle,
  'pants': HelpCircle,
  'boots': HelpCircle,
  'weapon1': Sword,
  'weapon2': Sword,
  'amulet': Circle,
  'ring1': Circle,
  'ring2': Circle,
};

const ICONS: Record<string, React.ElementType> = {
  'Sword': Sword,
  'Shield': Shield,
  'Circle': Circle,
};

const RARITY_COLORS: Record<Rarity, string> = {
  'Normal': 'border-zinc-600 text-zinc-300',
  'Magic': 'border-blue-500 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
  'Rare': 'border-yellow-500 text-yellow-400 shadow-[0_0_8px_rgba(234,179,8,0.2)]',
  'Epic': 'border-purple-500 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.3)]',
  'Legendary': 'border-orange-500 text-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  'Unique': 'border-amber-400 text-amber-300 shadow-[0_0_8px_rgba(251,191,36,0.4)]',
};

const getTooltip = (item: Item | undefined, slotLabel: string) => {
  if (!item) return `Empty ${slotLabel}`;
  
  let tooltip = `${item.name}\n${item.rarity} ${item.itemType} (iLvl ${item.iLvl})\n`;
  
  if (item.baseStats.length > 0) {
     tooltip += `\n-- Base Stats --\n`;
     item.baseStats.forEach(stat => {
        const sign = stat.value > 0 ? '+' : '';
        const suffix = stat.type === 'increased' ? '%' : '';
        tooltip += `${sign}${stat.value}${suffix} ${stat.stat}\n`;
     });
  }

  if (item.affixes.length > 0) {
     tooltip += `\n-- Affixes --\n`;
     item.affixes.forEach(affix => {
        tooltip += `${affix.description}\n`;
     });
  }
  
  tooltip += `\n(Click to unequip)`;
  return tooltip;
};

const getTooltipBag = (item: Item | undefined) => {
  if (!item) return `Empty slot`;
  const t = getTooltip(item, '');
  return t.replace('(Click to unequip)', '(Click to equip)');
};

export function InventoryPanel() {
  const { inventory, equipment, equip, unequip } = useInventoryStore();

  const renderEquipmentSlot = (slot: EquipmentSlot, label: string) => {
    const item = equipment[slot];
    const Icon = item ? (ICONS[item.icon] || HelpCircle) : (SLOT_ICONS[slot] || HelpCircle);

    const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-zinc-900/50 border-zinc-800 text-zinc-600';

    return (
      <button
        onClick={() => item && unequip(slot)}
        className={`w-12 h-12 flex flex-col items-center justify-center border rounded transition-all group relative bg-zinc-800 hover:bg-zinc-700
          ${rarityClasses}
        `}
        title={getTooltip(item, label)}
      >
        <Icon className={`w-5 h-5`} />
        <span className="text-[8px] mt-1 font-bold uppercase tracking-wider opacity-50">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Paper Doll Equipment */}
        <div className="grid grid-cols-3 gap-2 mb-6 justify-items-center">
          <div className="col-start-2">{renderEquipmentSlot('helm', 'Helm')}</div>
          
          <div className="col-start-1">{renderEquipmentSlot('weapon1', 'Wep 1')}</div>
          <div className="col-start-2">{renderEquipmentSlot('chest', 'Chest')}</div>
          <div className="col-start-3">{renderEquipmentSlot('weapon2', 'Wep 2')}</div>
          
          <div className="col-start-1">{renderEquipmentSlot('gloves', 'Gloves')}</div>
          <div className="col-start-2">{renderEquipmentSlot('pants', 'Pants')}</div>
          <div className="col-start-3">{renderEquipmentSlot('amulet', 'Amulet')}</div>
          
          <div className="col-start-1">{renderEquipmentSlot('ring1', 'Ring')}</div>
          <div className="col-start-2">{renderEquipmentSlot('boots', 'Boots')}</div>
          <div className="col-start-3">{renderEquipmentSlot('ring2', 'Ring')}</div>
        </div>

        {/* Bag Header */}
        <div className="flex items-center gap-2 mb-3 text-zinc-400 text-xs font-bold uppercase tracking-wider">
          <PackageOpen className="w-4 h-4" /> Backpack
        </div>

        {/* Bag Grid */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 15 }).map((_, i) => {
            const item = inventory[i];
            const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-zinc-900/30 border-zinc-800/50';

            return (
              <button
                key={i}
                onClick={() => item && equip(i)}
                className={`w-12 h-12 flex items-center justify-center border rounded transition-colors bg-zinc-800 hover:bg-zinc-700
                  ${rarityClasses}
                `}
                title={getTooltipBag(item)}
              >
                {item && (
                  (() => {
                    const ItemIcon = ICONS[item.icon] || HelpCircle;
                    return <ItemIcon className="w-6 h-6 text-zinc-300" />;
                  })()
                )}
              </button>
            );
          })}
        </div>
    </div>
  );
}
