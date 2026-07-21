import type { Skill } from '../../engine/skills/types';
import { WARRIOR_SKILLS } from './warrior_skills';

export const SKILLS: Record<string, Skill> = {
  ...WARRIOR_SKILLS,
};
