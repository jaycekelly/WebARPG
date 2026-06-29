import { create } from 'zustand';

export interface CombatLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'player-attack' | 'enemy-attack' | 'system' | 'ability';
}

interface CombatState {
  logs: CombatLogEntry[];
  isAutoAttacking: boolean;
  
  // Timers for the real-time engine
  gcdEndTime: number;
  lastMoveTime: number;
  lastAutoAttackTime: number;
  
  // Cast Bar State
  castingSkillId: string | null;
  castEndTime: number;

  addLog: (message: string, type: CombatLogEntry['type']) => void;
  setAutoAttacking: (val: boolean) => void;
  
  // Timer setters
  triggerGcd: (durationMs: number) => void;
  setLastMoveTime: (time: number) => void;
  setLastAutoAttackTime: (time: number) => void;
  setCasting: (skillId: string | null, durationMs?: number) => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  logs: [],
  isAutoAttacking: false,
  gcdEndTime: 0,
  lastMoveTime: 0,
  lastAutoAttackTime: 0,
  castingSkillId: null,
  castEndTime: 0,

  addLog: (message, type) => set((state) => {
    const newLog = { id: Math.random().toString(), message, timestamp: new Date(), type };
    return { logs: [...state.logs, newLog].slice(-50) }; // Keep last 50 logs
  }),

  setAutoAttacking: (val) => set({ isAutoAttacking: val }),
  
  triggerGcd: (durationMs) => set({ gcdEndTime: Date.now() + durationMs }),
  setLastMoveTime: (time) => set({ lastMoveTime: time }),
  setLastAutoAttackTime: (time) => set({ lastAutoAttackTime: time }),
  
  setCasting: (skillId, durationMs) => set({ 
    castingSkillId: skillId, 
    castEndTime: skillId && durationMs ? Date.now() + durationMs : 0 
  }),
}));
