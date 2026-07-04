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

  initPromise = (async () => {
    const instance = new Application();
    await instance.init({
      canvas,
      background: 0x000000,
      width: 800,
      height: 600,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
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

export function destroyPixiApp() {
  if (app) {
    app.destroy(true, { children: true });
    app = null;
    appCanvas = null;
  }
  initPromise = null;
}
