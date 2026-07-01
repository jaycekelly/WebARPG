import { create } from 'zustand';
import { useStatsStore } from './useStatsStore';
import { useCombatStore } from './useCombatStore';
import type { ClassType } from '../engine/player/types';

interface PlayerState {
  playerClass: ClassType;
  position: { x: number; y: number };
  currentHealth: number;
  currentMana: number;
  activeTargetId: string | null;
  level: number;
  currentXp: number;
  skillPoints: number;
  attributePoints: number;
  gold: number;
  normalPityCount: number;
  magicPityCount: number;
  boundSkills: (string | null)[];
  flaskCharges: number;
  maxFlaskCharges: number;
  cameraMode: 'auto' | 'free';
  
  
  move: (dx: number, dy: number) => void;
  setPosition: (x: number, y: number) => void;
  setTarget: (id: string | null) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  restoreMana: (amount: number) => void;
  useMana: (amount: number) => boolean;
  addXp: (amount: number) => { leveledUp: boolean, newLevel: number };
  addGold: (amount: number) => void;
  addSkillPoints: (amount: number) => void;
  allocateAttribute: (stat: 'Strength' | 'Dexterity' | 'Intelligence' | 'Vitality') => void;
  incrementPity: (rarity: 'Normal' | 'Magic') => void;
  resetPity: (rarity: 'Normal' | 'Magic') => void;
  bindSkill: (slotIndex: number, skillId: string | null) => void;
  addFlaskCharges: (amount: number) => void;
  useFlask: () => boolean;
  toggleCameraMode: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playerClass: 'Fighter',
  position: { x: 5, y: 5 },
  currentHealth: 80,
  currentMana: 50,
  activeTargetId: null,
  level: 1,
  currentXp: 0,
  skillPoints: 100,
  attributePoints: 0,
  gold: 0,
  normalPityCount: 0,
  magicPityCount: 0,
  boundSkills: [null, null, null, null, null, null, null, null],
  flaskCharges: 4,
  maxFlaskCharges: 4,
  cameraMode: 'auto',

  move: (dx, dy) => set((state) => {
    const now = Date.now();
    const combatState = useCombatStore.getState();
    const moveSpeed = useStatsStore.getState().getStat('MoveSpeed');
    const moveCooldown = 1000 / Math.max(0.1, moveSpeed);
    
    if (now - combatState.lastMoveTime < moveCooldown) return state;
    
    // Attack Animation Root
    if (now - combatState.lastAttackAnimationTime < 500) return state;
    
    // Cancel any active cast
    if (combatState.castingSkillId) {
      combatState.setCasting(null);
      combatState.triggerGcd(0);
      combatState.addLog(`Cast cancelled (interrupted by movement).`, 'system');
    }
    
    combatState.setLastMoveTime(now);
    return { position: { x: state.position.x + dx, y: state.position.y + dy } };
  }),

  setPosition: (x, y) => set({ position: { x, y } }),
  
  setTarget: (id) => set({ activeTargetId: id }),

  takeDamage: (amount) => set((state) => {
    const newHealth = Math.max(0, state.currentHealth - amount);
    return { currentHealth: newHealth };
  }),

  heal: (amount: number) => set((state) => {
    // Read the dynamic max health from the stats store
    const maxHealth = useStatsStore.getState().getStat('Health');
    const newHealth = Math.min(maxHealth, state.currentHealth + amount);
    return { currentHealth: newHealth };
  }),

  restoreMana: (amount) => set((state) => {
    const maxMana = useStatsStore.getState().getStat('Mana');
    const newMana = Math.min(maxMana, state.currentMana + amount);
    return { currentMana: newMana };
  }),

  useMana: (amount) => {
    const { currentMana } = get();
    if (currentMana >= amount) {
      set({ currentMana: currentMana - amount });
      return true;
    }
    return false;
  },

  addXp: (amount) => {
    const state = get();
    let newXp = state.currentXp + amount;
    let newLevel = state.level;
    let newSkillPoints = state.skillPoints;
    let newAttrPoints = state.attributePoints;
    let leveledUp = false;

    // We use a while loop in case they gain enough XP to gain multiple levels
    while (newXp >= 100 * Math.pow(newLevel, 2)) {
      newXp -= 100 * Math.pow(newLevel, 2);
      newLevel++;
      newSkillPoints++;
      newAttrPoints++;
      leveledUp = true;
        
        // Push the static stat bonuses to the stat engine
        useStatsStore.getState().addModifier({
          id: `lvl_hp_${newLevel}_${Math.random()}`,
          sourceId: 'base_character_leveling',
          stat: 'Health',
          type: 'flat',
          value: 10
        });
        useStatsStore.getState().addModifier({
          id: `lvl_mana_${newLevel}_${Math.random()}`,
          sourceId: 'base_character_leveling',
          stat: 'Mana',
          type: 'flat',
          value: 10
        });
    }

    if (leveledUp) {
      set({ currentXp: newXp, level: newLevel, skillPoints: newSkillPoints, attributePoints: newAttrPoints });

      return { leveledUp: true, newLevel };
    } else {
      set({ currentXp: newXp });
      return { leveledUp: false, newLevel: state.level };
    }
  },
  
  addGold: (amount) => set((state) => ({
    gold: state.gold + amount
  })),

  addSkillPoints: (amount) => set((state) => ({
    skillPoints: Math.max(0, state.skillPoints + amount)
  })),
  
  allocateAttribute: (stat) => set((state) => {
    if (state.attributePoints <= 0) return state;
    
    const statsStore = useStatsStore.getState();
    const currentBase = statsStore.modifiers.find(m => m.id === `base_${stat.toLowerCase()}`);
    if (currentBase) {
      statsStore.updateModifierValue(`base_${stat.toLowerCase()}`, currentBase.value + 5);
    }
    
    return { attributePoints: state.attributePoints - 1 };
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
    newBound[slotIndex] = skillId;
    return { boundSkills: newBound };
  }),

  addFlaskCharges: (amount) => set((state) => {
    return { flaskCharges: Math.min(state.maxFlaskCharges, state.flaskCharges + amount) };
  }),

  useFlask: () => {
    const { flaskCharges } = get();
    if (flaskCharges >= 1) {
      set({ flaskCharges: flaskCharges - 1 });
      return true;
    }
    return false;
  },
  toggleCameraMode: () => set((state) => ({ cameraMode: state.cameraMode === 'auto' ? 'free' : 'auto' })),
}));
