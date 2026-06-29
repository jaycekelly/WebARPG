import type { Item, Rarity, GeneratedAffix, ItemType } from './types';
import { ITEM_TEMPLATES } from '../../data/items';
import { AFFIX_POOL } from '../../data/affixes';

/**
 * Tuning variables for Item Rarity weights based on Item Level (L).
 * W_common    = max(0, commonBase - commonDecay * L)
 * W_magic     = magicBase
 * W_rare      = max(0, rareScale * L - rareOffset)
 * W_epic      = max(0, epicScale * L - epicOffset)
 * W_legendary = max(0, legScale * L - legOffset)
 * W_unique    = uniqueBase
 */
export const RARITY_TUNING = {
  commonBase: 100,
  commonDecay: 10,
  magicBase: 80,
  rareScale: 1.5,
  rareOffset: 15,
  epicScale: 1.0,
  epicOffset: 30,
  legScale: 0.5,
  legOffset: 4,
  uniqueBase: 1.5
};

export class ItemGenerator {
  
  /**
   * Determine rarity based on a weighted random roll influenced by iLvl.
   */
  private static rollRarity(iLvl: number): Rarity {
    const t = RARITY_TUNING;
    const wCommon = Math.max(0, t.commonBase - t.commonDecay * iLvl);
    const wMagic = t.magicBase;
    const wRare = Math.max(0, t.rareScale * iLvl - t.rareOffset);
    const wEpic = Math.max(0, t.epicScale * iLvl - t.epicOffset);
    const wLegendary = Math.max(0, t.legScale * iLvl - t.legOffset);
    const wUnique = t.uniqueBase;

    const totalWeight = wCommon + wMagic + wRare + wEpic + wLegendary + wUnique;
    const roll = Math.random() * totalWeight;

    let acc = wUnique;
    if (roll < acc) return 'Unique';
    
    acc += wLegendary;
    if (roll < acc) return 'Legendary';
    
    acc += wEpic;
    if (roll < acc) return 'Epic';
    
    acc += wRare;
    if (roll < acc) return 'Rare';
    
    acc += wMagic;
    if (roll < acc) return 'Magic';
    
    return 'Normal';
  }

  /**
   * Determine how many affixes an item gets based on rarity.
   */
  private static getAffixCount(rarity: Rarity): number {
    switch (rarity) {
      case 'Normal': return 0;
      case 'Magic': return 1;
      case 'Rare': return 2;
      case 'Epic': return 3;
      case 'Legendary': return 4;
      case 'Unique': return 0; // Uniques have hardcoded affixes, bypass generator
    }
  }

  /**
   * Pick random unique affixes from the allowed pool for this item type.
   */
  private static rollAffixes(itemType: ItemType, iLvl: number, count: number): GeneratedAffix[] {
    const allowedAffixes = AFFIX_POOL.filter(a => a.allowedTypes.includes(itemType));
    const selectedAffixes: GeneratedAffix[] = [];
    
    // Copy pool so we can remove picked affixes (no duplicates)
    const availablePool = [...allowedAffixes];

    for (let i = 0; i < count; i++) {
      if (availablePool.length === 0) break;

      const randomIndex = Math.floor(Math.random() * availablePool.length);
      const affixTemplate = availablePool.splice(randomIndex, 1)[0];
      
      const rolled = affixTemplate.roll(iLvl);
      
      selectedAffixes.push({
        id: affixTemplate.id,
        description: rolled.description,
        stat: rolled.stat
      });
    }

    return selectedAffixes;
  }

  /**
   * Generates a fully rolled Item instance.
   */
  static generateLoot(templateId: string, iLvl: number): Item | null {
    const template = ITEM_TEMPLATES[templateId];
    if (!template) return null;

    const rarity = this.rollRarity(iLvl);
    
    if (rarity === 'Unique') {
       return this.generateUnique(templateId, iLvl);
    }

    const affixCount = this.getAffixCount(rarity);
    const affixes = this.rollAffixes(template.itemType, iLvl, affixCount);

    return {
      id: Math.random().toString(36).substring(2, 9),
      templateId: template.id,
      name: template.name,
      icon: template.icon,
      itemType: template.itemType,
      iLvl,
      rarity,
      baseStats: template.baseStats, // Inherited intrinsic stats (like base damage)
      affixes,
      damageType: template.damageType
    };
  }

  /**
   * Specifically generate a Unique item (bypasses RNG for rarity/affixes)
   * This assumes the template has predefined 'affixes' if we update it.
   */
  static generateUnique(templateId: string, iLvl: number): Item | null {
    const template = ITEM_TEMPLATES[templateId];
    if (!template) return null;

    return {
      id: Math.random().toString(36).substring(2, 9),
      templateId: template.id,
      name: template.name,
      icon: template.icon,
      itemType: template.itemType,
      iLvl,
      rarity: 'Unique',
      baseStats: template.baseStats,
      affixes: [], // For now, Unique templating can just rely on baseStats, or we expand it later
      damageType: template.damageType
    };
  }
}
