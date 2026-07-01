# WebARPG Development Rules & Guidelines

This document outlines the core principles and architectural rules for the WebARPG project. As we expand this prototype to include extensive skill systems, Diablo 2 style items, classes, and AI companions, it is critical that we strictly adhere to these rules to prevent the codebase from becoming chaotic or difficult to maintain.

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
- **Store Communication**: When stores need to interact (e.g., `useCombatStore` needs to know stats from `usePlayerStore` and `useInventoryStore`), rely on pure functions or pass the derived state gracefully. Avoid circular dependencies between stores.

## 3. Data-Driven Design
- **Externalize Game Data**: Never hardcode items, skills, or enemy stats directly into components or store initializations. 
- Create a `src/data/` directory to store static game definitions (e.g., `items.ts`, `enemies.ts`, `skillTrees.ts`).
- This allows for easy balancing and prevents logic files from becoming cluttered with massive arrays of data.

## 4. UI & Aesthetics (Tailwind)
- **Premium Dark Aesthetic**: Maintain the clean, dark-themed, "Melvor Idle" inspired interface. 
- **Universal Base Background**: Use `bg-zinc-950` for the absolute lowest layer (e.g., the body or global container).
- **Strict UI Palette**:
  - **Background Color**: `bg-zinc-900` (Use `bg-zinc-900/50` or `bg-zinc-900/90` with `backdrop-blur-md` for floating elements)
  - **Border Color**: `border-zinc-800`
  - **Major Text**: `text-zinc-100`
  - **Minor Text**: `text-zinc-400`
  - **Highlight Color**: `sky-400` (e.g., `text-sky-400`, `border-sky-400` for active states, important callouts)
  - **Health Displays**: `red-600` for fills (`bg-red-600`), `red-500` for text/icons
  - **Mana Displays**: `blue-600` for fills (`bg-blue-600`), `blue-500` for text/icons
  - **Enemy Display Icons**: `text-red-500`
  - **Enemy Display Backgrounds**: `bg-red-950`
  - **Player Display Icon**: `text-emerald-500`
  - **Player Display Background**: `bg-emerald-950`
- **Grid Layouts**: Combat grid tiles use `border-zinc-800/40`.
- **Combat Log Formatting**:
  - *System*: `text-zinc-400 italic`
  - *Player Attack*: `text-zinc-100`
  - *Enemy Attack*: `text-red-500`
  - *Abilities*: `text-sky-400 font-semibold bg-sky-400/10`
- **Micro-Animations**: Rely on subtle visual cues (`transition-colors`, `hover:scale-110`, `animate-pulse` on targeted units, Lucide icons) rather than massive blocks of text to convey information.

## 5. Agent Workflow
- **Plan Before Massive Changes**: Whenever a massive new system is requested (e.g., "Build the Trade Skill system"), stop and write out an implementation plan first to ensure the architecture remains clean.
- **Refactor Ruthlessly**: If a file feels like it's getting too complex, take a step back and split it up before moving on to the next feature.

---
# Game Systems Architecture & Mathematical Intent
*Do not violate these core mathematical rules when generating code.*

## 6. Combat Math & Damage Calculator
- **Centralized Engine**: All damage goes through `src/engine/combat/DamageCalculator.ts`. Do not write ad-hoc damage formulas in React components or skills.
- **Constants**: `A_mult = 50`, `R_mult = 5`, `A_cap = 0.85`, `R_cap = 0.75`, `ArmorFactor = 0.5`.
- **Physical Damage**: Mitigated by Armor. Penetration cannot push Armor below zero to amplify damage.
- **Elemental Damage**: Mitigated by Resistances. Resistance *can* be driven below zero by Penetration. Negative resistance amplifies damage using an asymptote formula: `abs(R) / (abs(R) + R_mult * Level)`. There is a hardcap `MIN_RESIST_DR` of `-1.0` (max +100% amplification).
- **Damage Types**: Weapons dictate the `DamageType` (e.g., `Slashing`, `Piercing`, `Fire`) of auto-attacks.

## 7. Stat & Modifier System
- **Formula**: `Final Stat = (FlatSum) * (1 + IncreasedSum/100) * (MoreMult)`.
- **Penetration Separation**: Penetrations are explicitly split into two variables in `StatType` (e.g., `FirePenetrationFlat` and `FirePenetrationPercent`) because the combat formula requires them to be separated (`(Resist - FlatPen) * (1 - PercentPen)`). 
- **MoveSpeed**: Defined as Tiles Per Second. A `MoveSpeed` of `1.33` translates to ~750ms grid movement cooldown. Do not hardcode movement cooldowns; derive them from `1000 / MoveSpeed`.

## 8. Item Generation & Loot
- **Drop Weights**: Stored in `RARITY_TUNING`. The formula for rarity scarcity is explicitly tied to Item Level (`L`). 
  - *Example*: `W_common = max(0, 100 - 10*L)`. Common items vanish as the player levels up.
- **Rarity Affixes**: Normal (0), Magic (1), Rare (2-3), Legendary (4). Unique items are handcrafted.
- **Item Level (`iLvl`)**: Dictates the mathematical power/magnitude of the rolled affixes.

## 9. Enemy Spawner & AI Engine
- **Dynamic Scaling**: Enemies are generated from templates in `src/data/enemies.ts`. `EnemySpawner.ts` scales their base Health and Damage up by `+10%` for every level they spawn above their template's `minLevel`.
- **AI Profiles**: `melee_rusher` tracks the player orthogonally based on their own `MoveSpeed` stat.
- **Level Caps**: Enemies will not scale past their defined `maxLevel`.

## 10. Combat Input & Targeting
- **Controls**: `Tab` cycles through targets on the grid. `1-8` keys cast skills.
- **Auto-Attacking**: Automatically triggers when a target is in range and standing still. Uses the equipped weapon's stats and damage type.
