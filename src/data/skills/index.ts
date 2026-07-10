import type { Skill } from '../../engine/skills/types';
import { FIGHTER_L10_SKILLS } from './fighter_l10';

export const SKILLS: Record<string, Skill> = {
  ...FIGHTER_L10_SKILLS,
};
