import type { EnemyTemplate } from '../../engine/enemies/types';
import { GOBLINS } from './goblins';
import { ORCS } from './orcs';
import { UNDEAD } from './undead';

export const ENEMY_TEMPLATES: Record<
  string,
  EnemyTemplate
> = {
  ...GOBLINS,
  ...ORCS,
  ...UNDEAD,
};
