import { useEffect, useRef } from 'react';
import { useCombatStore } from '../store/useCombatStore';
import { clsx } from 'clsx';
import { ScrollText } from 'lucide-react';

export function CombatLog() {
  const { logs } = useCombatStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-80 h-full bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.5)] overflow-hidden">
      {/* Top Half Spacer */}
      <div className="flex-1 flex-shrink-0" />
      
      {/* Bottom Half: Log Content */}
      <div className="h-[60%] flex flex-col overflow-hidden">
        <div className="px-4 border-b border-zinc-800 flex items-end pb-2.5 bg-zinc-900/50 sticky top-0 backdrop-blur-md h-14">
          <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5">
            <ScrollText size={20} className="mt-0.5" />
            Combat Log
          </h2>
        </div>
      
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-1 text-sm font-mono tracking-tight leading-relaxed">
        {logs.length === 0 ? (
          <div className="p-2 rounded bg-zinc-900/30 border border-zinc-800/30 shadow-sm text-zinc-600 italic">
            Waiting for battle...
          </div>
        ) : null}
        
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={clsx(
              "px-2 py-1.5 rounded bg-zinc-950/80 border border-zinc-800/50 shadow-sm transition-all",
              log.type === 'player-attack' && 'text-blue-500',
              log.type === 'enemy-attack' && 'text-red-500 border-red-950/50',
              log.type === 'ability' && 'text-sky-400 font-semibold border-cyan-900/50 bg-sky-950/30',
              log.type === 'system' && 'text-sky-400 italic border-emerald-900/50',
            )}
          >
            {log.message}
          </div>
        ))}
        <div ref={endRef} className="h-0" />
        </div>
      </div>
    </div>
  );
}
