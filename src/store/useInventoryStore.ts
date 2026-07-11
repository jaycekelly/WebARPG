import { create } from 'zustand';
import type { Item, EquipmentSlot, ItemType } from '../engine/items/types';
import { useStatsStore } from './useStatsStore';
import { useCombatStore, COMBAT_TIMEOUT_MS } from './useCombatStore';
import { useMessageStore } from './useMessageStore';
import { usePlayerStore } from './usePlayerStore';
import { useAppStore } from './useAppStore';
import { ItemGenerator } from '../engine/items/ItemGenerator';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dualStorage } from './storage';

interface InventoryState {
  inventory: (Item | null)[];
  equipment: Partial<Record<EquipmentSlot, Item>>;
  
  activeWeaponSet: 1 | 2;
  
  lootItem: (item: Item, silent?: boolean) => void;
  equip: (inventoryIndex: number, targetSlot?: EquipmentSlot) => void;
  unequip: (slot: EquipmentSlot, bypassRevalidation?: boolean) => void;
  sellItem: (inventoryIndex: number) => void;
  swapWeaponSet: () => boolean;
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

export const useInventoryStore = create<InventoryState>()(
  persist(
    (set, get) => ({
      inventory: [],
      equipment: {},
      activeWeaponSet: 1,

      swapWeaponSet: () => {
        let swapped = false;
        set((state) => {
          swapped = true;
          const newEquipment = { ...state.equipment };
          
          const tempWep1 = newEquipment['weapon1'];
          newEquipment['weapon1'] = newEquipment['weapon1_alt'];
          newEquipment['weapon1_alt'] = tempWep1;

          const tempWep2 = newEquipment['weapon2'];
          newEquipment['weapon2'] = newEquipment['weapon2_alt'];
          newEquipment['weapon2_alt'] = tempWep2;

          // Clean up undefined/null keys to keep equipment clean
          if (!newEquipment['weapon1']) delete newEquipment['weapon1'];
          if (!newEquipment['weapon1_alt']) delete newEquipment['weapon1_alt'];
          if (!newEquipment['weapon2']) delete newEquipment['weapon2'];
          if (!newEquipment['weapon2_alt']) delete newEquipment['weapon2_alt'];

          return {
            activeWeaponSet: state.activeWeaponSet === 1 ? 2 : 1,
            equipment: newEquipment
          };
        });
        
        if (swapped) {
          get().revalidateEquipment();
        }
        return swapped;
      },

      lootItem: (item, silent = false) => {
        set((state) => {
          // Find first empty slot; if none, append
          const inv = [...state.inventory];
          const emptyIdx = inv.findIndex(s => s === null || s === undefined);
          if (emptyIdx !== -1) {
            inv[emptyIdx] = item;
          } else {
            inv.push(item);
          }
          return { inventory: inv };
        });
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
              useMessageStore.getState().addScreenMessage('above', `Level ${reqs.level} required`);
              return;
           }
           if (reqs.strength && statsStore.getStat('Strength') < reqs.strength) {
              useMessageStore.getState().addScreenMessage('above', `${reqs.strength} STR required`);
              return;
           }
           if (reqs.dexterity && statsStore.getStat('Dexterity') < reqs.dexterity) {
              useMessageStore.getState().addScreenMessage('above', `${reqs.dexterity} DEX required`);
              return;
           }
           if (reqs.intelligence && statsStore.getStat('Intelligence') < reqs.intelligence) {
              useMessageStore.getState().addScreenMessage('above', `${reqs.intelligence} INT required`);
              return;
           }
           if (reqs.vitality && statsStore.getStat('Vitality') < reqs.vitality) {
              useMessageStore.getState().addScreenMessage('above', `${reqs.vitality} VIT required`);
              return;
           }
        }

        // Global Combat Lockout Check
        const combatState = useCombatStore.getState();
        if (useAppStore.getState().getGameTime() - combatState.lastCombatEventTime < COMBAT_TIMEOUT_MS) {
          useMessageStore.getState().addScreenMessage('mouse', "Can't change gear in combat!", 1500);
          return;
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

        // Clear the source inventory slot FIRST so that unequips can use the empty space
        const initialInv = [...get().inventory];
        initialInv[inventoryIndex] = null;
        set({ inventory: initialInv });

        // Handle 2H Weapon equipping logic
        if (item.itemType === 'weapon-2h') {
          slot = 'weapon1';
          // If we are equipping a 2H weapon, we must unequip whatever is in weapon2
          if (get().equipment['weapon2']) {
            get().unequip('weapon2');
          }
        }

        // Handle equipping a 1H weapon into weapon2 while wearing a 2H weapon
        if (slot === 'weapon2' && get().equipment['weapon1']?.itemType === 'weapon-2h') {
           get().unequip('weapon1');
        }

        // If something was already in the target slot, unequip it
        if (get().equipment[slot]) {
           get().unequip(slot);
        }

        // Actually Equip
        set((s) => ({
          equipment: { ...s.equipment, [slot]: item }
        }));
        
        get().revalidateEquipment();
      },

      unequip: (slot, bypassRevalidation = false) => {
        const state = get();
        const item = state.equipment[slot];
        if (!item) return;

        // Global Combat Lockout Check
        const combatState = useCombatStore.getState();
        if (useAppStore.getState().getGameTime() - combatState.lastCombatEventTime < COMBAT_TIMEOUT_MS) {
          useMessageStore.getState().addScreenMessage('mouse', "Can't change gear in combat!", 1500);
          return;
        }

        // Move to first empty inventory slot and clear equipment slot
        set((state) => {
          const inv = [...state.inventory];
          const emptyIdx = inv.findIndex(s => s === null || s === undefined);
          if (emptyIdx !== -1) {
            inv[emptyIdx] = item;
          } else {
            inv.push(item);
          }
          return {
            inventory: inv,
            equipment: { ...state.equipment, [slot]: undefined }
          };
        });
        
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
        newInventory[inventoryIndex] = null;  // null in-place, don't shift
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
                 useMessageStore.getState().addScreenMessage('above', `${item.name} requirements no longer met!`);
                 useCombatStore.getState().addLog(`${item.name} requirements no longer met, unequipping...`, 'system');
                 get().unequip(slot as EquipmentSlot, true);
                 revalidated = false; // Need to loop again since stats changed
                 break;
              }
           }
        }
      }
    }),
    {
      name: 'webarpg-inventory',
      storage: createJSONStorage(() => dualStorage),
    }
  )
);

