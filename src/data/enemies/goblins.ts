import type { EnemyTemplate } from '../../engine/enemies/types';

export const GOBLINS: Record<string, EnemyTemplate> = {
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    minLevel: 1,
    maxLevel: 10,
    aiProfile: 'melee_rusher',
    baseXpReward: 20,
    stats: {
      maxHealth: 40,
      attackPower: 5,
      attackSpeed: 1.5,
      attackRange: 1.5,
      moveSpeed: 2.0,
      aggroRange: 5,
      armor: 10,
      fireResist: 0,
      coldResist: 0,
      lightningResist: 0,
    },
  },
};
