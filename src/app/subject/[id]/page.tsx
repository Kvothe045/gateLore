"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/constants/subjects";
import { usePlayer } from "@/hooks/usePlayer";
import { 
  CheckCircle2, Play, Download, ChevronLeft, 
  Zap, HelpCircle, X, Maximize, Loader2, Minimize, 
  Menu, ChevronDown, Clock, Rewind, FastForward,
  Film, FileText, Sparkles
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
  
  // Player
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [buffering, setBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showTips, setShowTips] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // UX State
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [doubleTapAnimation, setDoubleTapAnimation] = useState<'left' | 'right' | null>(null);

  // Progress
  const [watched, setWatched] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  usePlayer(videoRef, (speed) => setPlaybackSpeed(speed));
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

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

    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, [id, defaultSubject, router]);

  // --- CONTROLS VISIBILITY LOGIC ---
  const handleUserActivity = () => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 3000);
  };

  // --- DOUBLE TAP LOGIC ---
  const lastTapRef = useRef<number>(0);
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const width = rect.width;

      if (x < width * 0.35) {
        seek(-10);
        setDoubleTapAnimation('left');
        setTimeout(() => setDoubleTapAnimation(null), 600);
      } else if (x > width * 0.65) {
        seek(10);
        setDoubleTapAnimation('right');
        setTimeout(() => setDoubleTapAnimation(null), 600);
      } else {
        toggleFullscreen();
      }
    } else {
      handleUserActivity();
    }
    lastTapRef.current = now;
  };

  const seek = (seconds: number) => {
    if (videoRef.current) videoRef.current.currentTime += seconds;
  };

  // --- VIDEO LOGIC ---
  const playVideo = async (file: any) => {
    setBuffering(true);
    setActiveVideo(file);
    setIsMobileSidebarOpen(false); 
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    try {
      const res = await fetch("/api/sign-lore", {
        method: "POST",
        body: JSON.stringify({ id: file.id, topic_id: id, topic_name: subjectData?.name, filename: file.name })
      });
      const { token } = await res.json();
      setVideoSrc(`/api/lore-world?token=${encodeURIComponent(token)}`);
    } catch (e) { setBuffering(false); }
  };

  const onVideoLoaded = () => {
    setBuffering(false);
    if (!videoRef.current || !activeVideo) return;
    videoRef.current.playbackRate = playbackSpeed;
    const savedTime = localStorage.getItem(`timestamp_${activeVideo.id}`);
    if (savedTime) videoRef.current.currentTime = parseFloat(savedTime);
    videoRef.current.play();
    handleUserActivity();
  };

  const onTimeUpdate = () => {
    if (!videoRef.current || !activeVideo) return;
    const { currentTime, duration } = videoRef.current;
    if (!duration) return;
    if (Math.floor(currentTime) % 5 === 0) {
      localStorage.setItem(`timestamp_${activeVideo.id}`, currentTime.toString());
    }
    if ((currentTime / duration) > 0.9 && !watched.includes(String(activeVideo.id))) {
      const updated = [...watched, String(activeVideo.id)];
      setWatched(updated);
      localStorage.setItem(`watched_${id}`, JSON.stringify(updated));
    }
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerContainerRef.current.requestFullscreen();
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
    } catch (e) { alert("Security Check Failed."); }
  };

  if (!subjectData) return null;

  const videos = files.filter(f => f.type === 'video');
  const resources = files.filter(f => f.type !== 'video');
  const watchedCount = videos.filter(v => watched.includes(String(v.id))).length;
  const progressPercent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  return (
    <div className="h-screen bg-black text-slate-100 flex flex-col font-sans selection:bg-[#6366f1]/30 overflow-hidden">
      
      {/* NETFLIX-INSPIRED HEADER */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="backdrop-blur-md bg-black/90 border-b border-white/5 flex flex-col shrink-0 z-50"
      >
        <div className="px-4 sm:px-6 lg:px-8 py-3 lg:py-4">
          <div className="flex items-center justify-between gap-4">
            
            {/* Back + Logo */}
            <div className="flex items-center gap-3">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/")} 
                className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 shrink-0"
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back</span>
              </motion.button>
              
              <div className="hidden sm:block">
                <h1 className="text-xl lg:text-2xl font-black tracking-tight bg-gradient-to-r from-[#818cf8] to-[#c084fc] bg-clip-text text-transparent">
                  GATE LORES
                </h1>
              </div>
            </div>
            
            {/* Subject Name + Progress */}
            <div className="flex-1 max-w-md">
              <h2 className="text-sm sm:text-base font-semibold text-white mb-1.5 truncate">
                {subjectData.name}
              </h2>
              <div className="relative h-1 bg-neutral-800 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="h-full bg-gradient-to-r from-[#818cf8] to-[#c084fc] relative"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 animate-shimmer" />
                </motion.div>
              </div>
            </div>
            
            {/* Stats + Menu */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex items-baseline gap-1 text-sm">
                <span className="font-bold text-white">{watchedCount}</span>
                <span className="text-neutral-600">/</span>
                <span className="text-neutral-400">{videos.length}</span>
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
                className="lg:hidden p-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* NETFLIX-STYLE SIDEBAR */}
        <AnimatePresence>
          {(isMobileSidebarOpen || typeof window !== 'undefined' && window.innerWidth >= 1024) && (
            <>
              {isMobileSidebarOpen && (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setIsMobileSidebarOpen(false)} 
                  className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-40" 
                />
              )}
              <motion.aside
                initial={{ x: -400 }} 
                animate={{ x: 0 }} 
                exit={{ x: -400 }} 
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="w-full sm:w-80 lg:w-96 bg-neutral-950/98 lg:bg-neutral-950/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-50 lg:z-20 fixed lg:relative h-full"
              >
                <button 
                  onClick={() => setIsMobileSidebarOpen(false)} 
                  className="lg:hidden absolute top-4 right-4 p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors z-10 border border-white/10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                {/* Tabs */}
                <div className="flex border-b border-white/5 pt-16 lg:pt-0">
                  <button 
                    onClick={() => setActiveTab('modules')} 
                    className={`flex-1 py-3.5 text-xs font-semibold tracking-wide transition-all relative ${
                      activeTab === 'modules' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    MODULES
                    {activeTab === 'modules' && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#818cf8] to-[#c084fc]" 
                      />
                    )}
                  </button>
                  <button 
                    onClick={() => setActiveTab('resources')} 
                    className={`flex-1 py-3.5 text-xs font-semibold tracking-wide transition-all relative ${
                      activeTab === 'resources' ? 'text-white' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    RESOURCES
                    {activeTab === 'resources' && (
                      <motion.div 
                        layoutId="activeTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#818cf8] to-[#c084fc]" 
                      />
                    )}
                  </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1.5">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center p-10 gap-3">
                      <Loader2 className="w-6 h-6 animate-spin text-[#818cf8]"/>
                      <span className="text-xs text-neutral-500">Loading...</span>
                    </div>
                  ) : activeTab === 'modules' ? (
                    <div className="space-y-1.5">
                      {videos.length === 0 ? (
                        <div className="text-center py-12 text-neutral-600">
                          <Film className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">No modules available</p>
                        </div>
                      ) : (
                        videos.map((f, index) => {
                          const isWatched = watched.includes(String(f.id));
                          const isActive = activeVideo?.id === f.id;
                          
                          return (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              key={f.id} 
                              onClick={() => playVideo(f)} 
                              className={`group relative overflow-hidden rounded-md cursor-pointer transition-all duration-200 ${
                                isActive 
                                  ? 'bg-neutral-800 ring-1 ring-[#818cf8]/50' 
                                  : 'bg-neutral-900/50 hover:bg-neutral-800/70'
                              }`}
                            >
                              <div className="p-3 flex gap-3 items-center">
                                {/* Status */}
                                <div className="shrink-0">
                                  {isWatched ? (
                                    <div className="w-8 h-8 rounded bg-green-500/20 flex items-center justify-center">
                                      <CheckCircle2 className="w-4.5 h-4.5 text-green-400" />
                                    </div>
                                  ) : isActive ? (
                                    <div className="w-8 h-8 rounded bg-[#818cf8]/20 flex items-center justify-center">
                                      <div className="w-4.5 h-4.5 rounded bg-[#818cf8] animate-pulse" />
                                    </div>
                                  ) : (
                                    <div className="w-8 h-8 rounded bg-neutral-800 flex items-center justify-center group-hover:bg-neutral-700 transition-colors">
                                      <Play className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
                                    </div>
                                  )}
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-xs font-medium mb-0.5 truncate ${
                                    isActive ? 'text-white' : 'text-neutral-300 group-hover:text-white'
                                  }`}>
                                    {f.name.replace(/\.[^/.]+$/, "")}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                                    <span>{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                                    {isWatched && (
                                      <>
                                        <span>•</span>
                                        <span className="text-green-400">Watched</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {resources.length === 0 ? (
                        <div className="text-center py-12 text-neutral-600">
                          <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">No resources available</p>
                        </div>
                      ) : (
                        resources.map((f, index) => (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.03 }}
                            key={f.id} 
                            onClick={(e) => handleDownload(e, f)} 
                            className="group relative overflow-hidden flex gap-3 items-center p-3 rounded-md bg-neutral-900/50 hover:bg-neutral-800/70 cursor-pointer transition-all"
                          >
                            <div className="w-8 h-8 rounded bg-blue-500/20 flex items-center justify-center shrink-0">
                              <Download className="w-4 h-4 text-blue-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-neutral-300 group-hover:text-white mb-0.5 truncate">
                                {f.name}
                              </p>
                              <p className="text-[10px] text-neutral-600">Download</p>
                            </div>
                            <ChevronLeft className="w-4 h-4 text-neutral-600 group-hover:text-neutral-400 rotate-180 shrink-0" />
                          </motion.div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* MAIN PLAYER */}
        <main className="flex-1 bg-black relative flex flex-col items-center justify-center">
          {activeVideo ? (
            <div 
              ref={playerContainerRef} 
              className="relative w-full h-full flex items-center justify-center bg-black group"
              onMouseMove={handleUserActivity}
              onTouchStart={handleUserActivity}
              onClick={handleContainerClick}
            >
              
              {/* Double Tap Animations */}
              <AnimatePresence>
                {doubleTapAnimation === 'left' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }} 
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute left-[15%] z-50 pointer-events-none"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, times: [0, 0.5, 1] }}>
                          <Rewind className="w-8 h-8 text-white drop-shadow-2xl" />
                        </motion.div>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, times: [0, 0.5, 1], delay: 0.1 }}>
                          <Rewind className="w-8 h-8 text-white drop-shadow-2xl" />
                        </motion.div>
                      </div>
                      <span className="text-sm font-bold text-white drop-shadow-2xl">10 seconds</span>
                    </div>
                  </motion.div>
                )}
                {doubleTapAnimation === 'right' && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 1] }} 
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6 }}
                    className="absolute right-[15%] z-50 pointer-events-none"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex gap-1">
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, times: [0, 0.5, 1] }}>
                          <FastForward className="w-8 h-8 text-white drop-shadow-2xl" />
                        </motion.div>
                        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.6, times: [0, 0.5, 1], delay: 0.1 }}>
                          <FastForward className="w-8 h-8 text-white drop-shadow-2xl" />
                        </motion.div>
                      </div>
                      <span className="text-sm font-bold text-white drop-shadow-2xl">10 seconds</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buffering */}
              <AnimatePresence>
                {buffering && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-30 flex items-center justify-center bg-black/50"
                  >
                    <Loader2 className="w-12 h-12 text-[#818cf8] animate-spin" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Controls Overlay - Fades with video controls */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: controlsVisible ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute top-4 sm:top-6 right-4 sm:right-6 z-40 flex items-center gap-2"
              >
                {/* Help */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setShowTips(!showTips); }} 
                  className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-neutral-400 hover:text-white hover:bg-black/60 transition-all border border-white/10"
                >
                  <HelpCircle className="w-4.5 h-4.5" />
                </motion.button>
                
                {/* Speed */}
                <div className="relative">
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={(e) => { e.stopPropagation(); setShowSpeedMenu(!showSpeedMenu); }} 
                    className="px-3 py-2 bg-black/40 backdrop-blur-md rounded-lg text-xs font-semibold text-white border border-white/10 flex items-center gap-1.5 hover:bg-black/60 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> 
                    <span>{playbackSpeed}x</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showSpeedMenu ? 'rotate-180' : ''}`} />
                  </motion.button>
                  
                  <AnimatePresence>
                    {showSpeedMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: -8, scale: 0.95 }} 
                        animate={{ opacity: 1, y: 0, scale: 1 }} 
                        exit={{ opacity: 0, y: -8, scale: 0.95 }} 
                        className="absolute right-0 top-full mt-2 bg-neutral-900/98 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl overflow-hidden min-w-[100px]"
                      >
                        {speedOptions.map((speed) => (
                          <button 
                            key={speed} 
                            onClick={(e) => { e.stopPropagation(); changeSpeed(speed); }} 
                            className={`w-full px-4 py-2.5 text-xs font-medium text-left transition-colors ${
                              playbackSpeed === speed 
                                ? 'bg-[#818cf8]/20 text-[#818cf8]' 
                                : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                            }`}
                          >
                            {speed}x {playbackSpeed === speed && '✓'}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Fullscreen */}
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} 
                  className="p-2 bg-black/40 backdrop-blur-md rounded-lg text-neutral-400 hover:text-white hover:bg-black/60 border border-white/10 transition-all"
                >
                  {isFullscreen ? <Minimize className="w-4.5 h-4.5"/> : <Maximize className="w-4.5 h-4.5"/>}
                </motion.button>
              </motion.div>

              {/* Tips Modal */}
              <AnimatePresence>
                {showTips && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: -10 }} 
                    animate={{ opacity: 1, scale: 1, y: 0 }} 
                    exit={{ opacity: 0, scale: 0.9, y: -10 }} 
                    className="absolute top-20 sm:top-24 right-4 sm:right-6 z-50 bg-neutral-900/98 backdrop-blur-xl border border-white/10 p-5 rounded-xl shadow-2xl w-72"
                  >
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/10">
                      <span className="text-xs font-bold text-white tracking-wide">SHORTCUTS</span>
                      <button onClick={(e) => { e.stopPropagation(); setShowTips(false); }}>
                        <X className="w-4 h-4 text-neutral-500 hover:text-white transition-colors"/>
                      </button>
                    </div>
                    <div className="space-y-2.5 text-xs">
                      {[
                        { label: 'Play / Pause', key: 'SPACE' },
                        { label: 'Back 10s (or double tap left)', key: '←' },
                        { label: 'Forward 10s (or double tap right)', key: '→' },
                        { label: 'Speed Down', key: '[' },
                        { label: 'Speed Up', key: ']' },
                        { label: 'Fullscreen', key: 'F' },
                      ].map((s, i) => (
                        <div key={i} className="flex justify-between items-center py-2 px-2.5 rounded bg-white/5">
                          <span className="text-neutral-300 text-[11px]">{s.label}</span>
                          <kbd className="bg-neutral-800 px-2.5 py-1 rounded text-white text-[10px] font-mono border border-white/10">
                            {s.key}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <video 
                ref={videoRef} 
                src={videoSrc} 
                className="w-full h-full max-h-screen object-contain focus:outline-none" 
                controls 
                autoPlay 
                onLoadedData={onVideoLoaded} 
                onWaiting={() => setBuffering(true)} 
                onPlaying={() => setBuffering(false)} 
                onTimeUpdate={onTimeUpdate} 
                controlsList="nodownload" 
                playsInline 
              />
            </div>
          ) : (
            // INSPIRING IDLE STATE
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full px-6 text-center relative overflow-hidden max-w-2xl"
            >
              {/* Ambient Glow */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3]
                  }}
                  transition={{ 
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="w-96 h-96 bg-gradient-to-r from-[#818cf8]/20 to-[#c084fc]/20 rounded-full blur-[100px]"
                />
              </div>
              
              {/* Content */}
              <div className="relative z-10 space-y-8">
                
                {/* Animated Icon */}
                <motion.div 
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 2, -2, 0]
                  }}
                  transition={{ 
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="relative w-24 h-24 sm:w-32 sm:h-32 mx-auto"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#818cf8] to-[#c084fc] rounded-2xl shadow-2xl shadow-[#818cf8]/30 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                  </div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-2 border-2 border-dashed border-[#818cf8]/30 rounded-2xl"
                  />
                </motion.div>

                {/* Quote */}
                <div className="space-y-4">
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg sm:text-xl font-light text-neutral-400 leading-relaxed italic"
                  >
                    "If you don't sacrifice for what you want,
                  </motion.p>
                  <motion.p 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-xl sm:text-2xl font-semibold text-white leading-relaxed"
                  >
                    what you want becomes the sacrifice."
                  </motion.p>
                </div>

                {/* Stats Grid */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="grid grid-cols-2 gap-4 max-w-md mx-auto"
                >
                  <div className="bg-neutral-900/50 border border-white/5 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-white mb-1">{progressPercent}%</div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Complete</div>
                  </div>
                  <div className="bg-neutral-900/50 border border-white/5 rounded-lg p-4 backdrop-blur-sm">
                    <div className="text-3xl font-bold text-white mb-1">{watchedCount}/{videos.length}</div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide">Modules</div>
                  </div>
                </motion.div>

                {/* Deadline Info */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-center gap-2 text-sm text-neutral-400">
                    <Clock className="w-4 h-4 text-[#818cf8]" />
                    <span>Deadline: <span className="font-semibold text-white">{subjectData.endDate}</span></span>
                  </div>
                  
                  <p className="text-[10px] text-neutral-600 leading-relaxed max-w-md">
                    Deadlines exist due to the significant costs of hosting and maintaining this platform. 
                    Your commitment helps us continue providing quality educational content.
                  </p>
                </motion.div>

                {/* CTA for Mobile */}
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMobileSidebarOpen(true)}
                  className="lg:hidden mx-auto flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#818cf8] to-[#c084fc] text-white font-semibold rounded-lg shadow-lg shadow-[#818cf8]/30 transition-all"
                >
                  <Play className="w-4 h-4" />
                  <span>Start Learning</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </main>
      </div>

      <style jsx global>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(115, 115, 115, 0.3) transparent;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(115, 115, 115, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(115, 115, 115, 0.5);
        }
      `}</style>
    </div>
  );
}