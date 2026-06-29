import { usePlayerStore } from '../store/usePlayerStore';
import { useWorldStore } from '../store/useWorldStore';
import { useCombatStore } from '../store/useCombatStore';
import { useStatsStore } from '../store/useStatsStore';
import { Crosshair, X, Flame, ShieldAlert, Footprints } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { SKILLS } from '../data/skills';
import type { Skill } from '../engine/skills/types';
import { SkillExecutor } from '../engine/skills/executor';

// Map icon strings to actual Lucide components for MVP
const ICONS: Record<string, React.ElementType> = {
  Flame,
  ShieldAlert,
  Footprints
};

const getDistance = (p1: {x: number, y: number}, p2: {x: number, y: number}) => {
  return Math.max(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
};

export function CombatOverlay() {
  const { activeTargetId, setTarget, position, currentMana, useMana, currentHealth, level, currentXp } = usePlayerStore();
  const { enemies } = useWorldStore();
  const { gcdEndTime, triggerGcd, addLog, castingSkillId, castEndTime, setCasting } = useCombatStore();
  const { getStat } = useStatsStore();
  
  const maxHealth = getStat('Health');
  const maxMana = getStat('Mana');
  const xpRequired = 100 * Math.pow(level, 2);
  
  const [now, setNow] = useState(Date.now());
  
  // Re-render frequently to update the GCD visual sweep smoothly
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 50);
    return () => clearInterval(interval);
  }, []);

  const target = enemies.find(e => e.id === activeTargetId);

  const handleCastSkill = (skill: Skill) => {
    if (castingSkillId) {
       addLog(`You are already casting.`, 'system');
       return;
    }
    if (now < gcdEndTime) return; // GCD is active
    
    // Check Mana
    if (currentMana < skill.manaCost) {
      addLog(`Not enough mana for ${skill.name}.`, 'system');
      return;
    }

    // Check Range if we have a target
    if (target) {
      const dist = getDistance(position, target.position);
      if (dist > skill.range && skill.range > 0) {
        addLog(`Target is out of range for ${skill.name}.`, 'system');
        return;
      }
    } else if (skill.range > 0) {
      addLog(`You need a target for ${skill.name}.`, 'system');
      return;
    }

    // Spend Mana
    if (!useMana(skill.manaCost)) return;

    // Trigger GCD
    triggerGcd(skill.gcdDuration);
    
    // Execute Skill or Start Cast
    if (skill.castTime > 0) {
      setCasting(skill.id, skill.castTime);
      addLog(`Casting ${skill.name}...`, 'system');
    } else {
      SkillExecutor.execute(skill, target?.id);
    }
  };

  const handleCastSkillRef = useRef(handleCastSkill);
  useEffect(() => {
    handleCastSkillRef.current = handleCastSkill;
  });

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Handle Tab targeting
      if (e.key === 'Tab') {
        e.preventDefault(); // Prevent browser UI focus shift
        const allEnemies = useWorldStore.getState().enemies.filter(en => !en.isDead);
        if (allEnemies.length === 0) return;
        
        const currentTargetId = usePlayerStore.getState().activeTargetId;
        const currentIndex = allEnemies.findIndex(en => en.id === currentTargetId);
        
        // Cycle to next, or first if none targeted
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % allEnemies.length;
        usePlayerStore.getState().setTarget(allEnemies[nextIndex].id);
        return;
      }

      // Handle 1-8 Skill usage
      const skillKeys = ['1', '2', '3', '4', '5', '6', '7', '8'];
      if (skillKeys.includes(e.key)) {
         const index = parseInt(e.key) - 1;
         const skillArray = Object.values(SKILLS);
         if (skillArray[index]) {
            handleCastSkillRef.current(skillArray[index]);
         }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const healthPercent = target ? (target.health / target.stats.maxHealth) * 100 : 0;
  
  const gcdRemaining = Math.max(0, gcdEndTime - now);
  const gcdPercent = (gcdRemaining / 2000) * 100; // Updated to match 2.0s GCD
  const isGcdActive = gcdRemaining > 0;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8 z-10">
      
      {/* Target Frame (Top Center) */}
      <div className="flex justify-center pointer-events-auto h-24">
        {target && (
          <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-lg p-4 flex items-center gap-4 min-w-[300px]">
            <div className="w-12 h-12 bg-red-950 rounded border border-red-800 flex items-center justify-center shadow-inner">
              <Crosshair className="text-red-500 w-6 h-6 animate-[spin_4s_linear_infinite]" />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-red-50">{target.name}</span>
                <button onClick={() => setTarget(null)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="h-3 w-full bg-zinc-800 rounded-full overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-red-500 transition-all duration-300"
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
              <div className="text-xs text-zinc-400 mt-1 text-right font-medium">{Math.ceil(target.health)} / {target.stats.maxHealth} HP</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Cast Bar (Center screen) */}
      {castingSkillId && castEndTime > 0 && SKILLS[castingSkillId] && (
        <div className="absolute top-[60%] left-1/2 -translate-x-1/2 w-48 pointer-events-auto">
          <div className="text-xs text-center text-white mb-1 font-bold shadow-sm drop-shadow-md">
            Casting {SKILLS[castingSkillId].name}...
          </div>
          <div className="h-2 w-full bg-zinc-900 rounded-full border border-zinc-700 overflow-hidden shadow-lg">
            <div 
              className="h-full bg-orange-400 transition-all duration-50 ease-linear"
              style={{ width: `${Math.min(100, Math.max(0, 100 - ((castEndTime - now) / SKILLS[castingSkillId].castTime) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* HUD & Action Bar (Bottom Center) */}
      <div className="flex flex-col items-center pointer-events-auto gap-3">
        
        {/* HP / MP / XP Bars */}
        <div className="flex flex-col gap-1 w-80 bg-zinc-950/80 backdrop-blur border border-zinc-800 p-2 rounded-lg shadow-xl">
          {/* Health */}
          <div className="relative h-3 w-full bg-zinc-800 rounded-sm overflow-hidden">
             <div 
               className="absolute top-0 left-0 h-full bg-red-600 transition-all duration-300"
               style={{ width: `${Math.min(100, (currentHealth / maxHealth) * 100)}%` }}
             />
             <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow-black drop-shadow-md">
                {Math.floor(currentHealth)} / {Math.floor(maxHealth)}
             </div>
          </div>
          {/* Mana */}
          <div className="relative h-3 w-full bg-zinc-800 rounded-sm overflow-hidden">
             <div 
               className="absolute top-0 left-0 h-full bg-blue-600 transition-all duration-300"
               style={{ width: `${Math.min(100, (currentMana / maxMana) * 100)}%` }}
             />
             <div className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white shadow-black drop-shadow-md">
                {Math.floor(currentMana)} / {Math.floor(maxMana)}
             </div>
          </div>
          {/* XP row */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <div className="bg-zinc-800 text-zinc-300 border border-zinc-700 text-[8px] font-black w-4 h-4 flex-shrink-0 flex items-center justify-center rounded-sm">
              {level}
            </div>
            <div className="relative h-1.5 flex-1 bg-zinc-800 rounded-sm overflow-hidden">
               <div 
                 className="absolute top-0 left-0 h-full bg-purple-500 transition-all duration-300 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                 style={{ width: `${Math.min(100, (currentXp / xpRequired) * 100)}%` }}
               />
            </div>
            {/* Invisible spacer to perfectly center the XP bar under the HP/MP bars */}
            <div className="w-4 flex-shrink-0" />
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-zinc-900/90 backdrop-blur-sm border border-zinc-700 shadow-2xl rounded-xl p-3 flex gap-3 relative overflow-hidden">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-red-500/50 blur-sm rounded-full"></div>
           
           {Object.entries(SKILLS).map(([key, skill], index) => {
             const IconComponent = ICONS[skill.icon] || Flame;
             
             // Range check visual
             let outOfRange = false;
             if (target && skill.range > 0) {
                const dist = getDistance(position, target.position);
                outOfRange = dist > skill.range;
             }

             return (
              <button 
                key={key}
                disabled={isGcdActive || currentMana < skill.manaCost}
                className={`relative w-14 h-14 rounded border flex flex-col items-center justify-center gap-1 transition-all group overflow-hidden
                  ${isGcdActive ? 'bg-zinc-800 border-zinc-700 cursor-not-allowed' : 'bg-zinc-800 border-zinc-700 hover:border-orange-500 hover:bg-zinc-700'}
                  ${outOfRange ? 'opacity-30' : ''}
                `}
                onClick={() => handleCastSkill(skill)}
              >
                {/* GCD Sweep Overlay */}
                {isGcdActive && (
                  <div 
                    className="absolute inset-0 bg-black/60 origin-bottom transition-all ease-linear"
                    style={{ height: `${gcdPercent}%` }}
                  />
                )}

                <IconComponent className={`w-6 h-6 relative z-10 ${outOfRange ? 'text-red-900' : 'text-orange-500 group-hover:scale-110'} transition-transform`} />
                <span className="text-[10px] font-bold text-zinc-400 relative z-10">{index + 1}</span>
                
                {/* Mana Cost indicator */}
                <div className="absolute top-0 right-0 px-1 py-0.5 bg-blue-900/80 text-[8px] text-blue-200 rounded-bl font-bold z-10">
                  {skill.manaCost}
                </div>
              </button>
             );
           })}
        </div>
      </div>
      
    </div>
  );
}
