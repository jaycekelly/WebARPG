import { create } from 'zustand';
import type { EnemyStats, AIProfile } from '../engine/enemies/types';
import type { Item } from '../engine/items/types';
import type { DamageType } from '../engine/stats/types';

export interface Enemy {
  id: string;
  templateId: string;
  name: string;
  level: number;
  position: { x: number; y: number };
  health: number;
  stats: EnemyStats;
  aiProfile: AIProfile;
  rarity: 'Normal' | 'Magic' | 'Rare' | 'Boss';
  isDead: boolean;
  xpReward: number;
  goldReward: number;
  lastAttackTime: number;
  lastMoveTime: number;
  faction: 'enemy' | 'player';
  rewardsGranted?: boolean;
  spawnOrigin: { x: number; y: number };
  isAggroed?: boolean;
  groupId?: string;
  autoTargetChecked?: boolean;
}

export interface LootDrop {
  id: string;
  items: Item[];
  position: { x: number; y: number };
}

export interface GroundZone {
  id: string;
  position: { x: number; y: number };
  hazardId: string;
  element?: DamageType;
  damagePerSecond: number;
  expiresAt: number;
}

export interface Obstacle {
  x: number;
  y: number;
  type: 'tree' | 'wall' | 'rock';
}

export interface GridMap {
  width: number;
  height: number;
  obstacles: Obstacle[];
}

interface WorldState {
  grid: GridMap;
  enemies: Enemy[];
  lootDrops: LootDrop[];
  spawnEnemy: (enemy: Omit<Enemy, 'id' | 'isDead' | 'lastAttackTime' | 'lastMoveTime'>) => void;
  damageEnemy: (id: string, amount: number) => void;
  updateEnemyAttackTime: (id: string, time: number) => void;
  updateEnemyMoveTime: (id: string, time: number) => void;
  moveEnemy: (id: string, position: {x: number, y: number}) => void;
  getEnemyAt: (x: number, y: number) => Enemy | undefined;
  markEnemyRewardsGranted: (id: string) => void;
  updateEnemy: (id: string, updates: Partial<Enemy>) => void;
  
  // Loot
  addLoot: (position: { x: number; y: number }, items: Item[]) => void;
  removeLootItem: (dropId: string, itemId: string) => void;
  removeLootDrop: (dropId: string) => void;
  setGrid: (grid: GridMap) => void;

  // Zones
  zones: GroundZone[];
  addZone: (zone: Omit<GroundZone, 'id'>) => void;
  clearExpiredZones: (now: number) => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  grid: { width: 15, height: 15, obstacles: [] },
  enemies: [],
  lootDrops: [],
  zones: [],

  spawnEnemy: (enemyData) => set((state) => ({
    enemies: [...state.enemies, { 
      ...enemyData, 
      rarity: enemyData.rarity || 'Normal', 
      id: Math.random().toString(), 
      isDead: false, 
      lastAttackTime: 0, 
      lastMoveTime: 0, 
      faction: enemyData.faction || 'enemy',
      spawnOrigin: enemyData.spawnOrigin || { ...enemyData.position },
      isAggroed: enemyData.isAggroed || false,
      groupId: enemyData.groupId
    }]
  })),

  damageEnemy: (id, amount) => set((state) => ({
    enemies: state.enemies.map(enemy => {
      if (enemy.id === id) {
        const newHealth = Math.max(0, enemy.health - amount);
        return { ...enemy, health: newHealth, isDead: newHealth === 0, isAggroed: true };
      }
      return enemy;
    })
  })),

  updateEnemyAttackTime: (id, time) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, lastAttackTime: time } : enemy
    )
  })),

  updateEnemyMoveTime: (id, time) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, lastMoveTime: time } : enemy
    )
  })),

  updateEnemy: (id, updates) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, ...updates } : enemy
    )
  })),

  moveEnemy: (id, position) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, position } : enemy
    )
  })),

  getEnemyAt: (x, y) => {
    return get().enemies.find(e => e.position.x === x && e.position.y === y && !e.isDead);
  },

  markEnemyRewardsGranted: (id) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, rewardsGranted: true } : enemy
    )
  })),

  addLoot: (position, items) => set((state) => {
    // Check if loot already exists at this tile to merge it
    const existingDrop = state.lootDrops.find(drop => drop.position.x === position.x && drop.position.y === position.y);
    
    if (existingDrop) {
      return {
        lootDrops: state.lootDrops.map(drop => 
          drop.id === existingDrop.id ? { ...drop, items: [...drop.items, ...items] } : drop
        )
      };
    } else {
      return {
        lootDrops: [...state.lootDrops, { id: Math.random().toString(), items, position }]
      };
    }
  }),

  removeLootItem: (dropId, itemId) => set((state) => ({
    lootDrops: state.lootDrops.map(drop => {
      if (drop.id === dropId) {
        return { ...drop, items: drop.items.filter(item => item.id !== itemId) };
      }
      return drop;
    }).filter(drop => drop.items.length > 0) // Clean up empty drops
  })),

  removeLootDrop: (dropId) => set((state) => ({
    lootDrops: state.lootDrops.filter(drop => drop.id !== dropId)
  })),

  setGrid: (grid) => set({ grid }),

  addZone: (zoneData) => set((state) => {
    // If a zone of the same hazardId already exists here, we can overwrite or just add another
    // Let's just add it for now, can optimize stacking later
    return {
      zones: [...state.zones, { ...zoneData, id: Math.random().toString() }]
    };
  }),

  clearExpiredZones: (now) => set((state) => ({
    zones: state.zones.filter(z => z.expiresAt > now)
  }))
}));
