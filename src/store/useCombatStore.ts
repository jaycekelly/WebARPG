import { create } from 'zustand';

export interface CombatLogEntry {
  id: string;
  message: string;
  timestamp: Date;
  type: 'player-attack' | 'enemy-attack' | 'system' | 'ability';
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  expiresAt: number;
}

export type InputRequest = 
  | { type: 'move'; dx: number; dy: number }
  | { type: 'skill'; skillId: string; targetId?: string; targetPos?: {x: number, y: number} };

export type QueuedAction = InputRequest & { expiresAt: number };

interface CombatState {
  logs: CombatLogEntry[];
  floatingTexts: FloatingText[];
  hitEffects: { targetId: string; id: string; expiresAt: number }[];
  isAutoAttacking: boolean;
  
  // Timers for the real-time engine
  gcdEndTime: number;
  lastMoveTime: number;
  lastMainHandAttackTime: number;
  lastOffHandAttackTime: number;
  lastAttackAnimationTime: number;
  
  // Cast Bar State
  castingSkillId: string | null;
  castEndTime: number;
  castTargetId?: string;
  castTargetPos?: {x: number, y: number};

  // Targeting & Preview State
  targetingSkillId: string | null;
  hoveredSkillId: string | null;

  // Skill Cooldowns
  skillCooldowns: Record<string, number>;

  // Input Queue
  queuedAction: QueuedAction | null;

  addLog: (message: string, type: CombatLogEntry['type']) => void;
  addFloatingText: (x: number, y: number, text: string, color: string) => void;
  addHitEffect: (targetId: string) => void;
  clearExpiredFloatingTexts: (now: number) => void;
  setAutoAttacking: (val: boolean) => void;
  
  // Timer setters
  triggerGcd: (durationMs: number) => void;
  setLastMoveTime: (time: number) => void;
  setLastMainHandAttackTime: (time: number) => void;
  setLastOffHandAttackTime: (time: number) => void;
  setLastAttackAnimationTime: (time: number) => void;
  setCasting: (skillId: string | null, durationMs?: number, targetId?: string, targetPos?: {x: number, y: number}) => void;
  
  // Targeting setters
  setTargetingSkill: (skillId: string | null) => void;
  setHoveredSkill: (skillId: string | null) => void;
  
  // Specific Cooldown
  triggerSkillCooldown: (skillId: string, durationMs: number) => void;

  // Queue methods
  queueAction: (action: QueuedAction) => void;
  clearQueue: () => void;
}

export const useCombatStore = create<CombatState>((set) => ({
  logs: [],
  floatingTexts: [],
  hitEffects: [],
  isAutoAttacking: false,
  gcdEndTime: 0,
  lastMoveTime: 0,
  lastMainHandAttackTime: 0,
  lastOffHandAttackTime: 0,
  lastAttackAnimationTime: 0,
  castingSkillId: null,
  castEndTime: 0,
  targetingSkillId: null,
  hoveredSkillId: null,
  skillCooldowns: {},
  queuedAction: null,

  addLog: (message, type) => set((state) => {
    const newLog = { id: Math.random().toString(), message, timestamp: new Date(), type };
    return { logs: [...state.logs, newLog].slice(-50) }; // Keep last 50 logs
  }),
  
  addFloatingText: (x, y, text, color) => {
    const expiresAt = Date.now() + 800; // Live for 800ms
    const id = Math.random().toString();
    set((state) => ({
      floatingTexts: [
        ...state.floatingTexts,
        { id, x, y, text, color, expiresAt }
      ]
    }));
  },

  addHitEffect: (targetId: string) => {
    const expiresAt = Date.now() + 150; // 150ms flash duration
    const id = Math.random().toString();
    set((state) => {
      // Remove any existing hit effect for this target so it refreshes the timer
      const filtered = state.hitEffects.filter(h => h.targetId !== targetId);
      return {
        hitEffects: [
          ...filtered,
          { targetId, id, expiresAt }
        ]
      };
    });
  },

  clearExpiredFloatingTexts: (now: number) => {
    set((state) => {
      const activeTexts = state.floatingTexts.filter((ft) => ft.expiresAt > now);
      const activeHits = state.hitEffects.filter((he) => he.expiresAt > now);
      
      if (activeTexts.length !== state.floatingTexts.length || activeHits.length !== state.hitEffects.length) {
        return { 
          floatingTexts: activeTexts,
          hitEffects: activeHits
        };
      }
      return state; // No change
    });
  },

  setAutoAttacking: (val) => set({ isAutoAttacking: val }),
  
  triggerGcd: (durationMs) => set({ gcdEndTime: Date.now() + durationMs }),
  setLastMoveTime: (time) => set({ lastMoveTime: time }),
  setLastMainHandAttackTime: (time) => set({ lastMainHandAttackTime: time }),
  setLastOffHandAttackTime: (time) => set({ lastOffHandAttackTime: time }),
  setLastAttackAnimationTime: (time) => set({ lastAttackAnimationTime: time }),
  
  setCasting: (skillId, durationMs = 0, targetId, targetPos) => set({ 
    castingSkillId: skillId, 
    castEndTime: skillId ? Date.now() + durationMs : 0,
    castTargetId: targetId,
    castTargetPos: targetPos
  }),
  
  setTargetingSkill: (skillId) => set({ targetingSkillId: skillId }),
  setHoveredSkill: (skillId) => set({ hoveredSkillId: skillId }),

  triggerSkillCooldown: (skillId, durationMs) => set((state) => ({
    skillCooldowns: { ...state.skillCooldowns, [skillId]: Date.now() + durationMs }
  })),

  queueAction: (action) => set({ queuedAction: action }),
  clearQueue: () => set({ queuedAction: null })
}));
