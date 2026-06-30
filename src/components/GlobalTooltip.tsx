import { useEffect, useState } from 'react';
import { useTooltipStore } from '../store/useTooltipStore';

export function GlobalTooltip() {
  const { content } = useTooltipStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!content) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [content]);

  if (!content) return null;

  return (
    <div 
      className="fixed z-[9999] pointer-events-none"
      style={{
        left: mousePos.x + 15, // Right
        top: mousePos.y - 15,  // Up
        transform: 'translateY(-100%)' // Move anchor point to bottom-left so it shoots up
      }}
    >
      {content}
    </div>
  );
}
