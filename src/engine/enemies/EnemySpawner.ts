import { ENEMY_TEMPLATES } from '../../data/enemies';
import { useWorldStore } from '../../store/useWorldStore';

export class EnemySpawner {
  /**
   * Spawns an enemy from a template at the given position, scaled to the player's level (clamped by min/max).
   */
  static spawn(templateId: string, position: { x: number; y: number }, playerLevel: number) {
    const template = ENEMY_TEMPLATES[templateId];
    if (!template) {
      console.error(`Enemy template ${templateId} not found!`);
      return;
    }

    // Determine the actual level of the enemy
    // It scales with the player, but cannot go below minLevel or above maxLevel
    const level = Math.max(template.minLevel, Math.min(template.maxLevel, playerLevel));

    // Calculate level scaling factor
    // For every level above minLevel, we give them a 10% boost to health and damage.
    const levelDiff = Math.max(0, level - template.minLevel);
    const scaleFactor = 1 + (levelDiff * 0.10);

    const worldStore = useWorldStore.getState();

    worldStore.spawnEnemy({
      templateId: template.id,
      name: template.name,
      level: level,
      position: position,
      spawnOrigin: { x: position.x, y: position.y },
      rarity: 'Normal',
      health: Math.floor(template.stats.maxHealth * scaleFactor),
      aiProfile: template.aiProfile,
      faction: 'enemy',
      scale: template.scale,
      xpReward: Math.floor(template.baseXpReward * (1 + levelDiff * 0.2)),
      goldReward: Math.floor((template.baseGoldReward || 0) * (1 + levelDiff * 0.2)),
      stats: {
        maxHealth: Math.floor(template.stats.maxHealth * scaleFactor),
        attackPower: Math.floor(template.stats.attackPower * scaleFactor),
        damageType: template.stats.damageType,
        // We usually don't scale attack speed, range, or move speed with level to keep their "feel" consistent
        attackSpeed: template.stats.attackSpeed,
        attackRange: template.stats.attackRange,
        moveSpeed: template.stats.moveSpeed,
        aggroRange: template.stats.aggroRange,
        armor: template.stats.armor,
        fireResist: template.stats.fireResist,
        coldResist: template.stats.coldResist,
        lightningResist: template.stats.lightningResist,
        strikeResist: template.stats.strikeResist,
        pierceResist: template.stats.pierceResist,
        physicalResist: template.stats.physicalResist,
        deflectChance: template.stats.deflectChance,
        deflectEffect: template.stats.deflectEffect,
        block: template.stats.block,
        spellBlock: template.stats.spellBlock,
        blockEffect: template.stats.blockEffect,
        parry: template.stats.parry,
        spellParry: template.stats.spellParry,
        parryEffect: template.stats.parryEffect,
      }
    });
  }
}
