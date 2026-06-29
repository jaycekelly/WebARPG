import type { ItemType, BaseStat } from '../engine/items/types';

export interface AffixTemplate {
  id: string;
  allowedTypes: ItemType[]; // e.g. ['weapon-1h', 'weapon-2h']
  roll: (iLvl: number) => { description: string; stat: BaseStat };
}

// A simple pool of affixes
export const AFFIX_POOL: AffixTemplate[] = [
  {
    id: 'flat_health',
    allowedTypes: ['helm', 'chest', 'gloves', 'pants', 'boots', 'ring', 'amulet'],
    roll: (iLvl) => {
      const value = Math.floor(Math.random() * (iLvl * 2)) + Math.max(5, Math.floor(iLvl / 2));
      return {
        description: `+${value} Maximum Health`,
        stat: { stat: 'Health', value, type: 'flat' }
      };
    }
  },
  {
    id: 'flat_mana',
    allowedTypes: ['helm', 'chest', 'gloves', 'ring', 'amulet'],
    roll: (iLvl) => {
      const value = Math.floor(Math.random() * (iLvl * 1.5)) + Math.max(5, Math.floor(iLvl / 3));
      return {
        description: `+${value} Maximum Mana`,
        stat: { stat: 'Mana', value, type: 'flat' }
      };
    }
  },
  {
    id: 'flat_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'ring', 'amulet'],
    roll: (iLvl) => {
      const value = Math.floor(Math.random() * iLvl) + Math.max(2, Math.floor(iLvl / 5));
      return {
        description: `+${value} Damage`,
        stat: { stat: 'Damage', value, type: 'flat' }
      };
    }
  },
  {
    id: 'inc_damage',
    allowedTypes: ['weapon-1h', 'weapon-2h', 'amulet'],
    roll: (iLvl) => {
      const value = Math.floor(Math.random() * (iLvl * 1.5)) + 5;
      return {
        description: `${value}% Increased Damage`,
        stat: { stat: 'Damage', value, type: 'increased' }
      };
    }
  },
  {
    id: 'flat_armor',
    allowedTypes: ['helm', 'chest', 'gloves', 'pants', 'boots'],
    roll: (iLvl) => {
      const value = Math.floor(Math.random() * (iLvl * 1.2)) + 5;
      return {
        description: `+${value} Armor`,
        stat: { stat: 'Armor', value, type: 'flat' }
      };
    }
  },
  {
    id: 'inc_attack_speed',
    allowedTypes: ['weapon-1h', 'gloves', 'ring'],
    roll: (iLvl) => {
      // Attack speed scales slowly
      const value = Math.floor(Math.random() * (iLvl / 2)) + 2;
      return {
        description: `${value}% Increased Attack Speed`,
        stat: { stat: 'AttackSpeed', value, type: 'increased' }
      };
    }
  }
];
