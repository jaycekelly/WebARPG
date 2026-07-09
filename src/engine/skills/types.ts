import type { StatModifier } from '../stats/types';
import type { AoeShape } from '../world/gridMath';
import type { WeaponCategory } from '../items/types';
import type { DamageType } from '../stats/types';

export type SkillTag = 
  | 'Attack' | 'Spell' | 'Melee' | 'Projectile' | 'Area' | 'AoE' | 'Buff' | 'Aura' | 'Movement'
  | 'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Minion' | 'Strike' | 'Pierce';

export type TargetingType = 'Single' | 'Self' | 'Directional' | 'Ground' | 'Area';

export type EffectType = 'damage' | 'heal' | 'status' | 'buff' | 'summon' | 'charge';

export type TargetFilter = 'Enemy' | 'Ally' | 'Self' | 'All';

export interface AoeParams {
  shape: AoeShape;
  radius: number;
  respectWalls?: boolean;
  
  // Advanced Scaling
  falloff?: {
    innerRadius: number; // e.g., 1 (tiles within this range take full damage)
    outerMultiplier: number; // e.g., 0.5 (tiles outside innerRadius take half damage)
  };
  lingering?: {
    durationMs: number;
    // A string identifier for the hazard (e.g. 'fire_surface')
    hazardId: string;
    damagePerSecond?: number;
    element?: DamageType;
  };
  cascade?: {
    radius: number;
    chance: number; // 0 to 1
    maxDepth?: number; // Prevent infinite loops
  };
}

export type SkillReachScalingEntry = 
  | { required: number; effect: 'radius'; value: number }
  | { required: number; effect: 'falloff'; inner: number; outerDamage: number }
  | { required: number; effect: 'lingering'; duration: number; damagePerTurn?: number; hazardId?: string; element?: DamageType }
  | { required: number; effect: 'cascade'; radius: number; chance: number }
  | { required: number; effect: 'shape'; shape: AoeShape };

export interface SummonParams {
  templateId: string;
  durationMs?: number; // 0 or undefined for permanent
  maxCount?: number;   // Maximum allowed of this minion type
}

export interface SkillEffect {
  type: EffectType;
  targetFilter?: TargetFilter; // Defaults to 'Enemy' for damage/debuffs, 'Ally' for heals/buffs
  
  baseValue?: number; // Optional now, since buffs don't use it
  damageMultiplier?: number; // e.g. 1.5 for 150% weapon damage
  damageEffectiveness?: number; // e.g. 1.5 scales flat spell damage by 150%
  // If damage, what element is it?
  element?: DamageType;
  // If status, what is it?
  statusEffect?: string;
  durationMs?: number;
  
  // For Buffs
  buffId?: string;
  buffName?: string;
  statModifiers?: StatModifier[];

  // For Summons
  summonParams?: SummonParams;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  tags: SkillTag[];
  
  manaCost: number;
  range: number; // 0 for self, >0 for targeted
  cooldownMs?: number; // Specific cooldown for this skill
  gcdDuration: number;
  castTime: number; // 0 for instant, >0 for a cast bar
  
  baseCritChance?: number; // Intrinsic crit chance (0 for most spells, >0 if explicitly unlocked)
  
  targeting: TargetingType;
  requiredWeaponCategories?: WeaponCategory[];
  aoeParams?: AoeParams;
  skillReachScaling?: SkillReachScalingEntry[];
  effects: SkillEffect[];
  
  // The escape hatch for bizarre edge-case skills
  onExecute?: (sourceId: string, targetId: string) => void;
}
