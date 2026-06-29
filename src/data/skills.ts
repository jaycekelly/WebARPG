import type { Skill } from '../engine/skills/types';

export const SKILLS: Record<string, Skill> = {
  heavy_strike: {
    id: 'heavy_strike',
    name: 'Heavy Strike',
    description: 'A powerful melee swing.',
    icon: 'Flame',
    
    tags: ['Attack', 'Melee', 'Physical'],
    
    manaCost: 10,
    range: 1.5,
    gcdDuration: 2000,
    castTime: 0, // Instant
    
    targeting: 'Single',
    effects: [
      { type: 'damage', element: 'Physical', baseValue: 25 }
    ]
  },
  
  fireball: {
    id: 'fireball',
    name: 'Fireball',
    description: 'Hurl a fiery projectile that explodes on impact.',
    icon: 'Flame', // Need a fireball icon later
    
    tags: ['Spell', 'Projectile', 'Fire'],
    
    manaCost: 15,
    range: 5,
    gcdDuration: 2000,
    castTime: 1000, // 1 second cast time
    
    targeting: 'Directional', // Will treat as Single for now in MVP
    effects: [
      { type: 'damage', element: 'Fire', baseValue: 40 }
    ]
  },

  heal: {
    id: 'heal',
    name: 'Heal',
    description: 'Call upon divine magic to restore health.',
    icon: 'ShieldAlert',
    
    tags: ['Spell'],
    
    manaCost: 20,
    range: 0,
    gcdDuration: 2000,
    castTime: 500, // 0.5s cast time
    
    targeting: 'Self',
    effects: [
      { type: 'heal', baseValue: 30 }
    ]
  }
};
