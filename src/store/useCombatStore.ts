import { create } from 'zustand';
import { useAppStore } from './useAppStore';

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

export interface TileEffect {
  id: string;
  x: number;
  y: number;
  type: string;
  color: number;
  expiresAt: number;
}

export interface HitEffect {
  id: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  color: number;
  damageType?: string;
  expiresAt: number;
}

export interface QueuedAction {
  type: 'skill' | 'interact' | 'move';
  skillId?: string;
  targetId?: string;
  targetPos?: { x: number, y: number };
  dx?: number;
  dy?: number;
  expiresAt: number;
}

interface CombatState {
  logs: CombatLogEntry[];
  floatingTexts: FloatingText[];
  hitEffects: HitEffect[];
  tileEffects: TileEffect[];
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
  addHitEffect: (targetId: string, sourceX: number, sourceY: number, color: number, damageType?: string) => void;
  addTileEffect: (x: number, y: number, type: string, color: number) => void;
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
  tileEffects: [],
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

  addLog: (_message, _type) => {
    // Combat log disabled per user request
  },
  
  addFloatingText: (x, y, text, color) => {
    const now = useAppStore.getState().getGameTime();
    const expiresAt = now + 800; // Live for 800ms
    
    set((state) => {
      // Throttle exact same error messages (only allow 1 every 250ms globally)
      const isCombatText = text === 'Miss' || text === 'Dodge' || text === 'Block' || text.includes('Crit') || !isNaN(Number(text));
      if (!isCombatText) {
          const existing = state.floatingTexts.find(f => f.text === text);
          if (existing && existing.expiresAt - now > 550) { // 800 - 550 = 250ms cooldown
            return state;
          }
      }
      
      const id = Math.random().toString();
      return {
        floatingTexts: [
          ...state.floatingTexts,
          { id, x, y, text, color, expiresAt }
        ]
      };
    });
  },

  addHitEffect: (targetId: string, sourceX: number, sourceY: number, color: number, damageType?: string) => {
    const expiresAt = useAppStore.getState().getGameTime() + 150; // 150ms flash duration
    const id = Math.random().toString();
    set((state) => {
      // Remove any existing hit effect for this target so it refreshes the timer
      const filtered = state.hitEffects.filter(h => h.targetId !== targetId);
      return {
        hitEffects: [
          ...filtered,
          { targetId, id, sourceX, sourceY, color, expiresAt, damageType }
        ]
      };
    });
  },
  
  addTileEffect: (x, y, type, color) => {
    const expiresAt = useAppStore.getState().getGameTime() + 300; // 300ms default lifespan
    const id = Math.random().toString();
    set((state) => ({
      tileEffects: [...(state.tileEffects || []), { id, x, y, type, color, expiresAt }]
    }));
  },

  clearExpiredFloatingTexts: (now: number) => {
    set((state) => {
      const activeTexts = state.floatingTexts.filter((ft) => ft.expiresAt > now);
      const activeHits = state.hitEffects.filter((he) => he.expiresAt > now);
      const currentTiles = state.tileEffects || [];
      const activeTiles = currentTiles.filter((te) => te.expiresAt > now);
      
      if (activeTexts.length !== state.floatingTexts.length || activeHits.length !== state.hitEffects.length || activeTiles.length !== currentTiles.length) {
        return { 
          floatingTexts: activeTexts,
          hitEffects: activeHits,
          tileEffects: activeTiles
        };
      }
      return state; // No change
    });
  },

  setAutoAttacking: (val) => set({ isAutoAttacking: val }),
  
  triggerGcd: (durationMs) => set({ gcdEndTime: useAppStore.getState().getGameTime() + durationMs }),
  setLastMoveTime: (time) => set({ lastMoveTime: time }),
  setLastMainHandAttackTime: (time) => set({ lastMainHandAttackTime: time }),
  setLastOffHandAttackTime: (time) => set({ lastOffHandAttackTime: time }),
  setLastAttackAnimationTime: (time) => set({ lastAttackAnimationTime: time }),
  
  setCasting: (skillId, durationMs = 0, targetId, targetPos) => set({ 
    castingSkillId: skillId, 
    castEndTime: skillId ? useAppStore.getState().getGameTime() + durationMs : 0,
    castTargetId: targetId,
    castTargetPos: targetPos
  }),
  
  setTargetingSkill: (skillId) => set({ targetingSkillId: skillId }),
  setHoveredSkill: (skillId) => set({ hoveredSkillId: skillId }),

  triggerSkillCooldown: (skillId, durationMs) => set((state) => ({
    skillCooldowns: { ...state.skillCooldowns, [skillId]: useAppStore.getState().getGameTime() + durationMs }
  })),

  queueAction: (action) => set({ queuedAction: action }),
  clearQueue: () => set({ queuedAction: null })
}));
