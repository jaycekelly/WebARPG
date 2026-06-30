import type { AffixTemplate } from '../../engine/items/types';

export const ATTRIBUTE_AFFIXES: AffixTemplate[] = [
  {
    id: 'flat_strength',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    allowedArmorCategories: ['Heavy'],
    minLevel: 1,
    stat: 'Strength',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.5,
    descriptionTpl: '+{value} Strength',
    exclusivityGroup: 'Attribute'
  },
  {
    id: 'flat_dexterity',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    allowedArmorCategories: ['Light'],
    minLevel: 1,
    stat: 'Dexterity',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.5,
    descriptionTpl: '+{value} Dexterity',
    exclusivityGroup: 'Attribute'
  },
  {
    id: 'flat_intelligence',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots', 'shield', 'tome', 'amulet', 'ring'],
    allowedArmorCategories: ['Caster'],
    minLevel: 1,
    stat: 'Intelligence',
    type: 'flat',
    baseValue: 2,
    levelMultiplier: 0.5,
    descriptionTpl: '+{value} Intelligence',
    exclusivityGroup: 'Attribute'
  }
];
