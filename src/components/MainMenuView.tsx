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
        <div className="absolute inset-0 z-[200] bg-surface-base flex flex-col items-center justify-center p-8">
            {view === 'main' && (
                <h1 className="text-6xl font-black tracking-widest text-text-primary mb-8 opacity-80 select-none">WebARPG</h1>
            )}
            
            {view === 'main' && (
                <div className="flex flex-col gap-2.5 w-52">
                    {characters.length > 0 && (
                        <button 
                            className="bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all py-1.5 px-3 rounded-none text-sm font-bold text-center"
                            onClick={handleContinue}
                        >
                            Continue
                        </button>
                    )}
                    
                    {characters.length > 0 && (
                        <button 
                            className="bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all py-1.5 px-3 rounded-none text-sm font-bold text-center"
                            onClick={() => setView('select')}
                        >
                            Choose Character
                        </button>
                    )}
                    
                    <button 
                        className="bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all py-1.5 px-3 rounded-none text-sm font-bold text-center"
                        onClick={() => setView('create')}
                    >
                        New Character
                    </button>
                    
                    <button className="bg-surface-raised/40 border border-transparent text-text-muted py-1.5 px-3 rounded-none text-sm font-bold opacity-30 text-center">
                        Options
                    </button>
                </div>
            )}
            
            {view === 'select' && (
                <div className="relative flex flex-col w-64">
                    <div className="absolute -top-12 left-0 w-full flex justify-between items-center">
                        <h2 className="text-lg font-bold text-text-primary">Select Character</h2>
                        <button 
                            className="bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all py-1 px-2.5 rounded-none text-xs font-bold"
                            onClick={() => setView('main')}
                        >
                            Back
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 pb-2 max-h-[280px] custom-scrollbar">
                        {sortedCharacters.map(char => (
                            <button
                                key={char.id}
                                className="flex items-center gap-3 p-1.5 border border-transparent bg-surface-raised hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all text-left group"
                                onClick={() => handleSelectChar(char.id)}
                            >
                                <div className="w-12 h-12 bg-surface-base rounded-none flex items-center justify-center border border-white/5 group-hover:border-accent transition-colors flex-shrink-0">
                                    <PlayerIcon size={36} className="text-text-secondary group-hover:text-accent" />
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-bold text-text-primary truncate">{char.name}</span>
                                    <span className="text-text-secondary text-xs truncate">Level {char.level} {char.playerClass}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {view === 'create' && (
                <div className="relative flex flex-col w-60 gap-3">
                    <div className="absolute -top-12 left-0 w-full flex justify-between items-baseline">
                        <h2 className="text-lg font-bold text-text-primary">New Character</h2>
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-1">
                        <label className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Character Name</label>
                        <input 
                            type="text" 
                            className="bg-surface-deep focus:bg-surface-deep text-text-primary outline-none transition-colors text-sm py-1.5 px-2.5 rounded-none border border-border-subtle focus:border-accent"
                            placeholder="Enter name..."
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    <div className="flex flex-col gap-1 mt-1">
                        <label className="text-text-secondary text-[10px] font-bold uppercase tracking-widest">Starting Class</label>
                        <div className="grid grid-cols-2 gap-2">
                             {(['Fighter', 'Rogue', 'Ranger', 'Mage'] as const).map(cls => {
                                const isEnabled = cls === 'Fighter';
                                const isSelected = selectedClass === cls;
                                return (
                                    <button
                                        key={cls}
                                        disabled={!isEnabled}
                                        onClick={() => setSelectedClass(cls)}
                                        className={`py-1.5 px-1 rounded-none text-xs font-bold transition-all ${!isEnabled ? 'opacity-30 bg-surface-raised/45 text-text-muted border border-transparent' : isSelected ? 'bg-surface-overlay border border-accent text-accent font-black shadow-glow-accent' : 'border border-transparent bg-surface-raised hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent text-text-secondary hover:text-text-primary active:scale-[0.98]'}`}
                                    >
                                        {cls}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                        <button 
                            className="flex-1 bg-surface-raised border border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent active:scale-[0.98] transition-all py-1.5 rounded-none font-bold text-xs"
                            onClick={() => setView('main')}
                        >
                            Cancel
                        </button>
                        <button 
                            className="flex-1 bg-surface-raised border border-transparent text-accent hover:text-white hover:bg-surface-overlay hover:border-accent hover:ring-1 hover:ring-accent py-1.5 rounded-none transition-all font-bold text-xs disabled:opacity-30 active:scale-[0.98]"
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