// Initialize starter gear if the player has nothing
setTimeout(() => {
  const store = useInventoryStore.getState();
  const playerClass = usePlayerStore.getState().playerClass;
  if (Object.keys(store.equipment).length === 0 && store.inventory.filter(Boolean).length === 0) {
     let starterItems: (Item | null)[] = [];
     
     switch (playerClass) {
        case 'Fighter':
        default:
           const sword = ItemGenerator.generateUnique('bronze_sword', 1);
           const shield = ItemGenerator.generateUnique('iron_shield', 1);
           const chest = ItemGenerator.generateUnique('iron_chest', 1);
           const legs = ItemGenerator.generateUnique('iron_legs', 1);
           
           if (sword) sword.rarity = 'Normal';
           if (shield) shield.rarity = 'Normal';
           if (chest) chest.rarity = 'Normal';
           if (legs) legs.rarity = 'Normal';
           
           starterItems = [sword, shield, chest, legs];
           break;
        // In the future, add cases for Mage, Rogue, Ranger here
     }
     
     // Loot into inventory first so they get consecutive slots
     starterItems.forEach((item) => {
        if (item) {
           store.lootItem(item, true);
        }
     });
     
     // Equip them sequentially
     starterItems.forEach((item, index) => {
        if (item) {
           store.equip(index);
        }
     });
  }
}, 100);
