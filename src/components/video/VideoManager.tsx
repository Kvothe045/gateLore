"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { 
  Play, Pause, Maximize, Minimize, Volume2, VolumeX, 
  Settings, Loader2, Rewind, FastForward, CheckCircle2,
  SkipBack, SkipForward 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePlayer } from "@/hooks/usePlayer";

interface VideoManagerProps {
  videoSrc: string;
  file: any; 
  onVideoEnded?: () => void;
  autoPlay?: boolean;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext?: boolean;
  hasPrev?: boolean;
}

export default function VideoManager({ 
  videoSrc, 
  file, 
  onVideoEnded, 
  autoPlay = true,
  onNext,
  onPrev,
  hasNext = true,
  hasPrev = true
}: VideoManagerProps) {
  // --- STATE ---
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); 
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // UX State
  const [showControls, setShowControls] = useState(true);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [doubleTapAction, setDoubleTapAction] = useState<'rewind' | 'forward' | null>(null);
  
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastTapTime = useRef<number>(0);
  const isSeeking = useRef(false);

  // Hook for keyboard shortcuts
  usePlayer(videoRef, (speed) => setPlaybackSpeed(speed));

  // --- CONTROLS VISIBILITY ---
  const handleShowControls = useCallback(() => {
    setShowControls(true);
    document.body.style.cursor = "auto";
    if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
    
    if (!isSeeking.current) {
      controlsTimeout.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
          if (isFullscreen) document.body.style.cursor = "none";
          setShowSpeedMenu(false);
        }
      }, 3000);
    }
  }, [isPlaying, isFullscreen]);

  useEffect(() => {
    handleShowControls();
    return () => { if (controlsTimeout.current) clearTimeout(controlsTimeout.current); };
  }, [handleShowControls]);

  // --- VIDEO ENGINE ---
  useEffect(() => {
    if (videoRef.current) {
      // Restore timestamp
      const savedTime = localStorage.getItem(`timestamp_${file.id}`);
      if (savedTime) videoRef.current.currentTime = parseFloat(savedTime);
      if (autoPlay) videoRef.current.play().catch(() => {});
    }
  }, [videoSrc, file.id, autoPlay]);

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    handleShowControls();
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || isSeeking.current) return;
    const ct = videoRef.current.currentTime;
    const dur = videoRef.current.duration;
    
    setCurrentTime(ct);
    setDuration(dur);
    setProgress((ct / dur) * 100);

    // Save progress every 5s
    if (Math.floor(ct) % 5 === 0) localStorage.setItem(`timestamp_${file.id}`, ct.toString());
    
    if (dur > 0 && ct >= dur - 1 && onVideoEnded) {
       onVideoEnded();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setProgress(val);
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = (val / 100) * videoRef.current.duration;
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const toggleFullscreen = async (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
      try { await (screen as any).orientation.lock('landscape'); } catch {}
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
      try { await (screen as any).orientation.unlock(); } catch {}
    }
  };

  // --- GESTURES ---
  const handleTap = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.controls-layer')) return;

    const now = Date.now();
    const rect = containerRef.current!.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const isLeft = x < rect.width * 0.3;
    const isRight = x > rect.width * 0.7;

    if (now - lastTapTime.current < 300) {
      // Double Tap
      if (isLeft) {
        if (videoRef.current) videoRef.current.currentTime -= 10;
        setDoubleTapAction('rewind');
      } else if (isRight) {
        if (videoRef.current) videoRef.current.currentTime += 10;
        setDoubleTapAction('forward');
      } else {
        togglePlay();
      }
      setTimeout(() => setDoubleTapAction(null), 600);
    } else {
      // Single Tap -> Toggle Controls
      if (showControls) {
          setShowControls(false); 
          setShowSpeedMenu(false);
      } else {
          handleShowControls();
      }
    }
    lastTapTime.current = now;
  };

  const formatTime = (s: number) => {
    if (isNaN(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black group select-none overflow-hidden flex items-center justify-center"
      onClick={handleTap}
      onMouseMove={handleShowControls}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* 1. VIDEO ELEMENT */}
      <video
        ref={videoRef}
        src={videoSrc}
        className="w-full h-full max-h-screen object-contain"
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setIsPlaying(true); }}
        onPause={() => setIsPlaying(false)}
        onEnded={onVideoEnded}
      />

      {/* 2. BUFFERING SPINNER */}
      <AnimatePresence>
        {buffering && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] z-10 pointer-events-none"
          >
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. DOUBLE TAP FEEDBACK */}
      <AnimatePresence>
        {doubleTapAction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute top-0 bottom-0 z-20 w-1/3 flex items-center justify-center bg-white/10 backdrop-blur-[1px] ${doubleTapAction === 'rewind' ? 'left-0 rounded-r-[50%]' : 'right-0 rounded-l-[50%]'}`}
          >
            <div className="flex flex-col items-center text-white">
                {doubleTapAction === 'rewind' ? <Rewind className="w-10 h-10 fill-current"/> : <FastForward className="w-10 h-10 fill-current"/>}
                <span className="text-xs font-bold mt-1">10s</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. CONTROLS LAYER */}
      <motion.div 
        className="controls-layer absolute inset-x-0 bottom-0 z-30 pt-32 pb-4 px-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: showControls ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="relative group/scrubber w-full h-4 flex items-center cursor-pointer mb-4">
            <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden">
                 <div className="h-full bg-indigo-500" style={{ width: `${progress}%` }} />
            </div>
            
            <div 
                className="absolute w-3.5 h-3.5 bg-white rounded-full shadow-md opacity-0 group-hover/scrubber:opacity-100 transition-opacity duration-200"
                style={{ left: `${progress}%`, transform: 'translateX(-50%)' }}
            />
            
            <input
                type="range" min="0" max="100" step="0.1"
                value={progress}
                onChange={handleSeek}
                onMouseDown={() => { isSeeking.current = true; }}
                onMouseUp={() => { isSeeking.current = false; handleShowControls(); }}
                onTouchStart={() => { isSeeking.current = true; }}
                onTouchEnd={() => { isSeeking.current = false; handleShowControls(); }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
        </div>

        <div className="flex items-center justify-between">
            
            {/* LEFT: Play, Prev, Next & Volume */}
            <div className="flex items-center gap-4">
                
                <div className="flex items-center gap-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onPrev?.(); }} 
                        disabled={!hasPrev}
                        className={`transition-colors p-1 ${hasPrev ? 'text-white hover:text-indigo-400' : 'text-white/30 cursor-not-allowed'}`}
                    >
                        <SkipBack className="w-5 h-5 fill-current"/>
                    </button>

                    <button onClick={togglePlay} className="text-white hover:text-indigo-400 transition-colors p-1">
                        {isPlaying ? <Pause className="w-6 h-6 fill-current"/> : <Play className="w-6 h-6 fill-current"/>}
                    </button>

                    <button 
                        onClick={(e) => { e.stopPropagation(); onNext?.(); }} 
                        disabled={!hasNext}
                        className={`transition-colors p-1 ${hasNext ? 'text-white hover:text-indigo-400' : 'text-white/30 cursor-not-allowed'}`}
                    >
                        <SkipForward className="w-5 h-5 fill-current"/>
                    </button>
                </div>

                {/* Time Display */}
                <div className="text-xs font-mono text-slate-300">
                    <span className="text-white">{formatTime(currentTime)}</span>
                    <span className="mx-1 text-slate-500">/</span>
                    <span>{formatTime(duration)}</span>
                </div>

                {/* Volume */}
                <div className="hidden md:flex items-center gap-2 group/vol">
                    <button onClick={() => { setIsMuted(!isMuted); if(videoRef.current) videoRef.current.muted = !isMuted; }} className="text-slate-300 hover:text-white">
                        {isMuted ? <VolumeX className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                    </button>
                    <div className="w-0 group-hover/vol:w-20 overflow-hidden transition-all duration-300">
                        <input 
                            type="range" min="0" max="1" step="0.1" 
                            value={isMuted ? 0 : volume}
                            onChange={(e) => { 
                                const v = parseFloat(e.target.value); 
                                setVolume(v); 
                                if(videoRef.current) videoRef.current.volume = v; 
                                setIsMuted(v===0);
                            }}
                            className="w-20 h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                        />
                    </div>
                </div>
            </div>

            {/* RIGHT: Speed & Fullscreen */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button 
                        onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-bold text-white border border-white/5 transition-colors"
                    >
                        <Settings className="w-3 h-3" /> {playbackSpeed}x
                    </button>
                    
                    <AnimatePresence>
                        {showSpeedMenu && (
                            <motion.div 
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute bottom-full right-0 mb-3 w-24 bg-zinc-900/95 backdrop-blur-md border border-white/10 rounded-lg shadow-xl overflow-hidden py-1"
                            >
                                {[1.0, 1.5, 2.0, 2.3, 2.5, 2.7, 2.83, 3, 3.15, 3.25, 3.35, 3.5].map(speed => (
                                    <button
                                        key={speed}
                                        onClick={() => { 
                                            setPlaybackSpeed(speed); 
                                            if(videoRef.current) videoRef.current.playbackRate = speed; 
                                            setShowSpeedMenu(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 text-xs hover:bg-white/10 ${playbackSpeed === speed ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}
                                    >
                                        {speed}x
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button onClick={toggleFullscreen} className="text-white hover:text-indigo-400 transition-colors p-1">
                    {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
                </button>
            </div>
        </div>
      </motion.div>
    </div>
  );
}