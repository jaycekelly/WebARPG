import { create } from 'zustand';
import { SKILL_TREE } from '../data/skillTrees';
import { usePlayerStore } from './usePlayerStore';
import { useBuffStore } from './useBuffStore';
import type { ClassType } from '../engine/player/types';

interface SkillState {
  // node id -> points spent
  allocatedPoints: Record<string, number>;
  unlockedActives: string[]; // List of skillIds
  
  allocatePoint: (nodeId: string, classType: ClassType) => boolean; // Returns true if successful
  getTotalPointsSpent: (classType: ClassType) => number;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  allocatedPoints: { 't1_active_heavy_strike': 1 },
  unlockedActives: ['heavy_strike', 'charge_attack', 'fireball'],

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

    // Check tier unlock requirement (5 points per tier previous)
    const requiredPoints = (node.tier - 1) * 5;
    if (state.getTotalPointsSpent(classType) < requiredPoints) return false;

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

    // If it's a passive, we need to apply its buff to the player.
    // We can do this by applying a permanent buff with the stat modifiers.
    if (node.type === 'passive' && node.statModifiers) {
       // We'll re-apply the passive buff entirely to ensure correct stacks or values.
       // Because the passive gives X per point, we just multiply the base modifier value by the new points.
       const newPoints = currentPoints + 1;
       const scaledModifiers = node.statModifiers.map((mod: any) => ({
          ...mod,
          value: mod.value * newPoints // Multiply by points spent!
       }));

       useBuffStore.getState().addBuff('player', {
         buffId: `passive_${node.id}`,
         name: node.name,
         type: 'buff',
         stackingBehavior: 'independent',
         durationMs: null, // permanent
         maxDurationMs: null,
         stacks: 1, // We bake the stack math into the modifier value instead
         maxStacks: 1,
         icon: node.icon,
         statModifiers: scaledModifiers
       });
    } else if (node.type === 'active' && node.grantedSkillId) {
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
}));
