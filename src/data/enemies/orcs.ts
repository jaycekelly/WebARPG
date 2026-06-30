import type { EnemyTemplate } from '../../engine/enemies/types';

export const ORCS: Record<string, EnemyTemplate> = {
  orc: {
    id: 'orc',
    name: 'Orc',
    minLevel: 5,
    maxLevel: 25,
    aiProfile: 'melee_rusher',
    baseXpReward: 50,
    stats: {
      maxHealth: 120,
      attackPower: 15,
      attackSpeed: 0.5,
      attackRange: 1.5,
      moveSpeed: 0.8,
      aggroRange: 8,
      armor: 50,
      fireResist: 20,
      coldResist: 20,
      lightningResist: 10,
    },
  },
};
