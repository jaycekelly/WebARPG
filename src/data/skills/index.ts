import type { Skill } from '../../engine/skills/types';
import { MELEE_SKILLS } from './melee';

export const SKILLS: Record<string, Skill> = {
  ...MELEE_SKILLS,
};
