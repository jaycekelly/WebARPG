import type { DamageType } from '../stats/types';

export class DamageCalculator {
  static readonly A_MULT = 50;
  static readonly R_MULT = 5;
  static readonly A_CAP = 0.85;
  static readonly R_CAP = 0.75;
  static readonly ARMOR_FACTOR = 0.5;
  static readonly MIN_RESIST_DR = -1.0; // Max +100% damage taken

  static calculateDamage(
    rawDamage: number,
    damageType: DamageType | undefined,
    isSpell: boolean,
    attackerLevel: number,
    attackerStats: Record<string, number>,
    defenderStats: Record<string, number>,
    baseCritChance: number = 0,
    defenderHasWeapon: boolean = true,
    defenderHasShield: boolean = false,
    defenderBaseBlockChance: number = 0
  ): { damage: number, result: 'hit' | 'block' | 'parry' | 'deflect' | 'crit' } {
    const isPhysical = damageType === 'Strike' || damageType === 'Pierce';

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
        const multiplierBonus = isSpell
          ? (attackerStats['SpellCriticalStrikeMultiplier'] || 150)
          : (attackerStats['AttackCriticalStrikeMultiplier'] || 150);
          
        critMultiplier = multiplierBonus / 100;
        rawDamage *= critMultiplier;
      }
    }

    // 2. Deflection (Evasion)
    let deflectMitigation = 0;
    const deflectChance = isSpell ? (defenderStats['SpellDeflectChance'] || 0) : (defenderStats['DeflectChance'] || 0);
    if (Math.random() < deflectChance / 100) {
      deflectMitigation = (defenderStats['DeflectEffect'] || 40) / 100;
    }

    // 3. Block or Parry (Mutually Exclusive based on equipment)
    let blockMitigation = 0;
    let parryMitigation = 0;
    
    if (defenderHasShield) {
      const blockChance = defenderBaseBlockChance + (isSpell ? (defenderStats['SpellBlock'] || 0) : (defenderStats['Block'] || 0));
      if (Math.random() < blockChance / 100) {
         blockMitigation = (defenderStats['BlockEffect'] || (isSpell ? 0 : 75)) / 100; 
      }
    } else if (defenderHasWeapon) {
      const parryChance = isSpell ? (defenderStats['SpellParry'] || 0) : (defenderStats['Parry'] || 0);
      if (Math.random() < parryChance / 100) {
         parryMitigation = (defenderStats['ParryEffect'] || (isSpell ? 0 : 50)) / 100;
      }
    }
    
    const mitigationPercent = Math.min(1.0, deflectMitigation + blockMitigation + parryMitigation);
    
    let finalResult: 'hit' | 'block' | 'parry' | 'deflect' | 'crit' = isCrit ? 'crit' : 'hit';
    if (blockMitigation > 0) finalResult = 'block';
    else if (parryMitigation > 0) finalResult = 'parry';
    else if (deflectMitigation > 0) finalResult = 'deflect';

    const armor = defenderStats['Armor'] || 0;
    
    // BaseArmorDR is used for Elemental mitigation via ArmorFactor
    const baseArmorDR = Math.min(this.A_CAP, armor / (armor + this.A_MULT * attackerLevel));
    
    if (isPhysical) {
      const flatPen = attackerStats['PhysicalPenetrationFlat'] || 0;
      const percentPen = attackerStats['PhysicalPenetrationPercent'] || 0;
      
      const effectiveArmor = Math.max(0, armor - flatPen) * (1 - percentPen / 100);
      const armorDR_Physical = Math.min(this.A_CAP, effectiveArmor / (effectiveArmor + this.A_MULT * attackerLevel));
      
      const specificResist = damageType === 'Strike' ? (defenderStats['StrikeResist'] || 0) : (defenderStats['PierceResist'] || 0);
      const specificResistDR = specificResist / 100;
      
      const finalDamage = Math.max(0, rawDamage * (1 - armorDR_Physical) * (1 - specificResistDR) * (1 - mitigationPercent));
      return { damage: finalDamage, result: finalResult };
    } else {
      let resistance = 0;
      let flatPen = attackerStats['ElementalPenetrationFlat'] || 0;
      let percentPen = attackerStats['ElementalPenetrationPercent'] || 0;
      
      if (damageType === 'Fire') {
        resistance = defenderStats['FireResist'] || 0;
        flatPen += attackerStats['FirePenetrationFlat'] || 0;
        percentPen += attackerStats['FirePenetrationPercent'] || 0;
      } else if (damageType === 'Cold') {
        resistance = defenderStats['ColdResist'] || 0;
        flatPen += attackerStats['ColdPenetrationFlat'] || 0;
        percentPen += attackerStats['ColdPenetrationPercent'] || 0;
      } else if (damageType === 'Lightning') {
        resistance = defenderStats['LightningResist'] || 0;
        flatPen += attackerStats['LightningPenetrationFlat'] || 0;
        percentPen += attackerStats['LightningPenetrationPercent'] || 0;
      }
      
      const effectiveResistance = (resistance - flatPen) * (1 - percentPen / 100);
      
      // Mathematical Safety: We use Math.abs(effectiveResistance) in the denominator 
      // to prevent asymptote zero-division crashes when negative resists cross R_MULT * AttackerLevel
      const resistDRRaw = effectiveResistance / (Math.abs(effectiveResistance) + this.R_MULT * attackerLevel);
      const resistDR = Math.max(this.MIN_RESIST_DR, Math.min(this.R_CAP, resistDRRaw));
      
      const finalDamage = Math.max(0, rawDamage * (1 - this.ARMOR_FACTOR * baseArmorDR) * (1 - resistDR) * (1 - mitigationPercent));
      return { damage: finalDamage, result: finalResult };
    }
  }
}
