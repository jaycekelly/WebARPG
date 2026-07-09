export interface DialOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface MorphOption {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export const GENERIC_DIALS: DialOption[] = [
  { id: 'dmg', name: 'Potency', description: '+5% Damage or Healing', icon: 'Swords' },
  { id: 'cooldown', name: 'Haste', description: '5% Cooldown Reduction', icon: 'Clock' },
  { id: 'cost', name: 'Efficiency', description: '-5% Resource Cost', icon: 'Droplets' },
  { id: 'range', name: 'Reach', description: '+1 Range / Area', icon: 'Maximize' }
];

// Fallback morphs for testing if a skill doesn't define its own
export const FALLBACK_MORPHS: MorphOption[] = [
  { id: 'morph_a', name: 'Bleeding Edge', description: 'Applies a bleeding DoT effect.', icon: 'Droplet' },
  { id: 'morph_b', name: 'Wide Arc', description: 'Hits up to 5 additional targets.', icon: 'Expand' },
  { id: 'morph_c', name: 'Momentum', description: 'Refunds cooldown per hit.', icon: 'RotateCw' },
  { id: 'morph_d', name: 'Overwhelm', description: 'Shreds enemy armor on hit.', icon: 'ShieldAlert' }
];

export function getMorphOptionsForSkill(skillId: string, rank: number): MorphOption[] {
  // In the future, we can map specific skillIds to their unique morphs.
  // For now, use the fallback morphs for everything.
  if (rank === 3) {
    return [
      { id: `${skillId}_r3_1`, name: 'Morph 1', description: '+10% Damage', icon: 'Zap' },
      { id: `${skillId}_r3_2`, name: 'Morph 2', description: '-10% Cooldown', icon: 'Clock' },
      { id: `${skillId}_r3_3`, name: 'Morph 3', description: 'Applies Bleed', icon: 'Droplet' },
      { id: `${skillId}_r3_4`, name: 'Morph 4', description: 'Armor Shred', icon: 'ShieldAlert' }
    ];
  } else if (rank === 6) {
    return [
      { id: `${skillId}_r6_1`, name: 'Ultimate A', description: 'Double Cast Chance', icon: 'Wand2' },
      { id: `${skillId}_r6_2`, name: 'Ultimate B', description: 'Massive AoE', icon: 'Maximize' },
      { id: `${skillId}_r6_3`, name: 'Ultimate C', description: 'Stuns Enemies', icon: 'Hammer' },
      { id: `${skillId}_r6_4`, name: 'Ultimate D', description: 'Execution threshold', icon: 'Skull' }
    ];
  }
  
  return FALLBACK_MORPHS;
}
