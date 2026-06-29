import type { StatType, ModifierType, DamageType } from '../stats/types';

export type EquipmentSlot = 
  | 'helm' 
  | 'chest' 
  | 'gloves' 
  | 'pants' 
  | 'boots' 
  | 'weapon1' 
  | 'weapon2' 
  | 'amulet' 
  | 'ring1' 
  | 'ring2';

export type ItemType = 
  | 'helm' 
  | 'chest' 
  | 'gloves' 
  | 'pants' 
  | 'boots' 
  | 'weapon-1h' 
  | 'weapon-2h' 
  | 'amulet' 
  | 'ring';

export type Rarity = 'Normal' | 'Magic' | 'Rare' | 'Epic' | 'Legendary' | 'Unique';

export interface BaseStat {
  stat: StatType;
  value: number;
  type: ModifierType;
}

export interface GeneratedAffix {
  id: string; // The pool ID of the affix (e.g. 'flat_health')
  description: string; // What shows on the tooltip
  stat: BaseStat;
}

export interface Item {
  id: string; // Unique instance ID
  templateId: string; // ID of the base item definition
  name: string;
  icon: string; // Lucide icon name
  itemType: ItemType;
  rarity: Rarity;
  iLvl: number;
  baseStats: BaseStat[];
  affixes: GeneratedAffix[];
  damageType?: DamageType; // Used if itemType is a weapon
}
