import { create } from 'zustand';

export interface CombatLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'player-attack' | 'enemy-attack' | 'system' | 'ability';
}

export type InputRequest = 
  | { type: 'move'; dx: number; dy: number }
  | { type: 'skill'; skillId: string; targetId?: string };

export type QueuedAction = InputRequest & { expiresAt: number };

interface CombatState {
  logs: CombatLogEntry[];
  isAutoAttacking: boolean;
  
  // Timers for the real-time engine
  gcdEndTime: number;
  lastMoveTime: number;
  lastMainHandAttackTime: number;
  lastOffHandAttackTime: number;
  
  // Cast Bar State
  castingSkillId: string | null;
  castEndTime: number;

  // Input Queue
  queuedAction: QueuedAction | null;

  addLog: (message: string, type: CombatLogEntry['type']) => void;
  setAutoAttacking: (val: boolean) => void;
  
  // Timer setters
  triggerGcd: (durationMs: number) => void;
  setLastMoveTime: (time: number) => void;
  setLastMainHandAttackTime: (time: number) => void;
  setLastOffHandAttackTime: (time: number) => void;
  setCasting: (skillId: string | null, durationMs?: number) => void;
  
  // Queue methods
  queueAction: (action: QueuedAction) => void;
  clearQueue: () => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  logs: [],
  isAutoAttacking: false,
  gcdEndTime: 0,
  lastMoveTime: 0,
  lastMainHandAttackTime: 0,
  lastOffHandAttackTime: 0,
  castingSkillId: null,
  castEndTime: 0,
  queuedAction: null,

  addLog: (message, type) => set((state) => {
    const newLog = { id: Math.random().toString(), message, timestamp: new Date(), type };
    return { logs: [...state.logs, newLog].slice(-50) }; // Keep last 50 logs
  }),

  setAutoAttacking: (val) => set({ isAutoAttacking: val }),
  
  triggerGcd: (durationMs) => set({ gcdEndTime: Date.now() + durationMs }),
  setLastMoveTime: (time) => set({ lastMoveTime: time }),
  setLastMainHandAttackTime: (time) => set({ lastMainHandAttackTime: time }),
  setLastOffHandAttackTime: (time) => set({ lastOffHandAttackTime: time }),
  
  setCasting: (skillId, durationMs) => set({ 
    castingSkillId: skillId, 
    castEndTime: skillId && durationMs ? Date.now() + durationMs : 0 
  }),
  
  queueAction: (action) => set({ queuedAction: action }),
  clearQueue: () => set({ queuedAction: null })
}));
