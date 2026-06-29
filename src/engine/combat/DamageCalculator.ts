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
    damageType: DamageType,
    attackerLevel: number,
    attackerStats: Record<string, number>,
    defenderStats: Record<string, number>
  ): number {
    const armor = defenderStats['Armor'] || 0;
    
    // BaseArmorDR is used for Elemental mitigation via ArmorFactor
    const baseArmorDR = Math.min(this.A_CAP, armor / (armor + this.A_MULT * attackerLevel));

    const isPhysical = damageType === 'Slashing' || damageType === 'Piercing';
    
    if (isPhysical) {
      const flatPen = attackerStats['PhysicalPenetrationFlat'] || 0;
      const percentPen = attackerStats['PhysicalPenetrationPercent'] || 0;
      
      const effectiveArmor = Math.max(0, armor - flatPen) * (1 - percentPen / 100);
      const armorDR_Physical = Math.min(this.A_CAP, effectiveArmor / (effectiveArmor + this.A_MULT * attackerLevel));
      
      return Math.max(0, rawDamage * (1 - armorDR_Physical));
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
      
      return Math.max(0, rawDamage * (1 - this.ARMOR_FACTOR * baseArmorDR) * (1 - resistDR));
    }
  }
}
