import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useAppStore } from './useAppStore';
import { useWorldStore } from './useWorldStore';
import { dualStorage } from './storage';

export const OUT_OF_COMBAT_MOVE_COOLDOWN_MS = 400;
export const COMBAT_TIMEOUT_MS = 4000;
export const DEFAULT_FLOATING_TEXT_DURATION_MS = 1300;
export const FLOATING_TEXT_THROTTLE_MS = 250;

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
  isCrit?: boolean;
  lane?: 'middle' | 'left' | 'right';
  isSkillDamage?: boolean;
  skillIcon?: string;
  isGold?: boolean;
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
  isInCombat: () => boolean;
  
  comboStep: number;
  lastComboTime: number;
  comboOtherSkillsCast: number;
  advanceCombo: (now: number, timeoutMs: number, chainLength?: number) => number;
  recordSkillCast: (isComboSkill: boolean) => void;
  resetCombo: () => void;
  
  lastSideLanes: Record<string, 'left' | 'right'>;
  
  // Timers for the real-time engine
  gcdEndTime: number;
  lastMoveTime: number;
  lastMainHandAttackTime: number;
  lastOffHandAttackTime: number;
  lastAttackAnimationTime: number;
  lastCombatEventTime: number;
  lastDamageDealtTime: number;
  
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
  addFloatingText: (x: number, y: number, text: string, options?: { colorClass?: string, isCrit?: boolean, duration?: number, isSkillDamage?: boolean, skillIcon?: string, isGold?: boolean }) => void;
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
  triggerCombatEvent: () => void;
  setLastDamageDealtTime: (time: number) => void;
  setCasting: (skillId: string | null, durationMs?: number, targetId?: string, targetPos?: {x: number, y: number}) => void;
  
  // Targeting setters
  setTargetingSkill: (skillId: string | null) => void;
  setHoveredSkill: (skillId: string | null) => void;
  
  // Specific Cooldown
  triggerSkillCooldown: (skillId: string, durationMs: number) => void;
  refundSkillCooldown: (skillId: string) => void;

  // Queue methods
  queueAction: (action: QueuedAction) => void;
  clearQueue: () => void;
}

export const useCombatStore = create<CombatState>()(
  persist(
    (set, get) => ({
  logs: [],
  floatingTexts: [],
  hitEffects: [],
  tileEffects: [],
  isAutoAttacking: false,
  isInCombat: () => {
    const state = get();
    const now = useAppStore.getState().getGameTime();
    // Timer-based check: covers the trailing grace period after the last damage/cast
    // event, and after the last aggroed enemy drops aggro, so combat doesn't end
    // instantly on the same frame.
    if ((now - state.lastCombatEventTime) < COMBAT_TIMEOUT_MS) return true;
    // Aggro-based check: an enemy can chase/attack-attempt for longer than
    // COMBAT_TIMEOUT_MS without ever landing a hit (e.g. player kiting/running).
    // As long as anything is actively aggroed on the player, combat should stay active.
    return useWorldStore.getState().enemies.some(e => !e.isDead && e.isAggroed);
  },
  comboStep: 0,
  lastComboTime: 0,
  comboOtherSkillsCast: 0,
  advanceCombo: (now, timeoutMs, chainLength = 3) => {
    let newStep = 1;
    set((state) => {
      if (now - state.lastComboTime < timeoutMs) {
        newStep = state.comboStep + 1;
        if (newStep > chainLength) {
          newStep = 1;
        }
      }
      return { comboStep: newStep, lastComboTime: now };
    });
    return newStep;
  },
  recordSkillCast: (isComboSkill) => {
    if (isComboSkill) {
      set({ comboOtherSkillsCast: 0 });
    } else {
      set((state) => {
        if (state.comboStep > 0) {
          const newCount = state.comboOtherSkillsCast + 1;
          if (newCount > 1) {
            return { comboStep: 0, lastComboTime: 0, comboOtherSkillsCast: 0 };
          }
          return { comboOtherSkillsCast: newCount };
        }
        return state;
      });
    }
  },
  resetCombo: () => set({ comboStep: 0, lastComboTime: 0, comboOtherSkillsCast: 0 }),
  lastSideLanes: {},
  gcdEndTime: 0,
  lastMoveTime: 0,
  lastMainHandAttackTime: 0,
  lastOffHandAttackTime: 0,
  lastAttackAnimationTime: 0,
  lastCombatEventTime: 0,
  lastDamageDealtTime: 0,
  castingSkillId: null,
  castEndTime: 0,
  targetingSkillId: null,
  hoveredSkillId: null,
  skillCooldowns: {},
  queuedAction: null,

  addLog: (_message, _type) => {
    // Combat log disabled per user request
  },
  
  addFloatingText: (x, y, text, options) => {
    const now = useAppStore.getState().getGameTime();
    const duration = options?.duration || DEFAULT_FLOATING_TEXT_DURATION_MS;
    const expiresAt = now + duration;
    const color = options?.colorClass || 'text-zinc-100';
    const isCrit = options?.isCrit || false;
    
    set((state) => {
      // Throttle exact same error messages (only allow 1 every FLOATING_TEXT_THROTTLE_MS globally)
      const isCombatText = text === 'Miss' || text === 'Dodge' || text === 'Block' || text.includes('Crit') || !isNaN(Number(text));
      if (!isCombatText) {
          const existing = state.floatingTexts.find(f => f.text === text);
          if (existing && existing.expiresAt - now > duration - FLOATING_TEXT_THROTTLE_MS) {
            return state;
          }
      }
      
      const id = Math.random().toString();
      
      // Lane assignment logic
      // Find active texts at this exact coordinate spawned in the last 500ms
      const recentAtCoord = state.floatingTexts.filter(
        f => f.x === x && f.y === y && now - (f.expiresAt - duration) < 500
      );
      
      const occupiedLanes = new Set(recentAtCoord.map(f => f.lane));
      let assignedLane: 'middle' | 'left' | 'right' = 'middle';
      
      if (isCombatText && occupiedLanes.has('middle')) {
        const leftFree = !occupiedLanes.has('left');
        const rightFree = !occupiedLanes.has('right');
        
        if (leftFree && rightFree) {
          // Both free: choose randomly
          assignedLane = Math.random() > 0.5 ? 'left' : 'right';
        } else if (leftFree) {
          assignedLane = 'left';
        } else if (rightFree) {
          assignedLane = 'right';
        }
      }
      

      
      return {
        floatingTexts: [
          ...state.floatingTexts,
          { id, x, y, text, color, expiresAt, isCrit, lane: assignedLane, isSkillDamage: options?.isSkillDamage, skillIcon: options?.skillIcon, isGold: options?.isGold }
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
  triggerCombatEvent: () => set({ lastCombatEventTime: useAppStore.getState().getGameTime() }),
  setLastDamageDealtTime: (time) => set({ lastDamageDealtTime: time }),
  
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
  refundSkillCooldown: (skillId) => set((state) => {
    const newCooldowns = { ...state.skillCooldowns };
    delete newCooldowns[skillId];
    return { skillCooldowns: newCooldowns };
  }),

  queueAction: (action) => set({ queuedAction: action }),
  clearQueue: () => set({ queuedAction: null })
    }),
    {
      name: 'webarpg-combat',
      storage: createJSONStorage(() => dualStorage)
    }
  )
);
