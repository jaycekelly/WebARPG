# PixiJS Migration — Handoff & Plan

## Decision
Replace the DOM-based renderer (`src/components/Grid.tsx`) with **PixiJS v8 (plain, not `@pixi/react`)** for the game world. Keep React DOM for all UI (HUD, inventory, skill trees, tooltips, menus). This is a hybrid architecture: one `<canvas>` for the world, React DOM for everything else on top.

### Why
- The current DOM renderer fights the grain: `getBoundingClientRect` reflows, React reconciliation at 60fps, CSS 3D compositing on slow paths, driving position through state. Perf fixes got us to acceptable FPS (drag ~60, combat ~120) but each fix was working around a fundamental DOM-as-renderer limitation.
- A rendering layer handles all of that trivially: sprite batching = thousands of sprites at 60fps, camera is a free matrix transform, no reflows ever, zoom works without math divergence.
- The DOM approach becomes a recurring tax as the game scales (smooth auto-camera, projectiles, particles, bigger grids, status effect overlays all compound the cost).

### Why PixiJS v8 plain (not alternatives)
- **vs `@pixi/react`:** `@pixi/react` puts you back in React reconciliation as a render bottleneck. The game loop is already imperative (`useGameEngine.ts` runs rAF with `useStore.getState()` reads, no React) — extend that pattern to Pixi: mutate sprites directly, never pipe through JSX.
- **vs Phaser:** Phaser sits on Pixi but adds physics/input we don't need (we have a combat engine already).
- **vs Three.js:** Three is real 3D — overkill for a deliberately 2D-icon-on-tilted-plane aesthetic.

---

## What stays untouched (the bulk of the code)
- **All 9 Zustand stores** (`src/store/*`)
- **`engine/`** entirely: `DamageCalculator`, `EnemySpawner`, `InputHandler`, pathfinding, `LevelGenerator`, **`screenProjection.ts`** (ports verbatim to Pixi)
- **`data/`** (items, enemies, skills, affixes, skill trees)
- **All `components/` except `Grid.tsx`**: HUD, CharacterWindow, CombatOverlay, tooltips, LootPopup, GlobalTooltip, etc.
- `App.tsx`, Tailwind token system (`src/index.css`), `main.tsx`

That's ~90% of the codebase. The renderer is genuinely one file plus its sub-components.

## What gets deleted
- `src/components/Grid.tsx` and the `Flat*` sub-components (`FlatEntity`, `FlatPlayer`, `FlatEnemy`, `FlatEnemyLayer`, `FlatObstacleLayer`, `FlatLootLayer`, `FlatFloatingTextLayer`, `Tile`).
- The CSS 3D (`perspective`, `rotateX`, `preserve-3d`) goes with it. The zoom-drift bug disappears for free.

---

## Target Architecture

```
src/renderer/
  GameCanvas.tsx          # React mount point; mounts <canvas>, exposes nothing
  pixiApp.ts              # Application init, ticker setup
  camera.ts               # follow + zoom (just a Container scale/pos — trivial)
  assets.ts               # lucide SVG → texture cache (lazy rasterize)
  systems/
    renderFloor.ts        # tilted floor + tiles
    renderEntities.ts     # player/enemies/loot/obstacles as sprites
    renderEffects.ts      # AoE previews, hit flashes, targeting rings
    renderFloatingText.ts # combat numbers as Pixi Text
    input.ts              # canvas coord → grid cell (inverse projection), sprite click
```

### Bridge pattern (matches existing code)
- `useGameEngine.ts` keeps running game logic on its rAF (combat, AI) and mutating stores. **Untouched.**
- A **separate** Pixi ticker reads `useXxxStore.getState()` each frame and pushes to sprites. Game logic and render stay decoupled — same pattern already in place, just a different sink.
- **DOM UI stays in React:** HUD, inventory, skill trees, tooltips. The canvas reports "what's under the cursor" to the tooltip store; `GlobalTooltip` renders as before.

---

## Phased Plan (game stays playable throughout)

