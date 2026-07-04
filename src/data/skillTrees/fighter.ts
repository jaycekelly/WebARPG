import type { TalentNode } from './types';
import { Stat } from '../../engine/stats/types';

export const FIGHTER_TREE: TalentNode[] = [
  // Tier 1 (0 points required)
  {
    id: 't1_passive_strike',
    name: 'Placeholder Strike',
    description: '+10% Increased Strike Damage per point.',
    type: 'passive',
    tier: 1,
    maxPoints: 5,
    icon: 'Sword',
    statModifiers: [
      {
        id: 't1_strike',
        sourceId: 't1_passive_strike',
        ...Stat('StrikeDamage', 10, 'increased'),
      },
    ],
  },

  {
    id: 't1_active_charge',
    name: 'Charge',
    description: 'Instantly dash to your target and strike them.',
    type: 'active',
    tier: 1,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'charge_attack',
  },
  {
    id: 't1_active_fireball',
    name: 'Fireball',
    description: 'Hurls a fiery projectile at the enemy.',
    type: 'active',
    tier: 1,
    maxPoints: 1,
    icon: 'Flame',
    grantedSkillId: 'fireball',
  },
  {
    id: 't1_active_heavy_strike',
    name: 'Heavy Strike',
    description: 'A crushing blow that deals 150% weapon damage.',
    type: 'active',
    tier: 1,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'heavy_strike',
  },
  
  // --- TIER 2 ---
  {
    id: 't2_active_heavy_strike',
    name: 'Heavy Strike T2',
    description: 'A crushing blow that deals 150% weapon damage.',
    type: 'active',
    tier: 2,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'heavy_strike',
  },
  
  // --- TIER 3 ---
  {
    id: 't3_active_heavy_strike',
    name: 'Heavy Strike T3',
    description: 'A crushing blow that deals 150% weapon damage.',
    type: 'active',
    tier: 3,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'heavy_strike',
  },
  
  // --- TIER 4 ---
  {
    id: 't4_active_heavy_strike',
    name: 'Heavy Strike T4',
    description: 'A crushing blow that deals 150% weapon damage.',
    type: 'active',
    tier: 4,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'heavy_strike',
  },
  
  // --- TIER 5 ---
  {
    id: 't5_active_heavy_strike',
    name: 'Heavy Strike T5',
    description: 'A crushing blow that deals 150% weapon damage.',
    type: 'active',
    tier: 5,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'heavy_strike',
  }
];
