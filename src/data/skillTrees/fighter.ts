import type { TalentNode } from './types';
import { Stat } from '../../engine/stats/types';

export const FIGHTER_TREE: TalentNode[] = [
  // Tier 1 (0 points required)
  {
    id: 't1_active_fireball',
    name: 'Fireball',
    description:
      'Hurl a flaming ball that deals Fire damage.',
    type: 'active',
    tier: 1,
    maxPoints: 1,
    icon: 'Flame',
    grantedSkillId: 'fireball',
  },
  {
    id: 't1_passive_strength',
    name: 'Brute Strength',
    description: '+10% Increased Physical Damage.',
    type: 'passive',
    tier: 1,
    maxPoints: 5,
    icon: 'Sword',
    statModifiers: [
      {
        id: 't1_str',
        sourceId: 't1_passive_strength',
        ...Stat('PhysicalDamage', 10, 'increased'),
      },
    ],
  },

  // Tier 2 (10 points required)
  {
    id: 't2_active_cleave',
    name: 'Cleave',
    description:
      'A sweeping physical attack that hits a wide arc.',
    type: 'active',
    tier: 2,
    maxPoints: 1,
    icon: 'Sword',
    grantedSkillId: 'cleave',
  },
  {
    id: 't2_passive_swift',
    name: 'Swiftness',
    description:
      '+5% Increased Attack Speed and +5% Move Speed.',
    type: 'passive',
    tier: 2,
    maxPoints: 5,
    icon: 'Footprints',
    statModifiers: [
      {
        id: 't2_spd1',
        sourceId: 't2_passive_swift',
        ...Stat('AttackSpeed', 5, 'increased'),
      },
      {
        id: 't2_spd2',
        sourceId: 't2_passive_swift',
        ...Stat('MoveSpeed', 5, 'increased'),
      },
    ],
  },

  // Tier 3 (20 points required)
  {
    id: 't3_passive_iron_skin',
    name: 'Iron Skin',
    description: '+50 Flat Armor.',
    type: 'passive',
    tier: 3,
    maxPoints: 5,
    icon: 'ShieldAlert',
    statModifiers: [
      {
        id: 't3_arm',
        sourceId: 't3_passive_iron_skin',
        ...Stat('Armor', 50),
      },
    ],
  },
  {
    id: 't3_passive_vitality',
    name: 'Vitality',
    description: '+20 Flat Health.',
    type: 'passive',
    tier: 3,
    maxPoints: 5,
    icon: 'ArrowUpCircle',
    statModifiers: [
      {
        id: 't3_hp',
        sourceId: 't3_passive_vitality',
        ...Stat('Health', 20),
      },
    ],
  },

  // Tier 4 (30 points required)
  {
    id: 't4_active_warcry',
    name: 'Warcry',
    description:
      'Bellow a mighty cry, buffing your damage for a short time.',
    type: 'active',
    tier: 4,
    maxPoints: 1,
    icon: 'ArrowUpCircle',
    grantedSkillId: 'warcry',
  },
  {
    id: 't4_passive_crit',
    name: 'Lethal Strikes',
    description:
      '+50% increased Attack Critical Strike Chance.',
    type: 'passive',
    tier: 4,
    maxPoints: 5,
    icon: 'Sword',
    statModifiers: [
      {
        id: 't4_crit',
        sourceId: 't4_passive_crit',
        ...Stat(
          'AttackCriticalStrikeChance',
          50,
          'increased',
        ),
      },
    ],
  },

  // Tier 5 (40 points required)
  {
    id: 't5_passive_juggernaut',
    name: 'Juggernaut',
    description:
      '15% MORE Total Damage. The ultimate capstone.',
    type: 'passive',
    tier: 5,
    maxPoints: 1,
    icon: 'ShieldAlert',
    statModifiers: [
      {
        id: 't5_dmg',
        sourceId: 't5_passive_juggernaut',
        ...Stat('Damage', 15, 'more'),
      },
    ],
  },
];
