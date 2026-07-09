import type { Skill } from '../../engine/skills/types';

export const SPELL_SKILLS: Record<string, Skill> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Hurl a fiery projectile that explodes on impact.',
    icon: 'Flame',
    tags: ['Spell', 'Fire', 'Area'],
    manaCost: 10,
    range: 5,
    cooldownMs: 10000,
    gcdDuration: 1300,
    castTime: 1000,
    targeting: 'Area',
    aoeParams: {
      shape: 'cross',
      radius: 1,
      respectWalls: true,
    },
    effects: [
      { type: 'damage', element: 'Fire', baseValue: 25, damageEffectiveness: 1.5 },
    ],
  },
};