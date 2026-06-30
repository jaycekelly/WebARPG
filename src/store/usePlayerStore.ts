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
  gold: number;
  boundSkills: (string | null)[];
  
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
  bindSkill: (slotIndex: number, skillId: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  playerClass: 'Fighter',
  position: { x: 5, y: 5 },
  currentHealth: 40,
  currentMana: 40,
  activeTargetId: null,
  level: 1,
  currentXp: 0,
  skillPoints: 0,
  gold: 0,
  boundSkills: ['fireball', null, null, null, null, null],

  move: (dx, dy) => set((state) => {
    const now = Date.now();
    const combatState = useCombatStore.getState();
    const moveSpeed = useStatsStore.getState().getStat('MoveSpeed');
    const moveCooldown = 1000 / Math.max(0.1, moveSpeed);
    
    if (now - combatState.lastMoveTime < moveCooldown) return state;
    
    // Cancel any active cast
    if (combatState.castingSkillId) {
      combatState.setCasting(null);
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
    let leveledUp = false;

    // We use a while loop in case they gain enough XP to gain multiple levels
    while (true) {
      const xpRequired = 100 * Math.pow(newLevel, 2);
      if (newXp >= xpRequired) {
        newXp -= xpRequired;
        newLevel += 1;
        newSkillPoints += 1;
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
      } else {
        break;
      }
    }

    if (leveledUp) {
      set({ currentXp: newXp, level: newLevel, skillPoints: newSkillPoints });
      // Heal player completely on level up (wait till next tick to get updated max health)
      setTimeout(() => {
          const maxHealth = useStatsStore.getState().getStat('Health');
          usePlayerStore.setState({ currentHealth: maxHealth });
      }, 0);
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

  bindSkill: (slotIndex, skillId) => set((state) => {
    const newBound = [...state.boundSkills];
    // Optional: If skillId is already bound elsewhere, remove it?
    // We'll just allow multiple binds or just overwrite.
    newBound[slotIndex] = skillId;
    return { boundSkills: newBound };
  })
}));
