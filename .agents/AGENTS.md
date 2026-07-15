# WebARPG Development Rules & Guidelines

This document outlines the core principles and architectural rules for the WebARPG project. As we scale this fully functional game engine to include extensive skill systems, Diablo 2 style items, classes, and AI companions, it is critical that we strictly adhere to these rules to prevent the codebase from becoming chaotic or difficult to maintain.

## 1. Simplicity & Clean Architecture First
- **Avoid God Components**: No React component should exceed 200-300 lines. Break complex UIs (like an extensive skill tree or navigation menu) into smaller, reusable sub-components.
- **Separation of Concerns**: UI components should ONLY handle rendering and user input. Business logic (e.g., calculating stat scaling, generating random loot affixes, companion AI logic) must be extracted into helper functions in `src/utils/` or encapsulated within Zustand store actions.
- **Incremental Complexity**: When building massive systems (like the Diablo 2 item system), start with the simplest structural implementation first (e.g., just base items + 1 affix) before layering on complex mechanics.

## 2. State Management (Zustand) Scalability
- **Domain-Specific Stores**: As the game grows, do not cram everything into `usePlayerStore`. We must split state logically by domain. Future domains should include:
  - `useInventoryStore` (Items, equipment slots, Diablo 2 grid inventory logic)
  - `useSkillStore` (Trade skills, gathering, crafting)
  - `useClassStore` (Skill trees, XP, class specific mechanics)
  - `useCompanionStore` (AI companion stats, behaviors, party management)
- **Store Communication**: When stores need to interact (e.g., `useCombatStore` needs to know stats from `usePlayerStore` and `useInventoryStore`), rely on pure functions or pass the derived state gracefully. Avoid circular dependencies between stores. When one store needs to read from another outside of a React render, always use `useOtherStore.getState()`. Never place store hooks inside other store definitions.
- **State Persistence**: When adding new Zustand stores, ensure they are compatible with middleware persistence (like `zustand/middleware/persist`) if they contain player progression. Differentiate between transient state (Combat Engine, current targeted enemy) and persistent state (Inventory, Skill Points).

## 3. Data-Driven Design
- **Externalize Game Data**: Never hardcode items, skills, or enemy stats directly into components or store initializations. 
- Create a `src/data/` directory to store static game definitions (e.g., `items.ts`, `enemies.ts`, `skillTrees.ts`).
- This allows for easy balancing and prevents logic files from becoming cluttered with massive arrays of data.

## 4. UI & Aesthetics (Tailwind)
- **Premium Dark Aesthetic**: Maintain the clean, dark-themed interface. 
- **Universal Base Background**: Use `bg-zinc-950` for the absolute lowest layer (e.g., the body or global container).

### Design Token System
All UI colors are defined as CSS custom properties in `src/index.css` via a Tailwind v4 `@theme` block. **Never use raw `zinc-xxx` classes for UI backgrounds, borders, or text in components.** Use tokens so the whole game can be recolored from one place.

*(Note: For the exact token names and their current color values, refer directly to `src/index.css` to ensure accuracy.)*

**Semantic colors — never replace with tokens:**
- **Health**: `bg-red-700` fill, `text-red-500` text/icons
- **Mana**: `bg-blue-700` fill, `text-blue-500` text/icons
- **Enemy UI**: `text-red-500` icons, `bg-red-950` backgrounds
- **Player UI**: `text-emerald-500` icons, `bg-emerald-950` backgrounds
- **Item Rarity**: Normal=zinc-400, Magic=blue-500, Rare=yellow-500, Epic=purple-500, Legendary=orange-500, Unique=yellow-300
- **Damage Types**: Strike=zinc-200, Pierce=stone-300, Fire=orange-500, Cold=blue-300, Lightning=purple-500
- **Grid tiles**: `border-zinc-800/40` (fine-grained, keep as-is)
- **Combat Log**: System=`text-text-secondary italic`, Player=`text-text-primary`, Enemy=`text-red-500`, Abilities=`text-accent bg-accent/10`

- **Micro-Animations**: Rely on subtle visual cues (`transition-colors`, `hover:scale-110`, `animate-pulse` on targeted units, Lucide icons) rather than massive blocks of text to convey information.
- **Icons & Asset Management**: Always use `lucide-react` for icons. Do not import external SVG files or font-awesome unless absolutely necessary. Map game data strings (like `icon: 'flame'`) to Lucide components dynamically.
- **Floating Text vs Combat Log**: Floating Combat Text should only be used for raw numbers (Damage, Healing) and critical status procs (e.g., 'Dodged'). The Combat Log is for detailed system breakdowns, loot acquisition, and narrative feedback.
- **Tailwind v4 Specifics**: This project uses Tailwind CSS v4. Do NOT attempt to configure animations or theme extensions in `tailwind.config.js`. Define all custom `@keyframes` and `@theme` extensions directly in `src/index.css`.

