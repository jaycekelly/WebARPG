import { Container, Graphics } from 'pixi.js';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import { SKILLS } from '../../data/skills';
import { useInventoryStore } from '../../store/useInventoryStore';
import { useCombatStore } from '../../store/useCombatStore';
import { useAppStore } from '../../store/useAppStore';
import { useWorldStore } from '../../store/useWorldStore';
import { getAoETiles } from '../../engine/world/gridMath';

const OVERLAY_ALPHA = 0.45;
const OVERLAY_COLOR = 0x000000;

export interface TileVfxRenderer {
  container: Container;
  update(
    params: ProjectionParams,
    playerPos: { x: number; y: number },
    skillId: string | null,
    hoveredTile?: { x: number; y: number } | null,
    obstacles?: { x: number; y: number }[],
  ): void;
}

export function createTileVfxRenderer(): TileVfxRenderer {
  const container = new Container();
  const gfx = new Graphics();
  container.addChild(gfx);

  let lastKey = '';

  function getDistance(p1: { x: number; y: number }, p2: { x: number; y: number }) {
    return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
  }

  return {
    container,
    update(params, playerPos, skillId, hoveredTile, obstacles) {
      const now = useAppStore.getState().getGameTime();
      const currentEffects = useCombatStore.getState().tileEffects || [];
      const activeEffects = currentEffects.filter(e => e.expiresAt > now);
      
      const hasVfx = activeEffects.length > 0;
      
      if (!skillId && !hasVfx) {
        gfx.clear();
        container.visible = false;
        lastKey = '';
        return;
      }

      const weapon = useInventoryStore.getState().equipment['weapon1'];
      const weaponRange = (weapon as any)?.range || 1;
      
      let effectiveRange = 1;
      const skill = skillId ? SKILLS[skillId] : null;
      if (skill) {
          effectiveRange = skill.range > 0 ? skill.range : weaponRange;
      }

      const vfxKey = hasVfx ? Math.random().toString() : '';
      const key = `${params.panX},${params.panY},${params.tileSize},${playerPos.x},${playerPos.y},${effectiveRange},${hoveredTile?.x},${hoveredTile?.y},${vfxKey}`;
      
      if (key === lastKey) return;
      lastKey = key;

      gfx.clear();
      container.visible = true;

      const { gridWidth: w, gridHeight: h } = params;

      const dimPolys: number[][] = [];
      let hoverPoly: number[] | null = null;
      let hoverIsOutOfRange = false;
      let hoverIsInvalid = false;

      const aoeSet = new Set<string>();
      
      if (skill) {
          const isHoveringObstacle = hoveredTile && obstacles?.some(o => o.x === hoveredTile.x && o.y === hoveredTile.y);
          const isHoveringEnemy = hoveredTile && useWorldStore.getState().enemies.some(e => !e.isDead && e.position.x === hoveredTile.x && e.position.y === hoveredTile.y);
          
          if (hoveredTile) {
             if ((skill.targeting as string) === 'Enemy' && !isHoveringEnemy) hoverIsInvalid = true;
             else if ((skill.targeting === 'Ground' || skill.targeting === 'Area') && isHoveringObstacle) hoverIsInvalid = true;
          }

          if (skill.aoeParams && hoveredTile && getDistance(playerPos, hoveredTile) <= effectiveRange) {
            let center = hoveredTile;
            let target = hoveredTile;
            
            if (skill.targeting === 'Directional') center = playerPos;
            else if (skill.targeting === 'Self') { center = playerPos; target = playerPos; }

            const isSolid = (x: number, y: number) => obstacles?.some(o => o.x === x && o.y === y) ?? false;
            
            const tiles = getAoETiles(center, target, skill.aoeParams.shape, skill.aoeParams.radius, skill.aoeParams.respectWalls ?? false, isSolid, w, h);
            for (const pt of tiles) {
              // Never preview-highlight the player's own tile as a hit space (matches the
              // same exclusion applied when the skill actually resolves damage).
              if (pt.x === playerPos.x && pt.y === playerPos.y) continue;
              aoeSet.add(`${pt.x},${pt.y}`);
            }
          }
      }

      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          
          const center = projectTileToScreen(col, row, params);
          if (center.screenX < -200 || center.screenX > params.viewportWidth + 200 ||
              center.screenY < -200 || center.screenY > params.viewportHeight + 200) {
             continue;
          }

          let dimTile = false;
          let highlightAoe = false;

          if (skill) {
              const distToPlayer = getDistance(playerPos, { x: col, y: row });
              if (distToPlayer > effectiveRange) dimTile = true;
              if (aoeSet.has(`${col},${row}`)) { highlightAoe = true; dimTile = false; }
              
              const isHovered = hoveredTile && hoveredTile.x === col && hoveredTile.y === row;
              
              if (dimTile || highlightAoe || isHovered) {
                  const tl = projectTileToScreen(col - 0.5, row - 0.5, params);
                  const tr = projectTileToScreen(col + 0.5, row - 0.5, params);
                  const br = projectTileToScreen(col + 0.5, row + 0.5, params);
                  const bl = projectTileToScreen(col - 0.5, row + 0.5, params);
                  const poly = [tl.screenX, tl.screenY, tr.screenX, tr.screenY, br.screenX, br.screenY, bl.screenX, bl.screenY];
                  
                  if (isHovered) {
                     hoverPoly = poly;
                     hoverIsOutOfRange = distToPlayer > effectiveRange;
                  }
                  
                  if (dimTile && !highlightAoe) dimPolys.push(poly);
              }
          }
        }
      }

      if (dimPolys.length > 0) {
         dimPolys.forEach(p => gfx.poly(p));
         gfx.fill({ color: OVERLAY_COLOR, alpha: OVERLAY_ALPHA });
      }

      const time = Date.now();
      const bounce = (Math.sin(time / 150) + 1) / 2;

      if (aoeSet.size > 0 && !hoverIsOutOfRange) {
         const previewColor = hoverIsInvalid ? 0xef4444 : 0xffffff;
         const previewAlpha = hoverIsInvalid ? 0.15 : (0.15 + bounce * 0.1);
         const outlineAlpha = hoverIsInvalid ? 0.6 : 0.8;

         for (const tileStr of aoeSet) {
            const [cx, cy] = tileStr.split(',').map(Number);
            
            const tl = projectTileToScreen(cx - 0.5, cy - 0.5, params);
            const tr = projectTileToScreen(cx + 0.5, cy - 0.5, params);
            const br = projectTileToScreen(cx + 0.5, cy + 0.5, params);
            const bl = projectTileToScreen(cx - 0.5, cy + 0.5, params);

            gfx.poly([tl.screenX, tl.screenY, tr.screenX, tr.screenY, br.screenX, br.screenY, bl.screenX, bl.screenY]);
            gfx.fill({ color: previewColor, alpha: previewAlpha });

            const hasNorth = aoeSet.has(`${cx},${cy - 1}`);
            const hasSouth = aoeSet.has(`${cx},${cy + 1}`);
            const hasWest = aoeSet.has(`${cx - 1},${cy}`);
            const hasEast = aoeSet.has(`${cx + 1},${cy}`);

            if (!hasNorth) {
               gfx.moveTo(tl.screenX, tl.screenY); gfx.lineTo(tr.screenX, tr.screenY);
               gfx.stroke({ color: previewColor, alpha: outlineAlpha, width: 2 });
            }
            if (!hasEast) {
               gfx.moveTo(tr.screenX, tr.screenY); gfx.lineTo(br.screenX, br.screenY);
               gfx.stroke({ color: previewColor, alpha: outlineAlpha, width: 2 });
            }
            if (!hasSouth) {
               gfx.moveTo(br.screenX, br.screenY); gfx.lineTo(bl.screenX, bl.screenY);
               gfx.stroke({ color: previewColor, alpha: outlineAlpha, width: 2 });
            }
            if (!hasWest) {
               gfx.moveTo(bl.screenX, bl.screenY); gfx.lineTo(tl.screenX, tl.screenY);
               gfx.stroke({ color: previewColor, alpha: outlineAlpha, width: 2 });
            }
         }
      } else if (hoverPoly) {
         gfx.poly(hoverPoly);
         if (hoverIsInvalid) {
            gfx.fill({ color: 0xef4444, alpha: 0.15 });
            gfx.stroke({ color: 0xef4444, alpha: 0.6, width: 2 });
         } else if (hoverIsOutOfRange) {
            gfx.fill({ color: 0xffffff, alpha: 0.02 });
            gfx.stroke({ color: 0x555555, alpha: 0.3, width: 1 });
         } else {
            gfx.fill({ color: 0xffffff, alpha: 0.15 + bounce * 0.2 });
            gfx.stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
         }
      }

      // Group active effects by their timestamp to merge AoE blobs
      const groups = new Map<number, typeof activeEffects>();
      for (const eff of activeEffects) {
         if (!groups.has(eff.expiresAt)) groups.set(eff.expiresAt, []);
         groups.get(eff.expiresAt)!.push(eff);
      }

      for (const [expiresAt, group] of groups.entries()) {
         const lifeLeft = Math.max(0, expiresAt - now);
         const progress = Math.min(1, 1 - (lifeLeft / 300));
         const alpha = 1.0 - Math.pow(progress, 2); // Ease-in fade
         const uniformAlpha = alpha * 0.35; // Uniform transparency level
         const heightProgress = 1 - Math.pow(1 - progress, 3);
         const risePx = 35 * heightProgress;

         // Build a quick lookup for tiles in this specific AoE blob
         const tileSet = new Set<string>();
         for (const tile of group) tileSet.add(`${tile.x},${tile.y}`);

         for (const eff of group) {
            const center = projectTileToScreen(eff.x, eff.y, params);
            if (center.screenX < -200 || center.screenX > params.viewportWidth + 200 ||
                center.screenY < -200 || center.screenY > params.viewportHeight + 200) {
               continue;
            }

            const tl = projectTileToScreen(eff.x - 0.5, eff.y - 0.5, params);
            const tr = projectTileToScreen(eff.x + 0.5, eff.y - 0.5, params);
            const br = projectTileToScreen(eff.x + 0.5, eff.y + 0.5, params);
            const bl = projectTileToScreen(eff.x - 0.5, eff.y + 0.5, params);

            // 1. Base floor glow (always fill the floor tile)
            gfx.poly([tl.screenX, tl.screenY, tr.screenX, tr.screenY, br.screenX, br.screenY, bl.screenX, bl.screenY]);
            gfx.fill({ color: eff.color, alpha: uniformAlpha });

            // Helper to draw a gradient wall and strong base line
            const drawGradientWall = (
               p1: { screenX: number; screenY: number; scale: number },
               p2: { screenX: number; screenY: number; scale: number }
            ) => {
               // Base edge line (on the floor)
               gfx.moveTo(p1.screenX, p1.screenY);
               gfx.lineTo(p2.screenX, p2.screenY);
               gfx.stroke({ color: eff.color, alpha: uniformAlpha, width: 3 });

               // Sliced vertical gradient
               const slices = 8;
               for (let i = 0; i < slices; i++) {
                  const b = i / slices;
                  const t = (i + 1) / slices;
                  const sliceAlpha = uniformAlpha * Math.pow(1 - b, 1.5); // Non-linear fade so top is invisible

                  const b1 = { x: p1.screenX, y: p1.screenY - risePx * b * p1.scale };
                  const b2 = { x: p2.screenX, y: p2.screenY - risePx * b * p2.scale };
                  const t1 = { x: p1.screenX, y: p1.screenY - risePx * t * p1.scale };
                  const t2 = { x: p2.screenX, y: p2.screenY - risePx * t * p2.scale };

                  gfx.poly([b1.x, b1.y, t1.x, t1.y, t2.x, t2.y, b2.x, b2.y]);
                  gfx.fill({ color: eff.color, alpha: sliceAlpha });
               }
            };

            // Check neighbors to see if we are on the edge of the AoE blob
            const hasNorth = tileSet.has(`${eff.x},${eff.y - 1}`);
            const hasSouth = tileSet.has(`${eff.x},${eff.y + 1}`);
            const hasWest = tileSet.has(`${eff.x - 1},${eff.y}`);
            const hasEast = tileSet.has(`${eff.x + 1},${eff.y}`);

            // 2. Draw external side walls only
            // North edge corresponds to top-left to top-right
            if (!hasNorth) drawGradientWall(tl, tr);
            // East edge corresponds to top-right to bottom-right
            if (!hasEast) drawGradientWall(tr, br);
            // South edge corresponds to bottom-right to bottom-left
            if (!hasSouth) drawGradientWall(br, bl);
            // West edge corresponds to bottom-left to top-left
            if (!hasWest) drawGradientWall(bl, tl);
         }
      }
    },
  };
}
