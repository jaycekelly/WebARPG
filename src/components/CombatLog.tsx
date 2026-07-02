import { useEffect, useRef } from 'react';
import { useCombatStore } from '../store/useCombatStore';
import { clsx } from 'clsx';

export function CombatLog() {
  const { logs } = useCombatStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="absolute left-8 bottom-8 w-[500px] h-[300px] flex flex-col z-20 overflow-hidden pointer-events-none">
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1.5 text-sm font-mono tracking-tight leading-relaxed pointer-events-auto custom-scrollbar [mask-image:linear-gradient(to_bottom,transparent_0%,black_40%,black_100%)]">
        {logs.length === 0 ? (
          <div className="p-2 text-text-muted/50 italic text-shadow-sm mt-auto">
            Waiting for battle...
          </div>
        ) : null}
        
        {logs.map((log, i) => {
          // Fade out older logs visually
          const isRecent = i >= logs.length - 4;
          return (
            <div 
              key={log.id} 
              className={clsx(
                "px-2 py-0.5 rounded transition-all drop-shadow-[0_2px_2px_rgba(0,0,0,1)]",
                isRecent ? "opacity-100" : "opacity-40",
                log.type === 'player-attack' && 'text-text-primary',
                log.type === 'enemy-attack' && 'text-red-500',
                log.type === 'ability' && 'text-accent bg-accent/10 font-bold',
                log.type === 'system' && 'text-text-secondary italic',
              )}
            >
              <span className="opacity-50 text-[10px] mr-2">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]</span>
              {log.message}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
    </div>
  );
}
