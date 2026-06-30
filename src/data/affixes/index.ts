import type { AffixTemplate } from '../../engine/items/types';
import { OFFENSIVE_AFFIXES } from './offensive';
import { DEFENSIVE_AFFIXES } from './defensive';
import { ATTRIBUTE_AFFIXES } from './attributes';
import { SUSTAIN_AFFIXES } from './sustain';
import { MISC_AFFIXES } from './misc';

export const AFFIX_POOL: AffixTemplate[] = [
  ...OFFENSIVE_AFFIXES,
  ...DEFENSIVE_AFFIXES,
  ...ATTRIBUTE_AFFIXES,
  ...SUSTAIN_AFFIXES,
  ...MISC_AFFIXES,
];
