import { useEffect, useState } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { useStatsStore } from '../store/useStatsStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { useTooltipStore } from '../store/useTooltipStore';
import type { EquipmentSlot, Rarity } from '../engine/items/types';
import { Sword, HelpCircle, Plus, ChevronLeft, ArrowRightLeft } from 'lucide-react';
// Removed Tabler imports
import { ItemTooltip } from './ItemTooltip';
import { ICONS } from './IconLibrary';

const SLOT_ICONS: Record<string, React.ElementType> = {
  'helm': ICONS['helmet'] || HelpCircle,
  'chest': ICONS['chest_armor'] || HelpCircle,
  'gloves': ICONS['gloves'] || HelpCircle,
  'legs': ICONS['leg_armor'] || HelpCircle,
  'boots': ICONS['boots'] || HelpCircle,
  'weapon1': Sword,
  'weapon2': Sword,
  'amulet': ICONS['amulet'] || HelpCircle,
  'ring1': ICONS['ring'] || HelpCircle,
  'ring2': ICONS['ring'] || HelpCircle,
};


const RARITY_COLORS: Record<Rarity, string> = {
  'Normal': 'text-text-secondary',
  'Magic': 'text-blue-500',
  'Rare': 'text-yellow-500',
  'Epic': 'text-purple-500',
  'Legendary': 'text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.5)]',
  'Unique': 'text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)]',
};

// Slot button — purely responsive based on parent grid
const SLOT_CLASS = 'flex items-center justify-center transition-all relative bg-black/60 hover:bg-zinc-800 z-10';

