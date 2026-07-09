import { useWorldStore } from '../../store/useWorldStore';
import type { GridMap, Obstacle } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';
import { useVisionStore } from '../../store/useVisionStore';
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
          const type = Math.random() > 0.5 ? 'wall' : 'rock';
          obstacles.push({ x, y, type });
        }
      }
    }

    const grid: GridMap = { width, height, obstacles, environment: 'dungeon' };
    return grid;
  }

  static initializeTown() {
    const worldStore = useWorldStore.getState();
    const playerStore = usePlayerStore.getState();
    
    // Clear old state
    useWorldStore.setState({ enemies: [], lootDrops: [] });
    useVisionStore.getState().resetVision();

    // Generate Town Grid (12x12, empty by default)
    const width = 12;
    const height = 12;
    const obstacles: Obstacle[] = [
      { x: Math.floor(width / 2), y: Math.floor(height / 2) - 2, type: 'npc_guide' },
      { x: width - 2, y: Math.floor(height / 2), type: 'dungeon_entrance' },
      { x: 2, y: Math.floor(height / 2), type: 'campfire' }
    ];

    const grid: GridMap = { width, height, obstacles, environment: 'town' };
    worldStore.setGrid(grid);

    // Spawn Player in center
    playerStore.setPosition(Math.floor(width / 2), Math.floor(height / 2));
    playerStore.setTarget(null);
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
    // Fallback
    return { x: Math.floor(grid.width / 2), y: Math.floor(grid.height / 2) };
  }

  static getValidSpawnPointInZone(grid: GridMap, minX: number, maxX: number, minY: number, maxY: number): {x: number, y: number} {
    let attempts = 0;
    while (attempts < 200) {
      const x = Math.floor(Math.random() * (maxX - minX + 1)) + minX;
      const y = Math.floor(Math.random() * (maxY - minY + 1)) + minY;
      
      const isObstacle = grid.obstacles.some(o => o.x === x && o.y === y);
      if (!isObstacle) {
        return { x, y };
      }
      attempts++;
    }
    // Fallback to anywhere if zone is completely blocked
    return this.getValidSpawnPoint(grid);
  }

  static initializeDungeon(width: number = 15, height: number = 15, playerLevel: number = 1) {
    const worldStore = useWorldStore.getState();
    const playerStore = usePlayerStore.getState();
    
    // Clear old state
    useWorldStore.setState({ enemies: [], lootDrops: [] });
    useVisionStore.getState().resetVision();

    // Generate Grid
    const grid = this.generateScatteredLevel(width, height);
    worldStore.setGrid(grid);

    // Determine Progression Vector
    const vectors = ['BottomLeft_to_TopRight', 'Bottom_to_Top', 'Left_to_Right'];
    const vector = vectors[Math.floor(Math.random() * vectors.length)];

    let playerZone = { minX: 0, maxX: width - 1, minY: 0, maxY: height - 1 };
    let enemyZone = { minX: 0, maxX: width - 1, minY: 0, maxY: height - 1 };

    if (vector === 'BottomLeft_to_TopRight') {
       playerZone = { minX: 0, maxX: 10, minY: height - 11, maxY: height - 1 };
       enemyZone = { minX: 10, maxX: width - 1, minY: 0, maxY: height - 11 };
    } else if (vector === 'Bottom_to_Top') {
       playerZone = { minX: Math.floor(width/2) - 5, maxX: Math.floor(width/2) + 5, minY: height - 11, maxY: height - 1 };
       enemyZone = { minX: 0, maxX: width - 1, minY: 0, maxY: height - 11 };
    } else if (vector === 'Left_to_Right') {
       playerZone = { minX: 0, maxX: 10, minY: Math.floor(height/2) - 5, maxY: Math.floor(height/2) + 5 };
       enemyZone = { minX: 10, maxX: width - 1, minY: 0, maxY: height - 1 };
    }

    // Spawn Player
    const playerSpawn = this.getValidSpawnPointInZone(grid, playerZone.minX, playerZone.maxX, playerZone.minY, playerZone.maxY);
    playerStore.setPosition(playerSpawn.x, playerSpawn.y);
    playerStore.setTarget(null);

    // For the test level, we spawn 10 solo bats, and 5 groups of 2 bats
    const template = ENEMY_TEMPLATES['bat'];
    if (!template) return;
    
    // Helper to spawn a bat
    const spawnBat = (spawnPos: {x: number, y: number}, groupId?: string) => {
      const level = Math.max(template.minLevel, Math.min(template.maxLevel, playerLevel));
      const levelDiff = Math.max(0, level - template.minLevel);
      const scaleFactor = 1 + (levelDiff * 0.10);

      const health = Math.floor(template.stats.maxHealth * scaleFactor);

      useWorldStore.getState().spawnEnemy({
        templateId: template.id,
        name: template.name,
        level: level,
        position: spawnPos,
        spawnOrigin: { x: spawnPos.x, y: spawnPos.y },
        rarity: 'Normal',
        health: health,
        aiProfile: template.aiProfile,
        faction: 'enemy',
        groupId: groupId,
        scale: template.scale, // Pull scale from template
        xpReward: Math.floor(template.baseXpReward * (1 + levelDiff * 0.2)),
        goldReward: Math.floor((template.baseGoldReward || 0) * (1 + levelDiff * 0.2)),
        stats: {
          ...template.stats,
          maxHealth: health,
          attackPower: Math.floor(template.stats.attackPower * scaleFactor),
        }
      });
    };

    const getRandomValidTile = (_avoid?: {x: number, y: number}) => this.getValidSpawnPointInZone(grid, enemyZone.minX, enemyZone.maxX, enemyZone.minY, enemyZone.maxY);

    // Spawn 10 Solo Bats
    for (let i = 0; i < 10; i++) {
      const soloPos = getRandomValidTile();
      spawnBat(soloPos);
    }

    // Spawn 5 Groups of 2 Bats
    for (let i = 0; i < 5; i++) {
      const groupOrigin = getRandomValidTile();
      const groupId = `group_${Date.now()}_${i}`;
      spawnBat(groupOrigin, groupId);
      
      // Find an adjacent tile for the second group member
      let member2Pos = { x: groupOrigin.x + 1, y: groupOrigin.y };
      if (grid.obstacles.some(o => o.x === member2Pos.x && o.y === member2Pos.y) || member2Pos.x >= grid.width) {
         member2Pos = { x: groupOrigin.x - 1, y: groupOrigin.y };
      }
      spawnBat(member2Pos, groupId);
    }
  }
}
