import { Application } from 'pixi.js';

let app: Application | null = null;
let appCanvas: HTMLCanvasElement | null = null;
let initPromise: Promise<Application> | null = null;

export async function getPixiApp(canvas: HTMLCanvasElement): Promise<Application> {
  // Same canvas — return existing app or in-flight promise
  if (canvas === appCanvas) {
    if (app) return app;
    if (initPromise) return initPromise;
  }

  // Different canvas — destroy old app and start fresh
  if (app) {
    app.destroy(true, { children: true });
    app = null;
    appCanvas = null;
  }
  // If an init is in-flight for a different canvas, let it complete
  // and self-destruct (we changed appCanvas so the next call with
  // the old canvas won't see initPromise).

  appCanvas = canvas;

  // Perf A/B (reload-based, since these are WebGL context init options and can't
  // be flipped live): add ?noaa=1 to disable antialiasing, ?capres=1 to ignore
  // devicePixelRatio and render at 1x. See src/utils/perfDebug.ts for the live
  // hotkey toggles (fog blur, HUD backdrop-blur).
  const params = new URLSearchParams(window.location.search);
  const noAA = params.get('noaa') === '1';
  const capRes = params.get('capres') === '1';
  const resolution = capRes ? 1 : (window.devicePixelRatio || 1);
  if (noAA || capRes) {
    console.log(`[perf A/B] antialias=${!noAA} resolution=${resolution} (devicePixelRatio=${window.devicePixelRatio})`);
  }

  initPromise = (async () => {
    const instance = new Application();
    await instance.init({
      canvas,
      background: 0x060606,
      width: 800,
      height: 600,
      antialias: !noAA,
      resolution,
      autoDensity: true,
    });
    // If the canvas changed while we were initializing, discard.
    if (canvas !== appCanvas) {
      instance.destroy(true, { children: true });
      throw new Error('Pixi init superseded — canvas changed');
    }
    app = instance;
    return instance;
  })();

  return initPromise;
}

export function setPixiAppBackground(color: number) {
  if (app && app.renderer) {
    app.renderer.background.color = color;
  } else if (initPromise) {
    initPromise.then((instance) => {
      instance.renderer.background.color = color;
    });
  }
}

export function destroyPixiApp() {
  if (app) {
    app.destroy(true, { children: true });
    app = null;
    appCanvas = null;
  }
  initPromise = null;
}
