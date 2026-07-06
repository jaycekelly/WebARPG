import { X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { InventoryPanel } from './InventoryPanel';
import { CharacterSheet } from './CharacterSheet';
import { SkillTreePanel } from './SkillTreePanel';

export function CharacterWindow() {
  const { 
    characterWindowOpen, 
    characterWindowTab, 
    statsPopoutOpen,
    setCharacterWindowOpen, 
    setCharacterWindowTab,
    setStatsPopoutOpen
  } = useAppStore();
  
  const attributePoints = usePlayerStore(state => state.attributePoints);
  const skillPoints = usePlayerStore(state => state.skillPoints);
  
  const showStats = statsPopoutOpen && characterWindowTab === 'inventory';

  if (!characterWindowOpen) return null;

  return (
    <div className="absolute inset-x-0 top-[45%] -translate-y-1/2 pointer-events-none flex justify-center z-40">
      <div 
        className={`relative w-[30rem] h-[33.75rem] pointer-events-auto transition-transform duration-[400ms] ease-in-out ${showStats ? 'translate-x-[7.75rem]' : 'translate-x-0'}`}
      >
        {/* Stats Popout */}
        {statsPopoutOpen && characterWindowTab === 'inventory' && (
          <div className="absolute right-[calc(100%+0.5rem)] w-[15rem] h-[33.75rem] bg-surface-deep backdrop-blur-md border border-border-subtle rounded-2xl z-30 overflow-hidden shadow-2xl animate-in slide-in-from-right-8 fade-in duration-[400ms]">
            <CharacterSheet />
          </div>
        )}

        {/* Main Window */}
        <div className="absolute inset-0 bg-surface-deep backdrop-blur-md border border-border-subtle rounded-2xl flex flex-col z-40 overflow-hidden shadow-2xl">
      
      {/* Header & Tabs */}
      <div className="flex items-end justify-center px-4 border-b border-border-subtle bg-surface-base flex-shrink-0 relative h-[1.625rem]">
        <div className="flex gap-2 h-full">
          <button 
            onClick={() => setCharacterWindowTab('inventory')}
            className={`w-16 text-[10px] uppercase tracking-widest font-black h-full border-b-[2px] transition-colors flex items-center justify-center gap-1.5 ${characterWindowTab === 'inventory' ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
          >
            Inv
            {attributePoints > 0 && (
               <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse mb-0.5" />
            )}
          </button>
          
          <button 
            onClick={() => {
              setCharacterWindowTab('skills');
              if (statsPopoutOpen) setStatsPopoutOpen(false);
            }}
            className={`w-16 text-[10px] uppercase tracking-widest font-black h-full border-b-[2px] transition-colors flex items-center justify-center gap-1.5 ${characterWindowTab === 'skills' ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
          >
            Skills
            {skillPoints > 0 && (
               <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse mb-0.5" />
            )}
          </button>
        </div>
        
        {/* Close Button overlapping on the far right */}
        <button
          onClick={() => {
            setCharacterWindowOpen(false);
            useTooltipStore.getState().setContent(null);
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Content */}
      <div className={`flex-1 p-4 custom-scrollbar flex flex-col ${characterWindowTab === 'inventory' ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {characterWindowTab === 'inventory' && (
          <InventoryPanel />
        )}

        {characterWindowTab === 'skills' && (
          <SkillTreePanel />
        )}
      </div>

        </div>
      </div>
    </div>
  );
}
