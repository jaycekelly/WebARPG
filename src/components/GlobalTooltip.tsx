import { useEffect, useRef } from 'react';
import { useTooltipStore } from '../store/useTooltipStore';

let globalMouseX = 0;
let globalMouseY = 0;

if (typeof window !== 'undefined') {
  window.addEventListener('mousemove', (e) => {
    globalMouseX = e.clientX;
    globalMouseY = e.clientY;
  });
}

export function GlobalTooltip() {
  const { content } = useTooltipStore();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const getScale = () => {
    if (typeof document === 'undefined') return 1;
    const match = document.body.style.transform.match(/scale\((.*?)\)/);
    return match ? parseFloat(match[1]) : 1;
  };

  const updatePosition = (x: number, y: number) => {
    if (tooltipRef.current) {
      const scale = getScale();
      const vx = x / scale;
      const vy = y / scale;
      const vWindowWidth = window.innerWidth / scale;
      
      const tw = tooltipRef.current.offsetWidth;
      const OFFSET = 15;
      const wouldOverflow = vx + OFFSET + tw > vWindowWidth - 8;
      
      if (wouldOverflow) {
         tooltipRef.current.style.left = 'auto';
         tooltipRef.current.style.right = `${vWindowWidth - vx + OFFSET}px`;
      } else {
         tooltipRef.current.style.right = 'auto';
         tooltipRef.current.style.left = `${vx + OFFSET}px`;
      }
      tooltipRef.current.style.top = `${vy - OFFSET}px`;
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      updatePosition(e.clientX, e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (content) {
      updatePosition(globalMouseX, globalMouseY);
    }
  }, [content]);

  if (!content) return null;

  const initialScale = getScale();
  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={{ 
        transform: 'translateY(-100%)', 
        left: (globalMouseX / initialScale) + 15, 
        top: (globalMouseY / initialScale) - 15 
      }}
    >
      {content}
    </div>
  );
}
