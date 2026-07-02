import { useInventoryStore } from '../store/useInventoryStore';
import { useAppStore } from '../store/useAppStore';
import { useTooltipStore } from '../store/useTooltipStore';
import type { EquipmentSlot, Rarity } from '../engine/items/types';
import { Sword, Shield, Circle, HelpCircle, Crown, Shirt, Hexagon, Hand, Footprints, Book, ShieldAlert, Layers } from 'lucide-react';
import { ItemTooltip } from './ItemTooltip';

const SLOT_ICONS: Record<string, React.ElementType> = {
  'helm': Crown,
  'chest': Shirt,
  'gloves': Hand,
  'legs': Layers,
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
  'Layers': Layers,
  'Hexagon': Hexagon,
  'Hand': Hand,
  'Footprints': Footprints,
  'Book': Book,
  'ShieldAlert': ShieldAlert
};

const RARITY_COLORS: Record<Rarity, string> = {
  'Normal': 'border-border-strong text-text-secondary',
  'Magic': 'border-blue-500 text-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.2)]',
  'Rare': 'border-yellow-500 text-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.2)]',
  'Epic': 'border-purple-500 text-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.3)]',
  'Legendary': 'border-orange-500 text-sky-400 shadow-[0_0_8px_rgba(249,115,22,0.3)]',
  'Unique': 'border-amber-500 text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]',
};

// Slot button — uniform size, purely rem-based so it scales with the UI font-size
const SLOT_CLASS = 'w-10 h-10 flex items-center justify-center border rounded transition-all relative bg-surface-base hover:bg-surface-raised';

export function InventoryPanel() {
  const { inventory, equipment, equip, unequip, sellItem } = useInventoryStore();
  const { location, vendorOpen } = useAppStore();
  const { setContent } = useTooltipStore();

  const renderEquipmentSlot = (slot: EquipmentSlot) => {
    const item = equipment[slot];
    const Icon = item ? (ICONS[item.icon] || HelpCircle) : (SLOT_ICONS[slot] || HelpCircle);
    const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-surface-base border-border-subtle';

    return (
      <button
        onClick={() => item && unequip(slot)}
        onMouseEnter={() => item && setContent(<ItemTooltip item={item} />)}
        onMouseLeave={() => setContent(null)}
        className={`${SLOT_CLASS} ${rarityClasses}`}
      >
        <Icon className={`w-6 h-6 shrink-0 ${item ? 'text-text-primary' : 'text-text-muted opacity-40'}`} />
      </button>
    );
  };

  return (
    // Everything is w-max so container naturally sizes to content — no hardcoded px widths
    <div className="flex flex-col items-center gap-2 py-4 w-max mx-auto">

      {/* Paper Doll — 3-col grid, gap-3 uniform */}
      <div className="grid grid-cols-3 gap-3 justify-items-center">
        {/* row 1 */}
        <div className="invisible" aria-hidden /> {/* col 1 spacer */}
        <div>{renderEquipmentSlot('helm')}</div>
        <div>{renderEquipmentSlot('amulet')}</div>
        {/* row 2 */}
        <div>{renderEquipmentSlot('weapon1')}</div>
        <div>{renderEquipmentSlot('chest')}</div>
        <div>{renderEquipmentSlot('weapon2')}</div>
        {/* row 3 */}
        <div>{renderEquipmentSlot('gloves')}</div>
        <div>{renderEquipmentSlot('legs')}</div>
        <div className="invisible" aria-hidden /> {/* col 3 spacer */}
        {/* row 4 */}
        <div>{renderEquipmentSlot('ring1')}</div>
        <div>{renderEquipmentSlot('boots')}</div>
        <div>{renderEquipmentSlot('ring2')}</div>
      </div>

      {/* Bag label — left-aligned, full width of the bag grid below */}
      <div className="w-full">
        <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-2 mt-3 mb-0.5">Backpack</h3>
      </div>

      {/* Bag Grid — 6 cols, gap-2, purely rem-based */}
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: 30 }).map((_, i) => {
          const item = inventory[i] ?? null;
          const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-surface-base/30 border-border-subtle/50';

          return (
            <button
              key={i}
              onClick={() => {
                if (!item) return;
                if (location === 'town' && vendorOpen) {
                  sellItem(i);
                  setContent(null);
                } else {
                  equip(i);
                }
              }}
              onMouseEnter={() => item && setContent(<ItemTooltip item={item} />)}
              onMouseLeave={() => setContent(null)}
              className={`${SLOT_CLASS} ${rarityClasses}`}
            >
              {item && (() => {
                const ItemIcon = ICONS[item.icon] || HelpCircle;
                return <ItemIcon className="w-6 h-6 shrink-0 text-text-primary" />;
              })()}
            </button>
          );
        })}
      </div>

    </div>
  );
}
