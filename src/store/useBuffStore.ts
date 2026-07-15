import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAppStore } from './useAppStore';
import type { StatType } from '../engine/stats/types';
import { createThrottledPersistStorage } from './storage';

export interface StatModifier {
  stat: StatType;
  type: 'flat' | 'increased' | 'more';
  value: number;
}

export interface Buff {
  id: string; // Unique instance id
  buffId: string; // The base buff identifier (e.g. 'war_cry')
  name: string;
  type: 'buff' | 'debuff';
  stackingBehavior: 'independent' | 'refresh' | 'stack';
  durationMs: number | null; // null means permanent (e.g. passives)
  maxDurationMs: number | null;
  stacks: number;
  maxStacks: number;
  icon: string; // Lucide icon name
  statModifiers: StatModifier[];
  
  // DoT specific
  isDoT?: boolean;
  dotDamagePerTick?: number;
  dotTickRateMs?: number;
  nextTickAt?: number;
  dotDamageType?: string;
  
  // HoT specific
  isHoT?: boolean;
  hotHealPerTick?: number;
  hotManaPerTick?: number;
  hotTickRateMs?: number;
  expiresAt?: number | null;
}

interface BuffState {
  // Keyed by entityId (e.g. 'player', or enemy.id)
  entityBuffs: Record<string, Buff[]>;
  
  addBuff: (entityId: string, buff: Omit<Buff, 'id' | 'expiresAt' | 'nextTickAt'>) => void;
  removeBuff: (entityId: string, instanceId: string) => void;
  tickBuffs: (now: number) => { 
    dotEvents: { entityId: string, damage: number, damageType: string }[],
    hotEvents: { entityId: string, healAmount: number }[],
    manaEvents: { entityId: string, manaAmount: number }[]
  };

  // Universal Sunder debuff helpers
  applySunder: (entityId: string, stacks?: number) => void;
  getSunderStacks: (entityId: string) => number;
  getSunderArmorReduction: (entityId: string) => number; // 0 to 0.4 (percent, as a fraction)

  // Universal Knockdown helper
  applyKnockdown: (entityId: string, durationMs: number) => void;
  isKnockedDown: (entityId: string) => boolean;

  // Universal Stun helper
  applyStun: (entityId: string, durationMs: number) => void;
  isStunned: (entityId: string) => boolean;
}

export const SUNDER_BUFF_ID = 'sunder';
export const SUNDER_MAX_STACKS = 5;
export const SUNDER_DURATION_MS = 8000;
export const SUNDER_ARMOR_PER_STACK = 8; // 8% per stack

export const KNOCKDOWN_BUFF_ID = 'knockdown';
export const STUN_BUFF_ID = 'stun';

