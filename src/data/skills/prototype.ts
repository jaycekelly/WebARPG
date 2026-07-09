import type { Skill } from '../../engine/skills/types';

export const PROTOTYPE_SKILLS: Record<string, Skill> = {
  proto_strike_1: {
    id: 'proto_strike_1', name: 'Savage Slash', description: 'A basic attack prototype.', icon: 'Sword',
    tags: ['Attack', 'Melee'], energyCost: 5, range: 0, gcdDuration: 1300, castTime: 0, targeting: 'Single',
    effects: [{ type: 'damage', damageMultiplier: 1.0 }],
    requiredLevel: 0, classRequirement: 'Fighter'
  },
  proto_strike_2: {
    id: 'proto_strike_2', name: 'Pommel Strike', description: 'A stunning basic attack prototype.', icon: 'CircleOff',
    tags: ['Attack', 'Melee'], energyCost: 5, range: 0, gcdDuration: 1300, castTime: 0, targeting: 'Single',
    effects: [{ type: 'damage', damageMultiplier: 0.8 }],
    requiredLevel: 0, classRequirement: 'Fighter'
  },
  proto_cleave_1: {
    id: 'proto_cleave_1', name: 'Sweeping Edge', description: 'Cleave multiple enemies.', icon: 'Scissors',
    tags: ['Attack', 'Melee', 'AoE'], energyCost: 15, range: 0, gcdDuration: 1300, castTime: 0, targeting: 'Self',
    effects: [{ type: 'damage', damageMultiplier: 1.2 }],
    requiredLevel: 2, classRequirement: 'Fighter'
  },
  proto_cleave_2: {
    id: 'proto_cleave_2', name: 'Earthshatter', description: 'Smash the ground.', icon: 'Mountain',
    tags: ['Attack', 'Melee', 'AoE'], energyCost: 20, range: 0, gcdDuration: 1300, castTime: 0, targeting: 'Self',
    effects: [{ type: 'damage', damageMultiplier: 1.5 }],
    requiredLevel: 2, classRequirement: 'Fighter'
  },
  proto_buff_1: {
    id: 'proto_buff_1', name: 'Battle Cry', description: 'Increase damage for a short time.', icon: 'Megaphone',
    tags: ['Buff'], energyCost: 25, range: 0, gcdDuration: 1300, castTime: 0, targeting: 'Self',
    effects: [{ type: 'buff' }],
    requiredLevel: 3, classRequirement: 'Fighter'
  },
  proto_buff_2: {
    id: 'proto_buff_2', name: 'Iron Skin', description: 'Increase armor temporarily.', icon: 'Shield',
    tags: ['Buff'], energyCost: 25, range: 0, gcdDuration: 1300, castTime: 0, targeting: 'Self',
    effects: [{ type: 'buff' }],
    requiredLevel: 3, classRequirement: 'Fighter'
  },
  proto_ult_1: {
    id: 'proto_ult_1', name: 'Whirlwind', description: 'Spin to win.', icon: 'Wind',
    tags: ['Attack', 'Melee', 'AoE'], energyCost: 50, range: 0, cooldownMs: 15000, gcdDuration: 1300, castTime: 0, targeting: 'Self',
    effects: [{ type: 'damage', damageMultiplier: 2.5 }],
    requiredLevel: 4, classRequirement: 'Fighter'
  },
  proto_ult_2: {
    id: 'proto_ult_2', name: 'Execution', description: 'A massive single target hit.', icon: 'Axe',
    tags: ['Attack', 'Melee'], energyCost: 40, range: 0, cooldownMs: 12000, gcdDuration: 1300, castTime: 0, targeting: 'Single',
    effects: [{ type: 'damage', damageMultiplier: 3.0 }],
    requiredLevel: 4, classRequirement: 'Fighter'
  }
};
