# WebARPG: Tactical Pause Handoff

Welcome to the WebARPG project! The user wants to implement a **Tactical Pause** feature modeled after RTWP (Real-Time with Pause) CRPGs like Baldur's Gate 2. Pressing `Spacebar` pauses the game loop, allowing the player to freely queue up actions before unpausing.

Here is the essential context and architecture you need to know to implement this successfully:

## 1. Core Architecture
- **Tech Stack**: React, Zustand (for state), Tailwind CSS (for UI), and a custom real-time Grid combat engine.
- **Engine Loop**: The game runs on a real-time tick system located in `src/engine/useGameEngine.ts`. This file handles enemy AI pathfinding, auto-attacks, and buff/debuff timers using `requestAnimationFrame`.
- **Input Pipeline**: All player movement and skill inputs are routed through `src/engine/input/InputHandler.ts` (specifically `InputHandler.requestAction`). 

## 2. Relevant State Stores
- **`useCombatStore.ts`**: Holds the combat state. It currently has a `queuedAction: QueuedAction | null` field for input buffering (when the player is on GCD or casting). 
- **`useAppStore.ts`**: Global app state. This is likely the best place to add an `isPaused: boolean` flag.

## 3. Implementation Requirements

To build the Tactical Pause feature, you will need to touch the following systems:

1. **Pause State (`useAppStore.ts`)**: 
   - Add an `isPaused` boolean. 
   - Ensure the global `Spacebar` keydown event listener toggles this state. (Look in `App.tsx` or `Grid.tsx` for existing keydown listeners).

2. **Engine Freeze (`useGameEngine.ts`)**:
   - The engine loop must explicitly check `useAppStore.getState().isPaused`.
   - If paused, the loop should immediately `return` without updating the `lastFrameTime`, processing enemy AI, or ticking down GCDs/Cooldowns.

3. **Input Handling (`InputHandler.ts`)**:
   - The pause is primarily to give the player breathing room to aim AoE skills, swap weapons, or use potions without panic.
   - If the player is paused and issues a **valid skill cast** (i.e. they click to shoot a fireball or swing a sword, and they have the mana/cooldown to do so), the game should **automatically unpause** and execute the skill immediately. 
   - Other actions (like moving items in the inventory or using a potion) should *not* automatically unpause the game. Spacebar remains the manual toggle for time.

4. **Visual Indicator (`Grid.tsx` or `CombatOverlay.tsx`)**:
   - The player needs a clear visual indicator that they are in Tactical Mode, but **do not** use a literal "game paused" screen that blocks interaction. The UI must remain fully interactive.
   - We use a premium dark UI aesthetic. A subtle, stylish screen effect is highly recommended, such as a thin glowing border around the screen (`ring-4 ring-sky-500/30`), a slight desaturation/sepia overlay, or a stylish "Tactical Mode" badge.


