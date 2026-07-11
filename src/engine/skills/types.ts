import type { StatModifier } from '../stats/types';
import type { AoeShape } from '../world/gridMath';
import type { WeaponCategory } from '../items/types';
import type { DamageType } from '../stats/types';

export type SkillTag = 
  | 'Attack' | 'Spell' | 'Melee' | 'Projectile' | 'Area' | 'AoE' | 'Buff' | 'Aura' | 'Movement'
  | 'Physical' | 'Fire' | 'Cold' | 'Lightning' | 'Minion' | 'Strike' | 'Pierce';

export type TargetingType = 'Single' | 'Self' | 'Directional' | 'Ground' | 'Area';

export type EffectType = 'damage' | 'heal' | 'status' | 'buff' | 'summon' | 'charge' | 'leap';

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

  // Universal Sunder application (applies to all targets hit by a 'damage' effect)
  applySunderStacks?: number;

  // Scales this effect's damage up by a flat percent per existing Sunder stack on the target
  // (e.g. Shield Break: +10% per stack). Read before mitigation, non-destructive to stacks.
  bonusDamagePerSunderStack?: number;

  // If the target has at least this many Sunder stacks, spawn a T-shape explosion behind them
  // (relative to the caster's position) dealing tShapeDamageMultiplier% Strike damage.
  tShapeSunderThreshold?: number;
  tShapeDamageMultiplier?: number;

  // Universal Knockdown application - only affects targets that currently have Sunder stacks
  knockdownIfSundered?: boolean;
  knockdownDurationMs?: number;

  // Flat damage bonus (%) applied if the target currently has at least 1 Sunder stack
  // (e.g. Ravage: +25% damage vs a Sundered target). Does not scale with stack count.
  bonusDamageIfSundered?: number;

  // Only generate this effect's skill-level adrenalineGenerate if this specific damage
  // effect actually connects with at least one valid target (e.g. Onslaught Leap should
  // not generate Adrenaline if it lands on an empty tile).
  adrenalineOnlyOnHit?: boolean;

  // If this effect successfully interrupts an enemy cast/channel, also stun that enemy.
  stunOnInterruptMs?: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  
  tags: SkillTag[];
  
  energyCost: number;
  adrenalineCost?: number; // Universal Adrenaline resource cost (Fighter spenders)
  adrenalineGenerate?: number; // Universal Adrenaline resource generation on hit
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
  
  // Combo Chain metadata (e.g. Heavy Strike Combo). If set, this skill is a "combo starter":
  // activating it advances a shared combo counter and swaps in the appropriate chained skill's
  // effects/targeting for that hit. comboChainIds are ordered [hit1, hit2, hit3, ...].
  comboChainIds?: string[];
  comboTimeoutMs?: number;
  
  // If true, this skill does not trigger or respect the shared Global Cooldown at all
  // (e.g. Zealous Blow: instant reaction skill, castable even mid-GCD).
  offGcd?: boolean;
  
  // If set, this skill can only be activated while the given buffId is active on the player
  // (e.g. Zealous Blow requires the 'zealous_blow_ready' proc window). Fails silently like an
  // unmet resource cost if the buff isn't present.
  requiresBuffId?: string;
  // If true, successfully activating this skill removes requiresBuffId from the player.
  consumesRequiredBuff?: boolean;
  
  // If set on a 'Ground' targeting skill, and the player currently has an active target and
  // is not in Tactical Pause, the skill automatically resolves its ground position from that
  // target instead of requiring a manual tile click (e.g. Ground Slam). Manual targeting still
  // kicks in when there's no current target, or while paused.
  autoTargetCurrentEnemy?: boolean;
  
  // The escape hatch for bizarre edge-case skills
  onExecute?: (sourceId: string, targetId: string) => void;
  
  // Unlock Requirements
  requiredLevel?: number;
  classRequirement?: string;

  // Internal skills (e.g. combo chain hits) that shouldn't be listed as their own
  // entry in skill selection UIs like the Active Skills tab.
  isHidden?: boolean;
}
