import type { Skill } from '../../engine/skills/types';
import { Stat } from '../../engine/stats/types';

export const SPELL_SKILLS: Record<string, Skill> = {
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description:
      'Hurl a fiery projectile that explodes on impact.',
    icon: 'Flame',

    tags: ['Spell', 'Projectile', 'Fire', 'Area'],

    manaCost: 15,
    range: 5,
    gcdDuration: 2000,
    castTime: 1000,

    targeting: 'Area',
    aoeParams: {
      shape: 'square',
      radius: 2,
    },
    skillReachScaling: [
      { required: 5, effect: 'radius', value: 1 },
      {
        required: 12,
        effect: 'falloff',
        inner: 1,
        outerDamage: 0.6,
      },
      {
        required: 20,
        effect: 'cascade',
        radius: 1,
        chance: 0.5,
      },
    ],
    effects: [
      { type: 'damage', element: 'Fire', baseValue: 40 },
    ],
  },
  blizzard: {
    id: 'blizzard',
    name: 'Blizzard',
    description: 'Call down a freezing storm.',
    icon: 'CloudRain',

    tags: ['Spell', 'Cold', 'Area'],

    manaCost: 30,
    range: 6,
    gcdDuration: 2000,
    castTime: 1500,

    targeting: 'Area',
    aoeParams: {
      shape: 'diamond',
      radius: 2,
    },
    skillReachScaling: [
      {
        required: 5,
        effect: 'lingering',
        duration: 2000,
        damagePerTurn: 4,
        element: 'Cold',
        hazardId: 'blizzard_storm',
      },
      { required: 10, effect: 'radius', value: 1 },
      { required: 18, effect: 'lingering', duration: 2000 },
    ],
    effects: [
      { type: 'damage', element: 'Cold', baseValue: 20 },
    ],
  },
  heal: {
    id: 'heal',
    name: 'Heal',
    description:
      'Call upon divine magic to restore health.',
    icon: 'ShieldAlert',

    tags: ['Spell'],

    manaCost: 20,
    range: 0,
    gcdDuration: 2000,
    castTime: 500,

    targeting: 'Self',
    effects: [{ type: 'heal', baseValue: 30 }],
  },
  warcry: {
    id: 'warcry',
    name: 'Warcry',
    description:
      'Bellow a mighty cry, buffing your damage by 20% for 10 seconds.',
    icon: 'ArrowUpCircle',

    tags: ['Spell', 'Buff'],

    manaCost: 40,
    range: 0,
    gcdDuration: 2000,
    castTime: 0,

    targeting: 'Self',
    effects: [
      {
        type: 'buff',
        buffId: 'warcry_buff',
        buffName: 'Warcry',
        durationMs: 10000,
        statModifiers: [
          {
            id: 'warcry_dmg',
            sourceId: 'warcry',
            ...Stat('Damage', 20, 'increased'),
          },
        ],
      },
    ],
  },
};
