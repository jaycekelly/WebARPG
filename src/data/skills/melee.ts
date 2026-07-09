import type { Skill } from '../../engine/skills/types';

export const MELEE_SKILLS: Record<string, Skill> = {
  charge_attack: {
    id: 'charge_attack',
    name: 'Charge',
    description: 'Instantly dash to your target and strike them for 100% weapon damage.',
    icon: 'Zap',
    tags: ['Attack', 'Melee', 'Physical', 'Strike', 'Movement'],
    energyCost: 10,
    range: 3,
    cooldownMs: 8000,
    gcdDuration: 1300,
    castTime: 0,
    targeting: 'Ground',
    effects: [
      { type: 'charge' },
      { type: 'damage', damageMultiplier: 1.0, element: 'Strike' }
    ],
    requiredLevel: 0,
    classRequirement: 'Fighter'
  },
  heavy_strike: {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    description: 'A crushing blow that deals 150% weapon damage.',
    icon: 'Sword',
    tags: ['Attack', 'Melee', 'Physical', 'Strike'],
    energyCost: 8,
    range: 0,
    cooldownMs: 5000,
    gcdDuration: 1300,
    castTime: 0,
    targeting: 'Single',
    effects: [
      { type: 'damage', damageMultiplier: 1.5 }
    ],
    requiredLevel: 0,
    classRequirement: 'Fighter'
  }
};
