"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { SUBJECTS } from "@/constants/subjects";
import { usePlayer } from "@/hooks/usePlayer";
import { 
  CheckCircle2, Play, Download, ChevronLeft, 
  Zap, HelpCircle, X, Maximize, Loader2, Minimize, Lock 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const subjectId = parseInt(id);
  const subject = SUBJECTS.find(s => s.id === subjectId);

  // --- STATE ---
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'modules' | 'resources'>('modules');
  
  // Player
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [buffering, setBuffering] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [showTips, setShowTips] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Progress
  const [watched, setWatched] = useState<string[]>([]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  
  usePlayer(videoRef, (speed) => setPlaybackSpeed(speed));

  // --- INIT ---
  useEffect(() => {
    if (!subject) return;
    setWatched(JSON.parse(localStorage.getItem(`watched_${id}`) || "[]"));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/init?topic_id=${id}&topic_name=${subject.name}`, {
      headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
    })
    .then(res => res.json())
    .then(data => setFiles(data))
    .catch(() => router.push("/"))
    .finally(() => setLoading(false));

    const onFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFSChange);
    return () => document.removeEventListener("fullscreenchange", onFSChange);
  }, [id, subject, router]);

  // --- LOGIC ---
  const playVideo = async (file: any) => {
    setBuffering(true);
    setActiveVideo(file);
    if (videoSrc) URL.revokeObjectURL(videoSrc);
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stream/${file.id}?topic_id=${id}&topic_name=${subject?.name}`, {
        headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
      });
      const blob = await res.blob();
      setVideoSrc(URL.createObjectURL(blob));
    } catch (e) {
      setBuffering(false);
    }
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: file.id,
          topic_id: id,
          topic_name: subject?.name,
          filename: file.name // Pass the real filename here
        })
      });
      
      const { token } = await res.json();
      window.open(`/api/lore-world?token=${encodeURIComponent(token)}`, '_blank');
      
    } catch (e) {
      alert("Security Check Failed.");
    }
  };

  if (!subject) return null;

  const videos = files.filter(f => f.type === 'video');
  const resources = files.filter(f => f.type !== 'video');
  const watchedCount = videos.filter(v => watched.includes(String(v.id))).length;
  const progressPercent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  return (
    <div className="h-screen bg-[#050505] text-slate-200 flex flex-col font-sans selection:bg-magenta-500/30 overflow-hidden">
      
      {/* 1. HEADER (Redesigned) */}
      <div className="bg-zinc-950 border-b border-white/5 flex flex-col shrink-0 z-50 py-4 px-6 relative shadow-2xl">
        <div className="flex items-center justify-between">
          <button onClick={() => router.push("/")} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-4 py-2 rounded-full border border-white/5 hover:bg-white/10">
            <ChevronLeft className="w-4 h-4" /> DEN
          </button>
          
          <div className="flex flex-col items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white uppercase">{subject.name}</h1>
            
            {/* Centered Tanker Bar */}
            <div className="w-96 h-2 bg-zinc-900 rounded-full overflow-hidden border border-white/10 relative">
               <div 
                 className="h-full bg-gradient-to-r from-blue-500 via-magenta-500 to-green-500 shadow-[0_0_10px_rgba(219,39,119,0.8)] transition-all duration-1000 ease-out"
                 style={{ width: `${progressPercent}%` }}
               />
            </div>
          </div>
          
          <div className="text-right">
             <div className="text-2xl font-black text-white leading-none tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
               <span className="text-magenta-500">{watchedCount}</span> <span className="text-lg text-slate-500">/</span> {videos.length}
             </div>
             <div className="text-[10px] font-bold text-slate-400 tracking-widest mt-1">LORES COMPLETED</div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* 2. SIDEBAR */}
        <aside className="w-96 bg-zinc-950/50 border-r border-white/5 flex flex-col z-20">
          <div className="flex border-b border-white/5">
            <button onClick={() => setActiveTab('modules')} className={`flex-1 py-4 text-xs font-bold tracking-widest transition-colors ${activeTab === 'modules' ? 'text-white bg-white/5 border-b-2 border-magenta-500 shadow-[inset_0_-2px_10px_rgba(219,39,119,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}>MODULES</button>
            <button onClick={() => setActiveTab('resources')} className={`flex-1 py-4 text-xs font-bold tracking-widest transition-colors ${activeTab === 'resources' ? 'text-white bg-white/5 border-b-2 border-blue-500 shadow-[inset_0_-2px_10px_rgba(59,130,246,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}>RESOURCES</button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2">
             {loading ? (
                <div className="flex justify-center p-10"><Loader2 className="animate-spin text-magenta-500"/></div>
             ) : activeTab === 'modules' ? (
                videos.map((f) => (
                  <div key={f.id} onClick={() => playVideo(f)} className={`p-4 rounded-lg cursor-pointer group flex gap-4 items-center transition-all ${activeVideo?.id === f.id ? 'bg-magenta-500/10 border border-magenta-500/20 shadow-[0_0_15px_-5px_rgba(219,39,119,0.3)]' : 'bg-black/20 hover:bg-white/5 border border-transparent'}`}>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${watched.includes(String(f.id)) ? 'bg-green-500 border-green-500 scale-110' : 'border-slate-700'}`}>
                      {watched.includes(String(f.id)) && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm truncate ${activeVideo?.id === f.id ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'}`}>{f.name.replace(/\.[^/.]+$/, "")}</p>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                    </div>
                    {activeVideo?.id === f.id && <Play className="w-4 h-4 text-magenta-500 fill-current animate-pulse" />}
                  </div>
                ))
             ) : (
                resources.map((f) => (
                  <div key={f.id} onClick={(e) => handleDownload(e, f)} className="flex gap-4 items-center p-4 rounded-lg bg-black/20 hover:bg-white/5 border border-transparent hover:border-blue-500/30 cursor-pointer group transition-all">
                    <div className="p-2 bg-blue-500/10 rounded text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors shadow-[0_0_10px_rgba(59,130,246,0.1)]">
                      <Download className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-300 group-hover:text-white font-medium">{f.name}</p>
                      <p className="text-[10px] text-slate-600 mt-1">SECURE DOWNLOAD</p>
                    </div>
                  </div>
                ))
             )}
          </div>
        </aside>

        {/* 3. MAIN PLAYER */}
        <main className="flex-1 bg-black relative flex flex-col items-center justify-center">
          {activeVideo ? (
            <div 
              ref={playerContainerRef} 
              className="relative w-full h-full flex items-center justify-center bg-black group"
            >
              <AnimatePresence>
                {buffering && (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-[2px]">
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-magenta-500 animate-spin mb-2" />
                      <span className="text-xs font-mono text-magenta-300 tracking-[0.2em] animate-pulse">STREAMING...</span>
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {/* OVERLAY CONTROLS */}
              <div className="absolute top-6 right-6 z-40 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
                <button 
                  onClick={() => setShowTips(!showTips)}
                  className="p-2.5 bg-zinc-900/90 backdrop-blur rounded-full text-slate-300 hover:text-white hover:bg-magenta-600 transition-all border border-white/10 shadow-lg"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                
                <div className="px-4 py-2 bg-zinc-900/90 backdrop-blur rounded-full text-xs font-bold text-white border border-white/10 flex items-center gap-2 shadow-lg">
                  <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" /> 
                  <span className="font-mono text-yellow-100">{playbackSpeed}x</span>
                  <div className="flex gap-1 ml-2 text-[10px] text-slate-500 font-mono border-l border-white/10 pl-2">
                    <span className="bg-white/10 px-1 rounded">[</span>
                    <span className="bg-white/10 px-1 rounded">]</span>
                  </div>
                </div>

                <button 
                  onClick={toggleFullscreen}
                  className="p-2.5 bg-zinc-900/90 backdrop-blur rounded-full text-slate-300 hover:text-white hover:bg-white/10 border border-white/10 shadow-lg"
                >
                  {isFullscreen ? <Minimize className="w-5 h-5"/> : <Maximize className="w-5 h-5"/>}
                </button>
              </div>

              {/* TIPS MODAL */}
              <AnimatePresence>
                {showTips && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                    className="absolute top-20 right-6 z-50 bg-zinc-950/95 backdrop-blur-xl border border-white/10 p-5 rounded-2xl shadow-2xl w-64"
                  >
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                      <span className="text-xs font-black text-white tracking-widest">SHORTCUTS</span>
                      <button onClick={() => setShowTips(false)}><X className="w-4 h-4 text-slate-500 hover:text-white transition-colors"/></button>
                    </div>
                    <div className="space-y-3 text-xs font-mono text-slate-400">
                      <div className="flex justify-between items-center"><span>PLAY/PAUSE</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white">SPACE</kbd></div>
                      <div className="flex justify-between items-center"><span>SEEK ±10s</span> <div className="flex gap-1"><kbd className="bg-white/10 px-1 py-0.5 rounded text-white">←</kbd><kbd className="bg-white/10 px-1 py-0.5 rounded text-white">→</kbd></div></div>
                      <div className="flex justify-between items-center"><span>SPEED DOWN</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white">[</kbd></div>
                      <div className="flex justify-between items-center"><span>SPEED UP</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white">]</kbd></div>
                      <div className="flex justify-between items-center"><span>FULLSCREEN</span> <kbd className="bg-white/10 px-2 py-0.5 rounded text-white">F</kbd></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <video 
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full max-h-screen object-contain focus:outline-none drop-shadow-2xl"
                controls
                autoPlay
                onLoadedData={onVideoLoaded}
                onWaiting={() => setBuffering(true)}
                onPlaying={() => setBuffering(false)}
                onTimeUpdate={onTimeUpdate}
                controlsList="nodownload" 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center opacity-30 animate-pulse">
              <div className="w-24 h-24 rounded-full border-2 border-white/20 flex items-center justify-center mb-6">
                <Play className="w-10 h-10 text-white fill-white ml-1" />
              </div>
              <span className="font-mono text-sm tracking-[0.3em] text-white">SELECT MODULE TO BEGIN</span>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}