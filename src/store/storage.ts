const getActiveCharPrefix = (name: string) => {
    try {
        const metaStoreRaw = localStorage.getItem('webarpg-meta');
        if (metaStoreRaw) {
            const metaState = JSON.parse(metaStoreRaw);
            const activeId = metaState.state?.activeCharacterId;
            if (activeId) {
                return `${name}-${activeId}`;
            }
        }
    } catch(e) {}
    return name;
};

let preventSaves = false;
export const setPreventSaves = (val: boolean) => preventSaves = val;

export const setRunState = (state: 'town' | 'dungeon') => {
    const prefixedName = getActiveCharPrefix('webarpg-run-state');
    localStorage.setItem(prefixedName, state);
    if (state === 'town') {
        clearVolatileSaves();
    }
};

export const dualStorage = {
  getItem: (name: string) => {
    const prefixedName = getActiveCharPrefix(name);
    const volatileData = localStorage.getItem(`${prefixedName}-volatile`);
    if (volatileData) {
      console.log(`[Storage] Loaded volatile save for ${prefixedName}`);
      return volatileData;
    }
    console.log(`[Storage] Loaded town save for ${prefixedName}`);
    return localStorage.getItem(`${prefixedName}-town`);
  },
  setItem: (name: string, value: string) => {
    if (preventSaves) return;
    
    const prefixedName = getActiveCharPrefix(name);
    const runStateKey = getActiveCharPrefix('webarpg-run-state');
    const location = localStorage.getItem(runStateKey) || 'town';
    
    if (location === 'town') {
      localStorage.setItem(`${prefixedName}-town`, value);
    } else {
      localStorage.setItem(`${prefixedName}-volatile`, value);
    }
  },

  removeItem: (name: string) => {
    const prefixedName = getActiveCharPrefix(name);
    localStorage.removeItem(`${prefixedName}-town`);
    localStorage.removeItem(`${prefixedName}-volatile`);
  }
};

export const clearVolatileSaves = () => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
        if (key.endsWith('-volatile')) {
            localStorage.removeItem(key);
        }
    });
};
