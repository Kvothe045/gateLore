"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/constants/subjects";
import { usePlayer } from "@/hooks/usePlayer";
import { 
  CheckCircle2, Play, Download, ChevronLeft, 
  Zap, HelpCircle, X, Maximize, Loader2, Minimize, 
  Menu, ChevronDown, Clock, Rewind, FastForward
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
  
  // Seek Animation State
  const [seekOverlay, setSeekOverlay] = useState<'forward' | 'backward' | null>(null);

  // Progress
  const [watched, setWatched] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const lastTapRef = useRef<number>(0);
  
  usePlayer(videoRef, (speed) => setPlaybackSpeed(speed));
  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

  // --- INIT ---
  useEffect(() => {
    if (!defaultSubject) return;
    setWatched(JSON.parse(localStorage.getItem(`watched_${id}`) || "[]"));

    // Fetch Init Data
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/system-stats`, {
        headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
    }).then(res => res.json()).then(stats => {
        const remoteSub = stats.subjects.find((s:any) => s.id === subjectId);
        if(remoteSub) setSubjectData(remoteSub);
    }).catch(() => {});

    // Fetch Files
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

  // --- LOGIC ---
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

  // --- MOBILE DOUBLE TAP LOGIC ---
  const handleTouch = (e: React.TouchEvent | React.MouseEvent, direction: 'forward' | 'backward') => {
    const now = Date.now();
    const DOUBLE_TAP_DELAY = 300;
    
    if (now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      // Double tap detected
      if (videoRef.current) {
        videoRef.current.currentTime += (direction === 'forward' ? 10 : -10);
        setSeekOverlay(direction);
        setTimeout(() => setSeekOverlay(null), 600);
      }
    } else {
      // Single tap (toggle controls if needed, usually handled by video element naturally)
    }
    lastTapRef.current = now;
  };

  if (!subjectData) return null;

  const videos = files.filter(f => f.type === 'video');
  const resources = files.filter(f => f.type !== 'video');
  const watchedCount = videos.filter(v => watched.includes(String(v.id))).length;
  const progressPercent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  return (
    <div className="h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-magenta-500/30 overflow-hidden">
      
      {/* 1. HEADER */}
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
               <div className="text-xl md:text-2xl font-black text-white leading-none tracking-tight">
                 <span className="text-magenta-500">{watchedCount}</span> <span className="text-base md:text-lg text-slate-500">/</span> {videos.length}
               </div>
            </div>
            <div className="sm:hidden text-right">
              <div className="text-lg font-black text-white leading-none">
                <span className="text-magenta-500">{watchedCount}</span><span className="text-sm text-slate-500">/</span>{videos.length}
              </div>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} className="md:hidden p-2 bg-white/5 rounded-full border border-white/5 hover:bg-white/10 transition-colors">
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {/* 2. SIDEBAR (Mobile Responsive) */}
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
        <main className="flex-1 bg-black relative flex flex-col items-center justify-center overflow-hidden">
          {activeVideo ? (
            <div ref={playerContainerRef} className="relative w-full h-full flex items-center justify-center bg-black group select-none">
              
              {/* Invisible Touch Zones for Double Tap */}
              <div 
                className="absolute left-0 top-0 bottom-16 w-1/3 z-20"
                onClick={(e) => handleTouch(e, 'backward')} 
              />
              <div 
                className="absolute right-0 top-0 bottom-16 w-1/3 z-20"
                onClick={(e) => handleTouch(e, 'forward')} 
              />

              {/* Seek Animation Overlay */}
              <AnimatePresence>
                {seekOverlay && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    className={`absolute z-30 flex flex-col items-center text-white/80 ${seekOverlay === 'backward' ? 'left-[20%]' : 'right-[20%]'}`}
                  >
                    {seekOverlay === 'backward' ? <Rewind className="w-12 h-12" /> : <FastForward className="w-12 h-12" />}
                    <span className="font-mono text-sm font-bold">10s</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence>{buffering && (<div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]"><div className="flex flex-col items-center"><Loader2 className="w-10 md:w-12 h-10 md:h-12 text-magenta-500 animate-spin mb-2" /><span className="text-xs font-mono text-magenta-300 tracking-[0.2em] animate-pulse">STREAMING...</span></div></div>)}</AnimatePresence>
              
              {/* Overlay Controls - Glassy & Fade on Inactivity */}
              <div className="absolute top-3 md:top-6 right-3 md:right-6 z-40 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ease-in-out">
                {/* Help Button */}
                <button 
                  onClick={() => setShowTips(!showTips)}
                  className="p-2 md:p-2.5 bg-black/40 backdrop-blur-md rounded-full text-slate-300 hover:text-white hover:bg-magenta-600/50 transition-all border border-white/5 shadow-lg active:scale-95"
                >
                  <HelpCircle className="w-4 md:w-5 h-4 md:h-5" />
                </button>
                
                {/* Speed Control */}
                <div className="relative">
                  <button 
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)} 
                    className="px-3 md:px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-xs font-bold text-white border border-white/5 flex items-center gap-2 shadow-lg hover:bg-white/10 transition-all active:scale-95"
                  >
                    <Zap className="w-3 md:w-3.5 h-3 md:h-3.5 text-yellow-400 fill-current" /> 
                    <span className="font-mono text-yellow-100">{playbackSpeed}x</span>
                  </button>

                  <AnimatePresence>{showSpeedMenu && (<motion.div initial={{ opacity: 0, y: -10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.95 }} className="absolute right-0 top-full mt-2 bg-zinc-950/90 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden min-w-[100px]">{speedOptions.map((speed) => (<button key={speed} onClick={() => changeSpeed(speed)} className={`w-full px-4 py-2.5 text-xs font-mono text-left transition-colors ${playbackSpeed === speed ? 'bg-magenta-500/20 text-magenta-300 font-bold' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}>{speed}x</button>))}</motion.div>)}</AnimatePresence>
                </div>

                {/* Fullscreen */}
                <button 
                  onClick={toggleFullscreen} 
                  className="p-2 md:p-2.5 bg-black/40 backdrop-blur-md rounded-full text-slate-300 hover:text-white hover:bg-white/10 border border-white/5 shadow-lg active:scale-95 transition-all"
                >
                  {isFullscreen ? (<Minimize className="w-4 md:w-5 h-4 md:h-5"/>) : (<Maximize className="w-4 md:w-5 h-4 md:h-5"/>)}
                </button>
              </div>

              {/* Tips Modal */}
              <AnimatePresence>{showTips && (<motion.div initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute top-16 md:top-20 right-3 md:right-6 z-50 bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-4 md:p-5 rounded-2xl shadow-2xl w-64 md:w-72"><div className="flex justify-between items-center mb-3 md:mb-4 pb-2 border-b border-white/10"><span className="text-xs font-black text-white tracking-widest">SHORTCUTS</span><button onClick={() => setShowTips(false)}><X className="w-4 h-4 text-slate-500 hover:text-white transition-colors"/></button></div><div className="space-y-2.5 md:space-y-3 text-xs font-mono text-slate-400"><div className="flex justify-between items-center"><span>PLAY/PAUSE</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">SPACE</kbd></div><div className="flex justify-between items-center"><span>SEEK ±10s</span> <div className="flex gap-1"><kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">←</kbd><kbd className="bg-white/10 px-1 py-0.5 rounded text-white text-[10px]">→</kbd></div></div><div className="flex justify-between items-center"><span>SPEED DOWN</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">[</kbd></div><div className="flex justify-between items-center"><span>SPEED UP</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">]</kbd></div><div className="flex justify-between items-center"><span>FULLSCREEN</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white text-[10px]">F</kbd></div></div></motion.div>)}</AnimatePresence>

              <video ref={videoRef} src={videoSrc} className="w-full h-full max-h-screen object-contain focus:outline-none drop-shadow-2xl" controls autoPlay onLoadedData={onVideoLoaded} onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onTimeUpdate={onTimeUpdate} controlsList="nodownload" playsInline />
            </div>
          ) : (
            // COOL IDLE STATE - "Neural Core" Animation
            <div className="flex flex-col items-center justify-center h-full px-6 text-center animate-fade-in select-none">
              
              {/* Reactor Core Animation */}
              <div className="relative w-40 h-40 mb-10 flex items-center justify-center">
                 <div className="absolute inset-0 border-2 border-magenta-500/20 rounded-full animate-spin-slow"></div>
                 <div className="absolute inset-4 border border-blue-500/30 rounded-full animate-reverse-spin"></div>
                 <div className="absolute inset-8 border border-white/10 rounded-full"></div>
                 <div className="w-4 h-4 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.8)] animate-pulse"></div>
                 <div className="absolute top-0 w-1 h-full bg-gradient-to-b from-transparent via-magenta-500/50 to-transparent rotate-45 opacity-20"></div>
                 <div className="absolute top-0 w-1 h-full bg-gradient-to-b from-transparent via-blue-500/50 to-transparent -rotate-45 opacity-20"></div>
              </div>

              <h2 className="text-xl md:text-3xl font-black text-white mb-6 tracking-tight">
                "THE PAIN OF DISCIPLINE"
              </h2>
              <div className="max-w-md relative">
                <span className="absolute -left-4 -top-4 text-4xl text-white/10 font-serif">“</span>
                <p className="text-sm md:text-lg text-slate-300 font-medium leading-relaxed italic">
                  There are two types of pain you will go through in life: the pain of <span className="text-magenta-400">discipline</span> and the pain of <span className="text-blue-400">regret</span>.
                  <br className="mb-4"/>
                  Discipline weighs ounces, while regret weighs tons.
                </p>
                <span className="absolute -right-4 -bottom-4 text-4xl text-white/10 font-serif rotate-180">“</span>
              </div>
              
              <div className="mt-10 px-6 py-2 bg-white/5 border border-white/5 rounded-full text-[10px] font-mono text-slate-500 uppercase tracking-[0.2em] animate-pulse">
                System Online • Select Module
              </div>
            </div>
          )}
        </main>
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.2); }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.2); }
        
        @keyframes spin-slow { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes reverse-spin { 0% { transform: rotate(360deg); } 100% { transform: rotate(0deg); } }
        .animate-spin-slow { animation: spin-slow 10s linear infinite; }
        .animate-reverse-spin { animation: reverse-spin 15s linear infinite; }
        
        @media (hover: none) and (pointer: coarse) { .group .opacity-0 { opacity: 1 !important; } }
      `}</style>
    </div>
  );
}