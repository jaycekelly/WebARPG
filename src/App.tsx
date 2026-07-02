import { useEffect, useLayoutEffect } from 'react';
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
  const { location, setLocation, setScaleFactor } = useAppStore();

  useLayoutEffect(() => {
    const handleResize = () => {
      // Base aspect ratio is 1920x1080 (16:9)
      const scaleX = window.innerWidth / 1920;
      const scaleY = window.innerHeight / 1080;

      // Calculate scale to fit. Min 0.66 (720p equivalent); no upper cap so large monitors upscale.
      const scale = Math.max(0.66, Math.min(scaleX, scaleY));

      // UI offset: grow small screens toward 1440p size, flatten out above it.
      // 1080p (1.0) → +33% to match 1440p (1.333); 1440p and above → unchanged.
      const UI_BASE = 1.333;
      const uiScale = scale >= UI_BASE ? scale : scale + (UI_BASE - scale) * 0.4;

      // Update Tailwind's base 1rem (16px default)
      document.documentElement.style.fontSize = `${16 * uiScale}px`;
      setScaleFactor(scale);
    };

    handleResize(); // Initial call
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setScaleFactor]);

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

        // 1. Close Modal Windows
        if (appState.vendorOpen) {
          appState.setVendorOpen(false);
          return;
        }
        if (appState.characterWindowOpen) {
          appState.setCharacterWindowOpen(false);
          return;
        }
        
        // 2. Cancel Aiming Mode
        if (combatState.targetingSkillId) {
          combatState.setTargetingSkill(null);
          return;
        }

        // 3. Cancel Casting
        if (combatState.castingSkillId) {
          combatState.setCasting(null);
          combatState.triggerGcd(0);
          combatState.addLog("Spell cast cancelled.", 'system');
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
        
        {location === 'town' ? <TownView /> : <DungeonView />}

        <CharacterWindow />
        <GlobalTooltip />
        <GameOverScreen />
      </div>
    </div>
  );
}

export default App;
