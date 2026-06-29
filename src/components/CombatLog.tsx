import { useEffect, useRef } from 'react';
import { useCombatStore } from '../store/useCombatStore';
import { clsx } from 'clsx';
import { MessageSquare } from 'lucide-react';

export function CombatLog() {
  const { logs } = useCombatStore();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="w-80 bg-zinc-900 border-l border-zinc-800 flex flex-col z-20 shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.5)]">
      <div className="p-4 border-b border-zinc-800 flex items-center gap-2 bg-zinc-900/50 sticky top-0 backdrop-blur-md">
        <MessageSquare className="w-4 h-4 text-zinc-400" />
        <h2 className="font-bold text-zinc-100 tracking-tight">Combat Log</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 text-sm font-mono tracking-tight leading-relaxed">
        {logs.length === 0 ? (
          <div className="text-zinc-600 italic text-center mt-10">Waiting for battle...</div>
        ) : null}
        
        {logs.map((log) => (
          <div 
            key={log.id} 
            className={clsx(
              "p-2 rounded bg-zinc-950/30 border border-zinc-800/30 shadow-sm transition-all",
              log.type === 'player-attack' && 'text-blue-300/90 border-blue-900/30',
              log.type === 'enemy-attack' && 'text-red-400 border-red-900/30',
              log.type === 'ability' && 'text-orange-300 font-semibold border-orange-900/30 bg-orange-950/20',
              log.type === 'system' && 'text-emerald-400 italic border-emerald-900/30',
            )}
          >
            <span className="text-zinc-600 mr-2 text-[10px] block mb-0.5">
              {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
            {log.message}
          </div>
        ))}
        <div ref={endRef} className="h-2" />
      </div>
    </div>
  );
}
