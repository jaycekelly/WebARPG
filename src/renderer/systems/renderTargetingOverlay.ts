import { Container, Graphics } from 'pixi.js';
import type { ProjectionParams } from '../../engine/world/screenProjection';
import { projectTileToScreen } from '../../engine/world/screenProjection';
import { SKILLS } from '../../data/skills';
import { useInventoryStore } from '../../store/useInventoryStore';
import { getAoETiles } from '../../engine/world/gridMath';

const OVERLAY_ALPHA = 0.45;
const OVERLAY_COLOR = 0x000000;

export interface TargetingOverlayRenderer {
  container: Container;
  /**
   * Draw semi-transparent dark overlays on tiles outside the effective range
   * of the currently targeted skill. Call every frame.
   * @param params     — projection params for the current camera
   * @param playerPos  — player position (grid coords)
   * @param skillId    — the skill currently in targeting mode, or null
   */
  update(
    params: ProjectionParams,
    playerPos: { x: number; y: number },
    skillId: string | null,
    hoveredTile?: { x: number; y: number } | null,
    obstacles?: { x: number; y: number }[],
  ): void;
}

export function createTargetingOverlayRenderer(): TargetingOverlayRenderer {
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
      if (!skillId) {
        gfx.clear();
        container.visible = false;
        lastKey = '';
        return;
      }

      const skill = SKILLS[skillId];
      if (!skill) {
        gfx.clear();
        container.visible = false;
        lastKey = '';
        return;
      }

      const weapon = useInventoryStore.getState().equipment['weapon1'];
      const weaponRange = (weapon as any)?.range || 1;
      const effectiveRange = skill.range > 0 ? skill.range : weaponRange;

      const key = `${params.panX},${params.panY},${params.tileSize},${playerPos.x},${playerPos.y},${effectiveRange},${hoveredTile?.x},${hoveredTile?.y}`;
      if (key === lastKey) return;
      lastKey = key;

      gfx.clear();
      container.visible = true;

      const { gridWidth: w, gridHeight: h } = params;

      const dimPolys: number[][] = [];
      const aoePolys: number[][] = [];

      // Pre-calculate AOE tiles
      const aoeSet = new Set<string>();
      
      const isHoveringObstacle = hoveredTile && obstacles?.some(o => o.x === hoveredTile.x && o.y === hoveredTile.y);
      
      if (skill.aoeParams && hoveredTile && !isHoveringObstacle && getDistance(playerPos, hoveredTile) <= effectiveRange) {
        let center = hoveredTile;
        let target = hoveredTile;
        
        if (skill.targeting === 'Directional') {
            center = playerPos;
        } else if (skill.targeting === 'Self') {
            center = playerPos;
            target = playerPos;
        }

        const isSolid = (x: number, y: number) => obstacles?.some(o => o.x === x && o.y === y) ?? false;
        
        const tiles = getAoETiles(
           center,
           target,
           skill.aoeParams.shape,
           skill.aoeParams.radius,
           skill.aoeParams.respectWalls ?? false,
           isSolid,
           w,
           h
        );
        for (const pt of tiles) {
           aoeSet.add(`${pt.x},${pt.y}`);
        }
      }

      for (let row = 0; row < h; row++) {
        for (let col = 0; col < w; col++) {
          const distToPlayer = getDistance(playerPos, { x: col, y: row });
          
          let dimTile = false;
          let highlightAoe = false;

          if (distToPlayer > effectiveRange) {
             dimTile = true;
          }

          if (aoeSet.has(`${col},${row}`)) {
             highlightAoe = true;
             dimTile = false;
          }

          if (!dimTile && !highlightAoe) continue;

          // Viewport culling to prevent index buffer overflows on large grids
          const center = projectTileToScreen(col, row, params);
          if (
             center.screenX < -200 || center.screenX > params.viewportWidth + 200 ||
             center.screenY < -200 || center.screenY > params.viewportHeight + 200
          ) {
             continue;
          }

          // Project the 4 corners of the tile
          const tl = projectTileToScreen(col - 0.5, row - 0.5, params);
          const tr = projectTileToScreen(col + 0.5, row - 0.5, params);
          const br = projectTileToScreen(col + 0.5, row + 0.5, params);
          const bl = projectTileToScreen(col - 0.5, row + 0.5, params);

          const poly = [
            tl.screenX, tl.screenY,
            tr.screenX, tr.screenY,
            br.screenX, br.screenY,
            bl.screenX, bl.screenY
          ];
          
          if (highlightAoe) {
             aoePolys.push(poly);
          } else {
             dimPolys.push(poly);
          }
        }
      }

      // Draw all dim tiles and fill ONCE
      if (dimPolys.length > 0) {
         dimPolys.forEach(p => gfx.poly(p));
         gfx.fill({ color: OVERLAY_COLOR, alpha: OVERLAY_ALPHA });
      }

      // Draw all AOE tiles and fill ONCE
      if (aoePolys.length > 0) {
         aoePolys.forEach(p => gfx.poly(p));
         gfx.fill({ color: 0xef4444, alpha: 0.35 });
      }
    },
  };
}
