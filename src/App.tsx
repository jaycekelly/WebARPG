import { Sidebar } from './components/Sidebar';
import { Grid } from './components/Grid';
import { CombatOverlay } from './components/CombatOverlay';
import { CombatLog } from './components/CombatLog';
import { useGameEngine } from './engine/useGameEngine';

function App() {
  useGameEngine(); // Mount the 60fps game engine loop
  return (
    <div className="flex h-screen w-screen bg-zinc-950 overflow-hidden text-zinc-100 font-sans selection:bg-red-500/30">
      <Sidebar />
      
      <main className="flex-1 relative flex flex-col">
        {/* Top header bar */}
        <header className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center px-6 shadow-sm z-20">
          <h1 className="font-bold text-lg tracking-tight bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            WebARPG
          </h1>
          <div className="ml-auto flex items-center gap-4 text-sm text-zinc-500 font-medium">
            <span>Room: Dungeon Entrance</span>
          </div>
        </header>

        {/* Game Area */}
        <div className="flex-1 relative flex">
          <Grid />
          <CombatOverlay />
        </div>
      </main>

      <CombatLog />
    </div>
  );
}

export default App;
