export class RatingCalculator {
  /**
   * The constant determines how much rating is required to reach 50%.
   * E.g., if Constant is 100, then 100 Rating = 50%, 200 Rating = 66%, etc.
   */
  static readonly DEFLECT_CONSTANT = 100;
  static readonly BLOCK_CONSTANT = 100;
  static readonly PARRY_CONSTANT = 100;
  static readonly HASTE_CONSTANT = 100;
  static readonly CDR_CONSTANT = 100;

  /**
   * Calculate a diminishing return percentage from a rating.
   * @param rating The raw rating stat amount.
   * @param level The character's level (used to scale the difficulty of attaining percentage).
   * @param baseConstant The scaling factor.
   * @param maxCap Optional hard cap to prevent percentages from going over a threshold (e.g. 75%).
   * @returns A value between 0.0 and 1.0 (or maxCap).
   */
  static getPercentage(rating: number, level: number, baseConstant: number, maxCap: number = 1.0): number {
    if (rating <= 0) return 0;
    
    // Scale the constant linearly with level so higher levels need more rating
    const levelScaledConstant = baseConstant + (level * 2); 
    
    const percentage = rating / (rating + levelScaledConstant);
    return Math.min(percentage, maxCap);
  }

  static getDeflectChance(rating: number, level: number): number {
    // Deflect is strong, maybe cap at 75%
    return this.getPercentage(rating, level, this.DEFLECT_CONSTANT, 0.75);
  }

  static getBlockChance(rating: number, level: number): number {
    // Block mitigates 75% damage, hard cap at 60%
    return this.getPercentage(rating, level, this.BLOCK_CONSTANT, 0.60);
  }

  static getParryChance(rating: number, level: number): number {
    // Parry mitigates 50% damage, hard cap at 75%
    return this.getPercentage(rating, level, this.PARRY_CONSTANT, 0.75);
  }

  static getHasteReduction(rating: number, level: number): number {
    // Haste has no hard cap, but asymptotes
    return this.getPercentage(rating, level, this.HASTE_CONSTANT, 1.0);
  }

  static getCooldownReduction(rating: number, level: number): number {
    // CDR hard cap at 75% to prevent game breaks
    return this.getPercentage(rating, level, this.CDR_CONSTANT, 0.75);
  }
}
