import type { TalentNode } from './types';

export const WARRIOR_TREE: TalentNode[] = [
  {
    id: 'warrior_passive_strike_damage',
    name: 'Brutal Force',
    description: 'Increases Strike Damage by 3% per point (5 points, up to 15%).',
    type: 'passive',
    tier: 1,
    maxPoints: 5,
    icon: 'Sword',
    statModifiers: [
      { id: 'warrior_passive_strike_damage', sourceId: 'passive_warrior_passive_strike_damage', stat: 'StrikeDamage', type: 'increased', value: 3 }
    ]
  },
  {
    id: 'warrior_passive_armor',
    name: 'Iron Hide',
    description: 'Increases Armor by 3% per point (5 points, up to 15%).',
    type: 'passive',
    tier: 1,
    maxPoints: 5,
    icon: 'Shield',
    statModifiers: [
      { id: 'warrior_passive_armor', sourceId: 'passive_warrior_passive_armor', stat: 'Armor', type: 'increased', value: 3 }
    ]
  }
];
