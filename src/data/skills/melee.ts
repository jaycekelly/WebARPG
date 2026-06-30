import type { Skill } from '../../engine/skills/types';


export const MELEE_SKILLS: Record<string, Skill> = {
  heavy_strike: {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    description: 'A powerful melee swing.',
    icon: 'Flame',

    tags: ['Attack', 'Melee', 'Physical'],

    manaCost: 10,
    range: 1.5,
    gcdDuration: 2000,
    castTime: 0,

    targeting: 'Single',
    effects: [{ type: 'damage', baseValue: 25 }],
  },
  cleave: {
    id: 'cleave',
    name: 'Cleave',
    description:
      'A sweeping physical attack that hits all adjacent enemies.',
    icon: 'Sword',

    tags: ['Attack', 'Melee', 'Physical', 'AoE'],

    manaCost: 25,
    range: 1.5,
    gcdDuration: 2000,
    castTime: 0,

    targeting: 'Area',
    effects: [{ type: 'damage', baseValue: 35 }],
  },
};
