import { useEffect, useState } from 'react';
import { perfMetrics } from '../utils/performance';

export function FPSDisplay() {
  const [fps, setFps] = useState(0);
  const [logicMs, setLogicMs] = useState(0);
  const [renderMs, setRenderMs] = useState(0);

  useEffect(() => {
    console.log("FPSDisplay mounted!");
    let frameCount = 0;
    let accumulatedLogic = 0;
    let accumulatedRender = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      accumulatedLogic += perfMetrics.logicTimeMs;
      accumulatedRender += perfMetrics.renderTimeMs;

      const elapsed = currentTime - lastTime;
      
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        setLogicMs(accumulatedLogic / frameCount);
        setRenderMs(accumulatedRender / frameCount);
        
        frameCount = 0;
        accumulatedLogic = 0;
        accumulatedRender = 0;
        lastTime = currentTime;
      }
      
      animationFrameId = requestAnimationFrame(measureFPS);
    };

    animationFrameId = requestAnimationFrame(measureFPS);

    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div 
      style={{
        position: 'absolute',
        top: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 999999,
        pointerEvents: 'none',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#4ade80',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '6px 12px',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        display: 'flex',
        gap: '16px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.5)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>FPS</span>
         <span style={{ fontWeight: 'bold' }}>{fps > 0 ? fps : '--'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>LOGIC</span>
         <span style={{ color: logicMs > 3 ? '#fbbf24' : '#60a5fa' }}>{fps > 0 ? logicMs.toFixed(1) + 'ms' : '--'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>RENDER</span>
         <span style={{ color: renderMs > 5 ? '#fbbf24' : '#c084fc' }}>{fps > 0 ? renderMs.toFixed(1) + 'ms' : '--'}</span>
      </div>
    </div>
  );
}
