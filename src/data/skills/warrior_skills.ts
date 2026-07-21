import type { Skill } from '../../engine/skills/types';

// --- Family 1: Weapon Attacks ---
export const heavy_strike: Skill = {
  id: 'heavy_strike',
  name: 'Heavy Strike',
  description: 'The basic powerful weapon attack. Deal 150% Strike damage to a single target.',
  icon: 'Sword',
  tags: ['Attack', 'Melee', 'Physical', 'Strike'],
  energyCost: 8,
  range: 1,
  cooldownMs: 3000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Single',
  effects: [
    { type: 'damage', damageMultiplier: 1.5, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Warrior'
};

export const cleave: Skill = {
  id: 'cleave',
  name: 'Cleave',
  description: 'Simple frontal AoE. Strikes the target and nearby enemies in a cone for 120% Strike damage.',
  icon: 'Scissors',
  tags: ['Attack', 'Melee', 'Physical', 'Strike', 'AoE'],
  energyCost: 12,
  range: 1,
  cooldownMs: 5000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Directional',
  aoeParams: { shape: 'cone', radius: 1 },
  effects: [
    { type: 'damage', damageMultiplier: 1.2, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Warrior'
};

// --- Family 2: Mobility ---
export const charge: Skill = {
  id: 'charge',
  name: 'Charge',
  description: 'Primary gap closer. Rushes to an enemy and attacks them.',
  icon: 'Rocket',
  tags: ['Attack', 'Melee', 'Physical', 'Strike', 'Movement'],
  energyCost: 15,
  range: 4,
  cooldownMs: 12000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Single',
  effects: [
    { type: 'charge' },
    { type: 'damage', damageMultiplier: 1.0, element: 'Strike' }
  ],
  requiredLevel: 0,
  classRequirement: 'Warrior'
};

// --- Family 3: Stagger / Physical Control ---
export const war_cry: Skill = {
  id: 'war_cry',
  name: 'War Cry',
  description: 'Emit a powerful cry that demoralizes nearby enemies, reducing their damage by 20% for 8 seconds.',
  icon: 'Megaphone',
  tags: ['Spell', 'AoE'],
  energyCost: 15,
  range: 0,
  cooldownMs: 15000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Area',
  aoeParams: { shape: 'square', radius: 3 },
  effects: [
    {
      type: 'buff',
      targetFilter: 'Enemy',
      buffId: 'demoralized',
      buffName: 'Demoralized',
      durationMs: 8000,
      statModifiers: [
         { id: 'demoralized_dmg', sourceId: 'war_cry', stat: 'Damage', type: 'increased', value: -20 }
      ]
    }
  ],
  requiredLevel: 0,
  classRequirement: 'Warrior'
};

// --- Family 4: Defense ---
export const brace: Skill = {
  id: 'brace',
  name: 'Brace',
  description: 'Basic defensive cooldown. Increases Armor by 100% for 5 seconds.',
  icon: 'Shield',
  tags: ['Spell', 'Buff'],
  energyCost: 0,
  range: 0,
  cooldownMs: 20000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Self',
  effects: [
    {
      type: 'buff',
      buffId: 'brace_buff',
      buffName: 'Braced',
      durationMs: 5000,
      statModifiers: [
         { id: 'brace_armor', sourceId: 'brace', stat: 'Armor', type: 'increased', value: 100 }
      ]
    }
  ],
  requiredLevel: 0,
  classRequirement: 'Warrior'
};

// --- Family 5: Combat Momentum ---
export const battle_rage: Skill = {
  id: 'battle_rage',
  name: 'Battle Rage',
  description: 'Short-term offensive empowerment. Grants 40% Weapon Damage for 8 seconds.',
  icon: 'Flame',
  tags: ['Spell', 'Buff'],
  energyCost: 0,
  range: 0,
  cooldownMs: 30000,
  gcdDuration: 2000,
  castTime: 0,
  targeting: 'Self',
  effects: [
    {
      type: 'buff',
      buffId: 'battle_rage_buff',
      buffName: 'Battle Rage',
      durationMs: 8000,
      statModifiers: [
         { id: 'rage_dmg', sourceId: 'battle_rage', stat: 'WeaponDamage', type: 'increased', value: 40 }
      ]
    }
  ],
  requiredLevel: 0,
  classRequirement: 'Warrior'
};

export const WARRIOR_SKILLS: Record<string, Skill> = {
  heavy_strike,
  cleave,
  charge,
  war_cry,
  brace,
  battle_rage,
};
