import { create } from 'zustand';
import { useStatsStore } from './useStatsStore';
import { useCombatStore, OUT_OF_COMBAT_MOVE_COOLDOWN_MS } from './useCombatStore';
import { useAppStore } from './useAppStore';
import { useVisionStore } from './useVisionStore';
import { useMetaStore } from './useMetaStore';
import type { ClassType } from '../engine/player/types';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dualStorage } from './storage';

interface PlayerState {
  playerClass: ClassType;
  secondaryClass: ClassType | null;
  position: { x: number; y: number };
  currentHealth: number;
  currentEnergy: number;
  currentAdrenaline: number;
  activeTargetId: string | null;
  ignoredTargetIds: string[];
  level: number;
  currentXp: number;
  passivePoints: number;
  activeSkillPoints: number;
  attributePoints: number;
  allocatedAttributes: { Strength: number; Dexterity: number; Intelligence: number; Vitality: number };
  gold: number;
  normalPityCount: number;
  magicPityCount: number;
  boundSkills: (string | null)[];
  lastFlaskTime: number;

  
  move: (dx: number, dy: number) => void;
  setPosition: (x: number, y: number) => void;
  setTarget: (id: string | null, fromCancel?: boolean, isAuto?: boolean) => void;
  setSecondaryClass: (cls: ClassType | null) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  restoreEnergy: (amount: number) => void;
  useEnergy: (amount: number) => boolean;
  addAdrenaline: (amount: number) => void;
  useAdrenaline: (amount: number) => boolean;
  decayAdrenaline: (amount: number) => void;
  addXp: (amount: number) => { leveledUp: boolean, newLevel: number };
  addGold: (amount: number) => void;
  addPassivePoints: (amount: number) => void;
  addActiveSkillPoints: (amount: number) => void;
  allocateAttribute: (stat: 'Strength' | 'Dexterity' | 'Intelligence' | 'Vitality', amount?: number) => void;
  incrementPity: (rarity: 'Normal' | 'Magic') => void;
  resetPity: (rarity: 'Normal' | 'Magic') => void;
  bindSkill: (slotIndex: number, skillId: string | null) => void;
  useFlask: () => boolean;

}

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      playerClass: 'Fighter',
  secondaryClass: null,
  position: { x: 5, y: 5 },
  currentHealth: 100,
  currentEnergy: 35,
  currentAdrenaline: 0,
  activeTargetId: null,
  ignoredTargetIds: [],
  level: 1,
  currentXp: 0,
  passivePoints: 1,
  activeSkillPoints: 2,
  attributePoints: 0,
  allocatedAttributes: { Strength: 0, Dexterity: 0, Intelligence: 0, Vitality: 0 },
  gold: 0,
  normalPityCount: 0,
  magicPityCount: 0,
  boundSkills: ['heavy_strike_combo', 'onslaught_leap', 'shield_break', 'ground_slam', 'zealous_blow', null, null, null],
  lastFlaskTime: 0,
  move: (dx, dy) => {
    let moved = false;
    let nextPos: { x: number, y: number } | undefined;
    
    set((state) => {
      const now = useAppStore.getState().getGameTime();
      const combatState = useCombatStore.getState();
      const inCombat = combatState.isInCombat();
      let moveCooldown: number;
      if (inCombat) {
        const moveSpeed = useStatsStore.getState().getStat('MoveSpeed');
        moveCooldown = 1000 / Math.max(0.1, moveSpeed);
      } else {
        moveCooldown = OUT_OF_COMBAT_MOVE_COOLDOWN_MS;
      }
      
      if (now - combatState.lastMoveTime < moveCooldown) return state;
      
      // Attack Animation Root
      if (now - combatState.lastAttackAnimationTime < 500) return state;
      
      // Cancel any active cast
      if (combatState.castingSkillId) {
        combatState.refundSkillCooldown(combatState.castingSkillId);
        combatState.setCasting(null);
        combatState.addLog(`Cast cancelled (interrupted by movement).`, 'system');
      }
      
      combatState.setLastMoveTime(now);
      nextPos = { x: state.position.x + dx, y: state.position.y + dy };
      moved = true;
      return { position: nextPos };
    });

    if (moved && nextPos) {
      useVisionStore.getState().updateVision(nextPos);
    }
  },

  setPosition: (x, y) => {
    set({ position: { x, y } });
    useVisionStore.getState().updateVision({ x, y });
  },

  setSecondaryClass: (cls) => set({ secondaryClass: cls }),
  
  setTarget: (id, _fromCancel = false, isAuto = false) => set((state) => {
    let newIgnored = state.ignoredTargetIds;

    // If we are changing targets, the old target was untargeted, so ignore it
    if (state.activeTargetId && state.activeTargetId !== id) {
       if (!newIgnored.includes(state.activeTargetId)) {
          newIgnored = [...newIgnored, state.activeTargetId];
       }
    }
    
    // If we manually target an enemy, remove it from the ignored list
    if (id !== null && !isAuto && newIgnored.includes(id)) {
      newIgnored = newIgnored.filter(ignored => ignored !== id);
    }
    
    // Clear queued action if target is deselected/cancelled
    if (id === null) {
      useCombatStore.getState().clearQueue();
    }
    
    return { activeTargetId: id, ignoredTargetIds: newIgnored };
  }),

  takeDamage: (amount) => set((state) => {
    useCombatStore.getState().triggerCombatEvent();
    const newHealth = Math.max(0, state.currentHealth - amount);
    return { currentHealth: newHealth };
  }),

  heal: (amount: number) => set((state) => {
    // Read the dynamic max health from the stats store
    const maxHealth = useStatsStore.getState().getStat('Health');
    const newHealth = Math.min(maxHealth, state.currentHealth + amount);
    return { currentHealth: newHealth };
  }),

  restoreEnergy: (amount) => set((state) => {
    const maxEnergy = useStatsStore.getState().getStat('Energy');
    const newEnergy = Math.min(maxEnergy, state.currentEnergy + amount);
    return { currentEnergy: newEnergy };
  }),

  useEnergy: (amount) => {
    const { currentEnergy } = get();
    if (currentEnergy >= amount) {
      set({ currentEnergy: currentEnergy - amount });
      return true;
    }
    return false;
  },

  addAdrenaline: (amount) => set((state) => ({
    currentAdrenaline: Math.max(0, Math.min(100, state.currentAdrenaline + amount))
  })),

  useAdrenaline: (amount) => {
    const { currentAdrenaline } = get();
    if (currentAdrenaline >= amount) {
      set({ currentAdrenaline: currentAdrenaline - amount });
      return true;
    }
    return false;
  },

  decayAdrenaline: (amount) => set((state) => ({
    currentAdrenaline: Math.max(0, state.currentAdrenaline - amount)
  })),

  addXp: (amount) => {
    const state = get();
    let newXp = state.currentXp + amount;
    let newLevel = state.level;
    let newPassivePoints = state.passivePoints;
    let newActiveSkillPoints = state.activeSkillPoints;
    let newAttrPoints = state.attributePoints;
    let leveledUp = false;

    // We use a while loop in case they gain enough XP to gain multiple levels
    while (newLevel < 50 && newXp >= 100 * Math.pow(newLevel, 2)) {
      newXp -= 100 * Math.pow(newLevel, 2);
      newLevel++;
      newPassivePoints += 1;
      newActiveSkillPoints += newLevel <= 38 ? 2 : 1;
      newAttrPoints += 5;
      leveledUp = true;
    }

    if (newLevel >= 50) {
      newXp = 0; // Cap XP at max level
    }

    if (leveledUp) {
      set({ currentXp: newXp, level: newLevel, passivePoints: newPassivePoints, activeSkillPoints: newActiveSkillPoints, attributePoints: newAttrPoints });
      
      const activeCharId = useMetaStore.getState().activeCharacterId;
      if (activeCharId) {
        useMetaStore.getState().updateCharacter(activeCharId, { level: newLevel });
      }

      return { leveledUp: true, newLevel };
    } else {
      set({ currentXp: newXp });
      return { leveledUp: false, newLevel: state.level };
    }
  },
  
  addGold: (amount) => set((state) => ({
    gold: state.gold + amount
  })),

  addPassivePoints: (amount) => set((state) => ({
    passivePoints: Math.max(0, state.passivePoints + amount)
  })),

  addActiveSkillPoints: (amount) => set((state) => ({
    activeSkillPoints: Math.max(0, state.activeSkillPoints + amount)
  })),
  
  allocateAttribute: (stat, amount = 1) => set((state) => {
    if (state.attributePoints <= 0) return state;
    
    const allocAmount = Math.min(state.attributePoints, amount);
    
    return { 
       attributePoints: state.attributePoints - allocAmount,
       allocatedAttributes: {
          ...state.allocatedAttributes,
          [stat]: state.allocatedAttributes[stat] + allocAmount
       }
    };
  }),

  incrementPity: (rarity) => set((state) => {
    if (rarity === 'Normal') return { normalPityCount: state.normalPityCount + 1 };
    if (rarity === 'Magic') return { magicPityCount: state.magicPityCount + 1 };
    return state;
  }),
  
  resetPity: (rarity) => set((state) => {
    if (rarity === 'Normal') return { normalPityCount: 0 };
    if (rarity === 'Magic') return { magicPityCount: 0 };
    return state;
  }),

  bindSkill: (slotIndex, skillId) => set((state) => {
    const newBound = [...state.boundSkills];
    // Auto-clear the same skill from any other slot (prevent duplicates)
    if (skillId !== null) {
      for (let i = 0; i < newBound.length; i++) {
        if (i !== slotIndex && newBound[i] === skillId) {
          newBound[i] = null;
        }
      }
    }
    newBound[slotIndex] = skillId;
    return { boundSkills: newBound };
  }),

  useFlask: () => {
    const { lastFlaskTime } = get();
    const now = useAppStore.getState().getGameTime();
    
    if (now - lastFlaskTime < 30000) {
      return false;
    }
    
    set({ lastFlaskTime: now });
    return true;
  },


    }),
    {
      name: 'webarpg-player',
      storage: createJSONStorage(() => dualStorage),
    }
  )
);