export const useBuffStore = create<BuffState>()(
  persist(
    (set, get) => ({
  entityBuffs: {},

  addBuff: (entityId, newBuff) => {
    const now = useAppStore.getState().getGameTime();
    set((state) => {
      const entityBuffList = state.entityBuffs[entityId] || [];
      
      // Check if it already exists to stack/refresh
      const existingBuffIndex = entityBuffList.findIndex(b => b.buffId === newBuff.buffId);
      
      if (existingBuffIndex >= 0 && newBuff.stackingBehavior !== 'independent') {
        const updatedList = [...entityBuffList];
        const existing = updatedList[existingBuffIndex];
        
        if (newBuff.stackingBehavior === 'refresh' || newBuff.stackingBehavior === 'stack') {
          updatedList[existingBuffIndex] = {
            ...existing,
            expiresAt: existing.maxDurationMs ? now + existing.maxDurationMs : null,
            stacks: newBuff.stackingBehavior === 'stack' ? Math.min(existing.maxStacks, existing.stacks + (newBuff.stacks || 1)) : existing.stacks
          };
          return { entityBuffs: { ...state.entityBuffs, [entityId]: updatedList } };
        }
      }

      // Add new buff
      const buffInstance: Buff = { 
        ...newBuff, 
        id: Math.random().toString(36).substring(7),
        expiresAt: newBuff.durationMs ? now + newBuff.durationMs : null,
        nextTickAt: (newBuff.isDoT && newBuff.dotTickRateMs) ? now + newBuff.dotTickRateMs : ((newBuff.isHoT && newBuff.hotTickRateMs) ? now + newBuff.hotTickRateMs : undefined)
      };
      return { entityBuffs: { ...state.entityBuffs, [entityId]: [...entityBuffList, buffInstance] } };
    });
  },

  removeBuff: (entityId, buffInstanceId) => {
    set((state) => {
      const entityBuffList = state.entityBuffs[entityId] || [];
      return {
        entityBuffs: {
          ...state.entityBuffs,
          [entityId]: entityBuffList.filter(b => b.id !== buffInstanceId)
        }
      };
    });
  },

  tickBuffs: (now) => {
    let dotEvents: { entityId: string, damage: number, damageType: string }[] = [];
    let hotEvents: { entityId: string, healAmount: number }[] = [];
    let manaEvents: { entityId: string, manaAmount: number }[] = [];
    
    set((state) => {
      let changed = false;
      const newEntityBuffs = { ...state.entityBuffs };

      Object.keys(newEntityBuffs).forEach((entityId) => {
        let buffs = newEntityBuffs[entityId];
        
        // Filter out expired buffs
        const validBuffs = buffs.filter(b => b.expiresAt === null || b.expiresAt === undefined || b.expiresAt > now);
        let entityChanged = false;
        if (validBuffs.length !== buffs.length) {
            entityChanged = true;
        }

        // Process ticks
        let ticksProcessed = false;
        const tickedBuffs = validBuffs.map(buff => {
          let updatedBuff = buff;
          
          if (buff.nextTickAt && now >= buff.nextTickAt) {
             ticksProcessed = true;
             updatedBuff = { ...buff };
             
             if (buff.isDoT && buff.dotTickRateMs && buff.dotDamagePerTick) {
                const ticks = Math.floor((now - buff.nextTickAt) / buff.dotTickRateMs) + 1;
                updatedBuff.nextTickAt = buff.nextTickAt + (ticks * buff.dotTickRateMs);
                dotEvents.push({ 
                  entityId, 
                  damage: (buff.dotDamagePerTick * buff.stacks) * ticks,
                  damageType: buff.dotDamageType || 'Physical'
                });
             }
             
             if (buff.isHoT && buff.hotTickRateMs && (buff.hotHealPerTick || buff.hotManaPerTick)) {
                const ticks = Math.floor((now - buff.nextTickAt) / buff.hotTickRateMs) + 1;
                updatedBuff.nextTickAt = buff.nextTickAt + (ticks * buff.hotTickRateMs);
                if (buff.hotHealPerTick) {
                  hotEvents.push({ entityId, healAmount: (buff.hotHealPerTick * buff.stacks) * ticks });
                }
                if (buff.hotManaPerTick) {
                  manaEvents.push({ entityId, manaAmount: (buff.hotManaPerTick * buff.stacks) * ticks });
                }
             }
          }
          return updatedBuff;
        });

        if (entityChanged || ticksProcessed) {
           changed = true;
           newEntityBuffs[entityId] = tickedBuffs;
        }
      });

      return changed ? { entityBuffs: newEntityBuffs } : state;
    });

    return { dotEvents, hotEvents, manaEvents };
  },

  applySunder: (entityId, stacks = 1) => {
    get().addBuff(entityId, {
      buffId: SUNDER_BUFF_ID,
      name: 'Sunder',
      type: 'debuff',
      stackingBehavior: 'stack',
      durationMs: SUNDER_DURATION_MS,
      maxDurationMs: SUNDER_DURATION_MS,
      stacks,
      maxStacks: SUNDER_MAX_STACKS,
      icon: 'ShieldOff',
      statModifiers: []
    });
  },

  getSunderStacks: (entityId) => {
    const buffs = get().entityBuffs[entityId] || [];
    const sunder = buffs.find(b => b.buffId === SUNDER_BUFF_ID);
    return sunder?.stacks || 0;
  },

  getSunderArmorReduction: (entityId) => {
    const stacks = get().getSunderStacks(entityId);
    return Math.min(0.4, stacks * (SUNDER_ARMOR_PER_STACK / 100));
  },

  applyKnockdown: (entityId, durationMs) => {
    get().addBuff(entityId, {
      buffId: KNOCKDOWN_BUFF_ID,
      name: 'Knocked Down',
      type: 'debuff',
      stackingBehavior: 'refresh',
      durationMs,
      maxDurationMs: durationMs,
      stacks: 1,
      maxStacks: 1,
      icon: 'CircleOff',
      statModifiers: []
    });
  },

  isKnockedDown: (entityId) => {
    const buffs = get().entityBuffs[entityId] || [];
    return buffs.some(b => b.buffId === KNOCKDOWN_BUFF_ID);
  },

  applyStun: (entityId, durationMs) => {
    get().addBuff(entityId, {
      buffId: STUN_BUFF_ID,
      name: 'Stunned',
      type: 'debuff',
      stackingBehavior: 'refresh',
      durationMs,
      maxDurationMs: durationMs,
      stacks: 1,
      maxStacks: 1,
      icon: 'Sparkles',
      statModifiers: []
    });
  },

  isStunned: (entityId) => {
    const buffs = get().entityBuffs[entityId] || [];
    return buffs.some(b => b.buffId === STUN_BUFF_ID);
  }
    }),
    {
      name: 'webarpg-buffs',
      storage: createThrottledPersistStorage()
    }
  )
);
