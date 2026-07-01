import { useInventoryStore } from '../store/useInventoryStore';
import { useAppStore } from '../store/useAppStore';
import { useTooltipStore } from '../store/useTooltipStore';
import type { EquipmentSlot, Rarity } from '../engine/items/types';
import { Sword, Shield, Circle, HelpCircle, Crown, Shirt, Hexagon, Hand, Footprints, Book, ShieldAlert } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

const SLOT_ICONS: Record<string, React.ElementType> = {
  'helm': Crown,
  'chest': Shirt,
  'gloves': Hand,
  'legs': Hexagon,
  'boots': Footprints,
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
  'Crown': Crown,
  'Shirt': Shirt,
  'Hexagon': Hexagon,
  'Hand': Hand,
  'Footprints': Footprints,
  'Book': Book,
  'ShieldAlert': ShieldAlert
};

const RARITY_COLORS: Record<Rarity, string> = {
  'Normal': 'border-zinc-500 text-zinc-400',
  'Magic': 'border-blue-500 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
  'Rare': 'border-yellow-500 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.2)]',
  'Epic': 'border-purple-500 text-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]',
  'Legendary': 'border-orange-500 text-sky-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  'Unique': 'border-amber-500 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
};





export function InventoryPanel() {
  const { inventory, equipment, equip, unequip, sellItem } = useInventoryStore();
  const { location, vendorOpen } = useAppStore();
  const { setContent } = useTooltipStore();

  const renderEquipmentSlot = (slot: EquipmentSlot, label: string) => {
    const item = equipment[slot];
    const Icon = item ? (ICONS[item.icon] || HelpCircle) : (SLOT_ICONS[slot] || HelpCircle);

    const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-zinc-900/50 border-zinc-800 text-zinc-600';

    return (
      <button
        onClick={() => item && unequip(slot)}
        onMouseEnter={() => item && setContent(<ItemTooltip item={item} />)}
        onMouseLeave={() => setContent(null)}
        className={`w-12 h-12 flex flex-col items-center justify-center border rounded transition-all group relative bg-zinc-800 hover:bg-zinc-700
          ${rarityClasses}
        `}
      >
        <Icon className={`w-5 h-5 text-zinc-100`} />
        <span className="text-[8px] mt-1 font-bold uppercase tracking-wider opacity-50">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Paper Doll Equipment */}
        <div className="grid grid-cols-3 gap-2 mb-2 justify-items-center">
          <div className="col-start-2">{renderEquipmentSlot('helm', 'Helm')}</div>
          <div className="col-start-3">{renderEquipmentSlot('amulet', 'Amulet')}</div>
          
          <div className="col-start-1">{renderEquipmentSlot('weapon1', 'Wep 1')}</div>
          <div className="col-start-2">{renderEquipmentSlot('chest', 'Chest')}</div>
          <div className="col-start-3">{renderEquipmentSlot('weapon2', 'Wep 2')}</div>
          
          <div className="col-start-1">{renderEquipmentSlot('gloves', 'Gloves')}</div>
          <div className="col-start-2">{renderEquipmentSlot('legs', 'Legs')}</div>
          
          <div className="col-start-1">{renderEquipmentSlot('ring1', 'Ring')}</div>
          <div className="col-start-2">{renderEquipmentSlot('boots', 'Boots')}</div>
          <div className="col-start-3">{renderEquipmentSlot('ring2', 'Ring')}</div>
        </div>

        {/* Bag Header */}
        <h3 className="text-sm font-bold text-zinc-400 mt-2 mb-1 flex items-center gap-1.5">
          Backpack
        </h3>

        {/* Bag Grid */}
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: 20 }).map((_, i) => {
            const item = inventory[i];
            const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-zinc-900/30 border-zinc-800/50';

            return (
              <button
                key={i}
                onClick={() => {
                  if (!item) return;
                  if (location === 'town' && vendorOpen) {
                    sellItem(i);
                    setContent(null); // Hide tooltip after selling
                  } else {
                    equip(i);
                  }
                }}
                onMouseEnter={() => item && setContent(<ItemTooltip item={item} />)}
                onMouseLeave={() => setContent(null)}
                className={`w-12 h-12 flex items-center justify-center border rounded transition-colors bg-zinc-800 hover:bg-zinc-700
                  ${rarityClasses}
                `}
              >
                {item && (
                  (() => {
                    const ItemIcon = ICONS[item.icon] || HelpCircle;
                    return <ItemIcon className="w-6 h-6 text-zinc-100" />;
                  })()
                )}
              </button>
            );
          })}
        </div>

    </div>
  );
}
