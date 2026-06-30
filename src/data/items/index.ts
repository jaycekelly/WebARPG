import type { ItemTemplate } from '../../engine/items/types';
import { WEAPONS } from './weapons';
import { ARMOR } from './armor';
import { ACCESSORIES } from './accessories';

export const ITEM_TEMPLATES: Record<string, ItemTemplate> =
  {
    ...WEAPONS,
    ...ARMOR,
    ...ACCESSORIES,
  };
