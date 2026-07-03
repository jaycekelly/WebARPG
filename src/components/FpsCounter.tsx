import { useEffect, useRef, useState } from 'react';

export function FpsCounter() {
  const [fps, setFps] = useState(0);
  const frames = useRef(0);
  const last = useRef(performance.now());
  const rafId = useRef(0);

  useEffect(() => {
    const tick = (now: number) => {
      frames.current += 1;
      const elapsed = now - last.current;
      if (elapsed >= 500) {
        setFps(Math.round((frames.current * 1000) / elapsed));
        frames.current = 0;
        last.current = now;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, []);

  const color = fps >= 55 ? 'text-emerald-500' : fps >= 30 ? 'text-amber-500' : 'text-red-500';

  return (
    <div className="fixed top-2 right-2 z-[200] pointer-events-none select-none bg-surface-overlay border border-border-subtle rounded px-2 py-1 text-xs font-mono text-text-secondary">
      <span className={color}>{fps}</span> fps
    </div>
  );
}
