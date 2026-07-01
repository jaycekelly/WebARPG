# WebARPG Feature Breakdown & Refactoring Guide

As this project scales in complexity (moving towards a full Diablo 2 / Melvor Idle hybrid), the risk of "spaghetti code" increases exponentially. To prevent this, the architecture is broken down into **Five Core Domains**. When you want to refactor, audit, or expand the game, you should isolate your work to *one domain at a time*.

---

## 1. The Stat & Combat Engine (The Core Math)
*The mathematical foundation of the game. If this breaks, nothing else matters.*

**Scope:**
- `src/engine/stats/` (`StatCalculator.ts`, `types.ts`, `StatFormatter.ts`)
- `src/engine/combat/` (`DamageCalculator.ts`)

**Auditing & Refactoring Rules:**
- **Zero UI Knowledge:** This layer should never know about React components or DOM elements. It takes raw numbers and returns raw numbers.
- **Strict Formula Adherence:** Ensure the formula `Final = (FlatSum) * (1 + IncreasedSum) * (MoreProduct)` is strictly enforced. Never hardcode additive bonuses directly to `more` multipliers.
- **When to touch this:** You are adding a brand new game mechanic (e.g., "Ward" or "Energy Shield") that fundamentally alters how damage is taken or how stats scale.

> [!WARNING]  
> **Refactoring Danger:** Modifying mitigation formulas (Armor/Resistance curves) here will instantly impact the balance of every monster and item in the entire game.

---

## 2. The Skill & Tag System (Active Gameplay)
*How actions are performed on the grid and how tags govern those actions.*

**Scope:**
- `src/engine/skills/` (`executor.ts`, `types.ts`)
- `src/data/skills/` (The raw definitions of abilities)

**Auditing & Refactoring Rules:**
- **Tag-Driven Logic:** Ensure that every skill strictly utilizes `tags` (e.g., `Melee`, `Spell`, `Area`). The `SkillExecutor` should dynamically check these tags to apply the correct multipliers from the Stat Engine.
- **Single Responsibility:** The executor's job is to read a skill, calculate damage via the Combat Engine, and apply it to the World Store. It should not be managing user inputs or keybinds directly.
- **When to touch this:** You are adding new types of abilities (e.g., Chaining projectiles, persistent AoE ground hazards, or minion summoning).

---

## 3. The Item & Inventory System (Loot & Progression)
*The core reward loop.*

**Scope:**
- `src/store/useInventoryStore.ts`
- `src/data/items/` & `src/data/affixes/`
- `src/components/InventoryPanel.tsx` (UI representation)

**Auditing & Refactoring Rules:**
- **Separation of Data and State:** Static item definitions (what a "Rusty Sword" is) must remain in `src/data/`. The store (`useInventoryStore`) should only hold the *instantiated* items (the specific Rusty Sword the player picked up, including its randomly rolled affixes).
- **Scale Incrementally:** When building massive systems like the Diablo 2 grid inventory, build the data structure first, write unit tests for item placement (tetris logic), and *then* build the drag-and-drop UI.
- **When to touch this:** You are adding crafting, trade skills, stash tabs, or new item rarity tiers (e.g., Legendaries).

> [!TIP]  
> **Refactoring Strategy:** Always ensure `useInventoryStore` only exports derived state (like total stats from equipment) to `useStatsStore`. Avoid circular dependencies where the inventory relies on the stat calculator to function.

---

## 4. The Enemy & AI System (Entities)
*The things you fight.*

**Scope:**
- `src/engine/enemies/` (`EnemySpawner.ts`, `types.ts`)
- `src/store/useWorldStore.ts` (Where enemy state lives)

**Auditing & Refactoring Rules:**
- **Architectural Parity:** Enemies must consume the same exact stats (`StrikeResist`, `Block`, `MoveSpeed`) and use the same `DamageCalculator` as the player. Do not write separate combat math for enemies.
- **AI Profiles:** Keep AI logic modular. A `ranged_kiter` profile should be a self-contained function that evaluates the grid and returns a move/attack command.
- **When to touch this:** You are adding boss phases, new pathfinding algorithms, or new enemy scaling mechanics (e.g., Elite affixes like "Vampiric" or "Teleporter").

---

## 5. The User Interface & State Management (Presentation)
*What the player sees and interacts with.*

**Scope:**
- `src/components/` (React Components)
- `src/store/` (Zustand Stores)

**Auditing & Refactoring Rules:**
- **Avoid God Components:** Break down large overlays (like the Character Sheet or Skill Tree) into smaller sub-components. No component should exceed 300 lines.
- **Premium Aesthetics:** Maintain the dark theme (`bg-zinc-950`, `border-zinc-800`). Use subtle CSS transitions rather than jarring text popups.
- **Dumb Components:** Components should strictly read from Zustand stores and fire actions. They should not contain complex RPG math logic.
- **When to touch this:** You want to add a new menu, improve combat animations, or refactor a messy UI layout.

> [!IMPORTANT]  
> **The Golden Rule:** If you find yourself writing complex mathematical formulas inside a React `.tsx` file, **STOP**. That logic belongs in a helper utility in `src/engine/` or inside a Zustand store action.
