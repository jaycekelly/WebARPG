import type { Skill } from '../../engine/skills/types';

// ---------------------------------------------------------------------------
// Level 10 Fighter Prototype Kit
// Universal mechanics used here (Adrenaline, Sunder, Stun) are implemented
// in usePlayerStore / useBuffStore / SkillExecutor / InputHandler / useGameEngine.
// ---------------------------------------------------------------------------

// --- Slot 1: Heavy Strike Combo -------------------------------------------
// The bound skill "heavy_strike_combo" is the combo starter. Activating it
// advances a shared combo counter (see useCombatStore.advanceCombo) and swaps
// in whichever chained hit definition below is next. Free, no cooldown, resets
// after 3.0s of inactivity so manual 750ms grid movement can be used between
// strikes without breaking the chain.

export const heavy_strike_combo_1: Skill = {
  id: 'heavy_strike_combo_1',
  name: 'Vanguard Strike',
  description: 'Combo 1/3: 110% Weapon Damage. Generates 4 Adrenaline.',
  icon: 'Sword',
  tags: ['Attack', 'Melee', 'Physical', 'Strike'],
  energyCost: 0,
  adrenalineGenerate: 4,
  range: 1,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Single',
  effects: [
    { type: 'damage', damageMultiplier: 1.1, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter',
  isHidden: true
};

export const heavy_strike_combo_2: Skill = {
  id: 'heavy_strike_combo_2',
  name: 'Sweeping Cleave',
  description: 'Combo 2/3: 130% Weapon Damage. Generates 6 Adrenaline.',
  icon: 'Scissors',
  tags: ['Attack', 'Melee', 'Physical', 'Strike'],
  energyCost: 0,
  adrenalineGenerate: 6,
  range: 1,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Single',
  effects: [
    { type: 'damage', damageMultiplier: 1.3, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter',
  isHidden: true
};

export const heavy_strike_combo_3: Skill = {
  id: 'heavy_strike_combo_3',
  name: 'Overhead Strike',
  description: 'Combo 3/3: 130% Weapon Damage in a frontal cleave. Applies Sunder.',
  icon: 'Hammer',
  tags: ['Attack', 'Melee', 'Physical', 'Strike', 'AoE'],
  energyCost: 0,
  adrenalineGenerate: 10,
  range: 1,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Directional',
  aoeParams: { shape: 'cone', radius: 1 },
  effects: [
    { type: 'damage', damageMultiplier: 1.3, element: 'Strike', applySunderStacks: 1 }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter',
  isHidden: true
};

export const heavy_strike_combo: Skill = {
  id: 'heavy_strike_combo',
  name: 'Heavy Strike Combo',
  description: 'Free 3-hit combo: Vanguard Strike, Sweeping Cleave, Overhead Strike. Resets after 5s of inactivity or casting more than 1 other skill.',
  icon: 'Swords',
  tags: ['Attack', 'Melee', 'Physical', 'Strike'],
  energyCost: 0,
  range: 1,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Single',
  comboChainIds: ['heavy_strike_combo_1', 'heavy_strike_combo_2', 'heavy_strike_combo_3'],
  comboTimeoutMs: 5000,
  effects: [
    { type: 'damage', damageMultiplier: 1.1, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter'
};

// --- (Removed from starting kit for now) Kinetic Impact --------------------
// Kept defined here so the mechanic isn't lost, just unequipped by default and
// pulled out of the Fighter's kit/tree. The flank-hit hook in useGameEngine.ts
// checking for this buffId has been removed; re-wire it if this comes back.

export const kinetic_impact: Skill = {
  id: 'kinetic_impact',
  name: 'Kinetic Impact',
  description: 'For 8s, auto-attacks also strike the tiles beside your target. Restores 5 Energy per enemy clipped.',
  icon: 'Zap',
  tags: ['Buff', 'Melee'],
  energyCost: 20,
  range: 0,
  cooldownMs: 12000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Self',
  effects: [
    {
      type: 'buff',
      buffId: 'kinetic_impact',
      buffName: 'Kinetic Impact',
      durationMs: 8000,
      statModifiers: []
    }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter',
  isHidden: true
};

// --- Slot 3: Onslaught Leap --------------------------------------------------
// Custom spatial mechanic (leap to an empty tile up to 3 away, bypassing move
// CD, landing in a 3x3 AoE). Adrenaline only triggers if the slam connects with
// at least one enemy; a successful cast-interrupt also applies a 1s Stun.

export const onslaught_leap: Skill = {
  id: 'onslaught_leap',
  name: 'Onslaught Leap',
  description: 'Leap up to 3 tiles, slamming a 3x3 area for 80% Strike Damage. Generates 10 Adrenaline on hit. Interrupts stun for 1s.',
  icon: 'Rocket',
  tags: ['Attack', 'Melee', 'Physical', 'Strike', 'AoE', 'Movement'],
  energyCost: 20,
  range: 3,
  cooldownMs: 15000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Ground',
  aoeParams: { shape: 'ring', radius: 1 },
  effects: [
    { type: 'leap' },
    { type: 'damage', damageMultiplier: 0.8, element: 'Strike', adrenalineOnlyOnHit: true, stunOnInterruptMs: 1000 }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter'
};

// --- Slot 4: Ravage (formerly Shield Break) ----------------------------------
// Adrenaline spender. Flat +25% damage if the target currently has any Sunder
// stack (no more T-shape collateral explosion).

export const shield_break: Skill = {
  id: 'shield_break',
  name: 'Ravage',
  description: 'Overhead smash for 300% Weapon Damage. +25% damage if the target has Sunder.',
  icon: 'Swords',
  tags: ['Attack', 'Melee', 'Physical', 'Strike'],
  energyCost: 10,
  adrenalineCost: 30,
  range: 1,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Single',
  effects: [
    { type: 'damage', damageMultiplier: 3.0, element: 'Strike', bonusDamageIfSundered: 25 }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter'
};

// --- Slot 5: Ground Slam -----------------------------------------------------
// Adrenaline spender. Hits a 3-wide, 2-deep area anchored at the player and
// extending outward along the nearest cardinal direction toward the current
// target (auto-targeted), or a manually chosen tile/direction if there's no
// current target or the game is in Tactical Pause.

export const ground_slam: Skill = {
  id: 'ground_slam',
  name: 'Ground Slam',
  description: 'Slams a 3-wide, 2-deep area in front of you for 225% Strike Damage.',
  icon: 'Mountain',
  tags: ['Attack', 'Melee', 'Physical', 'Strike', 'AoE'],
  energyCost: 15,
  adrenalineCost: 40,
  range: 3,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Directional',
  autoTargetCurrentEnemy: true,
  aoeParams: { shape: 'rect', radius: 2 },
  effects: [
    { type: 'damage', damageMultiplier: 2.25, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter'
};

// --- Zealous Blow (Proc) -----------------------------------------------------
// Passive proc: all melee hits (auto-attacks and melee skills) have a 5% chance
// to grant the 'zealous_blow_ready' buff for 6s. While it's active, this skill
// becomes castable (free, instant, off-GCD) - a melee hit for 150% Weapon Damage
// that also grants 'zealous_blow_empowered' (the next skill you cast deals +25%
// damage). Zealous Blow itself then goes on an 8s cooldown. See useGameEngine.ts
// (melee hit proc roll) and executor.ts (next-skill damage consumption) for the
// wiring.

export const zealous_blow: Skill = {
  id: 'zealous_blow',
  name: 'Zealous Blow',
  description: 'Only usable when procced (5% chance on melee hits, 6s window). Melee strike for 150% Weapon Damage. Next skill deals 25% more damage.',
  icon: 'Sparkles',
  tags: ['Attack', 'Melee', 'Physical', 'Strike'],
  energyCost: 0,
  range: 1,
  cooldownMs: 8000,
  gcdDuration: 0,
  offGcd: true,
  castTime: 0,
  targeting: 'Single',
  requiresBuffId: 'zealous_blow_ready',
  consumesRequiredBuff: true,
  effects: [
    { type: 'damage', damageMultiplier: 1.5, element: 'Strike' },
    {
      type: 'buff',
      buffId: 'zealous_blow_empowered',
      buffName: 'Zealous Blow',
      durationMs: 8000,
      statModifiers: []
    }
  ],
  requiredLevel: 0,
  classRequirement: 'Fighter'
};

export const FIGHTER_L10_SKILLS: Record<string, Skill> = {
  heavy_strike_combo,
  heavy_strike_combo_1,
  heavy_strike_combo_2,
  heavy_strike_combo_3,
  kinetic_impact,
  onslaught_leap,
  shield_break,
  ground_slam,
  zealous_blow,
};
