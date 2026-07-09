import type { DamageType } from '../stats/types';
import { RatingCalculator } from '../stats/RatingCalculator';

export class DamageCalculator {
  static readonly A_CAP = 0.85;
  static readonly R_CAP = 0.75;
  static readonly ARMOR_FACTOR = 0.5;
  static readonly MIN_RESIST_DR = -1.0; // Max +100% damage taken

  static calculateDamage(
    rawDamage: number,
    damageType: DamageType | undefined,
    isSpell: boolean,
    attackerLevel: number,
    defenderLevel: number,
    attackerStats: Record<string, number>,
    defenderStats: Record<string, number>,
    baseCritChance: number = 0,
    defenderHasWeapon: boolean = true,
    defenderHasShield: boolean = false,
    defenderBaseBlockChance: number = 0,
    isAutoAttack: boolean = false
  ): { damage: number, result: 'hit' | 'block' | 'parry' | 'deflect' | 'crit' } {
    const isPhysical = damageType === 'Strike' || damageType === 'Pierce';

    // Apply +/- 25% global damage variance to auto attacks only
    if (isAutoAttack) {
      const variance = 0.75 + Math.random() * 0.50;
      rawDamage *= variance;
    }

    // 1. Critical Strike (Rolls before mitigation)
    let isCrit = false;
    let critMultiplier = 1.0;
    
    if (baseCritChance > 0) {
      const increasedCrit = isSpell 
        ? (attackerStats['SpellCriticalStrikeChance'] || 0)
        : (attackerStats['AttackCriticalStrikeChance'] || 0);
        
      const finalCritChance = baseCritChance * (1 + increasedCrit / 100);
      
      if (Math.random() < finalCritChance / 100) {
        isCrit = true;
        const multiplierBonus = attackerStats['CriticalStrikeMultiplier'] || 150;
          
        critMultiplier = multiplierBonus / 100;
        rawDamage *= critMultiplier;
      }
    }

    // 2. Deflection (Evasion)
    let deflectMitigation = 0;
    const deflectRating = defenderStats['DeflectRating'] || 0;
    const deflectChance = RatingCalculator.getDeflectChance(deflectRating, defenderLevel);
    
    if (Math.random() < deflectChance) {
      const deflectAmount = defenderStats['DeflectAmount'] || 0;
      deflectMitigation = deflectAmount / 100;
    }

    // 3. Block or Parry (Mutually Exclusive based on equipment)
    let blockMitigation = 0;
    let parryMitigation = 0;
    
    if (defenderHasShield) {
      const shieldBlockChance = defenderBaseBlockChance / 100; // E.g., 5% base from shield itself
      const blockRating = isSpell ? (defenderStats['SpellBlockRating'] || 0) : (defenderStats['BlockRating'] || 0);
      const ratingBlockChance = RatingCalculator.getBlockChance(blockRating, defenderLevel);
      const totalBlockChance = shieldBlockChance + ratingBlockChance;

      if (Math.random() < totalBlockChance) {
         const blockAmount = isSpell ? 0 : (defenderStats['BlockAmount'] || 0);
         blockMitigation = blockAmount / 100;
      }
    } else if (defenderHasWeapon) {
      const parryRating = isSpell ? (defenderStats['SpellParryRating'] || 0) : (defenderStats['ParryRating'] || 0);
      const parryChance = RatingCalculator.getParryChance(parryRating, defenderLevel);
      
      if (Math.random() < parryChance) {
         const parryAmount = isSpell ? 0 : (defenderStats['ParryAmount'] || 0);
         parryMitigation = parryAmount / 100;
      }
    }
    
    const mitigationPercent = Math.min(1.0, deflectMitigation + blockMitigation + parryMitigation);
    
    let finalResult: 'hit' | 'block' | 'parry' | 'deflect' | 'crit' = isCrit ? 'crit' : 'hit';
    if (blockMitigation > 0) finalResult = 'block';
    else if (parryMitigation > 0) finalResult = 'parry';
    else if (deflectMitigation > 0) finalResult = 'deflect';

    const armor = defenderStats['Armor'] || 0;
    
    // Innate penetration scales polynomially with attacker level
    const innatePenetration = (attackerLevel * 1.5) + (Math.pow(attackerLevel, 2) / 10);
    
    // BaseArmorDR is used for Elemental mitigation via ArmorFactor
    const baseEffectiveArmor = Math.max(0, armor - innatePenetration);
    const baseArmorDR = Math.min(this.A_CAP, baseEffectiveArmor / (baseEffectiveArmor + 100));
    
    if (isPhysical) {
      let flatPen = innatePenetration;
      let percentPen = attackerStats['PhysicalPenetrationPercent'] || 0;
      
      if (damageType === 'Strike') {
        percentPen += attackerStats['StrikePenetrationPercent'] || 0;
      } else if (damageType === 'Pierce') {
        percentPen += attackerStats['PiercePenetrationPercent'] || 0;
      }
      
      const effectiveArmor = Math.max(0, armor - flatPen) * (1 - percentPen / 100);
      const armorDR_Physical = Math.min(this.A_CAP, effectiveArmor / (effectiveArmor + 100));
      
      const specificResist = damageType === 'Strike' ? (defenderStats['StrikeResist'] || 0) : (defenderStats['PierceResist'] || 0);
      const specificResistDR = specificResist / 100;
      
      const finalDamage = Math.max(0, rawDamage * (1 - armorDR_Physical) * (1 - specificResistDR) * (1 - mitigationPercent));
      return { damage: finalDamage, result: finalResult };
    } else {
      let resistance = 0;
      let percentPen = attackerStats['ElementalPenetrationPercent'] || 0;
      
      if (damageType === 'Fire') {
        resistance = defenderStats['FireResist'] || 0;
        percentPen += attackerStats['FirePenetrationPercent'] || 0;
      } else if (damageType === 'Cold') {
        resistance = defenderStats['ColdResist'] || 0;
        percentPen += attackerStats['ColdPenetrationPercent'] || 0;
      } else if (damageType === 'Lightning') {
        resistance = defenderStats['LightningResist'] || 0;
        percentPen += attackerStats['LightningPenetrationPercent'] || 0;
      }
      
      // Decouple Innate Penetration from Resistances:
      const effectiveResistance = resistance * (1 - percentPen / 100);
      
      // Mathematical Safety: We use Math.abs(effectiveResistance) in the denominator 
      // to prevent asymptote zero-division crashes when negative resists cross the constant
      const resistDRRaw = effectiveResistance / (Math.abs(effectiveResistance) + 100);
      const resistDR = Math.max(this.MIN_RESIST_DR, Math.min(this.R_CAP, resistDRRaw));
      
      const finalDamage = Math.max(0, rawDamage * (1 - this.ARMOR_FACTOR * baseArmorDR) * (1 - resistDR) * (1 - mitigationPercent));
      return { damage: finalDamage, result: finalResult };
    }
  }
}
