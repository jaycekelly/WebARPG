import type { AffixTemplate } from '../../engine/items/types';

export const OFFENSIVE_AFFIXES: AffixTemplate[] = [
  {
    id: 'flat_damage',
    allowedTypes: [
      'weapon-1h',
      'weapon-2h',
      'ring',
      'amulet',
    ],
    minLevel: 1,
    stat: 'Damage',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.04,
    descriptionTpl: '+{value} Damage',
  },
  {
    id: 'inc_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet'],
    minLevel: 5,
    stat: 'Damage',
    type: 'increased',
    baseValue: 6,
    levelMultiplier: 0.03,
    descriptionTpl: '{value}% Increased Damage',
  },
  {
    id: 'inc_attack_speed',
    allowedTypes: ['weapon-1h', 'gloves', 'ring'],
    minLevel: 10,
    stat: 'AttackSpeed',
    type: 'increased',
    baseValue: 3,
    levelMultiplier: 0.02,
    descriptionTpl: '{value}% Increased Attack Speed',
  },
];
