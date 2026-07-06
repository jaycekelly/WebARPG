import { useEffect } from 'react';

export function useUIScale() {
  useEffect(() => {
    const updateScale = () => {
      // Calculate scale based on a 2560x1280 reference viewport
      const scaleW = window.innerWidth / 2560;
      const scaleH = window.innerHeight / 1280;
      
      // Take the minimum to ensure it always fits without clipping
      let scale = Math.min(scaleW, scaleH);
      
      // Soften the scaling curve for smaller monitors so the UI doesn't shrink as aggressively.
      // E.g. at 1080p (0.75 linear scale), Math.pow(0.75, 0.5) pushes it back up to ~0.866 scale.
      if (scale < 1.0) {
        scale = Math.pow(scale, 0.5);
      }

      // Clamp the scale between 0.4x and 2x
      scale = Math.max(0.4, Math.min(scale, 2));

      // Apply directly to body to bypass any CSS engine calc() bugs with CSS variables
      document.body.style.width = `${100 / scale}vw`;
      document.body.style.height = `${100 / scale}vh`;
      document.body.style.transform = `scale(${scale})`;
      document.body.style.transformOrigin = 'top left';
    };
    
    updateScale();
    window.addEventListener('resize', updateScale);
    
    return () => window.removeEventListener('resize', updateScale);
  }, []);
}
