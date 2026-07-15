// Dev-only runtime A/B toggles for diagnosing GPU compositing cost.
// Not wired into any UI - flip these live while playing to isolate where
// frame time is going, per the FPS investigation (see chat history).
//
//   F9  -> toggle the Pixi fog BlurFilter (renderFog.ts)
//   F10 -> toggle all CSS backdrop-filter / backdrop-blur-* across the DOM UI
//   F8  -> force-disable all persist() writes entirely (on top of the always-on
//          throttle in createThrottledPersistStorage - see storage.ts). Confirmed
//          zustand's persist-on-every-set() was costing 40+ fps in combat before
//          the throttle was added; kept as a toggle for future regression testing.
//          (F11 was avoided - it's a browser/OS-reserved fullscreen shortcut in most
//          browsers and may not reliably reach page JS)
//
// State + current values are also mirrored into FPSDisplay so you don't have
// to check the console while testing.
//
// Set PERF_DEBUG_ENABLED back to true to bring back the FPS overlay and all
// three hotkeys - everything else in this file is left as-is for that.

import { setPreventSaves } from '../store/storage';

export const PERF_DEBUG_ENABLED = false;

type Listener = () => void;

export const perfDebugFlags = {
  fogBlur: true,
  hudBackdropBlur: true,
  persistWrites: true,
};

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

/** Subscribe to flag changes. Returns an unsubscribe function. */
export function subscribePerfDebug(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function applyHudBackdropAttribute() {
  document.documentElement.setAttribute(
    'data-perf-hud-blur',
    perfDebugFlags.hudBackdropBlur ? 'on' : 'off'
  );
}

let initialized = false;

/** Call once at app startup. Safe to call multiple times. No-ops entirely when PERF_DEBUG_ENABLED is false. */
export function initPerfDebugHotkeys() {
  if (!PERF_DEBUG_ENABLED) return;
  if (initialized) return;
  initialized = true;

  applyHudBackdropAttribute();

  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.key === 'F9') {
      e.preventDefault();
      perfDebugFlags.fogBlur = !perfDebugFlags.fogBlur;
      console.log(`[perf A/B] Fog BlurFilter: ${perfDebugFlags.fogBlur ? 'ON' : 'OFF'}`);
      notify();
    } else if (e.key === 'F10') {
      e.preventDefault();
      perfDebugFlags.hudBackdropBlur = !perfDebugFlags.hudBackdropBlur;
      applyHudBackdropAttribute();
      console.log(`[perf A/B] HUD backdrop-blur: ${perfDebugFlags.hudBackdropBlur ? 'ON' : 'OFF'}`);
      notify();
    } else if (e.key === 'F8') {
      e.preventDefault();
      perfDebugFlags.persistWrites = !perfDebugFlags.persistWrites;
      setPreventSaves(!perfDebugFlags.persistWrites);
      console.log(`[perf A/B] persist() serialize+write (world/buff/player): ${perfDebugFlags.persistWrites ? 'ON' : 'OFF'}`);
      notify();
    }
  });
}
