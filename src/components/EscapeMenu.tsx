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
      <div className="relative w-56 bg-surface-deep backdrop-blur-md border border-border-subtle rounded-2xl flex flex-col overflow-hidden shadow-2xl">
         
         <div className="p-4 flex flex-col gap-2">
            {!showWarning ? (
               <>
                  <button 
                     onClick={handleResume}
                     className="w-full py-2 px-4 bg-surface-base hover:bg-surface-raised border border-border-subtle hover:border-accent rounded-lg text-sm font-bold text-accent transition-all text-center mb-2"
                  >
                     Resume Game
                  </button>

                  {location === 'dungeon' && (
                     <button 
                        onClick={handleForfeit}
                        className="w-full py-2 px-4 bg-surface-base hover:bg-surface-raised border border-border-subtle hover:border-accent rounded-lg text-sm font-bold text-text-secondary hover:text-text-primary transition-all text-center"
                     >
                        Forfeit Dungeon
                     </button>
                  )}
                  
                  <button 
                     onClick={handleCharacterSelect}
                     className="w-full py-2 px-4 bg-surface-base hover:bg-surface-raised border border-border-subtle hover:border-accent rounded-lg text-sm font-bold text-text-secondary hover:text-text-primary transition-all text-center"
                  >
                     Character Select
                  </button>
                  
                  <button 
                     disabled
                     className="w-full py-2 px-4 bg-surface-deep border border-border-subtle rounded-lg text-sm font-bold text-text-muted opacity-50 cursor-not-allowed text-center"
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
                         className="flex-1 py-2 bg-surface-base hover:bg-surface-raised border border-border-subtle rounded-lg text-text-secondary font-bold text-sm"
                         onClick={() => setShowWarning(false)}
                     >
                         Cancel
                     </button>
                     <button 
                         className="flex-1 py-2 bg-red-950/50 hover:bg-red-900/60 border border-red-900/50 hover:border-red-500 rounded-lg text-red-400 font-bold text-sm transition-colors"
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
