import { useEffect, useRef, useState } from 'react';
import { useTooltipStore } from '../store/useTooltipStore';

export function GlobalTooltip() {
  const { content } = useTooltipStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (!content) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });

      // Measure tooltip width after paint and decide whether to flip
      if (tooltipRef.current) {
        const tw = tooltipRef.current.offsetWidth;
        const OFFSET = 15;
        const wouldOverflow = e.clientX + OFFSET + tw > window.innerWidth - 8;
        setFlip(wouldOverflow);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [content]);

  if (!content) return null;

  // When flipping, anchor the RIGHT edge of the tooltip to the left of the cursor
  const style = flip
    ? {
        right: window.innerWidth - mousePos.x + 15,
        top: mousePos.y - 15,
        transform: 'translateY(-100%)',
      }
    : {
        left: mousePos.x + 15,
        top: mousePos.y - 15,
        transform: 'translateY(-100%)',
      };

  return (
    <div
      ref={tooltipRef}
      className="fixed z-[9999] pointer-events-none"
      style={style}
    >
      {content}
    </div>
  );
}
