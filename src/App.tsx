import { useEffect, useState } from 'react';
import { setRunState, setPreventSaves } from './store/storage';
import { CharacterWindow } from './components/CharacterWindow';
import { useGameEngine } from './engine/useGameEngine';
import { useAppStore } from './store/useAppStore';
import { useCombatStore } from './store/useCombatStore';
import { usePlayerStore } from './store/usePlayerStore';
import { useInventoryStore } from './store/useInventoryStore';
import { useWorldStore } from './store/useWorldStore';
import { useStatsStore } from './store/useStatsStore';
import { useMetaStore } from './store/useMetaStore';

import { TownView } from './components/TownView';
import { DungeonView } from './components/DungeonView';
import { DataEditorView } from './components/DataEditorView';
import { GlobalTooltip } from './components/GlobalTooltip';
import { GlobalMessages } from './components/GlobalMessages';
import { EscapeMenu } from './components/EscapeMenu';
import { useUIScale } from './hooks/useUIScale';
import { LevelGenerator } from './engine/world/LevelGenerator';
import { useVisionStore } from './store/useVisionStore';
import { FPSDisplay } from './components/FPSDisplay';
import { PERF_DEBUG_ENABLED } from './utils/perfDebug';

const GameOverScreen = () => {
  const currentHealth = usePlayerStore(state => state.currentHealth);

  useEffect(() => {
    if (currentHealth > 0) return;
    const handleInput = () => {
       setPreventSaves(true);
       setRunState('town');
       sessionStorage.setItem('webarpg-skip-menu-once', 'true');
       window.location.reload();
    };
    window.addEventListener('keydown', handleInput);
    window.addEventListener('click', handleInput);
    return () => {
        window.removeEventListener('keydown', handleInput);
        window.removeEventListener('click', handleInput);
    };
  }, [currentHealth]);

  if (currentHealth > 0) return null;
  return (
    <div className="absolute inset-0 z-[9999] bg-black flex flex-col items-center justify-center animate-in fade-in duration-1000">
       <div className="text-red-600 text-6xl font-black uppercase tracking-widest mb-4 drop-shadow-glow-red-strong">You Died</div>
       <div className="text-text-secondary text-sm font-bold uppercase tracking-widest animate-pulse">Press any key to load last save</div>
    </div>
  );
};

