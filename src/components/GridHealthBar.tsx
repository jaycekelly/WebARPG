import React from 'react';

interface GridHealthBarProps {
  currentHealth: number;
  maxHealth: number;
}

export const GridHealthBar: React.FC<GridHealthBarProps> = ({ currentHealth, maxHealth }) => {
  if (currentHealth >= maxHealth) return null;

  return (
    <div className="absolute -top-3 left-0 w-full h-[6px] bg-red-950 border border-zinc-800 rounded-sm overflow-hidden z-20">
      {/* Foreground */}
      <div 
        className="absolute top-0 left-0 h-full bg-red-500 transition-all duration-150 z-20" 
        style={{ width: `${Math.max(0, (currentHealth / maxHealth) * 100)}%` }}
      />
    </div>
  );
};
