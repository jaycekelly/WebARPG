import { useWorldStore } from '../../store/useWorldStore';
import type { GridMap, Obstacle } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { ENEMY_TEMPLATES } from '../../data/enemies';

export class LevelGenerator {
  static generateScatteredLevel(width: number, height: number) {
    const obstacles: Obstacle[] = [];
    const density = 0.15; // 15% of the map is obstacles
    
    // 1. Generate Obstacles
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Leave the center area relatively clear for spawning
        const isCenter = x >= width/2 - 2 && x <= width/2 + 2 && y >= height/2 - 2 && y <= height/2 + 2;
        
        if (!isCenter && Math.random() < density) {
          const type = Math.random() > 0.5 ? 'tree' : 'rock';
          obstacles.push({ x, y, type });
        }
      }
    }

    const grid: GridMap = { width, height, obstacles };
    return grid;
  }

  static getValidSpawnPoint(grid: GridMap, awayFrom?: {x: number, y: number}, minDist: number = 5): {x: number, y: number} {
    let attempts = 0;
    while (attempts < 100) {
      const x = Math.floor(Math.random() * grid.width);
      const y = Math.floor(Math.random() * grid.height);
      
      const isObstacle = grid.obstacles.some(obs => obs.x === x && obs.y === y);
      
      let isFarEnough = true;
      if (awayFrom) {
        const dist = Math.max(Math.abs(x - awayFrom.x), Math.abs(y - awayFrom.y));
        if (dist < minDist) isFarEnough = false;
      }
      
      if (!isObstacle && isFarEnough) {
        return { x, y };
      }
      attempts++;
    }
    
    // Fallback
    return { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
  }

  static initializeDungeon(width: number = 15, height: number = 15, playerLevel: number = 1) {
    const worldStore = useWorldStore.getState();
    const playerStore = usePlayerStore.getState();
    
    // Clear old state
    useWorldStore.setState({ enemies: [], lootDrops: [] });

    // Generate Grid
    const grid = this.generateScatteredLevel(width, height);
    worldStore.setGrid(grid);

    // Spawn Player
    const playerSpawn = this.getValidSpawnPoint(grid);
    playerStore.setPosition(playerSpawn.x, playerSpawn.y);
    playerStore.setTarget(null);

    // For the test level, we just spawn 2 goblins far away
    const enemyCount = 2; 
    
    // Filter valid enemies for this level
    const validTemplates = Object.values(ENEMY_TEMPLATES).filter(t => t.minLevel <= playerLevel);
    
    for (let i = 0; i < enemyCount; i++) {
      if (validTemplates.length === 0) break;
      // Always spawn goblin for test level as requested
      const template = ENEMY_TEMPLATES['goblin'];
      // Spawn at least 8 tiles away from player
      const spawnPos = this.getValidSpawnPoint(grid, playerSpawn, 8);
      
      // Calculate scaled stats based on level difference
      const levelDiff = Math.max(0, playerLevel - template.minLevel);
      const scaledStats = { ...template.stats };
      
      // +10% Health and Damage per level above minLevel
      const scaleFactor = 1 + (levelDiff * 0.10);
      scaledStats.maxHealth = Math.floor(scaledStats.maxHealth * scaleFactor);
      scaledStats.attackPower = Math.floor(scaledStats.attackPower * scaleFactor);
      
      worldStore.spawnEnemy({
        templateId: template.id,
        name: template.name,
        level: playerLevel,
        position: spawnPos,
        health: scaledStats.maxHealth,
        stats: scaledStats,
        aiProfile: template.aiProfile,
        faction: 'enemy',
        xpReward: Math.floor(template.baseXpReward * scaleFactor),
        goldReward: Math.floor((template.baseGoldReward || 0) * scaleFactor),
      });
    }
  }
}
