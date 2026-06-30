import type { AffixTemplate } from '../../engine/items/types';

export const DEFENSIVE_AFFIXES: AffixTemplate[] = [
  {
    id: 'flat_health',
    allowedTypes: [
      'helm',
      'chest',
      'gloves',
      'pants',
      'boots',
      'ring',
      'amulet',
    ],
    minLevel: 1,
    stat: 'Health',
    type: 'flat',
    baseValue: 6,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value} Maximum Health',
  },
  {
    id: 'flat_mana',
    allowedTypes: [
      'helm',
      'chest',
      'gloves',
      'ring',
      'amulet',
    ],
    minLevel: 1,
    stat: 'Mana',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value} Maximum Mana',
  },
  {
    id: 'flat_armor',
    allowedTypes: [
      'helm',
      'chest',
      'gloves',
      'pants',
      'boots',
    ],
    minLevel: 1,
    stat: 'Armor',
    type: 'flat',
    baseValue: 4,
    levelMultiplier: 0.04,
    descriptionTpl: '+{value} Armor',
  },
];
