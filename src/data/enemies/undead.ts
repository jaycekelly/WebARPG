import type { EnemyTemplate } from '../../engine/enemies/types';

export const UNDEAD: Record<string, EnemyTemplate> = {
  skeleton_archer: {
    id: 'skeleton_archer',
    name: 'Skeleton Archer',
    minLevel: 3,
    maxLevel: 15,
    aiProfile: 'static',
    baseXpReward: 30,
    stats: {
      maxHealth: 30,
      attackPower: 8,
      attackSpeed: 1.0,
      attackRange: 5.0,
      moveSpeed: 1.0,
      aggroRange: 8,
      armor: 5,
      fireResist: 0,
      coldResist: 50,
      lightningResist: 0,
    },
  },
};
