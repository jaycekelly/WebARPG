import { create } from 'zustand';
import { SKILL_TREE } from '../data/skillTrees';
import { usePlayerStore } from './usePlayerStore';
import { useBuffStore } from './useBuffStore';

interface SkillState {
  // node id -> points spent
  allocatedPoints: Record<string, number>;
  unlockedActives: string[]; // List of skillIds
  
  allocatePoint: (nodeId: string) => boolean; // Returns true if successful
  getTotalPointsSpent: () => number;
}

export const useSkillStore = create<SkillState>((set, get) => ({
  allocatedPoints: {},
  unlockedActives: [],

  getTotalPointsSpent: () => {
    return Object.values(get().allocatedPoints).reduce((sum, points) => sum + points, 0);
  },

  allocatePoint: (nodeId) => {
    const state = get();
    const playerStore = usePlayerStore.getState();
    const currentTree = SKILL_TREE[playerStore.playerClass] || [];
    const node = currentTree.find(n => n.id === nodeId);
    if (!node) return false;

    if (playerStore.skillPoints <= 0) return false; // No points to spend

    // Check tier unlock requirement (10 points per tier previous)
    // Tier 1 = 0, Tier 2 = 10, Tier 3 = 20, etc.
    const requiredPoints = (node.tier - 1) * 10;
    if (state.getTotalPointsSpent() < requiredPoints) return false;

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
       const scaledModifiers = node.statModifiers.map(mod => ({
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