function App() {
  useGameEngine(); // Mount the 60fps game engine loop
  useUIScale(); // Mount the responsive UI scaler
  const { location, setLocation } = useAppStore();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const checkHydration = () => {
      if (useAppStore.persist.hasHydrated() && usePlayerStore.persist.hasHydrated()) {
        setHydrated(true);
        // Sync loaded level back to meta store for character select screen
        const metaState = useMetaStore.getState();
        const playerState = usePlayerStore.getState();
        if (metaState.activeCharacterId) {
          metaState.updateCharacter(metaState.activeCharacterId, { level: playerState.level });
        }
      }
    };
    const unsubApp = useAppStore.persist.onFinishHydration(checkHydration);
    const unsubPlayer = usePlayerStore.persist.onFinishHydration(checkHydration);
    checkHydration();
    return () => {
      unsubApp();
      unsubPlayer();
    };
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        useAppStore.getState().updateLastActiveTime();
      } else {
        useAppStore.getState().resumeFromBackground();
      }
    };
    
    const handleUnload = () => {
      useAppStore.getState().updateLastActiveTime();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('beforeunload', handleUnload);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  useEffect(() => {
    if (hydrated && location === 'town') {
       LevelGenerator.initializeTown();
       // Heal upon entering town
       const maxHp = useStatsStore.getState().getStat('Health');
       const maxMana = useStatsStore.getState().getStat('Energy');
       usePlayerStore.getState().heal(maxHp);
       usePlayerStore.getState().restoreEnergy(maxMana);

       // Close all menus when entering or loading in town
       const appState = useAppStore.getState();
       appState.setVendorOpen(false);
       appState.setCharacterWindowOpen(false);
       appState.setStatsPopoutOpen(false);
       appState.setDungeonSelectOpen(false);
       appState.setEscapeMenuOpen(false);
       if ('setSkillTreeOpen' in appState) (appState as any).setSkillTreeOpen(false);
    }
  }, [location, hydrated]);

  // Initial vision update in case we loaded from a persisted save where vision (non-persisted) is empty
  useEffect(() => {
    const { position } = usePlayerStore.getState();
    useVisionStore.getState().updateVision(position);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Toggle Editor with Ctrl+E
      if (e.ctrlKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setLocation(useAppStore.getState().location === 'editor' ? 'town' : 'editor');
        return;
      }

      // Tactical Pause
      if (e.code === 'Space') {
        const appState = useAppStore.getState();
        e.preventDefault(); // Prevent scrolling
        appState.togglePause();
        return;
      }

      // Hotkeys for UI Windows
      if (e.key.toLowerCase() === 'i') {
        const appState = useAppStore.getState();
        if (appState.characterWindowOpen && appState.characterWindowTab === 'inventory') {
          appState.setCharacterWindowOpen(false);
        } else {
          appState.setCharacterWindowTab('inventory');
          appState.setCharacterWindowOpen(true);
        }
      }

      if (e.key.toLowerCase() === 'f') {
        const appState = useAppStore.getState();
        if (appState.location === 'town') {
           const { grid } = useWorldStore.getState();
           const { position } = usePlayerStore.getState();
           const entrance = grid.obstacles.find(o => o.type === 'dungeon_entrance');
           if (entrance) {
              const dist = Math.max(Math.abs(position.x - entrance.x), Math.abs(position.y - entrance.y));
              if (dist <= 1) {
                 appState.setDungeonSelectOpen(!appState.dungeonSelectOpen);
              }
           }
           
           const npc = grid.obstacles.find(o => o.type === 'npc_guide');
           if (npc) {
              const dist = Math.max(Math.abs(position.x - npc.x), Math.abs(position.y - npc.y));
              if (dist <= 1) {
                  useCombatStore.getState().addFloatingText(
                      npc.x, npc.y,
                      "I'm gay",
                      { colorClass: 'text-zinc-100 text-sm italic' }
                  );
              }
           }
        }
      }

      if (e.key.toLowerCase() === 'x') {
        // Allow weapon swap even while panels are open
        useInventoryStore.getState().swapWeaponSet();
        useCombatStore.getState().addFloatingText(
          usePlayerStore.getState().position.x,
          usePlayerStore.getState().position.y,
          'Weapon Swapped',
          { colorClass: 'text-zinc-400 text-sm' }
        );
      }


      if (e.key.toLowerCase() === 'k') {
        const appState = useAppStore.getState();
        if (appState.characterWindowOpen && appState.characterWindowTab === 'active_skills') {
          appState.setCharacterWindowOpen(false);
        } else {
          appState.setCharacterWindowTab('active_skills');
          appState.setCharacterWindowOpen(true);
        }
      }

      if (e.key.toLowerCase() === 'p') {
        const appState = useAppStore.getState();
        if (appState.characterWindowOpen && appState.characterWindowTab === 'skills') {
          appState.setCharacterWindowOpen(false);
        } else {
          appState.setCharacterWindowTab('skills');
          appState.setCharacterWindowOpen(true);
        }
      }

      if (e.key.toLowerCase() === 'm') {
        const appState = useAppStore.getState();
        if (appState.location === 'dungeon' || appState.location === 'town') {
          appState.setMapOverlayOpen(!appState.mapOverlayOpen);
        }
        return;
      }

      if (e.key === 'Escape') {
        const appState = useAppStore.getState();
        const combatState = useCombatStore.getState();
        const playerState = usePlayerStore.getState();

        // 1. Cancel Casting (combat safety — highest priority)
        if (combatState.castingSkillId) {
          combatState.refundSkillCooldown(combatState.castingSkillId);
          combatState.setCasting(null);
          combatState.addLog("Spell cast cancelled.", 'system');
          return;
        }

        // 2. Cancel Aiming Mode
        if (combatState.targetingSkillId) {
          combatState.setTargetingSkill(null);
          return;
        }

        // 3. Close Modal Windows
        if (appState.mapOverlayOpen) {
          appState.setMapOverlayOpen(false);
          return;
        }
        if (appState.vendorOpen) {
          appState.setVendorOpen(false);
          return;
        }
        if (appState.dungeonSelectOpen) {
          appState.setDungeonSelectOpen(false);
          return;
        }
        if (appState.characterWindowOpen) {
          appState.setCharacterWindowOpen(false);
          return;
        }

        // 4. Clear Target
        if (playerState.activeTargetId) {
          playerState.setTarget(null, true);
          return;
        }

        // 5. Toggle Escape Menu
        if (appState.escapeMenuOpen) {
          appState.setEscapeMenuOpen(false);
          appState.setPaused(false);
        } else {
          appState.setEscapeMenuOpen(true);
          appState.setPaused(true, true);
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setLocation]);

  if (location === 'editor') {
    return (
      <div className="flex w-full h-full items-center justify-center bg-black overflow-hidden">
        <div className="flex w-full h-full bg-zinc-950 overflow-hidden text-text-primary font-sans selection:bg-red-500/30 relative shadow-vignette">
          <DataEditorView />
          <GlobalTooltip />
          <GlobalMessages />
          {PERF_DEBUG_ENABLED && <FPSDisplay />}
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full h-full items-center justify-center bg-black overflow-hidden">
      <div className="flex w-full h-full bg-zinc-950 overflow-hidden text-text-primary font-sans selection:bg-red-500/30 relative shadow-vignette">
        
        {(location === 'dungeon' || location === 'town') && <DungeonView />}
        {location === 'town' && <TownView />}

        <CharacterWindow />
        <GlobalTooltip />
        <GlobalMessages />
        <EscapeMenu />
        <GameOverScreen />
        {PERF_DEBUG_ENABLED && <FPSDisplay />}
      </div>
    </div>
  );
}

export default App;
