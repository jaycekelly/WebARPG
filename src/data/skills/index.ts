import type { Skill } from '../../engine/skills/types';
import { MELEE_SKILLS } from './melee';
import { SPELL_SKILLS } from './spells';

export const SKILLS: Record<string, Skill> = {
  ...MELEE_SKILLS,
  ...SPELL_SKILLS,
};
