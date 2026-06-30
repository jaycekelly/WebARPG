import { useAppStore } from '../store/useAppStore';
import { Store, Map, Coins, ArrowRight } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { LevelGenerator } from '../engine/world/LevelGenerator';

export function TownView() {
  const { setLocation, vendorOpen, setVendorOpen } = useAppStore();
  const { gold } = usePlayerStore();

  const handleEnterDungeon = () => {
    LevelGenerator.initializeDungeon(15, 15, usePlayerStore.getState().level);
    setLocation('dungeon');
  };

  return (
    <main className="flex-1 relative flex flex-col bg-zinc-950">
      {/* Town Content */}
      <div className="flex-1 p-8 flex gap-8 max-w-6xl mx-auto w-full">
        {/* Left Column: Actions */}
        <div className="w-1/3 flex flex-col gap-4">
          <button 
            onClick={handleEnterDungeon}
            className="flex items-center justify-between p-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-xl transition-colors group text-left"
          >
            <div>
              <div className="flex items-center gap-2 text-red-500 font-bold text-lg mb-1">
                <Map className="w-5 h-5" />
                Enter Dungeon
              </div>
              <div className="text-red-500/60 text-sm">
                Fight monsters and find loot.
              </div>
            </div>
            <ArrowRight className="w-6 h-6 text-red-500 group-hover:translate-x-1 transition-transform" />
          </button>

          <button 
            onClick={() => setVendorOpen(!vendorOpen)}
            className={`flex items-center justify-between p-6 rounded-xl transition-colors text-left border ${
              vendorOpen 
                ? 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20' 
                : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
            }`}
          >
            <div>
              <div className={`flex items-center gap-2 font-bold text-lg mb-1 ${vendorOpen ? 'text-cyan-500' : 'text-zinc-300'}`}>
                <Store className="w-5 h-5" />
                Vendor
              </div>
              <div className={vendorOpen ? 'text-orange-200/60' : 'text-zinc-500'}>
                Sell your hard-earned loot.
              </div>
            </div>
          </button>
        </div>

        {/* Right Column: Information / Decor */}
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 flex flex-col relative overflow-hidden">
          {vendorOpen ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
              <Store className="w-16 h-16 text-cyan-500/20 mb-4" />
              <h2 className="text-2xl font-bold text-cyan-500 mb-2">The Vendor is Open</h2>
              <p className="text-zinc-400 max-w-md mb-6">
                Click any item in your inventory to sell it for Gold. Better rarity and item level means more gold!
              </p>
              <div className="bg-zinc-950/50 border border-zinc-800 rounded-lg p-4 inline-flex items-center gap-3">
                <span className="text-sm text-zinc-500 uppercase tracking-widest">Your Wealth:</span>
                <span className="text-xl font-bold text-yellow-400 flex items-center gap-1.5"><Coins className="w-5 h-5"/> {gold}</span>
              </div>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-center animate-in fade-in zoom-in-95 duration-200">
              <h2 className="text-2xl font-bold text-zinc-300 mb-2">Welcome to Town</h2>
              <p className="text-zinc-500 max-w-md">
                You are safe here. Prepare your inventory, manage your skills, and head back into the dungeon when you are ready.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
