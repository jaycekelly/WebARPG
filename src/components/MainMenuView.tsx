import { useState } from 'react';
import { useMetaStore } from '../store/useMetaStore';
import { GameIcon } from './IconLibrary';

const PlayerIcon = GameIcon('robot');

export const MainMenuView = () => {
    const { characters, activeCharacterId, addCharacter, setActiveCharacter } = useMetaStore();
    const [view, setView] = useState<'main' | 'select' | 'create'>('main');
    const [newName, setNewName] = useState('');
    const [selectedClass, setSelectedClass] = useState<'Fighter' | 'Rogue' | 'Ranger' | 'Mage'>('Fighter');
    
    const sortedCharacters = [...characters].sort((a, b) => b.lastPlayed - a.lastPlayed);
    
    const handleContinue = () => {
        if (!activeCharacterId && sortedCharacters.length > 0) {
            setActiveCharacter(sortedCharacters[0].id);
        }
        sessionStorage.setItem('webarpg-skip-menu-once', 'true');
        window.location.reload();
    };
    
    const handleSelectChar = (id: string) => {
        setActiveCharacter(id);
        useMetaStore.getState().updateCharacter(id, { lastPlayed: Date.now() });
        sessionStorage.setItem('webarpg-skip-menu-once', 'true');
        window.location.reload();
    };
    
    const handleCreateChar = () => {
        if (!newName.trim()) return;
        const id = 'char-' + Date.now();
        addCharacter({
            id,
            name: newName.trim(),
            level: 1,
            playerClass: selectedClass,
            lastPlayed: Date.now()
        });
        setActiveCharacter(id);
        sessionStorage.setItem('webarpg-skip-menu-once', 'true');
        window.location.reload();
    };
    
    return (
        <div className="absolute inset-0 z-[200] bg-zinc-950 flex flex-col items-center justify-center p-8">
            {view === 'main' && (
                <h1 className="text-8xl font-black tracking-widest text-text-primary mb-12 opacity-80 select-none">WebARPG</h1>
            )}
            
            {view === 'main' && (
                <div className="flex flex-col gap-3 w-64">
                    {characters.length > 0 && (
                        <button 
                            className="bg-[#0e0f11] hover:bg-[#202227] text-text-secondary hover:text-accent py-2 px-4 rounded-none text-base font-bold transition-all border-none"
                            onClick={handleContinue}
                        >
                            Continue
                        </button>
                    )}
                    
                    {characters.length > 0 && (
                        <button 
                            className="bg-[#0e0f11] hover:bg-[#202227] text-text-secondary hover:text-accent py-2 px-4 rounded-none text-base font-bold transition-all border-none"
                            onClick={() => setView('select')}
                        >
                            Choose Character
                        </button>
                    )}
                    
                    <button 
                        className="bg-[#0e0f11] hover:bg-[#202227] text-text-secondary hover:text-accent py-2 px-4 rounded-none text-base font-bold transition-all border-none"
                        onClick={() => setView('create')}
                    >
                        New Character
                    </button>
                    
                    <button className="bg-[#0e0f11] text-text-muted py-2 px-4 rounded-none text-base font-bold transition-all opacity-50 cursor-not-allowed border-none">
                        Options
                    </button>
                </div>
            )}
            
            {view === 'select' && (
                <div className="relative flex flex-col w-80">
                    <div className="absolute -top-12 left-0 w-full flex justify-between items-center">
                        <h2 className="text-xl font-bold text-text-primary">Select Character</h2>
                        <button 
                            className="bg-[#0e0f11] hover:bg-[#202227] text-text-secondary hover:text-accent py-1 px-3 rounded-none transition-all text-xs font-bold mr-2 border-none"
                            onClick={() => setView('main')}
                        >
                            Back
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 overflow-y-auto pr-2 pb-2 max-h-[352px]">
                        {sortedCharacters.map(char => (
                            <button
                                key={char.id}
                                className="flex items-center gap-4 p-2 bg-[#0e0f11] hover:bg-[#202227] rounded-none transition-all text-left group border-none"
                                onClick={() => handleSelectChar(char.id)}
                            >
                                <div className="w-16 h-16 bg-black/40 rounded-none flex items-center justify-center border border-[#202227]/50 group-hover:border-accent transition-colors flex-shrink-0">
                                    <PlayerIcon size={48} className="text-text-secondary group-hover:text-accent" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-base font-bold text-text-primary truncate">{char.name}</span>
                                    <span className="text-text-secondary text-xs truncate">Level {char.level} {char.playerClass}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {view === 'create' && (
                <div className="relative flex flex-col w-72 gap-4">
                    <div className="absolute -top-12 left-0 w-full flex justify-between items-baseline">
                        <h2 className="text-xl font-bold text-text-primary">New Character</h2>
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-2">
                        <label className="text-text-secondary text-xs font-bold uppercase tracking-widest">Character Name</label>
                        <input 
                            type="text" 
                            className="bg-[#0e0f11] focus:bg-[#0e0f11] text-text-primary outline-none transition-colors text-sm py-2 px-3 rounded-none border border-[#202227]/40 focus:border-accent"
                            placeholder="Enter name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-2">
                        <label className="text-text-secondary text-xs font-bold uppercase tracking-widest">Starting Class</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['Fighter', 'Rogue', 'Ranger', 'Mage'] as const).map(cls => {
                                const isEnabled = cls === 'Fighter';
                                const isSelected = selectedClass === cls;
                                return (
                                    <button
                                        key={cls}
                                        disabled={!isEnabled}
                                        onClick={() => setSelectedClass(cls)}
                                        className={`py-2 px-2 rounded-none text-sm font-bold transition-all border-none ${!isEnabled ? 'opacity-30 cursor-not-allowed bg-[#0e0f11]/40 text-text-muted' : isSelected ? 'bg-accent/15 text-accent font-bold' : 'bg-[#0e0f11] hover:bg-[#202227] text-text-secondary hover:text-accent'}`}
                                    >
                                        {cls}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                        <button 
                            className="flex-1 bg-[#0e0f11] hover:bg-[#202227] text-text-secondary hover:text-accent py-2 rounded-none transition-all font-bold text-sm border-none"
                            onClick={() => setView('main')}
                        >
                            Cancel
                        </button>
                        <button 
                            className="flex-1 bg-accent/15 hover:bg-accent/25 text-accent py-2 rounded-none transition-all font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed border-none"
                            onClick={handleCreateChar}
                            disabled={!newName.trim()}
                        >
                            Create
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
