import { useEffect, RefObject } from 'react';

export const usePlayer = (videoRef: RefObject<HTMLVideoElement | null>, onSpeedChange?: (speed: number) => void) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const v = videoRef.current;
      if (!v) return;

      // Prevent default scrolling
      if ([' ', 'ArrowRight', 'ArrowLeft'].includes(e.key)) e.preventDefault();

      switch(e.key) {
        case ' ': v.paused ? v.play() : v.pause(); break;
        case 'ArrowRight': v.currentTime += 10; break;
        case 'ArrowLeft': v.currentTime -= 10; break;
        // New Speed Controls
        case ']': 
          if (v.playbackRate < 3.0) {
            const newSpeed = +(v.playbackRate + 0.1).toFixed(1);
            v.playbackRate = newSpeed;
            onSpeedChange?.(newSpeed);
          }
          break;
        case '[': 
          if (v.playbackRate > 0.5) {
            const newSpeed = +(v.playbackRate - 0.1).toFixed(1);
            v.playbackRate = newSpeed;
            onSpeedChange?.(newSpeed);
          }
          break;
        case 'f': 
          // Find the container parent to fullscreen ONLY the wrapper
          const container = v.parentElement;
          if (document.fullscreenElement) document.exitFullscreen();
          else if (container) container.requestFullscreen(); 
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [videoRef, onSpeedChange]);
};