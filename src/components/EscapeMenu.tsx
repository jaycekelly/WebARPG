import { useAppStore } from '../store/useAppStore';
import { useCombatStore } from '../store/useCombatStore';
import { useMessageStore } from '../store/useMessageStore';
import { setRunState } from '../store/storage';
import { useState } from 'react';

export function EscapeMenu() {
  const { escapeMenuOpen, setEscapeMenuOpen, location } = useAppStore();
  const [showWarning, setShowWarning] = useState(false);

  if (!escapeMenuOpen) return null;

  const handleForfeit = () => {
    const combatState = useCombatStore.getState();
    if (useAppStore.getState().getGameTime() - combatState.lastCombatEventTime < 5000) {
       useMessageStore.getState().addScreenMessage('above', 'Cannot portal in combat', 4000);
    } else if (combatState.castingSkillId !== 'portal_skill') {
       combatState.setCasting('portal_skill', 4000);
    }
    setEscapeMenuOpen(false);
    useAppStore.getState().setPaused(false);
  };

  const handleResume = () => {
    setEscapeMenuOpen(false);
    useAppStore.getState().setPaused(false);
  };

  const handleCharacterSelect = () => {
    if (location === 'dungeon') {
       setShowWarning(true);
    } else {
       // Just go to menu
       sessionStorage.setItem('webarpg-skip-menu-once', 'false');
       window.location.reload();
    }
  };

  const confirmForfeitToMenu = () => {
     setRunState('town'); // Default to town when they load this char again
     sessionStorage.setItem('webarpg-skip-menu-once', 'false');
     window.location.reload();
  };

  return (
    <div className="absolute inset-0 z-[9000] flex items-center justify-center bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
      <div className="relative w-56 bg-surface-base/93 backdrop-blur-[1px] flex flex-col overflow-hidden shadow-2xl rounded-none border border-transparent">
         
         <div className="p-4 flex flex-col gap-2">
            {!showWarning ? (
               <>
                  <button 
                     onClick={handleResume}
                     className="w-full py-2 px-4 bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all rounded-none text-sm font-bold text-center mb-2"
                  >
                     Resume Game
                  </button>

                  {location === 'dungeon' && (
                     <button 
                        onClick={handleForfeit}
                        className="w-full py-2 px-4 bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all rounded-none text-sm font-bold text-center"
                     >
                        Forfeit Dungeon
                     </button>
                  )}
                  
                  {location !== 'dungeon' && (
                     <button 
                        onClick={handleCharacterSelect}
                        className="w-full py-2 px-4 bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all rounded-none text-sm font-bold text-center"
                     >
                        Character Select
                     </button>
                  )}
                  
                  <button 
                     disabled
                     className="w-full py-2 px-4 bg-surface-raised/40 border border-transparent text-sm font-bold text-text-muted opacity-30 text-center rounded-none"
                  >
                     Options
                  </button>
               </>
            ) : (
               <div className="animate-in fade-in slide-in-from-right-4 text-center flex flex-col items-center">
                  <p className="text-sm font-bold text-red-400 mb-2">Are you sure?</p>
                  <p className="text-xs text-text-secondary mb-4">You are currently in a dungeon. Returning to the main menu will forfeit your run.</p>
                  <div className="flex gap-2 w-full">
                     <button 
                          className="flex-1 py-2 bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all rounded-none font-bold text-sm"
                          onClick={() => setShowWarning(false)}
                      >
                          Cancel
                     </button>
                     <button 
                          className="flex-1 py-2 bg-surface-raised border border-transparent text-red-400 hover:text-red-300 hover:bg-surface-overlay hover:border-red-500 hover:ring-1 hover:ring-red-500 active:scale-[0.98] rounded-none font-bold text-sm transition-all"
                          onClick={confirmForfeitToMenu}
                      >
                          Forfeit
                     </button>
                  </div>
               </div>
            )}
         </div>

      </div>
    </div>
  );
}
