import type { ItemTemplate } from '../../engine/items/types';
import { Stat } from '../../engine/stats/types';

export const WEAPONS: Record<string, ItemTemplate> = {
  // #region Swords
  // #region Tier 1
  // 1H Sword (Strike, Melee)
  bronze_sword: {
    id: 'bronze_sword',
    name: 'Bronze Sword',
    icon: 'Sword',
    itemType: 'weapon-1h',
    weaponCategory: 'Sword',
    damageType: 'Strike',
    weaponAttackSpeed: 0.5,
    weaponRange: 1,
    baseCritChance: 5,
    baseStats: [Stat('Damage', 5)],
  },
  // 2H Sword (Strike, Melee)
  bronze_greatsword: {
    id: 'bronze_greatsword',
    name: 'Bronze Greatsword',
    icon: 'Sword',
    itemType: 'weapon-2h',
    weaponCategory: 'Sword',
    damageType: 'Strike',
    weaponAttackSpeed: 0.4,
    weaponRange: 1,
    baseCritChance: 5,
    baseStats: [Stat('Damage', 14)],
  },
  // #endregion
  // #endregion

  // #region Daggers
  // #region Tier 1
  // 1H Dagger (Pierce, Melee)
  bronze_dagger: {
    id: 'bronze_dagger',
    name: 'Bronze Dagger',
    icon: 'Sword', // We can use Sword or something else for dagger
    itemType: 'weapon-1h',
    weaponCategory: 'Dagger',
    damageType: 'Pierce',
    weaponAttackSpeed: 0.6,
    weaponRange: 1,
    baseCritChance: 10,
    baseStats: [Stat('Damage', 5)],
  },
  // #endregion
  // #endregion

  // #region Sceptres
  // #region Tier 1
  // 1H Sceptre (Melee, Cold)
  frost_sceptre: {
    id: 'frost_sceptre',
    name: 'Frost Sceptre',
    icon: 'Wand', // Changed to Wand icon since it's cold, but Flame could have been used for scepter. Let's just use Wand.
    itemType: 'weapon-1h',
    weaponCategory: 'Scepter',
    damageType: 'Cold',
    weaponAttackSpeed: 0.5,
    weaponRange: 1,
    baseCritChance: 5,
    baseStats: [Stat('Damage', 7)],
  },
  // #endregion
  // #endregion

  // #region Staves
  // #region Tier 1
  // 2H Staff (Range 2, Fire)
  ember_staff: {
    id: 'ember_staff',
    name: 'Ember Staff',
    icon: 'Flame',
    itemType: 'weapon-2h',
    weaponCategory: 'Staff',
    damageType: 'Fire',
    weaponAttackSpeed: 0.5,
    weaponRange: 2,
    baseCritChance: 5,
    baseStats: [Stat('Damage', 12), Stat('SpellDamage', 25, 'increased')],
  },
  // #endregion
  // #endregion

  // #region Wands
  // #region Tier 1
  // 1H Wand (Range 2, Lightning)
  spark_wand: {
    id: 'spark_wand',
    name: 'Spark Wand',
    icon: 'Wand',
    itemType: 'weapon-1h',
    weaponCategory: 'Wand',
    damageType: 'Lightning',
    weaponAttackSpeed: 0.6,
    weaponRange: 2,
    baseCritChance: 5,
    baseStats: [Stat('Damage', 6), Stat('SpellDamage', 15, 'increased')],
  },
  // #endregion
  // #endregion

  // #region Bows
  // #region Tier 1
  // 2H Bow (Range 3, Pierce)
  short_bow: {
    id: 'short_bow',
    name: 'Short Bow',
    icon: 'Crosshair',
    itemType: 'weapon-2h',
    weaponCategory: 'Bow',
    damageType: 'Pierce',
    weaponAttackSpeed: 0.5,
    weaponRange: 3,
    baseCritChance: 5,
    baseStats: [Stat('Damage', 10)],
  },
  // #endregion
  // #endregion
};
