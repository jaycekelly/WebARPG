import type { StatType, ModifierType, DamageType } from '../stats/types';

export type EquipmentSlot = 
  | 'helm' 
  | 'chest' 
  | 'gloves' 
  | 'pants' 
  | 'boots' 
  | 'weapon1' 
  | 'weapon2' 
  | 'shield'
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
  | 'shield'
  | 'amulet' 
  | 'ring';

export type WeaponCategory = 'Sword' | 'Dagger' | 'Bow' | 'Axe' | 'Scepter' | 'Wand' | 'Staff' | 'Unarmed';

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
  damageType?: DamageType; // Weapon specific
  weaponAttackSpeed?: number;
  weaponCategory?: WeaponCategory;
  weaponRange?: number;
  baseCritChance?: number;
  baseBlockChance?: number;
}

export interface ItemTemplate {
  id: string;
  name: string;
  icon: string;
  itemType: ItemType;
  baseStats: BaseStat[];
  damageType?: DamageType;
  weaponAttackSpeed?: number;
  weaponRange?: number;
  weaponCategory?: WeaponCategory;
  baseCritChance?: number;
  baseBlockChance?: number;
}

export interface AffixTemplate {
  id: string;
  allowedTypes: ItemType[];
  minLevel: number;
  stat: StatType;
  type: ModifierType;
  baseValue: number;
  levelMultiplier: number;
  descriptionTpl: string;
}
