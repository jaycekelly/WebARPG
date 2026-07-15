import type { DamageType } from '../stats/types';

export type AIProfile = 'melee_rusher' | 'static' | 'ranged_kiter';
export type EnemyRarity = 'Normal' | 'Magic' | 'Rare' | 'Boss';

export interface EnemyStats {
  maxHealth: number;
  attackPower: number;
  damageType: DamageType;
  attackSpeed: number; // Attacks per second. e.g. 0.5 = 1 attack every 2s
  attackRange: number; // Grid tiles
  moveSpeed: number;   // Tiles per second. e.g. 1.0 = 1 tile per second (1000ms cooldown)
  aggroRange: number;  // Distance before AI activates
  
  // Defenses
  armor: number;
  fireResist: number;
  coldResist: number;
  lightningResist: number;
  strikeResist?: number;
  pierceResist?: number;
  physicalResist?: number;
  deflectChance?: number;
  deflectEffect?: number;
  block?: number;
  spellBlock?: number;
  blockEffect?: number;
  parry?: number;
  spellParry?: number;
  parryEffect?: number;
}


export interface EnemySkill {
  id: string;
  chargeTime: number; // MS
  cooldown: number; // MS
  cooldownVariance?: number; // 0.0 to 1.0 (e.g. 0.2 is +/- 20%)
  initialCooldown?: number; // Base initial cooldown in MS
  range: number;
  shape: 'line' | 'radius'; // Add more shapes if needed
  radius: number; // For line, this is width (usually 0 for 1-wide)
  damageMult: number;
  color: number;
  damageType: DamageType;
}

export interface EnemyTemplate {
  id: string;
  name: string;
  minLevel: number;
  maxLevel: number;
  rarity?: EnemyRarity;
  stats: EnemyStats;
  aiProfile: AIProfile;
  baseXpReward: number; // XP to give at minLevel, can be scaled up
  baseGoldReward: number; // Gold to give at minLevel
  scale?: number; // Optional rendering scale factor
  skills?: EnemySkill[];
}
