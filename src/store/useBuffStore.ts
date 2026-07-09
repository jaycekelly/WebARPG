import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { StatType } from '../engine/stats/types';
import { dualStorage } from './storage';

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
  timeSinceLastTickMs?: number;
  dotDamageType?: string;
  
  // HoT specific
  isHoT?: boolean;
  hotHealPerTick?: number;
  hotManaPerTick?: number;
  hotTickRateMs?: number;
}

interface BuffState {
  // Keyed by entityId (e.g. 'player', or enemy.id)
  entityBuffs: Record<string, Buff[]>;
  
  addBuff: (entityId: string, buff: Omit<Buff, 'id'>) => void;
  removeBuff: (entityId: string, instanceId: string) => void;
  tickBuffs: (deltaTime: number) => { 
    dotEvents: { entityId: string, damage: number, damageType: string }[],
    hotEvents: { entityId: string, healAmount: number }[],
    manaEvents: { entityId: string, manaAmount: number }[]
  };
}

export const useBuffStore = create<BuffState>()(
  persist(
    (set) => ({
  entityBuffs: {},

  addBuff: (entityId, newBuff) => {
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
            durationMs: existing.maxDurationMs, // Refresh duration
            stacks: newBuff.stackingBehavior === 'stack' ? Math.min(existing.maxStacks, existing.stacks + 1) : existing.stacks
          };
          return { entityBuffs: { ...state.entityBuffs, [entityId]: updatedList } };
        }
      }

      // Add new buff
      const buffInstance = { ...newBuff, id: Math.random().toString(36).substring(7) };
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

  tickBuffs: (deltaTime) => {
    let dotEvents: { entityId: string, damage: number, damageType: string }[] = [];
    let hotEvents: { entityId: string, healAmount: number }[] = [];
    let manaEvents: { entityId: string, manaAmount: number }[] = [];
    
    set((state) => {
      let changed = false;
      const newEntityBuffs = { ...state.entityBuffs };

      Object.keys(newEntityBuffs).forEach((entityId) => {
        let buffs = newEntityBuffs[entityId];
        let hasExpired = false;
        
        const updatedBuffs = buffs.map(buff => {
          let updatedBuff = { ...buff };
          
          if (updatedBuff.durationMs !== null) {
            updatedBuff.durationMs -= deltaTime;
            if (updatedBuff.durationMs <= 0) hasExpired = true;
          }
          
          // Handle DoT
          if (updatedBuff.isDoT && updatedBuff.dotTickRateMs && updatedBuff.dotDamagePerTick) {
            updatedBuff.timeSinceLastTickMs = (updatedBuff.timeSinceLastTickMs || 0) + deltaTime;
            if (updatedBuff.timeSinceLastTickMs >= updatedBuff.dotTickRateMs) {
              const ticks = Math.floor(updatedBuff.timeSinceLastTickMs / updatedBuff.dotTickRateMs);
              updatedBuff.timeSinceLastTickMs -= ticks * updatedBuff.dotTickRateMs;
              dotEvents.push({ 
                entityId, 
                damage: (updatedBuff.dotDamagePerTick * updatedBuff.stacks) * ticks,
                damageType: updatedBuff.dotDamageType || 'Physical'
              });
            }
          }

          // Handle HoT
          if (updatedBuff.isHoT && updatedBuff.hotTickRateMs && (updatedBuff.hotHealPerTick || updatedBuff.hotManaPerTick)) {
            updatedBuff.timeSinceLastTickMs = (updatedBuff.timeSinceLastTickMs || 0) + deltaTime;
            if (updatedBuff.timeSinceLastTickMs >= updatedBuff.hotTickRateMs) {
              const ticks = Math.floor(updatedBuff.timeSinceLastTickMs / updatedBuff.hotTickRateMs);
              updatedBuff.timeSinceLastTickMs -= ticks * updatedBuff.hotTickRateMs;
              if (updatedBuff.hotHealPerTick) {
                hotEvents.push({
                  entityId,
                  healAmount: (updatedBuff.hotHealPerTick * updatedBuff.stacks) * ticks
                });
              }
              if (updatedBuff.hotManaPerTick) {
                manaEvents.push({
                  entityId,
                  manaAmount: (updatedBuff.hotManaPerTick * updatedBuff.stacks) * ticks
                });
              }
            }
          }
          
          return updatedBuff;
        });

        if (hasExpired) {
          changed = true;
          newEntityBuffs[entityId] = updatedBuffs.filter(b => b.durationMs === null || b.durationMs > 0);
        } else {
          changed = true;
          newEntityBuffs[entityId] = updatedBuffs;
        }
      });

      return changed ? { entityBuffs: newEntityBuffs } : state;
    });

    return { dotEvents, hotEvents, manaEvents };
  }
    }),
    {
      name: 'webarpg-buffs',
      storage: createJSONStorage(() => dualStorage)
    }
  )
);
