import { X, Coins } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { useTooltipStore } from '../store/useTooltipStore';
import { InventoryPanel } from './InventoryPanel';
import { CharacterSheet } from './CharacterSheet';
import { SkillTreePanel } from './SkillTreePanel';
import { ActiveSkillPanel } from './ActiveSkillPanel';

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
  const passivePoints = usePlayerStore(state => state.passivePoints);
  const activeSkillPoints = usePlayerStore(state => state.activeSkillPoints);
  const gold = usePlayerStore(state => state.gold);
  
  const showStats = statsPopoutOpen && characterWindowTab === 'inventory';

  if (!characterWindowOpen) return null;

  return (
    <div className="absolute inset-x-0 top-[45%] -translate-y-1/2 pointer-events-none flex justify-center z-40">
      <div 
        className={`relative w-[30rem] h-[34rem] pointer-events-auto transition-transform duration-[400ms] ease-in-out ${showStats ? 'translate-x-[7.75rem]' : 'translate-x-0'}`}
      >
        {/* Stats Popout */}
        {statsPopoutOpen && characterWindowTab === 'inventory' && (
          <div className="absolute right-[calc(100%+0.5rem)] w-[15rem] h-[34rem] bg-surface-deep backdrop-blur-md border border-border-subtle rounded-2xl z-30 overflow-hidden shadow-2xl animate-in slide-in-from-right-8 fade-in duration-[400ms]">
            <CharacterSheet />
          </div>
        )}

        {/* Main Window */}
        <div className="absolute inset-0 bg-surface-deep backdrop-blur-md border border-border-subtle rounded-2xl flex flex-col z-40 overflow-hidden shadow-2xl">
      
      {/* Header & Tabs */}
      <div className="flex items-end justify-center px-4 border-b border-border-subtle bg-surface-base flex-shrink-0 relative h-[1.375rem]">
        <div className="flex gap-0 h-full">
          <button 
            onClick={() => setCharacterWindowTab('inventory')}
            className={`relative px-0 text-[10px] uppercase tracking-widest font-black h-full transition-colors flex items-center justify-center ${characterWindowTab === 'inventory' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className={`w-18 h-full flex items-center justify-center border-b-[2px] ${characterWindowTab === 'inventory' ? 'border-accent' : 'border-transparent'}`}>
              <span className="relative">
                Inventory
                {attributePoints > 0 && (
                   <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse" />
                )}
              </span>
            </span>
          </button>
          
          <button 
            onClick={() => {
              setCharacterWindowTab('active_skills');
              if (statsPopoutOpen) setStatsPopoutOpen(false);
            }}
            className={`relative px-0 text-[10px] uppercase tracking-widest font-black h-full transition-colors flex items-center justify-center ${characterWindowTab === 'active_skills' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className={`w-18 h-full flex items-center justify-center border-b-[2px] ${characterWindowTab === 'active_skills' ? 'border-accent' : 'border-transparent'}`}>
              <span className="relative">
                Skills
                {activeSkillPoints > 0 && (
                   <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse" />
                )}
              </span>
            </span>
          </button>

          <button 
            onClick={() => {
              setCharacterWindowTab('skills');
              if (statsPopoutOpen) setStatsPopoutOpen(false);
            }}
            className={`relative px-0 text-[10px] uppercase tracking-widest font-black h-full transition-colors flex items-center justify-center ${characterWindowTab === 'skills' ? 'text-accent' : 'text-text-secondary hover:text-text-primary'}`}
          >
            <span className={`w-18 h-full flex items-center justify-center border-b-[2px] ${characterWindowTab === 'skills' ? 'border-accent' : 'border-transparent'}`}>
              <span className="relative">
                Passives
                {passivePoints > 0 && (
                   <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)] animate-pulse" />
                )}
              </span>
            </span>
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
      <div className={`flex-1 px-4 pt-4 custom-scrollbar flex flex-col ${characterWindowTab === 'inventory' ? 'pb-6 overflow-hidden' : 'pb-4 overflow-y-auto'}`}>
        {characterWindowTab === 'inventory' && (
          <InventoryPanel />
        )}

        {characterWindowTab === 'skills' && (
          <SkillTreePanel />
        )}

        {characterWindowTab === 'active_skills' && (
          <ActiveSkillPanel />
        )}
      </div>

      {/* Absolute Gold in Bottom Right */}
      {characterWindowTab === 'inventory' && (
        <div className="absolute bottom-1.5 right-[28px] flex justify-end items-center pointer-events-none">
           <span className="text-white text-[15px] font-bold font-mono mr-1.5 drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">{gold.toLocaleString()}</span>
           <Coins className="w-3 h-3 text-white opacity-80" />
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
