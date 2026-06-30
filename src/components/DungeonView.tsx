import { Grid } from './Grid';
import { CombatOverlay } from './CombatOverlay';
import { CombatLog } from './CombatLog';

export function DungeonView() {
  return (
    <>
      <main className="flex-1 relative flex flex-col">
        {/* Game Area */}
        <div className="flex-1 relative flex">
          <Grid />
          <CombatOverlay />
        </div>
      </main>

      <CombatLog />
    </>
  );
}
