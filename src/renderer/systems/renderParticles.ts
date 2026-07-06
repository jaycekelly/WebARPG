import { Container, Graphics } from 'pixi.js';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import { useWorldStore } from '../../store/useWorldStore';
import { usePlayerStore } from '../../store/usePlayerStore';

type VfxShape = 'slash' | 'ring' | 'orb' | 'streak' | 'zigzag' | 'needle' | 'bolt' | 'pillar' | 'shatter' | 'spark' | 'cube';

interface VfxElement {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  color: number;
  active: boolean;
  shape: VfxShape;
  rotation: number;
  scaleX: number;
  scaleY: number;
  targetId?: string;
  lastTargetX: number;
  lastTargetY: number;
  gfx: Graphics;
}

export function createParticleRenderer() {
  const container = new Container();
  
  const poolSize = 100;
  const elements: VfxElement[] = [];
  
  for (let i = 0; i < poolSize; i++) {
    const gfx = new Graphics();
    gfx.blendMode = 'add'; // Additive blending for glowing JRPG magic
    gfx.visible = false;
    container.addChild(gfx);
    
    elements.push({
      x: 0, y: 0, z: 0,
      vx: 0, vy: 0, vz: 0,
      life: 0, maxLife: 0,
      color: 0xffffff,
      active: false,
      shape: 'orb',
      rotation: 0,
      scaleX: 1, scaleY: 1,
      lastTargetX: 0, lastTargetY: 0,
      gfx
    });
  }
  
  let lastTime = performance.now();

  function spawnElement(x: number, y: number, z: number, color: number, shape: VfxShape, maxLife: number, rot = 0, vx=0, vy=0, vz=0, targetId?: string) {
    const p = elements.find(e => !e.active);
    if (!p) return;
    
    p.active = true;
    p.vx = vx; p.vy = vy; p.vz = vz;
    p.life = 0; p.maxLife = maxLife;
    p.color = color;
    p.shape = shape;
    p.rotation = rot;
    p.scaleX = 1; p.scaleY = 1;
    p.targetId = targetId;
    p.z = z;
    
    if (targetId) {
      let tx = x, ty = y;
      if (targetId === 'player') {
        const player = usePlayerStore.getState();
        tx = player.position.x; ty = player.position.y;
      } else {
        const enemy = useWorldStore.getState().enemies.find(e => e.id === targetId);
        if (enemy) { tx = enemy.position.x; ty = enemy.position.y; }
      }
      p.lastTargetX = tx;
      p.lastTargetY = ty;
      // Store relative offset
      p.x = x - tx;
      p.y = y - ty;
    } else {
      p.x = x; p.y = y;
    }
    
    p.gfx.clear();
    if (shape === 'slash') {
      // Crisp thick diamond (thick in middle, tapered ends)
      p.gfx.poly([-30, 0, 0, -10, 30, 0, 0, 10]);
      p.gfx.fill({ color: color, alpha: 1.0 });
    } else if (shape === 'spark') {
      // Thinner and slightly shorter version of the slash
      p.gfx.poly([-25, 0, 0, -5, 25, 0, 0, 5]);
      p.gfx.fill({ color: color, alpha: 1.0 });
    } else if (shape === 'cube') {
      // Small blocky square for pixel-art style evaporation
      p.gfx.rect(-8, -8, 16, 16);
      p.gfx.fill({ color: color, alpha: 1.0 });
    } else if (shape === 'needle') {
      // Bulky spearhead (slightly larger)
      p.gfx.poly([-13, -13, 20, 0, -13, 13]);
      p.gfx.fill({ color: 0xffffff, alpha: 1.0 });
      p.gfx.stroke({ color: color, width: 4, alpha: 1.0 });
    } else if (shape === 'bolt') {
      // Chunky, stylized comic-book lightning bolt
      p.gfx.poly([-5, -50, 10, -50, 0, -10, 15, -10, -10, 30, 0, 0, -15, 0]);
      p.gfx.fill({ color: 0xffffff, alpha: 1.0 });
      p.gfx.stroke({ color: color, width: 4, alpha: 1.0 });
    } else if (shape === 'pillar') {
      // Shorter vertical blocky beam of energy
      p.gfx.rect(-12, -60, 24, 80);
      p.gfx.fill({ color: color, alpha: 0.8 });
      p.gfx.rect(-4, -60, 8, 80);
      p.gfx.fill({ color: 0xffffff, alpha: 1.0 });
    } else if (shape === 'shatter') {
      // Like a slash, but thicker in the middle with custom tip length
      p.gfx.poly([-26, 0, 0, -12, 26, 0, 0, 12]);
      p.gfx.fill({ color: color, alpha: 1.0 });
    } else if (shape === 'streak') {
      // Fast straight lines
      p.gfx.rect(-15, -2, 30, 4);
      p.gfx.fill({ color: color, alpha: 0.8 });
      p.gfx.rect(-8, -1, 16, 2);
      p.gfx.fill({ color: 0xffffff, alpha: 1.0 });
    } else if (shape === 'orb') {
      // Massive blocky square core
      p.gfx.rect(-16, -16, 32, 32);
      p.gfx.fill({ color, alpha: 0.9 });
      p.gfx.rect(-8, -8, 16, 16);
      p.gfx.fill({ color: 0xffffff, alpha: 1.0 });
    }
    p.gfx.visible = true;
  }

  function spawn(x: number, y: number, z: number, color: number, type: string, _count = 1, targetId?: string, sourceX?: number, sourceY?: number) {
    if (type === 'slash' || type === 'strike' || type === 'physical') {
      const baseAngles = [Math.PI / 4, -Math.PI / 4, 0];
      const baseAngle = baseAngles[Math.floor(Math.random() * baseAngles.length)];
      const angle = baseAngle + (Math.random() - 0.5) * 0.3;
      
      const speed = 0.08;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      spawnElement(x - vx * 4, y - vy * 4, z + 0.2, color, 'slash', 150, angle, vx, vy, 0, targetId);
    } else if (type === 'pierce') {
      // Single massive forward thrust
      let angle = Math.random() * Math.PI * 2;
      if (sourceX !== undefined && sourceY !== undefined) {
         angle = Math.atan2(y - sourceY, x - sourceX);
      }
      
      // Matched speed and spawn offset to behave exactly like Strike FX
      const speed = 0.08;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      
      spawnElement(x - vx * 4, y - vy * 4, z + 0.2, color, 'needle', 150, angle, vx, vy, 0, targetId);
    } else if (type === 'fire') {
      // Tamed floating, burning blocky embers
      for (let i = 0; i < 3; i++) {
        const ox = (Math.random() - 0.5) * 0.6; // slightly more spread
        const oy = (Math.random() - 0.5) * 0.6;
        const vy = -0.02 - Math.random() * 0.02; // slowly rise upwards
        spawnElement(x + ox, y + oy, z + 0.1, color, 'orb', 200 + Math.random()*150, Math.random(), 0, vy, 0, targetId);
      }
    } else if (type === 'cold') {
      // Massive dense vertical and horizontal shatter (cross only)
      spawnElement(x, y, z + 0.2, color, 'shatter', 250, 0, 0, 0, 0, targetId);
      spawnElement(x, y, z + 0.2, color, 'shatter', 250, Math.PI / 2, 0, 0, 0, targetId);
    } else if (type === 'lightning') {
      // Anime-style electric burst
      spawnElement(x, y, z, 0xffffff, 'orb', 100, 0, 0, 0, 0, targetId);

      // 4 chaotic sparks crackling over the enemy
      const numSparks = 4;
      const positions: {x: number, y: number}[] = [];
      
      for (let i = 0; i < numSparks; i++) {
        let ox = 0, oy = 0;
        // Try up to 10 times to find a random spot that isn't too close to another spark
        for (let attempts = 0; attempts < 10; attempts++) {
          ox = (Math.random() - 0.5) * 0.7; // Tighter random box
          oy = (Math.random() - 0.5) * 0.7;
          let tooClose = false;
          for (const p of positions) {
            // Reduced rejection distance since they are in a tighter space
            if (Math.hypot(p.x - ox, p.y - oy) < 0.25) {
              tooClose = true;
              break;
            }
          }
          if (!tooClose) break; // Found a good spot!
        }
        positions.push({ x: ox, y: oy });
        
        // Completely random rotation angle
        const angle = Math.random() * Math.PI * 2;
        
        // Zero velocity so they just flash in place like static crackles
        spawnElement(x + ox, y + oy, z + 0.2, color, 'spark', 100 + Math.random() * 80, angle, 0, 0, 0, targetId);
      }
    } else if (type === 'death') {
      // Explode outwards into blocky white particles uniformly
      for (let i = 0; i < 12; i++) {
        // Start dead-center of the entity, lower to the ground
        const ox = 0;
        const oy = 0;
        const oz = 0.1;
        
        // 360-degree radial explosion on the XY plane
        const expAngle = Math.random() * Math.PI * 2;
        const speed = 0.02 + Math.random() * 0.03; // Reduced speed so they don't explode as far out
        const vx = Math.cos(expAngle) * speed;
        const vy = Math.sin(expAngle) * speed;
        const vz = 0; // Disable Z-axis velocity so it doesn't bias up/down on the screen
        
        // Random visual rotation for the cubes
        const angle = Math.random() * Math.PI * 2;
        
        spawnElement(x + ox, y + oy, z + oz, 0xffffff, 'cube', 250 + Math.random() * 150, angle, vx, vy, vz, targetId);
      }
    } else {
      // Generic condensed blast
      spawnElement(x, y, z + 0.2, color, 'slash', 200, Math.PI / 4, 0, 0, 0, targetId);
      spawnElement(x, y, z, 0xffffff, 'orb', 250, 0, 0, 0, 0, targetId);
    }
  }

  function update(params: ProjectionParams) {
    const now = performance.now();
    const dtMs = now - lastTime;
    lastTime = now;
    const dt = Math.min(dtMs, 50) / 16.666;
    
    for (let i = 0; i < poolSize; i++) {
      const p = elements[i];
      if (p.active) {
        p.life += dtMs;
        if (p.life >= p.maxLife) {
          p.active = false;
          p.gfx.visible = false;
          continue;
        }
        
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        p.vx *= Math.pow(0.9, dt); p.vy *= Math.pow(0.9, dt);
        
        let absX = p.x;
        let absY = p.y;
        if (p.targetId) {
          if (p.targetId === 'player') {
            const player = usePlayerStore.getState();
            p.lastTargetX = player.position.x;
            p.lastTargetY = player.position.y;
          } else {
            const enemy = useWorldStore.getState().enemies.find(e => e.id === p.targetId);
            if (enemy) {
               p.lastTargetX = enemy.position.x;
               p.lastTargetY = enemy.position.y;
            }
          }
          absX += p.lastTargetX;
          absY += p.lastTargetY;
        }
        
        const proj = projectTileToScreen(absX, absY, params);
        const zScreenPx = p.z * params.tileSize * proj.scale * 1.5;
        
        p.gfx.x = proj.screenX;
        p.gfx.y = proj.screenY - zScreenPx;
        p.gfx.rotation = p.rotation;
        
        const progress = p.life / p.maxLife;
        
        if (p.shape === 'slash' || p.shape === 'needle' || p.shape === 'bolt' || p.shape === 'shatter' || p.shape === 'spark') {
          // Slash elongates and fades
          p.scaleX = proj.scale * (1.0 + progress * 1.0);
          p.scaleY = proj.scale * (1.0 - progress * 0.5);
          p.gfx.alpha = 1.0 - Math.pow(progress, 3);
        } else if (p.shape === 'ring') {
          // Ring explodes outward
          p.scaleX = proj.scale * (0.2 + progress * 3.0);
          p.scaleY = p.scaleX * 0.5; // Squashed for isometric perspective
          p.gfx.alpha = 1.0 - Math.pow(progress, 1.5);
        } else if (p.shape === 'cube') {
          // Cubes stay full size but fade out completely linearly
          p.scaleX = proj.scale;
          p.scaleY = proj.scale;
          p.gfx.alpha = 1.0 - progress;
        } else if (p.shape === 'orb') {
          // Orb bursts and shrinks
          p.scaleX = proj.scale * (1.5 - progress);
          p.scaleY = p.scaleX;
          p.gfx.alpha = 1.0 - progress;
        } else if (p.shape === 'streak' || p.shape === 'pillar') {
          // Streaks fly and stretch
          p.scaleX = proj.scale * (1.0 + progress * 1.5);
          p.scaleY = proj.scale * (1.0 - progress * 0.5);
          p.gfx.alpha = 1.0 - Math.pow(progress, 2);
        }
        
        p.gfx.scale.set(p.scaleX, p.scaleY);
      }
    }
  }

  return { container, update, spawn };
}
