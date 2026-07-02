import { Backpack, User, BookOpen, X } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useAppStore } from '../store/useAppStore';
import { InventoryPanel } from './InventoryPanel';
import { CharacterSheet } from './CharacterSheet';
import { SkillTreePanel } from './SkillTreePanel';

export function CharacterWindow() {
  const { skillPoints, attributePoints } = usePlayerStore();
  const { 
    characterWindowOpen, 
    characterWindowTab, 
    setCharacterWindowOpen, 
    setCharacterWindowTab 
  } = useAppStore();
  
  if (!characterWindowOpen) return null;

  const isSkills = characterWindowTab === 'skills';

  return (
    <div className={`absolute right-3 top-1/2 -translate-y-1/2 ${isSkills ? 'w-[50rem]' : 'w-[25rem]'} h-[55vh] min-h-[28.125rem] bg-surface-deep backdrop-blur-md border border-border-subtle rounded-2xl flex flex-col z-40 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300`}>
      
      {/* Header & Tabs */}
      <div className="flex justify-between items-end border-b border-border-subtle px-4 pt-2 bg-surface-base flex-shrink-0">
        <div className="flex gap-4">
          <button 
            onClick={() => setCharacterWindowTab('inventory')}
            className={`text-sm font-bold pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${characterWindowTab === 'inventory' ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
          >
            <Backpack className="w-[1.125rem] h-[1.125rem] mt-0.5" />
            Inventory
          </button>
          <button 
            onClick={() => setCharacterWindowTab('stats')}
            className={`text-sm font-bold pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${characterWindowTab === 'stats' ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
          >
            <User className="w-[1.125rem] h-[1.125rem] mt-0.5" />
            Stats
            {attributePoints > 0 && <span className="bg-red-600 text-text-primary w-4 h-4 rounded-full flex items-center justify-center text-[0.5625rem] animate-pulse">{attributePoints}</span>}
          </button>
          <button 
            onClick={() => setCharacterWindowTab('skills')}
            className={`text-sm font-bold pb-2 border-b-2 transition-colors flex items-center gap-1.5 ${characterWindowTab === 'skills' ? 'text-accent border-accent' : 'text-text-secondary border-transparent hover:text-text-primary'}`}
          >
            <BookOpen className="w-[1.125rem] h-[1.125rem] mt-0.5" />
            Skills
            {skillPoints > 0 && <span className="bg-red-600 text-text-primary w-4 h-4 rounded-full flex items-center justify-center text-[0.5625rem] animate-pulse">{skillPoints}</span>}
          </button>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={() => setCharacterWindowOpen(false)}
          className="mb-2 text-text-muted hover:text-text-primary transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col">
        {characterWindowTab === 'inventory' && (
          <InventoryPanel />
        )}

        {characterWindowTab === 'stats' && (
          <CharacterSheet />
        )}

        {characterWindowTab === 'skills' && (
          <SkillTreePanel />
        )}
      </div>

    </div>
  );
}
