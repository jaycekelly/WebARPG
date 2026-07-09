import { create } from 'zustand';
import { SKILL_TREE } from '../data/skillTrees';
import { usePlayerStore } from './usePlayerStore';

import type { ClassType } from '../engine/player/types';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dualStorage } from './storage';

interface SkillState {
  // node id -> points spent
  allocatedPoints: Record<string, number>;
  unlockedActives: string[]; // List of skillIds
  
  allocatePoint: (nodeId: string, classType: ClassType) => boolean; // Returns true if successful
  getTotalPointsSpent: (classType: ClassType) => number;
}

export const useSkillStore = create<SkillState>()(
  persist(
    (set, get) => ({
      allocatedPoints: {},
  unlockedActives: [],

  getTotalPointsSpent: (classType) => {
    const tree = SKILL_TREE[classType] || [];
    const state = get();
    return tree.reduce((sum: number, node: any) => sum + (state.allocatedPoints[node.id] || 0), 0);
  },



    allocatePoint: (nodeId, classType) => {
    const state = get();
    const playerStore = usePlayerStore.getState();
    const currentTree = SKILL_TREE[classType] || [];
    const node = currentTree.find((n: any) => n.id === nodeId);
    if (!node) return false;

    if (playerStore.skillPoints <= 0) return false; // No points to spend

    // Check tier unlock requirement
    const TIER_REQS = [0, 0, 4, 10, 18, 28];
    const requiredPoints = TIER_REQS[node.tier] || 0;
    const spent = state.getTotalPointsSpent(classType);
    
    if (spent < requiredPoints) return false;

    const currentPoints = state.allocatedPoints[nodeId] || 0;
    if (currentPoints >= node.maxPoints) return false;

    // We can allocate!
    playerStore.addSkillPoints(-1); // Consume point

    set((s) => ({
      allocatedPoints: {
        ...s.allocatedPoints,
        [nodeId]: currentPoints + 1
      }
    }));

    if (node.type === 'active' && node.grantedSkillId) {
       // Track unlocked actives
       const { unlockedActives } = get();
       if (!unlockedActives.includes(node.grantedSkillId)) {
         set({ unlockedActives: [...unlockedActives, node.grantedSkillId] });
         
         // Auto-bind to next available slot
         const bound = playerStore.boundSkills;
         const emptyIndex = bound.findIndex(s => s === null);
         if (emptyIndex !== -1) {
             playerStore.bindSkill(emptyIndex, node.grantedSkillId);
         }
       }
    }

    return true;
  }
    }),
    {
      name: 'webarpg-skills',
      storage: createJSONStorage(() => dualStorage),
    }
  )
);
