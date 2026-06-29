import { create } from 'zustand';
import type { EnemyStats, AIProfile } from '../engine/enemies/types';

export interface Enemy {
  id: string;
  templateId: string;
  name: string;
  level: number;
  position: { x: number; y: number };
  health: number;
  stats: EnemyStats;
  aiProfile: AIProfile;
  isDead: boolean;
  xpReward: number;
  lastAttackTime: number;
  lastMoveTime: number;
}

interface WorldState {
  gridSize: { width: number; height: number };
  enemies: Enemy[];
  spawnEnemy: (enemy: Omit<Enemy, 'id' | 'isDead' | 'lastAttackTime' | 'lastMoveTime'>) => void;
  damageEnemy: (id: string, amount: number) => void;
  updateEnemyAttackTime: (id: string, time: number) => void;
  updateEnemyMoveTime: (id: string, time: number) => void;
  moveEnemy: (id: string, position: {x: number, y: number}) => void;
  getEnemyAt: (x: number, y: number) => Enemy | undefined;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  gridSize: { width: 15, height: 10 },
  enemies: [],

  spawnEnemy: (enemyData) => set((state) => ({
    enemies: [...state.enemies, { ...enemyData, id: Math.random().toString(), isDead: false, lastAttackTime: 0, lastMoveTime: 0 }]
  })),

  damageEnemy: (id, amount) => set((state) => ({
    enemies: state.enemies.map(enemy => {
      if (enemy.id === id) {
        const newHealth = Math.max(0, enemy.health - amount);
        return { ...enemy, health: newHealth, isDead: newHealth === 0 };
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

  moveEnemy: (id, position) => set((state) => ({
    enemies: state.enemies.map(enemy => 
      enemy.id === id ? { ...enemy, position } : enemy
    )
  })),

  getEnemyAt: (x, y) => {
    return get().enemies.find(e => e.position.x === x && e.position.y === y && !e.isDead);
  }
}));
