export type AIProfile = 'melee_rusher' | 'static' | 'ranged_kiter';

export interface EnemyStats {
  maxHealth: number;
  attackPower: number;
  attackSpeed: number; // Attacks per second. e.g. 0.5 = 1 attack every 2s
  attackRange: number; // Grid tiles
  moveSpeed: number;   // Tiles per second. e.g. 1.0 = 1 tile per second (1000ms cooldown)
  
  // Defenses
  armor: number;
  fireResist: number;
  coldResist: number;
  lightningResist: number;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  stats: EnemyStats;
  aiProfile: AIProfile;
  baseXpReward: number; // XP to give at minLevel, can be scaled up
}
