"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { 
  Menu, X, ChevronLeft, CheckCircle2, 
  Play, Download, FileText, Smartphone,
  ShieldCheck, Terminal, FastForward, XCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import VideoManager from "@/components/video/VideoManager";

// --- CONFIGURATION ---
const VM_API_URL = "https://vlogs.gaterealty.tech"; 

export default function SubjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const subjectId = parseInt(id);

  // Data State
  const [subjectData, setSubjectData] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [watched, setWatched] = useState<string[]>([]);
  const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoSrc, setVideoSrc] = useState<string>("");
  const [activeTab, setActiveTab] = useState<'modules' | 'resources'>('modules');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); 
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Auto-play State
  const [countdown, setCountdown] = useState<number | null>(null);
  const [nextVideoToPlay, setNextVideoToPlay] = useState<any>(null);

  const videos = files.filter(f => f.type === 'video');
  const resources = files.filter(f => f.type !== 'video');
  const watchedCount = videos.filter(v => watched.includes(String(v.id))).length;
  const progressPercent = videos.length > 0 ? Math.round((watchedCount / videos.length) * 100) : 0;

  // --- FETCHING ---
  useEffect(() => {
    const storedWatched = localStorage.getItem(`watched_${id}`);
    if (storedWatched) setWatched(JSON.parse(storedWatched));

    const storedLastPlayed = localStorage.getItem(`lastPlayed_${id}`);
    if (storedLastPlayed) setLastPlayedId(storedLastPlayed);

    const fetchData = async () => {
        try {
            const statsRes = await fetch(`${VM_API_URL}/admin/system-stats`, {
                headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
            });
            const stats = await statsRes.json();
            const sub = stats.subjects.find((s: any) => s.id === subjectId);
            
            if (sub) {
                setSubjectData(sub);
                const filesRes = await fetch(`${VM_API_URL}/init?topic_id=${id}&topic_name=${encodeURIComponent(sub.name)}`, {
                    headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
                });
                const filesData = await filesRes.json();
                setFiles(Array.isArray(filesData) ? filesData : []);
            }
        } catch (e) {
            console.error("Fetch Error", e);
        } finally {
            setLoading(false);
        }
    };
    fetchData();
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  }, [id, subjectId]);

  // --- AUTO-PLAY TIMER ---
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
        if (nextVideoToPlay) playVideo(nextVideoToPlay);
        setCountdown(null);
        setNextVideoToPlay(null);
        return;
    }

    const timer = setTimeout(() => {
        setCountdown(prev => prev! - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown, nextVideoToPlay]);

  // --- ACTIONS ---
  const playVideo = (file: any) => {
    // Clear any active countdown if the user manually clicks a video
    setCountdown(null);
    setNextVideoToPlay(null);

    setActiveVideo(file);
    setIsMobileSidebarOpen(false);
    
    // Remember last played
    setLastPlayedId(String(file.id));
    localStorage.setItem(`lastPlayed_${id}`, String(file.id));
    
    const apiKey = process.env.NEXT_PUBLIC_AUTH_TOKEN || "f8c2d692f4b74da1386ee5173e111564";
    const topicParam = encodeURIComponent(subjectData?.name || "");
    const streamUrl = `${VM_API_URL}/stream/${file.id}?topic_id=${id}&topic_name=${topicParam}&api_key=${apiKey}`;
    
    console.log("Streaming from:", streamUrl);
    setVideoSrc(streamUrl);
  };

  const markWatched = () => {
    if (!activeVideo) return;
    if (!watched.includes(String(activeVideo.id))) {
        const newWatched = [...watched, String(activeVideo.id)];
        setWatched(newWatched);
        localStorage.setItem(`watched_${id}`, JSON.stringify(newWatched));
    }
  };

  const handleVideoEnded = () => {
    markWatched();

    // Find next video
    const currentIndex = videos.findIndex(v => v.id === activeVideo.id);
    if (currentIndex !== -1 && currentIndex + 1 < videos.length) {
        const nextVid = videos[currentIndex + 1];
        setNextVideoToPlay(nextVid);
        setCountdown(3); // Start 3 second countdown
    }
  };

  // --- RENDER HELPERS ---
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-zinc-950/95 backdrop-blur-xl md:bg-zinc-950 border-r border-white/5">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-400 tracking-widest uppercase">Course Content</h2>
            <button onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden p-1 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
        </div>
        <div className="flex border-b border-white/5">
            <button onClick={() => setActiveTab('modules')} className={`flex-1 py-3 text-xs font-bold tracking-wider ${activeTab === 'modules' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>MODULES</button>
            <button onClick={() => setActiveTab('resources')} className={`flex-1 py-3 text-xs font-bold tracking-wider ${activeTab === 'resources' ? 'text-blue-400 border-b-2 border-blue-500 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>RESOURCES</button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {loading ? (
                <div className="text-center py-10 text-slate-600 text-xs">SYNCING DATABASE...</div>
            ) : activeTab === 'modules' ? (
                videos.map((f, i) => (
                    <div 
                        key={f.id} 
                        onClick={() => playVideo(f)}
                        className={`group p-3 rounded-lg cursor-pointer transition-all border border-transparent ${activeVideo?.id === f.id ? 'bg-indigo-500/10 border-indigo-500/30' : 'hover:bg-white/5'}`}
                    >
                        <div className="flex gap-3 items-start">
                             <div className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${watched.includes(String(f.id)) ? 'bg-green-500 border-green-500' : 'border-slate-700'}`}>
                                {watched.includes(String(f.id)) && <CheckCircle2 className="w-3 h-3 text-black" />}
                             </div>
                             <div className="min-w-0">
                                <p className={`text-sm truncate ${activeVideo?.id === f.id ? 'text-indigo-200 font-medium' : 'text-slate-300 group-hover:text-white'}`}>{f.name.replace(/\.[^/.]+$/, "")}</p>
                                <p className="text-[10px] text-slate-600 font-mono mt-0.5">{(f.size / 1024 / 1024).toFixed(1)} MB</p>
                             </div>
                        </div>
                    </div>
                ))
            ) : (
                resources.map(f => (
                    <div key={f.id} className="p-3 rounded-lg hover:bg-white/5 flex gap-3 items-center group cursor-pointer border border-transparent hover:border-white/10">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div className="min-w-0">
                            <p className="text-sm text-slate-300 group-hover:text-white truncate">{f.name}</p>
                            <span className="text-[10px] text-slate-600 uppercase">Resource</span>
                        </div>
                        <Download className="w-4 h-4 text-slate-600 ml-auto group-hover:text-blue-400" />
                    </div>
                ))
            )}
        </div>
    </div>
  );

  const lastPlayedVideo = videos.find(v => String(v.id) === lastPlayedId);

  return (
    <div className="h-screen bg-black text-slate-200 flex flex-col font-sans overflow-hidden">
        {/* HEADER */}
        <header className="h-20 bg-zinc-950 border-b border-white/5 flex items-center px-6 shrink-0 z-50 justify-between gap-4">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => {
                        if (window.innerWidth >= 768) setIsSidebarOpen(!isSidebarOpen);
                        else setIsMobileSidebarOpen(true);
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/5"
                    title="Toggle Sidebar"
                >
                    <Menu className="w-5 h-5 text-indigo-400" />
                </button>
                <div className="h-8 w-px bg-white/10 hidden md:block"></div>
                <button onClick={() => router.push("/")} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white transition-colors group">
                    <div className="p-1.5 rounded-full group-hover:bg-white/10 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </div>
                    <span className="hidden md:inline tracking-widest">DEN</span>
                </button>
            </div>

            <div className="flex-1 max-w-xl mx-auto flex flex-col items-center justify-center">
                <h1 className="text-sm md:text-base font-black text-white uppercase tracking-tight truncate w-full text-center">
                    {subjectData ? subjectData.name : "..."}
                </h1>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full mt-2 overflow-hidden relative border border-white/5">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.6)] transition-all duration-700 ease-out" 
                        style={{ width: `${progressPercent}%` }} 
                    />
                </div>
            </div>

            <div className="text-right hidden md:block pl-6">
                <div className="flex items-baseline justify-end gap-2">
                    <span className="text-3xl font-black text-white tracking-tighter shadow-indigo-500/50 drop-shadow-lg">
                        {watchedCount}
                    </span>
                    <span className="text-lg text-slate-600 font-medium">/</span>
                    <span className="text-lg text-slate-500 font-medium">{videos.length}</span>
                </div>
                <div className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest opacity-80">
                    Modules Complete
                </div>
            </div>
        </header>

        <div className="flex-1 flex overflow-hidden relative">
            {/* DESKTOP SIDEBAR */}
            <motion.div 
                animate={{ width: isSidebarOpen ? 320 : 0, opacity: isSidebarOpen ? 1 : 0 }} 
                className="hidden md:block overflow-hidden bg-zinc-950 relative"
            >
                <div className="w-[320px] h-full">
                    <SidebarContent />
                </div>
            </motion.div>

            {/* MOBILE SIDEBAR */}
            <AnimatePresence>
                {isMobileSidebarOpen && (
                    <>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsMobileSidebarOpen(false)} className="md:hidden fixed inset-0 bg-black/80 z-40" />
                        <motion.div 
                            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} 
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="md:hidden fixed inset-y-0 left-0 w-80 z-50 shadow-2xl"
                        >
                            <SidebarContent />
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* MAIN AREA */}
            <main className="flex-1 bg-black relative flex items-center justify-center">
                {activeVideo && videoSrc ? (
                    <>
                        <VideoManager 
                            videoSrc={videoSrc} 
                            file={activeVideo} 
                            onVideoEnded={handleVideoEnded}
                        />

                        {/* COUNTDOWN OVERLAY */}
                        {countdown !== null && (
                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all">
                                <div className="text-center p-8 bg-zinc-950/80 border border-white/10 rounded-2xl shadow-2xl max-w-md w-full mx-4">
                                    <h2 className="text-slate-300 text-sm font-bold tracking-widest uppercase mb-2">Up Next</h2>
                                    <p className="text-white text-lg font-medium mb-8 truncate">{nextVideoToPlay?.name?.replace(/\.[^/.]+$/, "")}</p>
                                    
                                    <div className="relative w-24 h-24 mx-auto mb-8 flex items-center justify-center">
                                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                                            <circle cx="48" cy="48" r="45" className="stroke-slate-800" strokeWidth="4" fill="none" />
                                            <circle 
                                                cx="48" cy="48" r="45" 
                                                className="stroke-indigo-500 transition-all duration-1000 ease-linear" 
                                                strokeWidth="4" fill="none" 
                                                strokeDasharray="283"
                                                strokeDashoffset={283 - (283 * (countdown / 3))}
                                            />
                                        </svg>
                                        <span className="text-4xl font-black text-white">{countdown}</span>
                                    </div>

                                    <div className="flex gap-4">
                                        <button 
                                            onClick={() => { setCountdown(null); setNextVideoToPlay(null); }}
                                            className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle className="w-5 h-5" /> Cancel
                                        </button>
                                        <button 
                                            onClick={() => setCountdown(0)}
                                            className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                        >
                                            <FastForward className="w-5 h-5" /> Play Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    // --- IDLE UI ---
                    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-zinc-900/50 via-black to-black">
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-50 contrast-150 pointer-events-none"></div>
                       
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          transition={{ duration: 0.8 }}
                          className="relative z-10 max-w-2xl px-6 text-center"
                        >
                            <div className="relative w-32 h-32 mx-auto mb-10">
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }} className="absolute inset-0 rounded-full border border-white/10 border-dashed" />
                                <motion.div animate={{ rotate: -360 }} transition={{ duration: 30, repeat: Infinity, ease: "linear" }} className="absolute inset-2 rounded-full border border-indigo-500/20 border-dotted" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <Terminal className="w-10 h-10 text-indigo-500" />
                                </div>
                            </div>

                            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 tracking-tighter mb-4">
                                {subjectData ? subjectData.name : "Loading Protocol..."}
                            </h1>
                          
                            {subjectData && (
                                <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-2 rounded-full mb-10 backdrop-blur-md">
                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                    <span className="text-xs font-mono text-red-400 tracking-widest uppercase">
                                        Deadline: <span className="text-white font-bold">{subjectData.endDate}</span>
                                    </span>
                                </div>
                            )}

                            <div className="relative border-t border-b border-white/5 py-8 mb-8 bg-black/20">
                                <p className="text-base md:text-lg text-slate-400 font-light italic leading-relaxed">
                                    "If you don&apos;t put <span className="text-white font-medium">everything you have</span> into achieving your dreams, you will end up <span className="text-white border-b border-indigo-500/50">regretting it</span> in life."
                                </p>
                            </div>

                            <div className="flex flex-col items-center justify-center gap-4">
                                {/* MOBILE SELECT MODULE */}
                                <button onClick={() => setIsMobileSidebarOpen(true)} className="md:hidden w-full px-8 py-4 bg-white text-black font-bold rounded-lg uppercase tracking-widest text-xs hover:bg-slate-200 transition-colors flex items-center justify-center gap-2">
                                    <Smartphone className="w-4 h-4"/> Select Module
                                </button>
                              
                                {/* CONTINUE WATCHING BUTTON */}
                                {lastPlayedVideo && (
                                    <button 
                                        onClick={() => playVideo(lastPlayedVideo)}
                                        className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg uppercase tracking-widest text-xs hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                                    >
                                        <Play className="w-4 h-4" /> 
                                        Continue: <span className="truncate max-w-[200px] normal-case font-medium">{lastPlayedVideo.name.replace(/\.[^/.]+$/, "")}</span>
                                    </button>
                                )}

                                <div className="hidden md:flex items-center gap-2 text-xs font-mono text-slate-600 mt-2">
                                    <ShieldCheck className="w-4 h-4 text-green-500" />
                                    <span> CONSISTENCY IS KEY</span>
                                    {!lastPlayedVideo && <span>Select Module to Start</span>}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </main>
        </div>
    </div>
  );
}