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

/**
 * Drop-in replacement for createJSONStorage(() => dualStorage) that coalesces
 * writes instead of persisting on every single zustand set() call.
 *
 * Profiling found that zustand's persist middleware serializing + writing the
 * full store to localStorage on every mutation (usePlayerStore/useWorldStore/
 * useBuffStore all mutate many times per second during combat: enemy AI ticks,
 * buff ticks, adrenaline generation) was costing 40+ fps in combat alone.
 *
 * This uses a trailing-edge throttle: at most one real write per `minIntervalMs`,
 * always using the latest value, plus a flush on tab close/hide so we don't lose
 * more than one throttle window of progress on a graceful exit. (A true crash -
 * power loss, browser kill - can't be intercepted by any JS-based approach, so
 * the worst case here is up to `minIntervalMs` of progress lost, same trade-off
 * any throttled autosave makes.) Note dualStorage.setItem() re-checks the
 * `preventSaves` flag at write time, so the death-screen's setPreventSaves(true)
 * still correctly suppresses any write still pending in the throttle queue.
 */
export function createThrottledPersistStorage(minIntervalMs = 1000) {
  let lastWriteTime = 0;
  let pendingName: string | null = null;
  let pendingValue: unknown = null;
  let flushTimeout: ReturnType<typeof setTimeout> | null = null;

  const flush = () => {
    if (flushTimeout !== null) {
      clearTimeout(flushTimeout);
      flushTimeout = null;
    }
    if (pendingName !== null) {
      dualStorage.setItem(pendingName, JSON.stringify(pendingValue));
      lastWriteTime = Date.now();
      pendingName = null;
      pendingValue = null;
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', flush);
    window.addEventListener('pagehide', flush);
  }

  return {
    getItem: (name: string) => {
      const raw = dualStorage.getItem(name);
      return raw ? JSON.parse(raw) : null;
    },
    setItem: (name: string, value: unknown) => {
      pendingName = name;
      pendingValue = value;

      const elapsed = Date.now() - lastWriteTime;
      if (elapsed >= minIntervalMs) {
        flush();
      } else if (flushTimeout === null) {
        flushTimeout = setTimeout(flush, minIntervalMs - elapsed);
      }
    },
    removeItem: (name: string) => dualStorage.removeItem(name),
  };
}

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
