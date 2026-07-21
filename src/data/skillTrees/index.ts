import type { ClassType } from '../../engine/player/types';
import type { TalentNode } from './types';
import { WARRIOR_TREE } from './warrior';

export type { TalentNode };

export const SKILL_TREE: Record<ClassType, TalentNode[]> = {
  Warrior: WARRIOR_TREE,
  Mage: [],
  Rogue: [],
  Ranger: [],
};
