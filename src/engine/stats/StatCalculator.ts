import type { StatModifier, StatType } from './types';

export class StatCalculator {
  /**
   * Calculates the final value of a stat given an array of modifiers.
   * Modifiers should already be filtered to only include those applicable to this specific StatType.
   * 
   * Formula: Final = (Sum of 'flat') * (1 + Sum of 'increased') * (Product of (1 + 'more'))
   */
  static calculateFinalStat(modifiers: StatModifier[]): number {
    let flatSum = 0;
    let increasedSum = 0;
    let moreMultiplier = 1;

    for (const mod of modifiers) {
      if (mod.type === 'flat') {
        flatSum += mod.value;
      } else if (mod.type === 'increased') {
        // e.g. 15 means 15% increased (0.15)
        increasedSum += (mod.value / 100);
      } else if (mod.type === 'more') {
        // e.g. 10 means 10% more (1.1 multiplier)
        // -10 means 10% less (0.9 multiplier)
        moreMultiplier *= (1 + (mod.value / 100));
      }
    }

    // Increased starts at 1 (100% of base)
    const totalMultiplier = Math.max(0, 1 + increasedSum) * moreMultiplier;

    const finalValue = flatSum * totalMultiplier;

    // We can floor or round here depending on game rules, but returning raw float is safest for intermediate calculations
    return finalValue;
  }

  /**
   * Helper to compute all stats into a dictionary for fast UI lookups.
   */
  static computeAllStats(allModifiers: StatModifier[]): Record<StatType, number> {
    // Group modifiers by stat
    const modifiersByStat = new Map<StatType, StatModifier[]>();
    
    for (const mod of allModifiers) {
      const existing = modifiersByStat.get(mod.stat) || [];
      existing.push(mod);
      modifiersByStat.set(mod.stat, existing);
    }

    // Calculate final for each stat that has modifiers
    // This requires casting the empty object to the full record type, 
    // we'll assume stats not present in the record simply default to 0 in the UI.
    const result = {} as Record<StatType, number>;

    for (const [stat, mods] of modifiersByStat.entries()) {
      result[stat] = this.calculateFinalStat(mods);
    }

    return result;
  }
}
