import { CombatOverlay } from './CombatOverlay';
import { GameCanvas } from '../renderer/GameCanvas';
import { LootPopup } from './LootPopup';
import { useAppStore } from '../store/useAppStore';

export function DungeonView() {
  const selectedLootDropId = useAppStore(s => s.selectedLootDropId);
  const setSelectedLootDropId = useAppStore(s => s.setSelectedLootDropId);

  return (
    <main className="absolute inset-0 z-0 flex flex-col bg-zinc-950">
      {/* Game Area — fills remaining space, canvas sizes to this div */}
      <div className="flex-1 relative overflow-hidden bg-zinc-950 shadow-[0_0_100px_rgba(0,0,0,1)]">
        <GameCanvas />
      </div>
      <CombatOverlay />
      {selectedLootDropId && (
        <LootPopup dropId={selectedLootDropId} onClose={() => setSelectedLootDropId(null)} />
      )}
    </main>
  );
}