## 5. Game Rendering Engine (PixiJS)
- **PixiJS Architecture**: The game canvas is entirely powered by PixiJS v8. All rendering code lives in `src/renderer/`.
- **Decoupled Logic & Visuals**: The React/Zustand game engine (`useGameEngine.ts`) runs purely on logical grid coordinates and instant state changes. The PixiJS renderer is responsible for visually interpolating between these states (e.g., hopping animations) and should NEVER contain actual game mechanics or mutate game state.
- **Isometric Fake-3D Camera**: The world is drawn using a custom 2.5D perspective engine (`screenProjection.ts`). It applies a `floorTiltDeg` to squash ground tiles and calculates a dynamic `scale` and `zDepth` based on an entity's distance from the camera focus, creating a 3D parallax effect.
- **Lighting & Fog of War**: The game features dynamic tile-based lighting and a fog of war system. Light sources (like the player, glowing loot, and fire skills) dynamically tint the sprites via `renderLights.ts` and `renderFog.ts`. Do not hardcode bright colors on entities without routing them through the lighting tint functions.

## 6. Agent Workflow
- **Plan Before Massive Changes**: Whenever a massive new system is requested (e.g., "Build the Trade Skill system"), stop and write out an implementation plan first to ensure the architecture remains clean.
- **Refactor Ruthlessly**: If a file feels like it's getting too complex, take a step back and split it up before moving on to the next feature.

---
# Game Systems Architecture & Mathematical Intent
*Do not violate these core mathematical rules when generating code.*

## 7. Combat Math & Damage Calculator
- **Centralized Engine**: All damage goes through `src/engine/combat/DamageCalculator.ts`. Do not write ad-hoc damage formulas in React components or skills.
- **Constants**: `A_mult = 50`, `R_mult = 5`, `A_cap = 0.85`, `R_cap = 0.75`, `ArmorFactor = 0.5`.
- **Physical Damage**: Mitigated by Armor. Penetration cannot push Armor below zero to amplify damage.
- **Elemental Damage**: Mitigated by Resistances. Resistance *can* be driven below zero by Penetration. Negative resistance amplifies damage using an asymptote formula: `abs(R) / (abs(R) + R_mult * Level)`. There is a hardcap `MIN_RESIST_DR` of `-1.0` (max +100% amplification).
- **Damage Types**: Weapons dictate the `DamageType` (e.g., `Slashing`, `Piercing`, `Fire`) of auto-attacks.

## 8. Stat & Modifier System
- **Formula**: `Final Stat = (FlatSum) * (1 + IncreasedSum/100) * (MoreMult1) * (MoreMult2)`. Increased modifiers are additive with each other. More multipliers are strictly multiplicative with each other.
- **Penetration Separation**: Penetrations are explicitly split into two variables in `StatType` (e.g., `FirePenetrationFlat` and `FirePenetrationPercent`) because the combat formula requires them to be separated (`(Resist - FlatPen) * (1 - PercentPen)`). 
- **MoveSpeed**: Defined as Tiles Per Second. A `MoveSpeed` of `1.33` translates to ~750ms grid movement cooldown. Do not hardcode movement cooldowns; derive them from `1000 / MoveSpeed`.

## 9. Item Generation & Loot
- **Drop Weights**: Stored in `RARITY_TUNING`. The formula for rarity scarcity is explicitly tied to Item Level (`L`). 
  - *Example*: `W_common = max(0, 100 - 10*L)`. Common items vanish as the player levels up.
- **Rarity Affixes**: Normal (0), Magic (1), Rare (2-3), Legendary (4). Unique items are handcrafted.
- **Item Level (`iLvl`)**: Dictates the mathematical power/magnitude of the rolled affixes.

## 10. Enemy Spawner & AI Engine
- **Dynamic Scaling**: Enemies are generated from templates in `src/data/enemies.ts`. `EnemySpawner.ts` scales their base Health and Damage up by `+10%` for every level they spawn above their template's `minLevel`.
- **AI Profiles**: `melee_rusher` tracks the player orthogonally based on their own `MoveSpeed` stat.
- **Level Caps**: Enemies will not scale past their defined `maxLevel`.

## 11. Combat Input & Targeting
- **Controls**: `Tab` cycles through targets on the grid. `1-8` keys cast skills.
- **Auto-Attacking & Action Queue**: Input commands should be routed through `InputHandler.ts` which respects the Global Cooldown (GCD), auto-attack swing timers, and buffers actions if the player is currently busy (e.g. casting or on GCD).
