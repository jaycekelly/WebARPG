import type { EnemyTemplate } from '../../engine/enemies/types';

export const ENEMIES: Record<string, EnemyTemplate> = {
  goblin: {
    id: 'goblin',
    name: 'Goblin',
    minLevel: 1,
    maxLevel: 5,
    aiProfile: 'melee_rusher',
    baseXpReward: 20,
    baseGoldReward: 5,
    stats: {
      maxHealth: 60,
      attackPower: 15,
      damageType: 'Strike',
      attackSpeed: 0.5,
      attackRange: 1,
      moveSpeed: 1.67,
      aggroRange: 5,
      armor: 10,
      strikeResist: 0,
      pierceResist: 0,
      fireResist: 0,
      coldResist: 0,
      lightningResist: 0,
    },
  },
};
