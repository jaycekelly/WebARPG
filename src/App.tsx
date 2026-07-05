import { useEffect } from 'react';
import { CharacterWindow } from './components/CharacterWindow';
import { useGameEngine } from './engine/useGameEngine';
import { useAppStore } from './store/useAppStore';
import { useCombatStore } from './store/useCombatStore';
import { usePlayerStore } from './store/usePlayerStore';
import { TownView } from './components/TownView';
import { DungeonView } from './components/DungeonView';
import { DataEditorView } from './components/DataEditorView';

import { GlobalTooltip } from './components/GlobalTooltip';

const GameOverScreen = () => {
  const currentHealth = usePlayerStore(state => state.currentHealth);
  if (currentHealth > 0) return null;
  return (
    <div className="absolute inset-0 z-[100] bg-zinc-950 flex flex-col items-center justify-center animate-in fade-in duration-1000">
       <div className="text-red-600 text-6xl font-black uppercase tracking-widest mb-4 drop-shadow-[0_0_20px_rgba(220,38,38,0.8)]">You Died</div>
       <div className="text-text-secondary text-sm font-bold uppercase tracking-widest animate-pulse">Refresh the window to resurrect</div>
    </div>
  );
};

function App() {
  useGameEngine(); // Mount the 60fps game engine loop
  const { location, setLocation } = useAppStore();

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
        if (appState.location === 'dungeon') {
          e.preventDefault(); // Prevent scrolling
          appState.togglePause();
          return;
        }
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

      if (e.key.toLowerCase() === 'p') {
        const appState = useAppStore.getState();
        if (appState.characterWindowOpen && appState.characterWindowTab === 'stats') {
          appState.setCharacterWindowOpen(false);
        } else {
          appState.setCharacterWindowTab('stats');
          appState.setCharacterWindowOpen(true);
        }
      }

      if (e.key.toLowerCase() === 'k') {
        const appState = useAppStore.getState();
        if (appState.characterWindowOpen && appState.characterWindowTab === 'skills') {
          appState.setCharacterWindowOpen(false);
        } else {
          appState.setCharacterWindowTab('skills');
          appState.setCharacterWindowOpen(true);
        }
      }

      if (e.key === 'Escape') {
        const appState = useAppStore.getState();
        const combatState = useCombatStore.getState();
        const playerState = usePlayerStore.getState();

        // 1. Cancel Casting (combat safety — highest priority)
        if (combatState.castingSkillId) {
          combatState.setCasting(null);
          combatState.triggerGcd(0);
          combatState.addLog("Spell cast cancelled.", 'system');
          return;
        }

        // 2. Cancel Aiming Mode
        if (combatState.targetingSkillId) {
          combatState.setTargetingSkill(null);
          return;
        }

        // 3. Close Modal Windows
        if (appState.vendorOpen) {
          appState.setVendorOpen(false);
          return;
        }
        if (appState.characterWindowOpen) {
          appState.setCharacterWindowOpen(false);
          return;
        }

        // 4. Clear Target
        if (playerState.activeTargetId) {
          playerState.setTarget(null);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [setLocation]);

  if (location === 'editor') {
    return (
      <div className="flex w-screen h-screen items-center justify-center bg-black overflow-hidden">
        <div className="flex w-full h-full bg-zinc-950 overflow-hidden text-text-primary font-sans selection:bg-red-500/30 relative shadow-[0_0_100px_rgba(0,0,0,0.8)]">
          <DataEditorView />
          <GlobalTooltip />
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-screen h-screen items-center justify-center bg-black overflow-hidden">
      <div className="flex w-full h-full bg-zinc-950 overflow-hidden text-text-primary font-sans selection:bg-red-500/30 relative shadow-[0_0_100px_rgba(0,0,0,0.8)]">
        
        {location === 'dungeon' && <DungeonView />}
        {location === 'town' && <TownView />}

        <CharacterWindow />
        <GlobalTooltip />
        <GameOverScreen />
      </div>
    </div>
  );
}

export default App;
