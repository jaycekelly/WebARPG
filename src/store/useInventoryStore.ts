import { create } from 'zustand';
import type { Item, EquipmentSlot, ItemType } from '../engine/items/types';
import { useStatsStore } from './useStatsStore';
import { useCombatStore } from './useCombatStore';
import { usePlayerStore } from './usePlayerStore';
import { useAppStore } from './useAppStore';
import { ItemGenerator } from '../engine/items/ItemGenerator';

interface InventoryState {
  inventory: Item[];
  equipment: Partial<Record<EquipmentSlot, Item>>;
  
  lootItem: (item: Item, silent?: boolean) => void;
  equip: (inventoryIndex: number, targetSlot?: EquipmentSlot) => void;
  unequip: (slot: EquipmentSlot, bypassRevalidation?: boolean) => void;
  sellItem: (inventoryIndex: number) => void;
  revalidateEquipment: () => void;
}

const getDefaultSlot = (type: ItemType): EquipmentSlot | null => {
  switch (type) {
    case 'helm': return 'helm';
    case 'chest': return 'chest';
    case 'gloves': return 'gloves';
    case 'legs': return 'legs';
    case 'boots': return 'boots';
    case 'weapon-1h': return 'weapon1';
    case 'weapon-2h': return 'weapon1';
    case 'shield': return 'weapon2';
    case 'tome': return 'weapon2';
    case 'amulet': return 'amulet';
    case 'ring': return 'ring1';
    default: return null;
  }
};

