import type { AffixTemplate } from '../../engine/items/types';

export const MISC_AFFIXES: AffixTemplate[] = [
  // ----------------------------------------------------
  // Buff Group
  // ----------------------------------------------------
  {
    id: 'flat_haste',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'tome', 'amulet', 'ring'],
    minLevel: 1,
    stat: 'HasteRating',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 1.5,
    descriptionTpl: '+{value} Haste Rating',
    exclusivityGroup: 'Speed'
  },
  {
    id: 'inc_buff_effect',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'BuffEffect',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Buff Effect',
    exclusivityGroup: 'Buff'
  },
  {
    id: 'inc_buff_duration',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'BuffDuration',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Buff Duration',
    exclusivityGroup: 'Buff'
  },

  // ----------------------------------------------------
  // Junk Group
  // ----------------------------------------------------
  {
    id: 'inc_xp_gain',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'ExperienceGain',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Experience Gain',
    exclusivityGroup: 'Junk'
  },
  {
    id: 'inc_gold_find',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'GoldFind',
    type: 'increased',
    baseValue: 10,
    levelMultiplier: 0.1,
    descriptionTpl: '+{value}% Gold Find',
    exclusivityGroup: 'Junk'
  },
  {
    id: 'flat_life_on_kill',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'LifeOnKill',
    type: 'flat',
    baseValue: 5,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Life on Kill',
    exclusivityGroup: 'Junk'
  },
  {
    id: 'flat_mana_on_kill',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'ManaOnKill',
    type: 'flat',
    baseValue: 3,
    levelMultiplier: 0.2,
    descriptionTpl: '+{value} Mana on Kill',
    exclusivityGroup: 'Junk'
  },

  // ----------------------------------------------------
  // Caster Utility (No Exclusivity)
  // ----------------------------------------------------
  {
    id: 'flat_skill_reach',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'shield', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    allowedArmorCategories: ['Caster'],
    minLevel: 1,
    stat: 'SkillReach',
    type: 'flat',
    baseValue: 1,
    levelMultiplier: 0.05,
    descriptionTpl: '+{value} Skill Reach'
  },
  {
    id: 'inc_cooldown_reduction',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'shield', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    allowedArmorCategories: ['Caster'],
    minLevel: 5,
    stat: 'CooldownReductionRating',
    type: 'flat',
    baseValue: 15,
    levelMultiplier: 1.5,
    descriptionTpl: '+{value} CDR Rating'
  },
  {
    id: 'inc_mana_cost_reduction',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'shield', 'tome', 'amulet', 'ring'],
    allowedWeaponCategories: ['Wand', 'Staff', 'Scepter'],
    allowedArmorCategories: ['Caster'],
    minLevel: 5,
    stat: 'ManaCostReduction',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.1,
    descriptionTpl: '-{value}% Mana Costs'
  },

  // ----------------------------------------------------
  // Magic Find
  // ----------------------------------------------------
  {
    id: 'mf_accessory',
    allowedTypes: ['amulet', 'ring'],
    minLevel: 1,
    stat: 'MagicFind',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.1,
    weight: 25,
    descriptionTpl: '+{value}% Magic Find'
  },
  {
    id: 'mf_armor',
    allowedTypes: ['helm', 'chest', 'gloves', 'legs', 'boots'],
    minLevel: 1,
    stat: 'MagicFind',
    type: 'increased',
    baseValue: 5,
    levelMultiplier: 0.1,
    weight: 25,
    descriptionTpl: '+{value}% Magic Find'
  }
];
