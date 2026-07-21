import type { EnemyTemplate } from '../../engine/enemies/types';

export const ENEMIES: Record<string, EnemyTemplate> = {
  bat: {
    id: 'bat',
    name: 'Bat',
    minLevel: 1,
    maxLevel: 5,
    aiProfile: 'melee_rusher',
    baseXpReward: 20,
    baseGoldReward: 5,
    scale: 0.45, // Smaller scaling factor for bats
    stats: {
      maxHealth: 200,
      attackPower: 5,
      damageType: 'Strike',
      attackSpeed: 0.4, // 1 attack every 2.5s
      attackRange: 1,
      moveSpeed: 1.33, // 750ms baseline
      aggroRange: 5,
      armor: 15,
      strikeResist: 0,
      pierceResist: 0,
      fireResist: 0,
      coldResist: 0,
      lightningResist: 0,
    },
    skills: [
      {
        id: 'sonic_screech',
        chargeTime: 1500,
        cooldown: 10000,
        cooldownVariance: 0.2, // +/- 20%
        initialCooldown: 5000, // Wait 3 seconds after aggro
        range: 2,
        shape: 'line',
        radius: 3, // Length of the line
        damageMult: 3.0,
        color: 0x38bdf8,
        damageType: 'Lightning',
      }
    ]
  },
  cultist_arbalest: {
    id: 'cultist_arbalest',
    name: 'Cultist Arbalest',
    minLevel: 1,
    maxLevel: 5,
    aiProfile: 'ranged_kiter',
    baseXpReward: 15,
    baseGoldReward: 4,
    scale: 1.0,
    stats: {
      maxHealth: 70,
      attackPower: 2.5,
      damageType: 'Pierce',
      attackSpeed: 0.4, // 1 attack every 2.5s
      attackRange: 4,
      moveSpeed: 1.33, // 750ms baseline
      aggroRange: 6,
      armor: 5,
      strikeResist: 0,
      pierceResist: 0,
      fireResist: 0,
      coldResist: 0,
      lightningResist: 0,
    },
  },
  ironclad_brute: {
    id: 'ironclad_brute',
    name: 'Ironclad Brute',
    minLevel: 1,
    maxLevel: 5,
    aiProfile: 'melee_rusher',
    baseXpReward: 25,
    baseGoldReward: 6,
    scale: 1.25,
    stats: {
      maxHealth: 180,
      attackPower: 4,
      damageType: 'Strike',
      attackSpeed: 0.4, // 1 attack every 2.5s
      attackRange: 1,
      moveSpeed: 1.33, // 750ms baseline
      aggroRange: 5,
      armor: 20,
      strikeResist: 0,
      pierceResist: 0,
      fireResist: 0,
      coldResist: 0,
      lightningResist: 0,
    },
  },
  footman: {
    id: 'footman',
    name: 'Footman',
    minLevel: 1,
    maxLevel: 5,
    aiProfile: 'melee_rusher',
    baseXpReward: 18,
    baseGoldReward: 5,
    scale: 1.0,
    stats: {
      maxHealth: 110,
      attackPower: 3,
      damageType: 'Strike',
      attackSpeed: 0.4, // 1 attack every 2.5s
      attackRange: 1,
      moveSpeed: 1.33, // 750ms baseline
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
