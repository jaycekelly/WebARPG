import { useEffect, useState } from 'react';
import { perfMetrics } from '../utils/performance';
import { perfDebugFlags, subscribePerfDebug } from '../utils/perfDebug';

export function FPSDisplay() {
  const [fps, setFps] = useState(0);
  const [logicMs, setLogicMs] = useState(0);
  const [renderMs, setRenderMs] = useState(0);
  const [gpuMs, setGpuMs] = useState(0);
  const [fogBlur, setFogBlur] = useState(perfDebugFlags.fogBlur);
  const [hudBlur, setHudBlur] = useState(perfDebugFlags.hudBackdropBlur);
  const [persistWrites, setPersistWrites] = useState(perfDebugFlags.persistWrites);

  useEffect(() => {
    return subscribePerfDebug(() => {
      setFogBlur(perfDebugFlags.fogBlur);
      setHudBlur(perfDebugFlags.hudBackdropBlur);
      setPersistWrites(perfDebugFlags.persistWrites);
    });
  }, []);

  useEffect(() => {
    console.log("FPSDisplay mounted!");
    let frameCount = 0;
    let accumulatedLogic = 0;
    let accumulatedRender = 0;
    let accumulatedGpu = 0;
    let lastTime = performance.now();
    let animationFrameId: number;

    const measureFPS = (currentTime: number) => {
      frameCount++;
      accumulatedLogic += perfMetrics.logicTimeMs;
      accumulatedRender += perfMetrics.renderTimeMs;
      accumulatedGpu += perfMetrics.gpuSubmitMs;

      const elapsed = currentTime - lastTime;
      
      if (elapsed >= 1000) {
        setFps(Math.round((frameCount * 1000) / elapsed));
        setLogicMs(accumulatedLogic / frameCount);
        setRenderMs(accumulatedRender / frameCount);
        setGpuMs(accumulatedGpu / frameCount);
        
        frameCount = 0;
        accumulatedLogic = 0;
        accumulatedRender = 0;
        accumulatedGpu = 0;
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
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>GPU SUBMIT</span>
         <span style={{ color: gpuMs > 3 ? '#fbbf24' : '#f472b6' }}>{fps > 0 ? gpuMs.toFixed(1) + 'ms' : '--'}</span>
      </div>
      <div style={{ width: '1px', background: 'rgba(255,255,255,0.15)', margin: '2px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>FOG BLUR (F9)</span>
         <span style={{ fontWeight: 'bold', color: fogBlur ? '#4ade80' : '#f87171' }}>{fogBlur ? 'ON' : 'OFF'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>HUD BLUR (F10)</span>
         <span style={{ fontWeight: 'bold', color: hudBlur ? '#4ade80' : '#f87171' }}>{hudBlur ? 'ON' : 'OFF'}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
         <span style={{ color: '#fff', fontSize: '10px', opacity: 0.7 }}>SAVES (F11)</span>
         <span style={{ fontWeight: 'bold', color: persistWrites ? '#4ade80' : '#f87171' }}>{persistWrites ? 'ON' : 'OFF'}</span>
      </div>
    </div>
  );
}
