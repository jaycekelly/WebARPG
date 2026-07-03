# 3D Billboard Grid — Handoff

## What We Did

Replaced blurry 3D-composited icons with crisp flat 2D rendering via anchor-based screen positioning.

## Architecture

```
viewport (perspective: 1400px, origin: 50% 10%)
├── pan-wrapper (translate(camX, camY), preserve-3d)
│   └── floor-plane (rotateX(50deg), preserve-3d)
│       ├── tile cells (CSS grid)
│       └── 1px anchor divs per entity at grid position
└── flat overlay (absolute, inset 0, z-index 10, pointer-events: none)
    └── flat entity components (positioned via anchor screen coords)
```

## How It Works

1. **Anchors**: Invisible 1px divs rendered inside the 3D floor-plane at each entity's grid position (player, enemies, obstacles, loot, floating text). They use inline `getState()` calls — not components — because they need to re-render on every position change (not just ID changes).

2. **Position reading**: `useLayoutEffect` reads all `[data-entity-anchor]` elements via `getBoundingClientRect()`, computes screen-relative center + perspective scale (`s = 1400 / (1400 - z)`), stores in `flatPositions` state. Only re-runs when camera, zoom, grid, or entity positions change (via `posFingerprint` memo).

3. **Flat overlay rendering**: Memo'd components (`FlatPlayer`, `FlatEnemy`, `FlatEnemyLayer`, `FlatObstacleLayer`, `FlatLootLayer`, `FlatFloatingTextLayer`) render at `position: absolute; left/top: pos.x/pos.y; transform: translate(-50%, -100%)`. Icons scale by `iconSize * pos.s` for perspective row scaling + zoom scaling.

4. **Icons**: Rabbit (player), Bird (enemies), Trees/Mountain (obstacles), LootPile (loot). All Lucide, rendered at native resolution (no `SCALE_AA` or `filter: blur(0)` needed in flat context).

5. **Shadows**: Uniform across all entities — `width = iconSize * 1.0`, `height = width * 0.65`, positioned at `bottom: -h*0.35`. Opacity 0.3. Scale with icon size.

## Key Constants

```
BASE_ICON_SIZE = 32
REF_TILE_SIZE  = 72 * 0.55 ≈ 40
iconSize = BASE_ICON_SIZE * (TILE_SIZE / REF_TILE_SIZE)  // zoom scaling
is = iconSize * pos.s  // perspective row scaling
SHADOW_WIDTH_RATIO = 1.0
```

## Performance Notes

- Flat entity components are memo'd with `useShallow` + primitive ID selectors — only re-render on actual data changes
- `useLayoutEffect` uses `posFingerprint` (string of concatenated entity positions) to skip runs when only health/stats change
- Anchor rendering uses inline `getState()` calls (cheap, small arrays)
- No `useLayoutEffect` infinite loops — positions rounded to 0.1px, stable comparison

## File

`src/components/Grid.tsx` (~590 lines)

## Remaining Tasks

- Grid lines blur fix (thicker borders / box-shadow / SVG overlay)
- Camera zoom toward cursor + smooth auto-follow lerp
- Remove dead code: `ICON_BILLBOARD`, `FLOOR_COUNTER_TILT` (only used by disabled `TILE_DECOR`)
- Profile performance: check if inline `getState()` calls in anchor section cause excessive re-renders
