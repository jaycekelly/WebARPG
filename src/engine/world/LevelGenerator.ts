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

    // For the test level, we spawn 1 solo goblin, and 1 group of 2 goblins
    const template = ENEMY_TEMPLATES['goblin'];
    if (!template) return;

    // Helper to spawn a goblin
    const spawnGoblin = (spawnPos: {x: number, y: number}, groupId?: string) => {
      const levelDiff = Math.max(0, playerLevel - template.minLevel);
      const scaleFactor = 1 + (levelDiff * 0.10);
      const scaledStats = { ...template.stats };
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
        groupId,
        spawnOrigin: spawnPos,
        isAggroed: false
      });
    };

    // Spawn 1 Solo Goblin
    const soloPos = this.getValidSpawnPoint(grid, playerSpawn, 8);
    spawnGoblin(soloPos);

    // Spawn Group of 2 Goblins
    const groupOrigin = this.getValidSpawnPoint(grid, playerSpawn, 8);
    spawnGoblin(groupOrigin, 'test-group-1');
    
    // Find an adjacent tile for the second group member
    let member2Pos = { x: groupOrigin.x + 1, y: groupOrigin.y };
    if (grid.obstacles.some(o => o.x === member2Pos.x && o.y === member2Pos.y) || member2Pos.x >= grid.width) {
       member2Pos = { x: groupOrigin.x - 1, y: groupOrigin.y };
    }
    spawnGoblin(member2Pos, 'test-group-1');
  }
}
