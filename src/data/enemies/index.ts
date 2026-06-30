import type { EnemyTemplate } from '../../engine/enemies/types';
import { ENEMIES } from './enemies';
import { MINIBOSSES } from './miniboss';
import { BOSSES } from './boss';

export const ENEMY_TEMPLATES: Record<
  string,
  EnemyTemplate
> = {
  ...ENEMIES,
  ...MINIBOSSES,
  ...BOSSES,
};
