import type { EnemyTemplate } from '../engine/enemies/types';

export const ENEMY_TEMPLATES: Record<string, EnemyTemplate> = {
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
      attackSpeed: 1.5, // 1.5 attacks per second (fast)
      attackRange: 1.5, // Melee
      moveSpeed: 2.0,   // 2 tiles per sec (500ms) - Fast mover
      armor: 10,
      fireResist: 0,
      coldResist: 0,
      lightningResist: 0
    }
  },
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
      attackSpeed: 0.5, // 0.5 attacks per second (slow)
      attackRange: 1.5, // Melee
      moveSpeed: 0.8,   // 0.8 tiles per sec (1250ms) - Slow mover
      armor: 50,
      fireResist: 20,
      coldResist: 20,
      lightningResist: 10
    }
  },
  skeleton_archer: {
    id: 'skeleton_archer',
    name: 'Skeleton Archer',
    minLevel: 3,
    maxLevel: 15,
    aiProfile: 'static', // Until we write a kiter AI
    baseXpReward: 30,
    stats: {
      maxHealth: 30,
      attackPower: 8,
      attackSpeed: 1.0,
      attackRange: 5.0, // Ranged!
      moveSpeed: 1.0,
      armor: 5,
      fireResist: 0,
      coldResist: 50,
      lightningResist: 0
    }
  }
};
