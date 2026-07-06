import type { Skill } from '../../engine/skills/types';

export const MELEE_SKILLS: Record<string, Skill> = {
  charge_attack: {
    id: 'charge_attack',
    name: 'Charge',
    description: 'Instantly dash to your target and strike them for 100% weapon damage.',
    icon: 'Zap',
    tags: ['Attack', 'Melee', 'Physical', 'Strike', 'Movement'],
    manaCost: 20,
    range: 3,
    cooldownMs: 8000,
    gcdDuration: 1500,
    castTime: 0,
    targeting: 'Ground',
    effects: [
      { type: 'charge' },
      { type: 'damage', damageMultiplier: 1.0, element: 'Strike' }
    ],
  },
  heavy_strike: {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    description: 'A crushing blow that deals 150% weapon damage.',
    icon: 'Sword',
    tags: ['Attack', 'Melee', 'Physical', 'Strike'],
    manaCost: 10,
    range: 0,
    cooldownMs: 5000,
    gcdDuration: 1500,
    castTime: 0,
    targeting: 'Single',
    effects: [
      { type: 'damage', damageMultiplier: 1.5 }
    ],
  }
};
