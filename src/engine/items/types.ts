import type { StatType, ModifierType, DamageType } from '../stats/types';

export type EquipmentSlot = 
  | 'helm' 
  | 'chest' 
  | 'gloves' 
  | 'legs'
  | 'boots' 
  | 'weapon1' 
  | 'weapon2' 
  | 'weapon1_alt'
  | 'weapon2_alt'
  | 'shield'
  | 'amulet' 
  | 'ring1' 
  | 'ring2';

export type ItemType = 
  | 'helm' 
  | 'chest' 
  | 'gloves' 
  | 'legs'
  | 'boots' 
  | 'weapon-1h' 
  | 'weapon-2h' 
  | 'shield'
  | 'tome'
  | 'amulet' 
  | 'ring';

export type WeaponCategory = 'Sword' | 'Dagger' | 'Bow' | 'Axe' | 'Scepter' | 'Wand' | 'Staff' | 'Unarmed';
export type ArmorCategory = 'Heavy' | 'Light' | 'Caster';

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

export interface ItemRequirements {
  level?: number;
  strength?: number;
  dexterity?: number;
  intelligence?: number;
  vitality?: number;
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
  requirements?: ItemRequirements;
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
  armorCategory?: ArmorCategory;
  baseCritChance?: number;
  baseBlockChance?: number;
  requirements?: ItemRequirements;
}

export interface AffixTemplate {
  id: string;
  allowedTypes: ItemType[];
  allowedWeaponCategories?: WeaponCategory[];
  allowedArmorCategories?: ArmorCategory[];
  minLevel: number;
  stat: StatType;
  type: ModifierType;
  baseValue: number;
  levelMultiplier: number;
  descriptionTpl: string;
  weight?: number; // Optional weight, defaults to 100
  exclusivityGroup?: string;
}
