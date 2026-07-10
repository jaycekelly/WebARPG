import { useInventoryStore } from '../../store/useInventoryStore';
import { useStatsStore } from '../../store/useStatsStore';

/**
 * Core skill damage formula: Skill_Damage = (Weapon_DPS * WEAPON_DPS_SKILL_SCALAR) * Skill_Multiplier.
 * Weapon-based skills scale off weapon DPS (main hand fully, off hand at 50%)
 * rather than a single hit's base damage, so slower/heavier weapons (e.g. 2H)
 * don't out-damage faster ones on skills. The scalar currently doubles that DPS
 * baseline (equivalent to "2 seconds of DPS'ing" worth of weapon damage).
 *
 * Dual Wield: the main hand contributes its full DPS, the off hand contributes
 * only half of its DPS. Single-wielding (or unarmed) just returns main-hand DPS.
 */
export const WEAPON_DPS_SKILL_SCALAR = 2.0;

const getHandFlatWeaponDamage = (slot: 'weapon1' | 'weapon2'): number => {
  const item = useInventoryStore.getState().equipment[slot];
  if (!item) return 0;

  let flatSum = 0;
  if (item.baseStats) {
    for (const baseStat of item.baseStats) {
      if (baseStat.stat === 'WeaponDamage' && baseStat.type === 'flat') flatSum += baseStat.value;
    }
  }
  if (item.affixes) {
    for (const affix of item.affixes) {
      if (affix.stat.stat === 'WeaponDamage' && affix.stat.type === 'flat') flatSum += affix.stat.value;
    }
  }
  return flatSum;
};

/**
 * Splits the pooled WeaponDamage stat (flat + all increased/more sources: tree
 * passives, buffs, global affixes) proportionally by each hand's own flat
 * contribution, so a weapon's share of "increased WeaponDamage" scales fairly
 * relative to how much flat damage it actually contributes to the pool.
 */
const getHandWeaponDamage = (slot: 'weapon1' | 'weapon2'): number => {
  const handFlat = getHandFlatWeaponDamage(slot);
  if (handFlat <= 0) return 0;

  const mainFlat = getHandFlatWeaponDamage('weapon1');
  const offFlat = getHandFlatWeaponDamage('weapon2');
  const baseCharacterFlat = useStatsStore.getState().modifiers
    .filter(m => m.stat === 'WeaponDamage' && m.type === 'flat' && m.sourceId === 'base_character')
    .reduce((sum, m) => sum + m.value, 0);
  // The base_character unarmed fallback is dropped once any weapon provides WeaponDamage
  // (see useStatsStore's "Unarmed Weapon Damage fallback"), so it doesn't count here
  // once at least one weapon is equipped.
  const hasAnyWeaponFlat = mainFlat > 0 || offFlat > 0;
  const totalFlatPool = mainFlat + offFlat + (hasAnyWeaponFlat ? 0 : baseCharacterFlat);
  if (totalFlatPool <= 0) return 0;

  const totalPooledWeaponDamage = useStatsStore.getState().getStat('WeaponDamage');
  const handShare = handFlat / totalFlatPool;

  return totalPooledWeaponDamage * handShare;
};

const getHandAttackSpeed = (slot: 'weapon1' | 'weapon2'): number => {
  const item = useInventoryStore.getState().equipment[slot];
  return item?.weaponAttackSpeed || 0;
};

/**
 * Returns the "weapon damage for skills" value: main-hand DPS fully, plus half
 * of the off-hand's DPS if dual wielding, scaled by WEAPON_DPS_SKILL_SCALAR.
 * Falls back to the shared unarmed WeaponDamage stat (at an assumed 1 attack/sec)
 * if no weapon is equipped.
 */
export const getWeaponSkillDamage = (): number => {
  const mainHandItem = useInventoryStore.getState().equipment['weapon1'];
  const offHandItem = useInventoryStore.getState().equipment['weapon2'];

  const isOffHandWeapon = !!offHandItem && offHandItem.itemType !== 'shield' && offHandItem.itemType !== 'tome';

  if (!mainHandItem && !isOffHandWeapon) {
    // Unarmed: treat the base character WeaponDamage stat as a 1.0 APS weapon.
    return useStatsStore.getState().getStat('WeaponDamage') * WEAPON_DPS_SKILL_SCALAR;
  }

  const mainHandDamage = getHandWeaponDamage('weapon1');
  const mainHandSpeed = getHandAttackSpeed('weapon1');
  const mainHandDps = mainHandDamage * mainHandSpeed;

  let offHandDps = 0;
  if (isOffHandWeapon) {
    const offHandDamage = getHandWeaponDamage('weapon2');
    const offHandSpeed = getHandAttackSpeed('weapon2');
    offHandDps = offHandDamage * offHandSpeed * 0.5;
  }

  return (mainHandDps + offHandDps) * WEAPON_DPS_SKILL_SCALAR;
};
