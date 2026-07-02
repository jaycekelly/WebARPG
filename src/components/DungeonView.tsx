import { PixiGrid } from './PixiGrid';
import { CombatOverlay } from './CombatOverlay';
// import { CombatLog } from './CombatLog';

export function DungeonView() {
  return (
    <main className="absolute inset-0 z-0 flex flex-col bg-zinc-950 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]">
      {/* Game Area */}
      <div className="flex-1 relative flex overflow-hidden items-center justify-center pointer-events-none">
        <div className="w-full h-full relative pointer-events-auto bg-zinc-950 shadow-[0_0_100px_rgba(0,0,0,1)] flex flex-col">
           <PixiGrid />
        </div>
      </div>
      <CombatOverlay />
      
      {/* <CombatLog /> */}
    </main>
  );
}
