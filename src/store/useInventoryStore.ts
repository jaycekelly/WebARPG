import { create } from 'zustand';
import type { Item, EquipmentSlot, ItemType } from '../engine/items/types';
import { useStatsStore } from './useStatsStore';
import { useCombatStore } from './useCombatStore';

interface InventoryState {
  inventory: Item[];
  equipment: Partial<Record<EquipmentSlot, Item>>;
  
  lootItem: (item: Item) => void;
  equip: (inventoryIndex: number, targetSlot?: EquipmentSlot) => void;
  unequip: (slot: EquipmentSlot) => void;
}

const getDefaultSlot = (type: ItemType): EquipmentSlot | null => {
  switch (type) {
    case 'helm': return 'helm';
    case 'chest': return 'chest';
    case 'gloves': return 'gloves';
    case 'pants': return 'pants';
    case 'boots': return 'boots';
    case 'weapon-1h': return 'weapon1';
    case 'weapon-2h': return 'weapon1';
    case 'amulet': return 'amulet';
    case 'ring': return 'ring1';
    default: return null;
  }
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  inventory: [],
  equipment: {},

  lootItem: (item) => {
    set((state) => ({ inventory: [...state.inventory, item] }));
    useCombatStore.getState().addLog(`Looted ${item.name}.`, 'system');
  },

  equip: (inventoryIndex, targetSlot) => {
    const state = get();
    const item = state.inventory[inventoryIndex];
    if (!item) return;

    // Determine target slot
    let slot = targetSlot || getDefaultSlot(item.itemType);
    if (!slot) return;

    // If ring and ring1 is full but ring2 is empty, auto-slot to ring2
    if (!targetSlot && item.itemType === 'ring' && state.equipment['ring1'] && !state.equipment['ring2']) {
      slot = 'ring2';
    }

    // If 1h weapon and weapon1 is full but weapon2 is empty, auto-slot to weapon2
    if (!targetSlot && item.itemType === 'weapon-1h' && state.equipment['weapon1'] && !state.equipment['weapon2']) {
      // Check if weapon1 is a 2H weapon, if so we can't equip in weapon2 without unequipping weapon1
      if (state.equipment['weapon1'].itemType !== 'weapon-2h') {
        slot = 'weapon2';
      }
    }

    // Handle 2H Weapon equipping logic
    if (item.itemType === 'weapon-2h') {
      slot = 'weapon1';
      // If we are equipping a 2H weapon, we must unequip whatever is in weapon2
      if (state.equipment['weapon2']) {
        get().unequip('weapon2');
      }
    }

    // Handle equipping a 1H weapon into weapon2 while wearing a 2H weapon
    if (slot === 'weapon2' && state.equipment['weapon1']?.itemType === 'weapon-2h') {
       get().unequip('weapon1');
    }

    // Remove item from inventory
    const newInventory = [...get().inventory];
    newInventory.splice(inventoryIndex, 1);

    // If something was already in the slot, put it back in inventory (unequip removes stats too)
    const existingItem = get().equipment[slot];
    if (existingItem) {
       get().unequip(slot);
       // Re-read inventory since unequip modifies it
       newInventory.push(existingItem);
    }

    // Actually Equip
    set((state) => ({
      inventory: newInventory,
      equipment: { ...state.equipment, [slot]: item }
    }));

    // Apply Base Stats
    const statsStore = useStatsStore.getState();
    for (const baseStat of item.baseStats) {
      statsStore.addModifier({
        id: `${slot}_${item.id}_base_${baseStat.stat}`,
        sourceId: `equip_${slot}`,
        stat: baseStat.stat,
        type: baseStat.type,
        value: baseStat.value
      });
    }

    // Apply Affix Stats
    for (const affix of item.affixes) {
      statsStore.addModifier({
        id: `${slot}_${item.id}_affix_${affix.id}_${affix.stat.stat}`,
        sourceId: `equip_${slot}`,
        stat: affix.stat.stat,
        type: affix.stat.type,
        value: affix.stat.value
      });
    }
  },

  unequip: (slot) => {
    const state = get();
    const item = state.equipment[slot];
    if (!item) return;

    // Remove Stats
    useStatsStore.getState().removeModifiersBySource(`equip_${slot}`);

    // Move to inventory and clear slot
    set((state) => ({
      inventory: [...state.inventory, item],
      equipment: { ...state.equipment, [slot]: undefined }
    }));
  }
}));
