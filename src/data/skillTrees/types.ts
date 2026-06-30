import type { StatModifier } from '../../engine/stats/types';

export interface TalentNode {
  id: string;
  name: string;
  description: string;
  type: 'active' | 'passive';
  tier: number; // 1 to 5
  maxPoints: number;
  icon: string;

  // For Passives
  statModifiers?: StatModifier[];

  // For Actives
  grantedSkillId?: string;
}