export function InventoryPanel() {
  const { inventory, equipment, equip, unequip, sellItem, activeWeaponSet, swapWeaponSet } = useInventoryStore();
  const { getStat } = useStatsStore();
  const { attributePoints, allocateAttribute, level } = usePlayerStore();
  const { location, vendorOpen, statsPopoutOpen, setStatsPopoutOpen } = useAppStore();
  const { setContent } = useTooltipStore();

  const [hoveredInvIndex, setHoveredInvIndex] = useState<number | null>(null);
  const [hoveredEqSlot, setHoveredEqSlot] = useState<EquipmentSlot | null>(null);
  const [hoveredCustom, setHoveredCustom] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    return () => setContent(null);
  }, [setContent]);

  useEffect(() => {
    if (hoveredCustom) {
      setContent(hoveredCustom);
    } else if (hoveredInvIndex !== null) {
      const item = inventory[hoveredInvIndex];
      setContent(item ? <ItemTooltip item={item} /> : null);
    } else if (hoveredEqSlot !== null) {
      const item = equipment[hoveredEqSlot];
      setContent(item ? <ItemTooltip item={item} /> : null);
    } else {
      setContent(null);
    }
  }, [inventory, equipment, hoveredInvIndex, hoveredEqSlot, hoveredCustom, setContent]);

  const renderEquipmentRow = (slot: EquipmentSlot, label: string) => {
    const item = equipment[slot];
    const Icon = item ? (ICONS[item.icon] || HelpCircle) : (SLOT_ICONS[slot] || HelpCircle);
    // Custom borders for the list items
    const iconClasses = item ? RARITY_COLORS[item.rarity] : 'bg-black/60 text-text-muted';

    return (
      <button
        onClick={() => item && unequip(slot)}
        onMouseEnter={() => setHoveredEqSlot(slot)}
        onMouseLeave={() => setHoveredEqSlot(null)}
        className={`flex items-center gap-2 py-1 px-1.5 pr-2 transition-all bg-black/60 hover:bg-zinc-900 w-full text-left shrink-0 ${!item ? 'opacity-40 hover:opacity-80' : ''}`}
      >
        <div className={`w-9 h-9 shrink-0 flex items-center justify-center bg-black/60 ${iconClasses}`}>
          <Icon className={`w-5 h-5 ${item ? 'text-text-primary' : ''}`} />
        </div>
        <div className="flex flex-col overflow-hidden min-w-0">
           <span className="text-[14px] font-bold uppercase tracking-wider text-text-muted leading-none">{label}</span>
           <span className={`text-[16px] font-semibold truncate leading-tight mt-0.5 ${item ? RARITY_COLORS[item.rarity].split(' ')[1] : 'text-text-secondary'}`}>
             {item ? item.name : 'Empty'}
           </span>
        </div>
      </button>
    );
  };

  return (
    <div className="flex flex-col h-full w-full">

      {/* Top Panel: Split Attributes & Loadout */}
      <div className="flex gap-2 shrink-0 mb-2">
        {/* Left Column */}
        <div className="w-[8rem] flex flex-col gap-2 shrink-0">
          {/* Attributes Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-center w-full mb-3 mt-1">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-border-subtle/50" />
              <div className="relative flex items-center justify-center w-7 h-7 mx-2 shrink-0 group" title="Character Level">
                <div className="absolute inset-0 bg-surface-deep border border-accent/50 rotate-45 rounded-[3px] shadow-[0_0_8px_rgba(56,189,248,0.3)] transition-all group-hover:border-accent group-hover:shadow-[0_0_12px_rgba(56,189,248,0.6)]" />
                <span className="relative text-[24px] font-black text-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.8)] z-10 leading-none select-none">{level}</span>
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-border-subtle/50" />
            </div>
            <div className="flex flex-col gap-1 w-full flex-1 justify-center mt-1">
              {(['Strength', 'Dexterity', 'Intelligence', 'Vitality'] as const).map(attr => (
                <div 
                  key={attr} 
                  className="bg-black/60 overflow-hidden flex items-center justify-between px-1.5 h-8 w-full"
                  onMouseEnter={() => {
                    const desc = 
                      attr === 'Strength' ? 'Gives 1 armor per point' :
                      attr === 'Dexterity' ? 'Gives 1 haste rating per point' :
                      attr === 'Intelligence' ? 'Gives 1 energy per point' :
                      'Gives 4 hp per point';
                    setHoveredCustom(
                      <div className="w-60 bg-surface-overlay border border-border-strong shadow-2xl rounded-lg px-2 py-1.5 text-left backdrop-blur-md pointer-events-none">
                        <div className="text-xs text-text-secondary leading-relaxed">
                          {desc}
                        </div>
                      </div>
                    );
                  }}
                  onMouseLeave={() => setHoveredCustom(null)}
                >
                   <div className="flex flex-row items-center flex-1 px-1 overflow-hidden min-w-0">
                     <span className="text-text-secondary text-[12px] uppercase tracking-wide leading-none truncate flex-1">{attr}</span>
                     <div className="h-3.5 w-px bg-border-subtle/80 mx-1.5 shrink-0" />
                     <span className="font-semibold text-text-primary text-[16px] leading-none shrink-0 w-6 text-center">{getStat(attr).toFixed(0)}</span>
                   </div>
                   {attributePoints > 0 && (
                     <button 
                       onClick={(e) => allocateAttribute(attr, e.shiftKey ? 5 : 1)}
                       className="w-5 h-5 rounded bg-accent/20 hover:bg-accent/40 text-accent border border-accent/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.4)] animate-pulse ml-0.5"
                     >
                       <Plus className="w-3 h-3" />
                     </button>
                   )}
                </div>
              ))}
            </div>
            
            <div className="mt-5.5 flex justify-start">
              {/* Stats Button */}
              <button 
                onClick={() => setStatsPopoutOpen(!statsPopoutOpen)}
                className={`flex items-center gap-1 py-1 pl-1 pr-3 transition-all group ${statsPopoutOpen ? 'bg-zinc-800 shadow-inner text-accent' : 'bg-black/60 hover:bg-zinc-800 text-text-secondary hover:text-text-primary shadow-sm'}`}
              >
                <ChevronLeft className={`w-3.5 h-3.5 transition-transform ${statsPopoutOpen ? 'rotate-180 text-accent' : 'text-accent group-hover:-translate-x-0.5'}`} />
                <span className="text-[9px] font-black uppercase tracking-widest leading-none">Stats</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Loadout */}
        <div className="flex-1 flex flex-col bg-black/20 p-2 relative">
          <div className="grid grid-cols-2 gap-0.5 h-full">
            {/* Left Column */}
            <div className="flex flex-col gap-0.5">
              {renderEquipmentRow('helm', 'Head')}
              {renderEquipmentRow('chest', 'Chest')}
              {renderEquipmentRow('legs', 'Legs')}
              {renderEquipmentRow('gloves', 'Hands')}
              {renderEquipmentRow('boots', 'Feet')}
            </div>
            {/* Right Column */}
            <div className="flex flex-col gap-0.5">
              {renderEquipmentRow('amulet', 'Amulet')}
              {renderEquipmentRow('ring1', 'Ring 1')}
              {renderEquipmentRow('ring2', 'Ring 2')}
              
              <div className="relative flex flex-col gap-0.5">
                {renderEquipmentRow('weapon1', `Main Hand (${activeWeaponSet === 1 ? 'I' : 'II'})`)}
                
                {/* Weapon Swap Button */}
                <div 
                  className="absolute right-[-9px] top-1/2 -translate-y-1/2 bg-surface-deep rounded z-20"
                  onMouseEnter={() => setHoveredCustom(
                    <div className="bg-surface-overlay border border-border-strong shadow-2xl rounded-lg px-2 py-1.5 text-left backdrop-blur-md pointer-events-none whitespace-nowrap">
                      <div className="text-xs text-text-secondary leading-relaxed">
                        Swap weapon set
                      </div>
                    </div>
                  )}
                  onMouseLeave={() => setHoveredCustom(null)}
                >
                  <button
                    onClick={() => swapWeaponSet()}
                    className="w-[1.4rem] h-[1.4rem] bg-black/60 hover:bg-zinc-800 rounded flex items-center justify-center transition-all group shadow-md"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5 text-accent transition-transform group-hover:scale-110" />
                  </button>
                </div>
                
                {renderEquipmentRow('weapon2', `Off Hand (${activeWeaponSet === 1 ? 'I' : 'II'})`)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Panel: Backpack */}
      <div className="flex flex-col flex-1 overflow-hidden min-h-0 bg-black/20">
        <div className="grid grid-cols-10 gap-1 auto-rows-max px-1.5 pt-1.5 pb-1 content-start flex-1 overflow-y-auto custom-scrollbar">
          {Array.from({ length: 50 }).map((_, i) => {
            const item = inventory[i] ?? null;
            const rarityClasses = item ? RARITY_COLORS[item.rarity] : 'bg-black/60';

            return (
              <button
                key={i}
                onClick={() => {
                  if (!item) return;
                  if (location === 'town' && vendorOpen) {
                    sellItem(i);
                  } else {
                    equip(i);
                  }
                }}
                onMouseEnter={() => setHoveredInvIndex(i)}
                onMouseLeave={() => setHoveredInvIndex(null)}
                className={`${SLOT_CLASS} ${rarityClasses} aspect-square w-full h-auto`}
              >
                {item && (() => {
                  const ItemIcon = ICONS[item.icon] || HelpCircle;
                  return <ItemIcon className="w-5 h-5 shrink-0 text-text-primary" />;
                })()}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

