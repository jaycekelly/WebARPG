import { create } from 'zustand';
import { useStatsStore } from './useStatsStore';
import { useCombatStore } from './useCombatStore';

interface PlayerState {
  position: { x: number; y: number };
  currentHealth: number;
  currentMana: number;
  activeTargetId: string | null;
  level: number;
  currentXp: number;
  skillPoints: number;
  
  move: (dx: number, dy: number) => void;
  setPosition: (x: number, y: number) => void;
  setTarget: (id: string | null) => void;
  takeDamage: (amount: number) => void;
  heal: (amount: number) => void;
  useMana: (amount: number) => boolean;
  addXp: (amount: number) => { leveledUp: boolean, newLevel: number };
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  position: { x: 5, y: 5 },
  currentHealth: 40,
  currentMana: 40,
  activeTargetId: null,
  level: 1,
  currentXp: 0,
  skillPoints: 0,

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

  heal: (amount) => set((state) => {
    // Read the dynamic max health from the stats store
    const maxHealth = useStatsStore.getState().getStat('Health');
    const newHealth = Math.min(maxHealth, state.currentHealth + amount);
    return { currentHealth: newHealth };
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
  }
}));
