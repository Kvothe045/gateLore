"use client";
import { useEffect, useState, useRef, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/constants/subjects";
import { usePlayer } from "@/hooks/usePlayer";
import { 
  CheckCircle2, Play, Download, ChevronLeft, 
  Zap, HelpCircle, X, Maximize, Loader2, Minimize, 
  Menu, ChevronDown, Clock, Rewind, FastForward,
  Sparkles, PlayCircle
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
  
  // Player State
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [buffering, setBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // Advanced Player UI State
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showTips, setShowTips] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [doubleTapFeedback, setDoubleTapFeedback] = useState<'rewind' | 'forward' | null>(null);
  const [progress, setProgress] = useState(0); // 0-100 for scrubber

  // Progress Data
  const [watched, setWatched] = useState<string[]>([]);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTapRef = useRef<number>(0);
  
  usePlayer(videoRef, (speed) => setPlaybackSpeed(speed));
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  // --- INIT ---
  useEffect(() => {
    if (!defaultSubject) return;
    setWatched(JSON.parse(localStorage.getItem(`watched_${id}`) || "[]"));

    // Fetch Stats & Files
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
  const showControlsBriefly = useCallback(() => {
    setControlsVisible(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (!videoRef.current?.paused) setControlsVisible(false);
    }, 3000); 
  }, []);

  useEffect(() => {
    return () => { if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current); };
  }, []);

  // --- DOUBLE TAP LOGIC ---
  const handleContainerClick = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      if (!videoRef.current || !playerContainerRef.current) return;
      let clientX;
      if ('touches' in e) clientX = e.touches[0].clientX;
      else clientX = (e as React.MouseEvent).clientX;

      const rect = playerContainerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const width = rect.width;

      if (x < width / 3) {
        videoRef.current.currentTime -= 10;
        setDoubleTapFeedback('rewind');
        setTimeout(() => setDoubleTapFeedback(null), 600);
        showControlsBriefly();
      } else if (x > (width * 2) / 3) {
        videoRef.current.currentTime += 10;
        setDoubleTapFeedback('forward');
        setTimeout(() => setDoubleTapFeedback(null), 600);
        showControlsBriefly();
      } else {
         if (videoRef.current.paused) videoRef.current.play();
         else videoRef.current.pause();
         showControlsBriefly();
      }
    } else {
       showControlsBriefly();
    }
    lastTapRef.current = now;
  };

  // --- PLAYER LOGIC ---
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
      showControlsBriefly();
    } catch (e) { setBuffering(false); }
  };

  const onVideoLoaded = () => {
    setBuffering(false);
    if (!videoRef.current || !activeVideo) return;
    videoRef.current.playbackRate = playbackSpeed;
    const savedTime = localStorage.getItem(`timestamp_${activeVideo.id}`);
    if (savedTime) videoRef.current.currentTime = parseFloat(savedTime);
    videoRef.current.play();
    showControlsBriefly();
  };

  const onTimeUpdate = () => {
    if (!videoRef.current || !activeVideo) return;
    const { currentTime, duration } = videoRef.current;
    if (!duration) return;
    
    setProgress((currentTime / duration) * 100);

    if (Math.floor(currentTime) % 5 === 0) {
      localStorage.setItem(`timestamp_${activeVideo.id}`, currentTime.toString());
    }
    if ((currentTime / duration) > 0.9 && !watched.includes(String(activeVideo.id))) {
      const updated = [...watched, String(activeVideo.id)];
      setWatched(updated);
      localStorage.setItem(`watched_${id}`, JSON.stringify(updated));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!videoRef.current) return;
    const time = (val / 100) * videoRef.current.duration;
    videoRef.current.currentTime = time;
    setProgress(val);
    showControlsBriefly();
  };

  const changeSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) videoRef.current.playbackRate = speed;
    setShowSpeedMenu(false);
    showControlsBriefly();
  };

  const toggleFullscreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else playerContainerRef.current.requestFullscreen();
    showControlsBriefly();
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
    <div className="h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-magenta-500/30 overflow-hidden">
      
      {/* 1. HEADER (Progress Bar) */}
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
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 via-magenta-500 to-green-500 shadow-[0_0_10px_rgba(219,39,119,0.8)] transition-all duration-1000 ease-out"
                 style={{ width: `${progressPercent}%` }}
               />
            </div>
            <span className="text-[10px] font-mono text-magenta-400/80 tracking-widest uppercase mt-0.5">
               Deadline: {subjectData.endDate}
            </span>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <div className="text-right hidden sm:block">
               <div className="text-xl md:text-2xl font-black text-white leading-none tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                 <span className="text-magenta-500">{watchedCount}</span> <span className="text-base md:text-lg text-slate-500">/</span> {videos.length}
               </div>
               <div className="text-[9px] md:text-[10px] font-bold text-slate-400 tracking-widest mt-1">LORES COMPLETED</div>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="md:hidden p-2 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        
        {/* 2. SIDEBAR */}
        <AnimatePresence>
          {(isMobileSidebarOpen || window.innerWidth >= 768) && (
            <>
              {isMobileSidebarOpen && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40" />
              )}
              <motion.aside
                initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="w-80 md:w-96 bg-zinc-950/95 md:bg-zinc-950/50 backdrop-blur-xl md:backdrop-blur-none border-r border-white/5 flex flex-col z-50 md:z-20 fixed md:relative h-full shadow-2xl md:shadow-none"
              >
                <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden absolute top-4 right-4 p-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
                
                <div className="flex border-b border-white/5 pt-12 md:pt-0">
                  <button onClick={() => setActiveTab('modules')} className={`flex-1 py-3 md:py-4 text-xs font-bold tracking-widest transition-colors ${activeTab === 'modules' ? 'text-white bg-white/5 border-b-2 border-magenta-500 shadow-[inset_0_-2px_10px_rgba(219,39,119,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}>MODULES</button>
                  <button onClick={() => setActiveTab('resources')} className={`flex-1 py-3 md:py-4 text-xs font-bold tracking-widest transition-colors ${activeTab === 'resources' ? 'text-white bg-white/5 border-b-2 border-blue-500 shadow-[inset_0_-2px_10px_rgba(59,130,246,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}>RESOURCES</button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
                   {loading ? (
                      <div className="flex justify-center p-10"><Loader2 className="animate-spin text-magenta-500"/></div>
                   ) : activeTab === 'modules' ? (
                      videos.map((f) => (
                        <div key={f.id} onClick={() => playVideo(f)} className={`p-3 md:p-4 rounded-lg cursor-pointer group flex gap-3 md:gap-4 items-center transition-all ${activeVideo?.id === f.id ? 'bg-magenta-500/10 border border-magenta-500/20 shadow-[0_0_15px_-5px_rgba(219,39,119,0.3)]' : 'bg-black/20 hover:bg-white/5 border border-transparent active:bg-white/10'}`}>
                          <div className={`w-4 h-4 md:w-5 md:h-5 rounded-full border flex items-center justify-center transition-all shrink-0 ${watched.includes(String(f.id)) ? 'bg-green-500 border-green-500 scale-110' : 'border-slate-700'}`}>
                            {watched.includes(String(f.id)) && <CheckCircle2 className="w-3 md:w-3.5 h-3 md:h-3.5 text-black" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs md:text-sm truncate ${activeVideo?.id === f.id ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>{f.name.replace(/\.[^/.]+$/, "")}</p>
                            <p className="text-[9px] md:text-[10px] font-mono text-slate-600 mt-1">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                          </div>
                          {activeVideo?.id === f.id && <Play className="w-3.5 md:w-4 h-3.5 md:h-4 text-magenta-500 fill-current animate-pulse shrink-0" />}
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
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* 3. MAIN PLAYER */}
        <main className="flex-1 bg-black relative flex flex-col items-center justify-center">
          {activeVideo ? (
            <div 
              ref={playerContainerRef} 
              className="relative w-full h-full flex items-center justify-center bg-black group overflow-hidden"
              onClick={handleContainerClick} 
              onMouseMove={showControlsBriefly}
              onTouchStart={showControlsBriefly}
            >
              <AnimatePresence>
                {buffering && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-10 md:w-12 h-10 md:h-12 text-magenta-500 animate-spin mb-2" />
                      <span className="text-xs font-mono text-magenta-300 tracking-[0.2em] animate-pulse">STREAMING...</span>
                    </div>
                  </div>
                )}
                
                {/* Double Tap Visual Feedback */}
                {doubleTapFeedback && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 1.5 }}
                    className={`absolute z-30 flex flex-col items-center justify-center p-6 bg-white/10 rounded-full backdrop-blur-md ${doubleTapFeedback === 'rewind' ? 'left-1/4' : 'right-1/4'}`}
                  >
                     {doubleTapFeedback === 'rewind' ? <Rewind className="w-8 h-8 text-white" /> : <FastForward className="w-8 h-8 text-white" />}
                     <span className="text-xs font-bold text-white mt-1">10s</span>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* CUSTOM OVERLAY CONTROLS */}
              <div className={`absolute inset-x-0 bottom-0 z-40 bg-gradient-to-t from-black/95 via-black/70 to-transparent pt-20 pb-4 px-4 sm:px-6 transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={(e) => e.stopPropagation()}>
                
                {/* SCRUBBER - Visible with your theme colors */}
                <div className="relative group/scrubber h-2 hover:h-3 transition-all cursor-pointer mb-6 flex items-center">
                    {/* Background Track */}
                    <div className="absolute inset-0 bg-white/20 rounded-full" />
                    
                    {/* Colored Fill (Blue -> Magenta) */}
                    <div 
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-magenta-500 rounded-full shadow-[0_0_10px_rgba(219,39,119,0.5)]" 
                        style={{ width: `${progress}%` }} 
                    />
                    
                    {/* Thumb */}
                    <div 
                        className="absolute h-4 w-4 bg-white rounded-full shadow-lg scale-0 group-hover/scrubber:scale-100 transition-transform z-10" 
                        style={{ left: `${progress}%`, transform: 'translateX(-50%)' }} 
                    />
                    
                    {/* Invisible Input for dragging */}
                    <input 
                        type="range" min="0" max="100" step="0.1" 
                        value={progress} onChange={handleSeek} 
                        className="absolute inset-0 w-full opacity-0 cursor-pointer z-20" 
                    />
                </div>

                <div className="flex items-center justify-between">
                    {/* Left Controls */}
                    <div className="flex items-center gap-4">
                        <button onClick={() => { if(videoRef.current?.paused) videoRef.current.play(); else videoRef.current?.pause(); }} className="hover:text-magenta-400 text-white transition-colors">
                            {videoRef.current?.paused ? <Play className="w-6 h-6 fill-current"/> : <div className="w-6 h-6 flex gap-1 justify-center"><div className="w-2 bg-current rounded"/><div className="w-2 bg-current rounded"/></div>}
                        </button>
                        <button onClick={() => setShowTips(!showTips)} className="text-slate-300 hover:text-white"><HelpCircle className="w-5 h-5"/></button>
                    </div>

                    {/* Right Controls */}
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <button onClick={() => setShowSpeedMenu(!showSpeedMenu)} className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded text-xs font-bold text-white border border-white/5 hover:bg-zinc-800">
                                <Zap className="w-3 h-3 text-yellow-400 fill-current" /> {playbackSpeed}x
                            </button>
                            <AnimatePresence>
                                {showSpeedMenu && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute bottom-full right-0 mb-2 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden min-w-[80px] pointer-events-auto">
                                        {speedOptions.map((speed) => (<button key={speed} onClick={() => changeSpeed(speed)} className={`block w-full text-left px-4 py-2 text-xs font-mono transition-colors ${playbackSpeed === speed ? 'bg-magenta-500/20 text-magenta-300 font-bold' : 'text-slate-300 hover:bg-white/5'}`}>{speed}x</button>))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={toggleFullscreen} className="p-2 md:p-2.5 bg-zinc-900/60 backdrop-blur rounded-full text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 shadow-lg active:scale-95 transition-all">
                            {isFullscreen ? (<Minimize className="w-4 md:w-5 h-4 md:h-5"/>) : (<Maximize className="w-4 md:w-5 h-4 md:h-5"/>)}
                        </button>
                    </div>
                </div>
              </div>

              {/* Tips Modal */}
              <AnimatePresence>{showTips && (<motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-16 md:top-20 right-3 md:right-6 z-50 bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl shadow-2xl w-64 md:w-72 pointer-events-auto"><div className="flex justify-between items-center mb-3 md:mb-4 pb-2 border-b border-white/10"><span className="text-xs font-black text-white tracking-widest">SHORTCUTS</span><button onClick={() => setShowTips(false)}><X className="w-4 h-4 text-slate-500 hover:text-white transition-colors"/></button></div><div className="space-y-2.5 md:space-y-3 text-xs font-mono text-slate-400"><div className="flex justify-between items-center"><span>PLAY/PAUSE</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">SPACE</kbd></div><div className="flex justify-between items-center"><span>SEEK ±10s</span> <div className="flex gap-1"><kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">←</kbd><kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">→</kbd></div></div><div className="flex justify-between items-center"><span>MOBILE SEEK</span> <span className="text-white text-[10px]">DOUBLE TAP SIDES</span></div></div></motion.div>)}</AnimatePresence>

              <video ref={videoRef} src={videoSrc} className="w-full h-full max-h-screen object-contain focus:outline-none drop-shadow-2xl" controls={false} autoPlay onLoadedData={onVideoLoaded} onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onTimeUpdate={onTimeUpdate} controlsList="nodownload" playsInline />
            </div>
          ) : (
            // --- IDLE STATE: "MODERN AESTHETIC" ---
            <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in w-full bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black">
              
              {/* Background Glow */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] animate-pulse"></div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-magenta-500/10 rounded-full blur-[80px]"></div>
              </div>

              {/* The "Breathing Void" Animation */}
              <div className="relative mb-12">
                 <motion.div 
                   animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }} 
                   transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                   className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-gradient-to-tr from-blue-600 to-magenta-600 blur-2xl opacity-50"
                 />
                 <div className="absolute inset-0 flex items-center justify-center">
                    <PlayCircle className="w-16 h-16 md:w-20 md:h-20 text-white/10" />
                 </div>
              </div>
              
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                <h2 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tight mb-6">
                  {subjectData.name}
                </h2>
                
                <p className="text-base md:text-xl text-slate-300 font-light leading-relaxed max-w-2xl mx-auto italic">
                  &quot;If you don&apos;t put <span className="text-white font-medium">everything you have</span> into achieving your dreams, you will end up <span className="text-white border-b border-magenta-500/50">regretting it</span> in life.&quot;
                </p>

                <div className="mt-10 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/5 bg-white/5 backdrop-blur-sm">
                   <Clock className="w-3 h-3 text-magenta-400" />
                   <span className="text-xs font-mono text-slate-400">SESSION DEADLINE: <span className="text-white">{subjectData.endDate}</span></span>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        @media (hover: none) and (pointer: coarse) { .group .opacity-0 { opacity: 1 !important; } }
      `}</style>
    </div>
  );
}