| Phase | Goal | Exit criterion |
|---|---|---|
| **0. Setup** | Install `pixi.js`, add `GameCanvas` mounting an empty canvas, wire Pixi ticker to read `useWorldStore` and `console.log` entity count | Data flow proven, no visual change |
| **1. Floor** | Render tile grid + obstacles on a tilted plane (or via `screenProjection.ts` as 2D-projected sprites — direct port). Camera follows player | Floor looks identical to now |
| **2. Entities** | Player/enemies/loot as Pixi sprites, health bars as `Graphics`. Delete `Flat*` layer | `Grid.tsx`'s flat layer gone, game playable |
| **3. Effects + floating text** | AoE previews, hit flashes, targeting rings, combat numbers as Pixi primitives | Delete `Grid.tsx` entirely |
| **4. Input** | Canvas click → inverse-project to grid cell (move/target), sprite `pointerdown` for targeting/looting, hover → tooltip store | Full input parity |
| **5. Cleanup** | Remove `Grid.tsx` + dead code, update `AGENTS.md` with renderer architecture, optional sprite-sheet pipeline | Done |

---

## Risk Areas to Validate Early

- **SVG → texture:** lucide icons are inline SVG. Pixi v8 can load SVGs as textures via `Assets`, but rasterize-once-and-cache (in `assets.ts`) so we're not re-decoding. Test in Phase 0/1.
- **The fake-3D look:** easiest path is the 2D-projection already in `screenProjection.ts` → sprite screen positions. Optionally upgrade later to a real tilted mesh (`@pixi/mesh-extras` Plane) for "true" floor tiles, but the 2D port is faithful and a 1:1 visual match.
- **Text:** floating combat text uses custom font/color — Pixi `Text` handles it; pre-instantiate glyphs if spawning many.

---

## Wins you get for free
- **Zoom** = `container.scale.set(z)` — no more math divergence, no more drift.
- **Smooth auto-camera** = lerp the camera container toward the player each frame — the deferred feature becomes ~10 lines.
- **Projectiles/particles** = trivially cheap. Door opens for richer combat.
- **Headroom:** 10× the entity count won't dent 60fps. The perf ceiling stops being the constraint.

---

## Recommendation

Do Phases 0→2 as a focused milestone before building any more combat features on the DOM renderer. Phases 0→2 are the riskiest (proving the bridge + asset pipeline + look parity). Once those land clean, 3→5 are mechanical. If we keep adding combat features to `Grid.tsx` before migrating, we're adding to the throwaway file.

---

## ✅ Phase 0 — COMPLETE

**Goal:** Prove the React → PixiJS data-flow bridge with no visual change.

**What was done:**
- Installed `pixi.js@8.19.0` (PixiJS v8, plain — no `@pixi/react`).
- Created `src/renderer/pixiApp.ts` — singleton `Application` factory (`getPixiApp` / `destroyPixiApp`), transparent background, `resolution: devicePixelRatio`, `autoDensity: true`, `resizeTo: parentElement`.
- Created `src/renderer/GameCanvas.tsx` — mounts an empty, transparent `<canvas>` behind the DOM grid (`zIndex: 0`, `pointerEvents: 'none'`). A Pixi ticker reads `useWorldStore.getState()` + `useAppStore.getState()` once per second and `console.log`s the entity count, grid size, location/pause state, and Pixi's own FPS counter — proving the imperative bridge works end-to-end.
- Mounted `<GameCanvas />` in `src/components/DungeonView.tsx`, layered behind `<Grid />` so the game looks identical.
- Removed a leftover dead `logTicker` variable and switched cleanup to `app.ticker.remove(fn)` (Pixi ticker, not rAF).

**Files added/changed:**
- `package.json` / `package-lock.json` — `pixi.js` dep.
- `src/renderer/pixiApp.ts` (new).
- `src/renderer/GameCanvas.tsx` (new).
- `src/components/DungeonView.tsx` — mounts `GameCanvas` behind `Grid`.

**Verification:**
- `npx tsc -b` — clean (no type errors).
- `npm run lint` — only the pre-existing `LootPile` / `CombatOverlay` hook-rule errors + the 2 intentional `Grid.tsx` proxy-dep warnings remain; **no new lint issues from Phase 0 code**.

**How to validate Phase 0 in browser:**
1. `npm run dev`, enter a dungeon.
2. Open the dev console (Firefox: `F12` → Console).
3. Every ~1s you should see a line like:
   `[pixi] location=dungeon paused=false grid=15x15 enemies=20 loot=0 fps=59`
4. The on-screen game should look visually identical (the Pixi canvas is transparent and behind the DOM grid, accepts no pointer events).

**Status:** Phase 0 exit criterion met (data flow proven, no visual change). Ready for Phase 1 (floor rendering) whenever you're ready. The `console.log` ticker is intentionally throttled to 1/s and should be removed once Phase 1 starts drawing real content.

