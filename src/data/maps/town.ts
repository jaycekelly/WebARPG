import type { Obstacle, GridMap } from '../../store/useWorldStore';

const TOWN_B3_LAYOUT = [
  "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  "▓▓▓▓░▓░▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  "▓▓░....░▓▓▓▓▓▓▓▓▓▓▓░░░C░▓▓▓▓",
  "▓▓W.▓▓.░░▓▓▓▓▓▓▓▓▓▓▓░...░▓▓▓",
  "▓▓░.▓▓.....▓▓▓▓▓▓▓▓░....░▓▓▓",
  "▓▓░.........░▓▓▓▓▓▓░..▓▓▓▓▓▓",
  "▓▓▓▓▓▓░▓▓▓...▓▓▓▓▓▓...▓▓▓▓▓▓",
  "▓▓▓▓▓▓░░▓............░▓▓▓▓▓▓",
  "▓▓░░░░░░M.PPP.........░░▓▓▓▓",
  "..........PPD.░░▓▓░.......D▓",
  "..........PPP.H░▓▓▓░......D▓",
  "▓▓░░░░░░░.....░░▓▓▓▓..░░▓▓▓▓",
  "▓▓▓▓▓▓░░▓▓..S░░▓▓▓▓▓..▓▓▓▓▓▓",
  "▓▓▓▓▓▓░░░...▓▓▓▓▓▓▓▓...░▓▓▓▓",
  "▓▓▓▓▓▓▓▓░...▓▓▓▓▓▓▓▓....▓▓▓▓",
  "▓▓▓▓▓▓▓▓░░G░▓▓▓▓▓▓▓▓░B░░▓▓▓▓",
  "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
  "▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓",
];

export function buildTownGrid(): { grid: GridMap, spawnPoint: { x: number, y: number } } {
  const height = TOWN_B3_LAYOUT.length;
  const width = TOWN_B3_LAYOUT[0].length;
  const obstacles: Obstacle[] = [];
  const dirtTiles: string[] = [];
  let spawnPoint = { x: Math.floor(width / 2), y: Math.floor(height / 2) };

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = TOWN_B3_LAYOUT[y][x];
      
      switch (char) {
        case '▓':
          obstacles.push({ x, y, type: 'wall' });
          break;
        case 'D':
          obstacles.push({ x, y, type: 'dungeon_entrance' });
          break;
        case 'H':
        case 'W':
        case 'S':
        case 'M':
        case 'G':
        case 'C':
        case 'B':
          obstacles.push({ x, y, type: 'npc_guide' });
          break;
        case 'P':
          if (TOWN_B3_LAYOUT[y][x-1] !== 'P' && (y === 0 || TOWN_B3_LAYOUT[y-1]?.[x] !== 'P')) {
            spawnPoint = { x: x + 1, y: y + 1 };
          }
          break;
        case '.':
          dirtTiles.push(`${x},${y}`);
          break;
      }
    }
  }

  obstacles.push({ x: spawnPoint.x + 3, y: spawnPoint.y, type: 'campfire' });

  return {
    grid: { width, height, obstacles, environment: 'town', dirtTiles },
    spawnPoint
  };
}
