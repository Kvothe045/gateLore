"use client";
import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/constants/subjects";
import { usePlayer } from "@/hooks/usePlayer";
import { 
  CheckCircle2, Play, Download, ChevronLeft, 
  Zap, HelpCircle, X, Maximize, Loader2, Minimize, 
  Menu, Rewind, FastForward,
  Server, Smartphone, Volume2, VolumeX, Volume1
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const subjectId = parseInt(id);
  const defaultSubject = SUBJECTS.find(s => s.id === subjectId);

  // --- STATE ---
  const [subjectData, setSubjectData] = useState<any>(defaultSubject);
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'resources'>('modules');
  
  // --- VIDEO ENGINE STATE ---
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Sidebar State
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  
  // UX State
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'rewind' | 'forward' | null>(null);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [watched, setWatched] = useState<string[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tapTimeoutRef = useRef<NodeJS.Timeout | null>(null); 
  const lastTapTimeRef = useRef<number>(0);
  const isSeeking = useRef(false);
  
  usePlayer(videoRef, (speed) => setPlaybackSpeed(speed));
  
  const speedOptions = [1.0, 1.25, 1.5, 1.75, 2.0, 2.25, 2.5];

  // --- INIT ---
  useEffect(() => {
    if (!defaultSubject) return;
    setWatched(JSON.parse(localStorage.getItem(`watched_${id}`) || "[]"));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/system-stats`, {
        headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
    }).then(res => res.json()).then(stats => {
        const remoteSub = stats.subjects.find((s:any) => s.id === subjectId);
        if(remoteSub) setSubjectData(remoteSub);
    }).catch(() => {}); 

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/init?topic_id=${id}&topic_name=${defaultSubject.name}`, {
      headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
    })
    .then(res => res.json())
    .then(data => setFiles(data))
    .catch(() => router.push("/"))
    .finally(() => setLoading(false));

    const onFSChange = () => {
        const isFS = !!document.fullscreenElement;
        setIsFullscreen(isFS);
        if(!isFS) unlockOrientation();
    };
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, [id, defaultSubject, router]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeVideo || !videoRef.current) return;

      switch(e.key) {
        case "ArrowUp":
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.min(1, prev + 0.1);
            if(videoRef.current) videoRef.current.volume = newVol;
            setIsMuted(newVol === 0);
            return newVol;
          });
          showControls();
          break;
        case "ArrowDown":
          e.preventDefault();
          setVolume(prev => {
            const newVol = Math.max(0, prev - 0.1);
            if(videoRef.current) videoRef.current.volume = newVol;
            setIsMuted(newVol === 0);
            return newVol;
          });
          showControls();
          break;
        case "m":
        case "M":
          toggleMute();
          showControls();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeVideo]);

  // --- ORIENTATION LOCK ---
  const lockOrientation = async () => {
    const screenAny = window.screen as any;
    if (screenAny.orientation && screenAny.orientation.lock) {
      try { await screenAny.orientation.lock('landscape'); } catch (e) {}
    }
  };
  const unlockOrientation = async () => {
    const screenAny = window.screen as any;
    if (screenAny.orientation && screenAny.orientation.unlock) {
      try { await screenAny.orientation.unlock(); } catch (e) {}
    }
  };

  // --- CONTROL VISIBILITY ---
  const showControls = useCallback(() => {
    setControlsVisible(true);
    document.body.style.cursor = 'auto';
    
    // Clear existing timer
    if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
    }
    
    // Set new timer: Hide after 3 seconds, UNLESS user is dragging the scrubber
    if (!isSeeking.current) {
      controlsTimeoutRef.current = setTimeout(() => {
        setControlsVisible(false);
        if (isFullscreen) document.body.style.cursor = 'none';
        setShowSpeedMenu(false);
      }, 5000);
    }
  }, [isFullscreen]);

  // Ensure controls stay up when interacting with menus
  useEffect(() => {
    if (showTips || showSpeedMenu) {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      setControlsVisible(true);
    }
  }, [showTips, showSpeedMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
    };
  }, []);

  // --- TAP HANDLER ---
  const handleTap = useCallback((clientX: number) => {
    if (!playerContainerRef.current || !videoRef.current) return;

    // Dismiss menu if open
    setShowSpeedMenu(false);

    const rect = playerContainerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const width = rect.width;
    
    // Zone definitions for double tap
    const isLeft = x < width * 0.35;
    const isRight = x > width * 0.65;
    
    const now = Date.now();
    const timeDiff = now - lastTapTimeRef.current;
    
    if (timeDiff < 300) {
      // --- DOUBLE TAP ---
      if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
      
      if (isLeft) {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        setDoubleTapFeedback('rewind');
        setTimeout(() => setDoubleTapFeedback(null), 500); 
      } else if (isRight) {
        videoRef.current.currentTime = Math.min(videoRef.current.duration, videoRef.current.currentTime + 10);
        setDoubleTapFeedback('forward');
        setTimeout(() => setDoubleTapFeedback(null), 500); 
      } else {
        togglePlayPause();
      }
      
      // Update UI immediately
      setCurrentTime(videoRef.current.currentTime);
      setProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
      showControls(); // Ensure controls show on double tap

    } else {
      // --- SINGLE TAP ---
      // Wait to confirm it's not a double tap
      tapTimeoutRef.current = setTimeout(() => {
        if (controlsVisible) {
           // If visible -> Hide
           setControlsVisible(false);
           if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        } else {
           // If hidden -> Show (this starts the 3s timer)
           showControls();
        }
      }, 300);
    }

    lastTapTimeRef.current = now;
  }, [controlsVisible, showControls]);

  const handleContainerClick = (e: React.MouseEvent) => {
    // Ignore clicks on actual buttons/inputs
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input')) return;
    
    // Pass to tap handler
    handleTap(e.clientX);
  };

  const togglePlayPause = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  }, []);

  // --- VOLUME LOGIC ---
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseFloat(e.target.value);
    setVolume(newVol);
    if (videoRef.current) {
        videoRef.current.volume = newVol;
        setIsMuted(newVol === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newState = !isMuted;
    videoRef.current.muted = newState;
    setIsMuted(newState);
    
    if (!newState && volume === 0) {
        setVolume(0.5);
        videoRef.current.volume = 0.5;
    }
  };

  // --- PLAYBACK LOGIC ---
  const playVideo = async (file: any) => {
    setBuffering(true);
    setActiveVideo(file);
    setIsMobileSidebarOpen(false);
    setControlsVisible(true);
    
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    
    try {
      const res = await fetch("/api/sign-lore", {
        method: "POST",
        body: JSON.stringify({ id: file.id, topic_id: id, topic_name: subjectData?.name, filename: file.name })
      });
      const { token } = await res.json();
      setVideoSrc(`/api/lore-world?token=${encodeURIComponent(token)}`);
    } catch (e) {
      setBuffering(false);
    }
  };

  const onVideoLoaded = () => {
    if (!videoRef.current || !activeVideo) return;
    setDuration(videoRef.current.duration);
    videoRef.current.playbackRate = playbackSpeed;
    videoRef.current.volume = volume;
    
    const savedTime = localStorage.getItem(`timestamp_${activeVideo.id}`);
    if (savedTime) videoRef.current.currentTime = parseFloat(savedTime);
    videoRef.current.play().catch(() => {});
  };

  const onVideoPlay = () => {
    setIsPlaying(true);
    setBuffering(false);
    showControls();
  };

  const onVideoPause = () => {
    setIsPlaying(false);
    setControlsVisible(true);
    // Even on pause, we want the controls to eventually fade if there's no activity, 
    // but showControls handles the 3s timeout now.
    showControls();
  };

  const onVideoWaiting = () => setBuffering(true);
  const onVideoCanPlay = () => setBuffering(false);

  const onTimeUpdate = () => {
    if (!videoRef.current || !activeVideo || isSeeking.current) return;
    const { currentTime: ct, duration: dur } = videoRef.current;
    if (!dur) return;
    
    setCurrentTime(ct);
    setProgress((ct / dur) * 100);

    if (Math.floor(ct) % 5 === 0) {
      localStorage.setItem(`timestamp_${activeVideo.id}`, ct.toString());
    }
    
    if ((ct / dur) > 0.9 && !watched.includes(String(activeVideo.id))) {
      const updated = [...watched, String(activeVideo.id)];
      setWatched(updated);
      localStorage.setItem(`watched_${id}`, JSON.stringify(updated));
    }
  };

  const handleSeekStart = () => {
    isSeeking.current = true;
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    setControlsVisible(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    const time = (val / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(val);
    setCurrentTime(time);
  };

  const handleSeekEnd = () => {
    isSeeking.current = false;
    showControls();
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(true); 
  };

  const toggleSidebar = () => {
    if (window.innerWidth < 768) {
        setIsMobileSidebarOpen(!isMobileSidebarOpen);
    } else {
        setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
    }
  };

  const toggleFullscreen = async () => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      await playerContainerRef.current.requestFullscreen();
      if (window.innerWidth < 768) lockOrientation();
    } else {
      await document.exitFullscreen();
      unlockOrientation();
    }
    showControls();
  };

  const handleDownload = async (e: React.MouseEvent, file: any) => {
    e.stopPropagation();
    try {
      const res = await fetch("/api/sign-lore", {
        method: "POST",
        body: JSON.stringify({ id: file.id, topic_id: id, topic_name: subjectData?.name, filename: file.name })
      });
      const { token } = await res.json();
      window.open(`/api/lore-world?token=${encodeURIComponent(token)}`, '_blank');
    } catch (e) {
      alert("Security Check Failed.");
    }
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const SidebarContent = () => (
    <>
        <div className="flex border-b border-white/5 pt-12 md:pt-0 shrink-0 bg-zinc-950">
          <button onClick={() => setActiveTab('modules')} className={`flex-1 py-3 md:py-4 text-xs font-bold tracking-widest transition-colors ${activeTab === 'modules' ? 'text-white bg-white/5 border-b-2 border-indigo-500' : 'text-slate-600 hover:text-slate-400'}`}>MODULES</button>
          <button onClick={() => setActiveTab('resources')} className={`flex-1 py-3 md:py-4 text-xs font-bold tracking-widest transition-colors ${activeTab === 'resources' ? 'text-white bg-white/5 border-b-2 border-blue-500' : 'text-slate-600 hover:text-slate-400'}`}>RESOURCES</button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 bg-zinc-950/50">
           {loading ? (
              <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500"/></div>
           ) : activeTab === 'modules' ? (
              videos.map((f) => (
                <div key={f.id} onClick={() => playVideo(f)} className={`p-3 md:p-4 rounded-lg cursor-pointer group flex gap-3 md:gap-4 items-center transition-all ${activeVideo?.id === f.id ? 'bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)]' : 'bg-black/20 hover:bg-white/5 border border-transparent active:bg-white/10'}`}>
                  <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${watched.includes(String(f.id)) ? 'bg-green-500 border-green-500 scale-110' : 'border-slate-700'}`}>
                    {watched.includes(String(f.id)) && <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5 text-black" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs md:text-sm truncate ${activeVideo?.id === f.id ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>{f.name.replace(/\.[^/.]+$/, "")}</p>
                    <p className="text-[9px] md:text-[10px] font-mono text-slate-600 mt-1">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  {activeVideo?.id === f.id && <Play className="w-3.5 md:w-4 h-3.5 md:h-4 text-indigo-500 fill-current animate-pulse shrink-0" />}
                </div>
              ))
           ) : (
              resources.map((f) => (
                <div key={f.id} onClick={(e) => handleDownload(e, f)} className="flex gap-3 md:gap-4 items-center p-3 md:p-4 rounded-lg bg-black/20 hover:bg-white/5 border border-transparent hover:border-blue-500/30 cursor-pointer group transition-all active:bg-white/10">
                  <div className="p-2 bg-blue-500/10 rounded text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(59,130,246,0.1)] shrink-0"><Download className="w-3.5 md:w-4 h-3.5 md:h-4" /></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-slate-300 group-hover:text-white font-medium truncate">{f.name}</p>
                    <p className="text-[9px] md:text-[10px] text-slate-600 mt-1">SECURE DOWNLOAD</p>
                  </div>
                </div>
              ))
           )}
        </div>
    </>
  );

  if (!subjectData) return null;

  const videos = files.filter(f => f.type === 'video');
  const resources = files.filter(f => f.type !== 'video');
  const watchedCount = videos.filter(v => watched.includes(String(v.id))).length;
  const progressPercent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  return (
    <div className="h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-indigo-500/30 overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-zinc-950 border-b border-white/5 flex flex-col shrink-0 z-50 py-3 md:py-4 px-4 md:px-6 relative shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-3 md:px-4 py-2 rounded-full border border-white/5 hover:bg-white/10 shrink-0">
            <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">DEN</span>
          </button>
          
          <div className="flex flex-col items-center gap-1.5 md:gap-2 flex-1 min-w-0">
            <h1 className="text-sm md:text-xl font-black tracking-tight text-white uppercase truncate max-w-full">
              {subjectData.name}
            </h1>
            <div className="w-full max-w-xs md:max-w-sm lg:w-96 h-1.5 md:h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10 relative">
               <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out" style={{ width: `${progressPercent}%` }} />
            </div>
            <span className="text-[10px] font-mono text-indigo-300 tracking-widest uppercase mt-0.5">
               Deadline: {subjectData.endDate}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
               <div className="text-xl md:text-2xl font-black text-white leading-none tracking-tight">
                 <span className="text-indigo-400">{watchedCount}</span> <span className="text-base md:text-lg text-slate-500">/</span> {videos.length}
               </div>
               <div className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-widest mt-1">LORES COMPLETED</div>
            </div>
            <button onClick={toggleSidebar} className="p-2 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* MOBILE SIDEBAR (OVERLAY) */}
        <AnimatePresence>
            {isMobileSidebarOpen && (
            <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50" />
                <motion.aside
                initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="md:hidden w-80 bg-zinc-950/95 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 fixed inset-y-0 left-0 h-full shadow-2xl"
                >
                <button onClick={() => setIsMobileSidebarOpen(false)} className="absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
                <SidebarContent />
                </motion.aside>
            </>
            )}
        </AnimatePresence>

        {/* DESKTOP SIDEBAR (COLLAPSIBLE) */}
        <motion.div 
            initial={false}
            animate={{ width: isDesktopSidebarOpen ? "24rem" : "0rem", opacity: isDesktopSidebarOpen ? 1 : 0 }} 
            className="hidden md:flex flex-col bg-zinc-950 border-r border-white/5 overflow-hidden relative"
        >
            <div className="w-96 flex flex-col h-full">
                <SidebarContent />
            </div>
        </motion.div>

        {/* MAIN PLAYER */}
        <main className="flex-1 bg-black relative flex flex-col items-center justify-center min-w-0">
          {activeVideo ? (
            <div 
              ref={playerContainerRef} 
              className="relative w-full h-full flex items-center justify-center bg-black group overflow-hidden select-none"
              onClick={handleContainerClick}
              onMouseMove={showControls}
            >
              {/* BUFFERING OVERLAY */}
              <AnimatePresence>
                {buffering && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px] pointer-events-none"
                  >
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 md:w-12 h-10 md:h-12 text-indigo-500 animate-spin mb-2" />
                      <span className="text-xs font-mono text-indigo-300 tracking-[0.2em] animate-pulse">STREAMING...</span>
                    </div>
                  </motion.div>
                )}
                
                {/* DOUBLE TAP ANIMATION */}
                {doubleTapFeedback === 'rewind' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute left-0 top-0 bottom-0 w-[40%] bg-gradient-to-r from-white/10 to-transparent z-20 flex items-center justify-center rounded-r-[100px] pointer-events-none"
                  >
                    <div className="flex flex-col items-center">
                        <Rewind className="w-8 h-8 md:w-10 md:h-10 text-white mb-1 drop-shadow-lg" />
                        <span className="text-xs font-bold text-white drop-shadow-lg">10s</span>
                    </div>
                  </motion.div>
                )}

                {doubleTapFeedback === 'forward' && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                    className="absolute right-0 top-0 bottom-0 w-[40%] bg-gradient-to-l from-white/10 to-transparent z-20 flex items-center justify-center rounded-l-[100px] pointer-events-none"
                  >
                     <div className="flex flex-col items-center">
                        <FastForward className="w-8 h-8 md:w-10 md:h-10 text-white mb-1 drop-shadow-lg" />
                        <span className="text-xs font-bold text-white drop-shadow-lg">10s</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* VIDEO ELEMENT */}
              <video 
                ref={videoRef} 
                src={videoSrc} 
                className="w-full h-full max-h-screen object-contain focus:outline-none drop-shadow-2xl" 
                controls={false}
                onLoadedMetadata={onVideoLoaded}
                onPlay={onVideoPlay}
                onPause={onVideoPause}
                onWaiting={onVideoWaiting}
                onCanPlay={onVideoCanPlay}
                onTimeUpdate={onTimeUpdate}
                controlsList="nodownload" 
                playsInline 
              />

              {/* CONTROLS OVERLAY */}
              <div 
                className={`absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-20 pb-4 px-4 sm:px-6 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {/* SCRUBBER */}
                <div className="relative group/scrubber h-1.5 hover:h-2.5 transition-all cursor-pointer mb-6 flex items-center">
                    <div className="absolute inset-0 bg-white/20 rounded-full" />
                    <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
                    <div className="absolute h-4 w-4 bg-white rounded-full shadow-[0_0_10px_rgba(0,0,0,0.5)] z-20 transition-all" style={{ left: `${progress}%`, transform: 'translateX(-50%)' }} />
                    <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="0.1" 
                        value={progress} 
                        onChange={handleSeek}
                        onMouseDown={handleSeekStart}
                        onTouchStart={handleSeekStart}
                        onMouseUp={handleSeekEnd}
                        onTouchEnd={handleSeekEnd}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-30 range-input-hidden-thumb" 
                    />
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        {/* PLAY/PAUSE */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); togglePlayPause(); }} 
                          className="hover:text-indigo-400 text-white transition-colors"
                        >
                            {isPlaying ? (
                              <div className="w-8 h-8 flex gap-1 justify-center items-center">
                                <div className="w-2.5 h-6 bg-current rounded"/>
                                <div className="w-2.5 h-6 bg-current rounded"/>
                              </div>
                            ) : (
                              <Play className="w-8 h-8 fill-current"/>
                            )}
                        </button>

                        {/* VOLUME CONTROL (Slider Hidden on Mobile) */}
                        <div className="group/volume flex items-center gap-0 w-8 sm:hover:w-32 transition-all duration-300 overflow-hidden">
                           <button onClick={(e) => { e.stopPropagation(); toggleMute(); }} className="hover:text-indigo-400 text-white mr-2 shrink-0">
                              {isMuted || volume === 0 ? <VolumeX className="w-6 h-6"/> : volume < 0.5 ? <Volume1 className="w-6 h-6"/> : <Volume2 className="w-6 h-6"/>}
                           </button>
                           <input 
                             type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} onClick={(e) => e.stopPropagation()}
                             className="w-0 sm:group-hover/volume:w-20 h-1 bg-white/30 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white transition-all duration-300 hidden sm:block opacity-0 sm:group-hover/volume:opacity-100"
                           />
                        </div>
                        
                        {/* TIME */}
                        <div className="flex items-center gap-1.5 text-sm font-mono text-slate-300">
                          <span className="text-white font-bold">{formatTime(currentTime)}</span>
                          <span className="text-slate-600">/</span>
                          <span className="text-slate-400">{formatTime(duration)}</span>
                        </div>
                        
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowTips(!showTips); }} 
                          className="text-slate-300 hover:text-white"
                        >
                          <HelpCircle className="w-5 h-5"/>
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }} 
                              className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs font-bold text-white border border-white/5 hover:bg-zinc-800"
                            >
                                <Zap className="w-3 h-3 text-yellow-400 fill-current" /> {playbackSpeed}x
                            </button>
                            <AnimatePresence>
                                {showSpeedMenu && (
                                    <motion.div 
                                      initial={{ opacity: 0, y: -10 }} 
                                      animate={{ opacity: 1, y: 0 }} 
                                      exit={{ opacity: 0, y: -10 }} 
                                      className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden min-w-[80px] shadow-2xl"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                        {speedOptions.map((speed) => (
                                          <button 
                                            key={speed} 
                                            onClick={(e) => { e.stopPropagation(); changeSpeed(speed); }} 
                                            className={`block w-full text-left px-4 py-2.5 text-xs font-mono transition-colors ${playbackSpeed === speed ? 'bg-indigo-500/20 text-indigo-300 font-bold' : 'text-slate-300 hover:bg-white/5'}`}
                                          >
                                            {speed}x
                                          </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} 
                          className="p-2 md:p-2.5 bg-zinc-900/60 backdrop-blur rounded-full text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 shadow-lg active:scale-95 transition-all"
                        >
                            {isFullscreen ? (<Minimize className="w-6 h-6"/>) : (<Maximize className="w-6 h-6"/>)}
                        </button>
                    </div>
                </div>
              </div>

              {/* TIPS OVERLAY */}
              <AnimatePresence>
                {showTips && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9 }} 
                    className="absolute top-16 md:top-20 right-3 md:right-6 z-50 bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl shadow-2xl w-64 md:w-72"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex justify-between items-center mb-3 md:mb-4 pb-2 border-b border-white/10">
                      <span className="text-xs font-black text-white tracking-widest">SHORTCUTS</span>
                      <button onClick={() => setShowTips(false)}>
                        <X className="w-4 h-4 text-slate-500 hover:text-white transition-colors"/>
                      </button>
                    </div>
                    <div className="space-y-2.5 md:space-y-3 text-xs font-mono text-slate-400">
                      <div className="flex justify-between items-center">
                        <span>PLAY/PAUSE</span> 
                        <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">SPACE</kbd>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>SEEK ±10s</span> 
                        <div className="flex gap-1">
                          <kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">←</kbd>
                          <kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">→</kbd>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>VOLUME ±10%</span> 
                        <div className="flex gap-1">
                          <kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">↑</kbd>
                          <kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">↓</kbd>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span>MOBILE SEEK</span> 
                        <span className="text-white text-[10px]">DOUBLE TAP SIDES</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            // IDLE STATE
            <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900 via-black to-black">
              <div className="relative mb-14">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} className="w-64 h-64 rounded-full border border-white/5 border-dashed" />
                 <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }} transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/10 rounded-full blur-3xl" />
                 <motion.div initial={{ height: 0 }} animate={{ height: 80 }} transition={{ duration: 1.5, ease: "easeOut" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] bg-gradient-to-b from-transparent via-white/40 to-transparent" />
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2">
                    <span className="text-[10px] font-mono text-slate-500 tracking-[0.3em] uppercase">Gateway</span>
                    <span className="text-[10px] font-mono text-indigo-500 tracking-widest uppercase">Online</span>
                 </div>
              </div>
              
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/20 tracking-tighter mb-6">
                  {subjectData.name}
                </h2>
                <div className="relative max-w-xl mx-auto">
                  <span className="absolute -top-4 -left-4 text-4xl text-white/5 font-serif">"</span>
                  <p className="text-base md:text-xl text-slate-300 font-light leading-relaxed italic tracking-wide">
                    If you don&apos;t put <span className="text-white font-medium">everything you have</span> into achieving your dreams, you will end up <span className="text-white border-b border-indigo-500/50 pb-0.5">regretting it</span> in life.
                  </p>
                  <span className="absolute -bottom-4 -right-4 text-4xl text-white/5 font-serif">"</span>
                </div>
                <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden mt-10 px-8 py-3 bg-white text-black font-bold rounded-full text-xs tracking-[0.2em] uppercase hover:scale-105 transition-transform flex items-center justify-center gap-2 mx-auto"><Smartphone className="w-4 h-4" /> Initialize</button>
                <div className="mt-16 flex items-start justify-center gap-3 max-w-md mx-auto opacity-50 hover:opacity-100 transition-opacity">
                   <Server className="w-3 h-3 text-indigo-500 shrink-0 mt-0.5" />
                   <p className="text-[9px] font-mono text-slate-500 text-left leading-relaxed"><span className="text-indigo-400 font-bold">SYSTEM NOTICE:</span> Content will be purged immediately after the deadline to reallocate bandwidth. Completion is mandatory.</p>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .range-input-hidden-thumb::-webkit-slider-thumb { -webkit-appearance: none; opacity: 0; }
        .range-input-hidden-thumb::-moz-range-thumb { opacity: 0; }
        .range-input-hidden-thumb::-ms-thumb { opacity: 0; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
      `}</style>
    </div>
  );
}