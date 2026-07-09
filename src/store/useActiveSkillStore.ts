import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { dualStorage } from './storage';
import { usePlayerStore } from './usePlayerStore';

// Ranks cost: 1 / 1 / 2 / 2 / 2 / 3
const RANK_COSTS = [1, 1, 2, 2, 2, 3];

interface ActiveSkillState {
  skillRanks: Record<string, number>;
  skillDials: Record<string, Record<number, string>>;
  skillMorphs: Record<string, Record<number, string>>;

  allocateDial: (skillId: string, rank: number, dialId: string) => boolean;
  allocateMorph: (skillId: string, rank: number, morphId: string) => boolean;
  respecSkill: (skillId: string) => void;
}

export const useActiveSkillStore = create<ActiveSkillState>()(
  persist(
    (set, get) => ({
      skillRanks: {},
      skillDials: {},
      skillMorphs: {},

      allocateDial: (skillId, rank, dialId) => {
        const state = get();
        const currentRank = state.skillRanks[skillId] || 0;
        
        // Ensure they are purchasing the *next* rank
        if (rank !== currentRank + 1) return false;
        
        // Ensure it's a dial rank (1, 2, 4, 5)
        if (![1, 2, 4, 5].includes(rank)) return false;

        const cost = RANK_COSTS[rank - 1];
        const playerStore = usePlayerStore.getState();
        if (playerStore.activeSkillPoints < cost) return false;

        playerStore.addActiveSkillPoints(-cost);

        set((s) => ({
          skillRanks: { ...s.skillRanks, [skillId]: rank },
          skillDials: {
            ...s.skillDials,
            [skillId]: { ...(s.skillDials[skillId] || {}), [rank]: dialId }
          }
        }));

        return true;
      },

      allocateMorph: (skillId, rank, morphId) => {
        const state = get();
        const currentRank = state.skillRanks[skillId] || 0;
        
        // Ensure they are purchasing the *next* rank
        if (rank !== currentRank + 1) return false;
        
        // Ensure it's a morph rank (3, 6)
        if (![3, 6].includes(rank)) return false;

        const cost = RANK_COSTS[rank - 1];
        const playerStore = usePlayerStore.getState();
        if (playerStore.activeSkillPoints < cost) return false;

        playerStore.addActiveSkillPoints(-cost);

        set((s) => ({
          skillRanks: { ...s.skillRanks, [skillId]: rank },
          skillMorphs: {
            ...s.skillMorphs,
            [skillId]: { ...(s.skillMorphs[skillId] || {}), [rank]: morphId }
          }
        }));

        return true;
      },

      respecSkill: (skillId) => {
        const state = get();
        const currentRank = state.skillRanks[skillId] || 0;
        if (currentRank === 0) return;

        // Refund points
        let refundedPoints = 0;
        for (let i = 0; i < currentRank; i++) {
          refundedPoints += RANK_COSTS[i];
        }
        
        usePlayerStore.getState().addActiveSkillPoints(refundedPoints);

        set((s) => {
          const newRanks = { ...s.skillRanks };
          const newDials = { ...s.skillDials };
          const newMorphs = { ...s.skillMorphs };
          
          delete newRanks[skillId];
          delete newDials[skillId];
          delete newMorphs[skillId];
          
          return {
            skillRanks: newRanks,
            skillDials: newDials,
            skillMorphs: newMorphs
          };
        });
      }
    }),
    {
      name: 'webarpg-active-skills',
      storage: createJSONStorage(() => dualStorage),
    }
  )
);