export const useInventoryStore = create<InventoryState>((set, get) => ({
  inventory: [],
  equipment: {},

  lootItem: (item, silent = false) => {
    set((state) => ({ inventory: [...state.inventory, item] }));
    if (!silent) {
      useCombatStore.getState().addLog(`Looted ${item.name}.`, 'system');
    }
  },

  equip: (inventoryIndex, targetSlot) => {
    const state = get();
    const item = state.inventory[inventoryIndex];
    if (!item) return;

    // Requirement Check
    if (item.requirements) {
       const statsStore = useStatsStore.getState();
       const playerStore = usePlayerStore.getState();
       const reqs = item.requirements;
       
       if (reqs.level && playerStore.level < reqs.level) {
          useCombatStore.getState().addLog(`Level ${reqs.level} required to equip ${item.name}.`, 'system');
          return;
       }
       if (reqs.strength && statsStore.getStat('Strength') < reqs.strength) {
          useCombatStore.getState().addLog(`${reqs.strength} Strength required to equip ${item.name}.`, 'system');
          return;
       }
       if (reqs.dexterity && statsStore.getStat('Dexterity') < reqs.dexterity) {
          useCombatStore.getState().addLog(`${reqs.dexterity} Dexterity required to equip ${item.name}.`, 'system');
          return;
       }
       if (reqs.intelligence && statsStore.getStat('Intelligence') < reqs.intelligence) {
          useCombatStore.getState().addLog(`${reqs.intelligence} Intelligence required to equip ${item.name}.`, 'system');
          return;
       }
       if (reqs.vitality && statsStore.getStat('Vitality') < reqs.vitality) {
          useCombatStore.getState().addLog(`${reqs.vitality} Vitality required to equip ${item.name}.`, 'system');
          return;
       }
    }

    // Combat Lockout Check
    if (item.itemType === 'weapon-1h' || item.itemType === 'weapon-2h' || item.itemType === 'shield') {
      const combatState = useCombatStore.getState();
      const lastAttack = Math.max(combatState.lastMainHandAttackTime, combatState.lastOffHandAttackTime);
      if (useAppStore.getState().getGameTime() - lastAttack < 4000) {
        combatState.addLog(`Cannot change equipment while in combat.`, 'system');
        return;
      }
    }

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
    
    get().revalidateEquipment();
  },

  unequip: (slot, bypassRevalidation = false) => {
    const state = get();
    const item = state.equipment[slot];
    if (!item) return;

    // Combat Lockout Check
    if (slot === 'weapon1' || slot === 'weapon2') {
      const combatState = useCombatStore.getState();
      const lastAttack = Math.max(combatState.lastMainHandAttackTime, combatState.lastOffHandAttackTime);
      if (useAppStore.getState().getGameTime() - lastAttack < 4000) {
        combatState.addLog(`Cannot change equipment while in combat.`, 'system');
        return;
      }
    }

    // Remove Stats
    useStatsStore.getState().removeModifiersBySource(`equip_${slot}`);

    // Move to inventory and clear slot
    set((state) => ({
      inventory: [...state.inventory, item],
      equipment: { ...state.equipment, [slot]: undefined }
    }));
    
    if (!bypassRevalidation) {
       get().revalidateEquipment();
    }
  },

  sellItem: (inventoryIndex) => {
    const state = get();
    const item = state.inventory[inventoryIndex];
    if (!item) return;

    // A simple sell formula based on iLvl and rarity
    const rarityMultiplier = {
      Normal: 1, Magic: 2, Rare: 5, Epic: 15, Legendary: 50, Unique: 100
    }[item.rarity];
    const goldValue = Math.max(1, item.iLvl * rarityMultiplier);

    usePlayerStore.getState().addGold(goldValue);

    const newInventory = [...state.inventory];
    newInventory.splice(inventoryIndex, 1);
    set({ inventory: newInventory });
  },

  revalidateEquipment: () => {
    // Repeatedly check if any item fails requirements, if so unequip it, and loop again
    // because unequipping one might invalidate another.
    let revalidated = false;
    while (!revalidated) {
       revalidated = true;
       const state = get();
       const statsStore = useStatsStore.getState();
       const playerStore = usePlayerStore.getState();
       
       for (const [slot, item] of Object.entries(state.equipment)) {
          if (!item || !item.requirements) continue;
          
          const reqs = item.requirements;
          let isValid = true;
          
          if (reqs.level && playerStore.level < reqs.level) isValid = false;
          if (reqs.strength && statsStore.getStat('Strength') < reqs.strength) isValid = false;
          if (reqs.dexterity && statsStore.getStat('Dexterity') < reqs.dexterity) isValid = false;
          if (reqs.intelligence && statsStore.getStat('Intelligence') < reqs.intelligence) isValid = false;
          if (reqs.vitality && statsStore.getStat('Vitality') < reqs.vitality) isValid = false;
          
          if (!isValid) {
             useCombatStore.getState().addLog(`${item.name} requirements no longer met, unequipping...`, 'system');
             get().unequip(slot as EquipmentSlot, true);
             revalidated = false; // Need to loop again since stats changed
             break;
          }
       }
    }
  }
}));

// Initialize starter gear if the player has nothing
setTimeout(() => {
  const store = useInventoryStore.getState();
  if (Object.keys(store.equipment).length === 0 && store.inventory.length === 0) {
     const sword = ItemGenerator.generateUnique('bronze_sword', 1);
     const shield = ItemGenerator.generateUnique('iron_shield', 1);
     const chest = ItemGenerator.generateUnique('iron_chest', 1);
     const legs = ItemGenerator.generateUnique('iron_legs', 1);
     
     if (sword) sword.rarity = 'Normal';
     if (shield) shield.rarity = 'Normal';
     if (chest) chest.rarity = 'Normal';
     if (legs) legs.rarity = 'Normal';
     
     if (sword) store.lootItem(sword, true);
     if (shield) store.lootItem(shield, true);
     if (chest) store.lootItem(chest, true);
     if (legs) store.lootItem(legs, true);
     
     // The items get pushed to index 0, 1, 2, 3. 
     // When we equip(0), it removes it, shifting the rest down.
     if (sword) store.equip(0);
     if (shield) store.equip(0);
     if (chest) store.equip(0);
     if (legs) store.equip(0);
  }
}, 100);
