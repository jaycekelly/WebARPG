import type { Item, GeneratedAffix, ItemTemplate, Rarity } from './types';
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
   * Determine rarity based on a weighted random roll influenced by iLvl and magicFind.
   */
  private static rollRarity(iLvl: number, magicFind: number = 0): Rarity {
    const t = RARITY_TUNING;
    const wCommon = Math.max(0, t.commonBase - t.commonDecay * iLvl);
    const mfMult = 1 + (magicFind / 100);
    
    // Magic find boosts higher rarities
    const wMagic = t.magicBase * mfMult;
    const wRare = Math.max(0, t.rareScale * iLvl - t.rareOffset) * mfMult;
    const wEpic = Math.max(0, t.epicScale * iLvl - t.epicOffset) * mfMult;
    const wLegendary = Math.max(0, t.legScale * iLvl - t.legOffset) * mfMult;
    const wUnique = t.uniqueBase * mfMult;

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
  private static rollAffixes(template: ItemTemplate, iLvl: number, count: number): GeneratedAffix[] {
    const allowedAffixes = AFFIX_POOL.filter(a => {
      if (!a.allowedTypes.includes(template.itemType)) return false;
      if (iLvl < a.minLevel) return false;
      
      // Category filters
      if (a.allowedWeaponCategories && template.weaponCategory) {
        if (!a.allowedWeaponCategories.includes(template.weaponCategory)) return false;
      }
      if (a.allowedArmorCategories && template.armorCategory) {
        if (!a.allowedArmorCategories.includes(template.armorCategory)) return false;
      }
      
      return true;
    });
    const selectedAffixes: GeneratedAffix[] = [];
    
    // Copy pool so we can remove picked affixes (no duplicates)
    const availablePool = [...allowedAffixes];

    for (let i = 0; i < count; i++) {
      if (availablePool.length === 0) break;

      const totalWeight = availablePool.reduce((sum, a) => sum + (a.weight ?? 100), 0);
      let rand = Math.random() * totalWeight;
      let selectedIndex = 0;
      
      for (let j = 0; j < availablePool.length; j++) {
         const w = availablePool[j].weight ?? 100;
         if (rand < w) {
            selectedIndex = j;
            break;
         }
         rand -= w;
      }

      const affixTemplate = availablePool.splice(selectedIndex, 1)[0];
      
      // Enforce exclusivity: remove any remaining affixes in the pool that share the same exclusivityGroup
      // If no exclusivityGroup is defined, fallback to ensuring the exact same stat isn't rolled again
      const groupToMatch = affixTemplate.exclusivityGroup;
      for (let j = availablePool.length - 1; j >= 0; j--) {
        const remaining = availablePool[j];
        if (groupToMatch && remaining.exclusivityGroup === groupToMatch) {
          availablePool.splice(j, 1);
        } else if (!groupToMatch && remaining.stat === affixTemplate.stat) {
          availablePool.splice(j, 1);
        }
      }
      
      // Compute the base exponential power: baseValue * (1 + levelMultiplier)^iLvl
      const targetPower = affixTemplate.baseValue * Math.pow(1 + affixTemplate.levelMultiplier, iLvl);
      
      // Apply +/- 25% random variance on top of the final target power
      const variance = 0.75 + (Math.random() * 0.50);
      
      // 2H weapons get 1.5x stronger affixes
      const typeMultiplier = template.itemType === 'weapon-2h' ? 1.5 : 1.0;
      
      let finalValue = Math.round(targetPower * variance * typeMultiplier);
      
      // Ensure it's at least 1 for flat/increased stats
      if (finalValue < 1) finalValue = 1;
      
      // Templates in data/affixes already define their own '+' signs where appropriate.
      // E.g. '+{value} Strength', so injecting a '+' here causes '++2 Strength'.
      const description = affixTemplate.descriptionTpl.replace('{value}', finalValue.toString());
      
      selectedAffixes.push({
        id: affixTemplate.id,
        description,
        stat: {
          stat: affixTemplate.stat,
          type: affixTemplate.type,
          value: finalValue
        }
      });
    }

    return selectedAffixes;
  }

  /**
   * Generates a fully rolled Item instance.
   */
  static generateLoot(templateId: string, iLvl: number, magicFind: number = 0): Item | null {
    const template = ITEM_TEMPLATES[templateId];
    if (!template) return null;

    const rarity = this.rollRarity(iLvl, magicFind);
    
    if (rarity === 'Unique') {
       return this.generateUnique(templateId, iLvl);
    }

    const affixCount = this.getAffixCount(rarity);
    const affixes = this.rollAffixes(template, iLvl, affixCount);

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
      damageType: template.damageType,
      weaponAttackSpeed: template.weaponAttackSpeed,
      weaponCategory: template.weaponCategory,
      weaponRange: template.weaponRange,
      baseCritChance: template.baseCritChance,
      baseBlockChance: template.baseBlockChance,
      requirements: template.requirements
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
      damageType: template.damageType,
      weaponAttackSpeed: template.weaponAttackSpeed,
      weaponCategory: template.weaponCategory,
      weaponRange: template.weaponRange,
      baseCritChance: template.baseCritChance,
      baseBlockChance: template.baseBlockChance,
      requirements: template.requirements
    };
  }

  /**
   * Generates a completely random piece of loot for the given iLvl.
   */
  static generateRandomLoot(iLvl: number, magicFind: number = 0): Item | null {
    const templateIds = Object.keys(ITEM_TEMPLATES);
    if (templateIds.length === 0) return null;
    
    const randomTemplateId = templateIds[Math.floor(Math.random() * templateIds.length)];
    return this.generateLoot(randomTemplateId, iLvl, magicFind);
  }
}