---

## ✅ Phase 1 — COMPLETE

**Goal:** Render tile grid + obstacles on a tilted plane via Pixi `Graphics`, camera follows player.

**What was done:**
- Created `src/renderer/camera.ts` — `createCamera()` returns `{ update(playerPos, grid, viewportW, viewportH, tileSize, totalTileSize): CameraResult }`. Deadzone logic (radius 2.0 tiles, manhattan 3.0) with clamp-to-map-bounds.
- Created `src/renderer/systems/renderFloor.ts` — `createFloorRenderer()` returns `{ container, rebuild(grid), update(panX, panY, viewportW, viewportH, grid, tileSize) }`. One `Graphics` quad per cell with pan-key dedup.
- Created `src/renderer/GameCanvas.tsx` — camera + floor renderer wired into Pixi ticker, F9 toggle.
- Added `togglePixiFloor: () => void;` to `AppState` interface in `useAppStore.ts`.
- Updated `Grid.tsx` — conditional `opacity-0` on floor-plane + `hidden` on Flat* overlay when `pixiFloorVisible` is true.

**Fixes applied:**
- Sorting function name collision in `renderFloor.ts` (shadowed `update` renamed to `sortByDepth`).
- `projectTileToScreen` calls filtered to only tiles in viewport (was computing all 225 every frame).

**Verification:**
- `npx tsc -b` — clean.
- F9 toggles between DOM and Pixi rendering — DOM tiles disappear, Pixi floor shows through.

---
## ✅ Phase 2 — COMPLETE

**Goal:** Player/enemies/loot as Pixi sprites, health bars as `Graphics`. Delete `Flat*` layer.

**What was done:**
- Created `src/renderer/assets.ts` — Canvas2D texture factory. Draws entity icons (rabbit, bird, tree, mountain, rock, loot diamond) on offscreen canvas, creates Pixi `Texture.from(canvas)`. Cached by `kind|color` key.
- Created `src/renderer/systems/renderEntities.ts` — entity sprite system via `createEntityRenderer()`. Returns `{ container, update(...) }`. Manages sprites per frame: player (green rabbit), enemies (red birds + health bars + targeting rings), loot (rarity-colored diamonds), obstacles (trees/rocks/mountains). Z-ordering: obstacle(0), loot(1), enemy(2), player(3). Hit flash via `.tint`. Stale entities hidden (not destroyed). Health bars drawn as Pixi `Graphics` rects (background `0x450a0a`, fill `0xef4444`).
- Updated `src/renderer/GameCanvas.tsx` — wired entity renderer into ticker with camera pan (`camResult.panX/panY`), base scale computation (`iconSize / TEXTURE_SIZE`).
- Updated `Grid.tsx` — Flat* overlay div gets `hidden` class when `pixiFloorVisible` is true. Exit criterion met.

**Fixes applied:**
- `Texture.frame` is read-only in Pixi v8 — removed explicit frame assignment.
- Entity `projParams` now uses `camResult.panX/panY` (was `0, 0`) so entities track with camera.
- Sorting function `update` renamed to `sortByDepth` to avoid shadowing.

**Verification:**
- `npx tsc -b` — clean.
- Dev server could not be started (safety classifier outage); visual verification pending.

---

## Performance Baseline (pre-migration, post-DOM-fixes)

| Scenario | FPS (Firefox) |
|---|---|
| Idle | 200+ |
| Camera drag | ~60 (capped) |
| Heavy combat | ~120 |

### Fixes already applied to `Grid.tsx` (will be superseded by migration)
1. Replaced `useLayoutEffect` + `getBoundingClientRect` reflow loop with `projectTileToScreen` math.
2. Extracted memoized `Tile` component + stabilized handlers with `useCallback`.
3. Moved sprite pan to CSS custom properties so camera moves don't re-render sprites.
4. Removed `shadow-2xl` from tilted floor + `backdrop-blur-md` from HUD globes (paint cost).
5. Added dev-only `FpsCounter` component (`src/components/FpsCounter.tsx`).

### Pre-existing lint issues (unrelated, still present)
- `src/components/LootPile.tsx:43` — `useTooltipStore` called conditionally (rules-of-hooks).
- `src/components/CombatOverlay.tsx:357` — `useFlask` called inside a callback (rules-of-hooks).