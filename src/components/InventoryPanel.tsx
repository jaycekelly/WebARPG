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


const RARITY_TEXT_COLORS: Record<Rarity, string> = {
  'Normal': 'text-zinc-200',
  'Magic': 'text-blue-400',
  'Rare': 'text-yellow-400',
  'Epic': 'text-purple-400',
  'Legendary': 'text-orange-400',
  'Unique': 'text-yellow-300',
};

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

    return (
      <button
        onClick={() => item && unequip(slot)}
        onMouseEnter={() => setHoveredEqSlot(slot)}
        onMouseLeave={() => setHoveredEqSlot(null)}
        className={`flex items-center gap-2 py-1 px-1.5 pr-2 transition-all w-full text-left shrink-0 rounded-none ring-1 ring-inset ${
          item 
            ? 'bg-[#1c1c21]/45 ring-transparent hover:ring-accent/40 hover:bg-[#1e1e23] hover:text-text-primary' 
            : 'bg-[#0c0c0f]/30 opacity-65 hover:opacity-100 ring-transparent hover:ring-accent/30 hover:bg-[#1e1e23]/30'
        }`}
      >
        <div className={`w-9 h-9 shrink-0 flex items-center justify-center border ${
          item ? `bg-[#1c1c21] border-white/5 slot-rarity-${item.rarity.toLowerCase()}` : 'bg-[#0c0c0f] border-white/2'
        }`}>
          <Icon className={`w-5 h-5 ${
            item ? RARITY_TEXT_COLORS[item.rarity] : 'text-zinc-500'
          }`} />
        </div>
        <div className="flex flex-col overflow-hidden min-w-0">
           <span className="text-[14px] font-bold uppercase tracking-wider text-text-muted leading-none">{label}</span>
           <span className={`text-[16px] font-semibold truncate leading-tight mt-0.5 ${
             item ? RARITY_TEXT_COLORS[item.rarity] : 'text-text-secondary'
           }`}>
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
        <div className="w-[rem] flex flex-col gap-2 shrink-0">
          {/* Attributes Panel */}
          <div className="flex flex-col">
            <div className="flex items-center justify-center w-full mb-2 mt-2 select-none px-5">
              <div className="flex-1 h-px bg-black" />
              <div className="relative flex items-center justify-center w-8 h-8 mx-[5px] shrink-0 group" title="Character Level">
                <svg className="absolute -top-[9px] -left-[8px] w-11 h-11 pointer-events-none" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path 
                    d="M22 2 L42 22 L22 42 L2 22 Z" 
                    fill="#0c0c0f" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    className="text-accent/40 group-hover:text-accent transition-colors" 
                  />
                </svg>
                <span className="relative text-[26px] font-black text-accent drop-shadow-[0_0_5px_rgba(56,189,248,0.6)] z-10 leading-none pt-[1px]">{level}</span>
              </div>
              <div className="flex-1 h-px bg-black" />
            </div>
            <div className="flex flex-col gap-1 w-full flex-1 justify-center mt-1">
              {(['Strength', 'Dexterity', 'Intelligence', 'Vitality'] as const).map(attr => (
                <div 
                  key={attr} 
                  className="bg-[#0c0c0f] overflow-hidden flex items-center justify-between px-1.5 h-8 w-full"
                  onMouseEnter={() => {
                    const desc = 
                      attr === 'Strength' ? 'Gives 1 armor per point' :
                      attr === 'Dexterity' ? 'Gives 1 haste rating per point' :
                      attr === 'Intelligence' ? 'Gives 1 energy per point' :
                      'Gives 4 hp per point';
                    setHoveredCustom(
                      <div className="w-60 bg-[#141417]/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none">
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
                      <div className="h-3.5 w-px bg-[#2a2a30]/40 mx-1.5 shrink-0" />
                      <span className="font-semibold text-text-primary text-[16px] leading-none shrink-0 w-6 text-center">{getStat(attr).toFixed(0)}</span>
                   </div>
                   {attributePoints > 0 && (
                     <button 
                       onClick={(e) => allocateAttribute(attr, e.shiftKey ? 5 : 1)}
                       className="w-5 h-5 rounded-none bg-accent/20 hover:bg-accent/40 text-accent border border-accent/50 flex items-center justify-center transition-all hover:scale-110 active:scale-95 shrink-0 shadow-[0_0_8px_rgba(56,189,248,0.4)] animate-pulse ml-0.5"
                     >
                       <Plus className="w-3 h-3" />
                     </button>
                   )}
                </div>
              ))}
            </div>
            
            <div className="mt-[calc(1.375rem-4px)] flex justify-start">
              {/* Stats Button */}
               <button 
                 onClick={() => setStatsPopoutOpen(!statsPopoutOpen)}
                 className={`flex items-center gap-1 py-1.5 pl-1.5 pr-3.5 transition-all rounded-none group ring-1 ring-inset ${
                   statsPopoutOpen 
                     ? 'bg-[#1e1e23] ring-accent text-accent font-black shadow-[0_0_8px_rgba(56,189,248,0.25)]' 
                     : 'bg-[#0c0c0f] ring-[#2a2a30]/20 hover:ring-accent/40 hover:bg-[#1e1e23] text-text-secondary hover:text-text-primary'
                 }`}
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
                  className="absolute right-[-9px] top-1/2 -translate-y-1/2 bg-transparent z-20"
                  onMouseEnter={() => setHoveredCustom(
                    <div className="bg-[#141417]/95 backdrop-blur-md border border-transparent shadow-[0_15px_50px_-10px_rgba(0,0,0,0.85)] rounded-none px-2 py-1.5 text-left pointer-events-none whitespace-nowrap">
                      <div className="text-xs text-text-secondary leading-relaxed">
                        Swap weapon set
                      </div>
                    </div>
                  )}
                  onMouseLeave={() => setHoveredCustom(null)}
                >
                   <button
                     onClick={() => swapWeaponSet()}
                     className="w-[1.4rem] h-[1.4rem] bg-[#0c0c0f] hover:bg-[#1e1e23] text-accent ring-1 ring-inset ring-[#2a2a30]/50 hover:ring-accent/40 rounded-none flex items-center justify-center transition-all group shadow-md"
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
                className={`aspect-square w-full h-auto flex items-center justify-center relative transition-all ${
                  item ? `slot-filled slot-rarity-${item.rarity.toLowerCase()}` : 'slot-empty'
                }`}
              >
                {item && (() => {
                  const ItemIcon = ICONS[item.icon] || HelpCircle;
                  return <ItemIcon className={`w-5 h-5 shrink-0 ${RARITY_TEXT_COLORS[item.rarity]}`} />;
                })()}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}

