import type { AffixTemplate } from '../../engine/items/types';
import { OFFENSIVE_AFFIXES } from './offensive';
import { DEFENSIVE_AFFIXES } from './defensive';

export const AFFIX_POOL: AffixTemplate[] = [
  ...OFFENSIVE_AFFIXES,
  ...DEFENSIVE_AFFIXES,
];
