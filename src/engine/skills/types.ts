export type SkillTag = 
  | 'Attack' | 'Spell' | 'Melee' | 'Projectile' | 'Area'
  | 'Physical' | 'Fire' | 'Cold' | 'Lightning';

export type TargetingType = 'Single' | 'Self' | 'Directional' | 'Ground';

export type EffectType = 'damage' | 'heal' | 'status';

export interface SkillEffect {
  type: EffectType;
  baseValue: number;
  // If damage, what element is it?
  element?: 'Physical' | 'Fire' | 'Cold' | 'Lightning';
  // If status, what is it?
  statusEffect?: string;
  durationMs?: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  tags: SkillTag[];
  
  manaCost: number;
  range: number; // 0 for self, >0 for targeted
  gcdDuration: number;
  castTime: number; // 0 for instant, >0 for a cast bar
  
  targeting: TargetingType;
  effects: SkillEffect[];
  
  // The escape hatch for bizarre edge-case skills
  onExecute?: (sourceId: string, targetId: string) => void;
}
