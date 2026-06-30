import type { ClassType } from '../../engine/player/types';
import type { TalentNode } from './types';
import { FIGHTER_TREE } from './fighter';

export type { TalentNode };

export const SKILL_TREE: Record<ClassType, TalentNode[]> = {
  Fighter: FIGHTER_TREE,
};
