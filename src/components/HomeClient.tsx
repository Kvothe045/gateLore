"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  Unlock,
  MessageSquare,
  X,
  Send,
  Radio,
  Terminal,
  ChevronRight,
  Loader2,
  Activity,
  Database,
  LayoutDashboard,
  Server,
  Cloud,
  HardDrive,
  ArrowRight,
  ShieldAlert,
  GitMerge,
  Cpu as Microchip,
  Network
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
interface Subject {
  id: number;
  name: string;
  status: "locked" | "unlocked";
  startDate: string;
  endDate: string;
}

interface Announcement {
  id: string;
  content: string;
  timestamp: number;
}

interface MsgForm {
  name: string;
  email: string;
  message: string;
}

// --- Access Control List (ACL) ---
// IDs that require the Override Key. Others are freely accessible.
const RESTRICTED_NODE_IDS = [4, 110, 154, 164, 256, 294, 319, 382, 393, 458, 469];

export default function HomeClient() {
  const router = useRouter();
  const [liveSubjects, setLiveSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Contact Modal State
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [msgForm, setMsgForm] = useState<MsgForm>({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  // Security Auth State
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTarget, setAuthTarget] = useState<string>("");
  const [passwordInput, setPasswordInput] = useState("");
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/system-stats`,
          { headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! } }
        );
        const stats = await res.json();
        
        if (stats.subjects && Array.isArray(stats.subjects)) {
          // --- ALPHABETICAL SORTING LOGIC ---
          const sortedSubjects = stats.subjects.sort((a: Subject, b: Subject) => 
            a.name.localeCompare(b.name)
          );
          
          setLiveSubjects(sortedSubjects);
        }
      } catch (err) {
        console.error("Sync Error:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchLiveData();

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/broadcast`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setAnnouncements(data);
      })
      .catch(() => console.error("API Offline"));
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgForm),
      });
      setIsContactOpen(false);
      setMsgForm({ name: "", email: "", message: "" });
    } catch {
      console.error("Transmission failed.");
    } finally {
      setSending(false);
    }
  };

  // --- Security Routing Logic ---
  const handleSecureNavigation = (targetPath: string, subjectId?: number) => {
    const isDashboardRoute = targetPath === "/dashboard";
    const isRestrictedSubject = subjectId !== undefined && RESTRICTED_NODE_IDS.includes(subjectId);

    if (isDashboardRoute || isRestrictedSubject) {
      const hasAccess = localStorage.getItem("lores_access_granted");
      if (hasAccess === "true") {
        router.push(targetPath);
      } else {
        setAuthTarget(targetPath);
        setIsAuthOpen(true);
        setAuthError(false);
        setPasswordInput("");
      }
    } else {
      router.push(targetPath);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "Aryan@450") {
      localStorage.setItem("lores_access_granted", "true");
      setIsAuthOpen(false);
      router.push(authTarget);
    } else {
      setAuthError(true);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-cyan-500/30 overflow-x-hidden relative">
      
      {/* BACKGROUND EFFECTS */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none z-0" />

      {/* 1. NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Microchip className="w-5 h-5 text-cyan-500" />
            <span className="text-lg font-black tracking-widest text-zinc-100 uppercase">
              LORES <span className="text-zinc-600 font-mono text-xs hidden sm:inline-block ml-2">// ASYNC.ENGINE</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-xs font-bold tracking-widest uppercase text-zinc-400 hover:text-cyan-400 transition-colors hidden sm:block"
            >
              Uplink
            </button>
            <button 
              onClick={() => handleSecureNavigation("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 rounded-md text-xs font-bold uppercase tracking-widest transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="relative pt-32 pb-16 lg:pt-40 lg:pb-20 px-6 text-center z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">Protocol 206: Operational</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-zinc-100 mb-6 drop-shadow-2xl">
            Lores-Async <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-500 to-purple-500">Media Gateway.</span>
          </h1>
          
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            A high-performance streaming proxy engineered for zero-lag video delivery. Utilizing HTTP 206 partial-content requests to enable instant seeking, backed by an intelligent dual-path caching engine.
          </p>
        </motion.div>
      </header>

      {/* 3. FAANG-LEVEL ARCHITECTURE FLOWCHART */}
      <div className="max-w-6xl mx-auto px-6 mb-24 relative z-10">
        <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative overflow-hidden">
          
          <div className="flex items-center gap-3 mb-12 relative z-10">
            <Network className="w-5 h-5 text-cyan-500" />
            <div>
               <h2 className="text-sm font-bold text-zinc-200 tracking-widest uppercase">System Architecture Logic</h2>
               <p className="text-[10px] text-zinc-500 font-mono mt-1">High-Concurrency Async Streaming Pipeline</p>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-4 relative w-full z-10">
            
            {/* 1. Client Request */}
            <div className="flex flex-col items-center gap-3 w-40 mt-4 lg:mt-0">
              <div className="relative">
                {/* Visual Stacking to imply concurrency */}
                <div className="absolute -top-3 -left-3 w-16 h-16 rounded-xl border border-zinc-700/30 bg-zinc-950/30" />
                <div className="absolute -top-1.5 -left-1.5 w-16 h-16 rounded-xl border border-zinc-700/60 bg-zinc-950/60" />
                <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-600 flex items-center justify-center shadow-lg relative z-10 group">
                  <Terminal className="w-6 h-6 text-zinc-300 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
              <div className="text-center mt-2">
                <span className="text-[10px] font-bold text-zinc-200 tracking-widest uppercase block">Concurrent Clients</span>
                <span className="text-[9px] text-cyan-400 font-mono bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/30 mt-2 inline-block">Range: bytes=0-</span>
              </div>
            </div>

            <div className="hidden lg:flex flex-col items-center">
              <span className="text-[8px] font-bold text-zinc-500 tracking-widest uppercase mb-1">HTTP 206 Partial</span>
              <ArrowRight className="w-5 h-5 text-zinc-700" />
            </div>

            {/* 2. Gateway Router */}
            <div className="flex flex-col items-center gap-3 w-56 relative">
              {/* Performance Badge */}
              <div className="absolute -top-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[8px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1.5 z-20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Sub-500ms Seek
              </div>
              
              <div className="w-24 h-24 rounded-2xl bg-zinc-900 border border-cyan-500/50 flex flex-col items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.15)] relative z-10">
                <Server className="w-8 h-8 text-cyan-400 mb-1.5" />
                <span className="text-[7px] text-cyan-300 font-mono tracking-widest border border-cyan-500/30 px-1.5 py-0.5 rounded bg-cyan-950/80">ASYNC CHUNK</span>
              </div>
              
              <div className="text-center">
                <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase block">Async Streaming Orchestrator</span>
                <span className="text-[9px] text-zinc-400 font-mono mt-1 block">Non-blocking I/O Engine</span>
              </div>
            </div>

            {/* Split Decision Branching Lines (Hidden on mobile) */}
            <div className="hidden lg:block relative w-32 h-32">
              <div className="absolute top-1/2 left-0 w-8 h-px bg-zinc-700" />
              <div className="absolute top-[15%] left-8 w-px h-[70%] bg-zinc-700" />
              <div className="absolute top-[15%] left-8 w-16 h-px bg-zinc-700 flex items-center">
                 <ArrowRight className="absolute -right-3 w-4 h-4 text-zinc-600" />
              </div>
              <div className="absolute bottom-[15%] left-8 w-16 h-px bg-zinc-700 flex items-center">
                 <ArrowRight className="absolute -right-3 w-4 h-4 text-zinc-600" />
              </div>
              {/* Smart Routing Label */}
              <div className="absolute top-1/2 left-4 -translate-y-1/2 -translate-x-1/2 bg-zinc-950 border border-zinc-700 rounded-md p-1.5 flex flex-col items-center justify-center z-10 shadow-xl">
                 <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1 whitespace-nowrap px-1">Smart Routing Layer</span>
                 <GitMerge className="w-4 h-4 text-zinc-300" />
              </div>
            </div>

            {/* 3A & 3B Container */}
            <div className="flex flex-col gap-8 lg:gap-12 w-full lg:w-auto items-center">
               
               {/* 3A: Cache Miss (Remote) */}
               <div className="flex items-center gap-4 w-full justify-center lg:justify-start">
                  <div className="flex flex-col items-center min-w-[65px]">
                    <span className="text-[8px] font-mono text-purple-400 uppercase mb-1.5 tracking-widest bg-purple-500/10 px-1.5 py-0.5 rounded border border-purple-500/20">Cache Miss</span>
                    <div className="w-14 h-14 rounded-full bg-zinc-950 border border-purple-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] relative">
                        <Cloud className="w-6 h-6 text-purple-400" />
                    </div>
                  </div>
                  <div className="text-left max-w-[150px]">
                    <span className="text-[10px] font-bold text-zinc-200 uppercase block tracking-wider">Remote Media Source</span>
                    <p className="text-[9px] text-purple-300/80 font-mono mt-1 leading-relaxed">Stream + Background Persist</p>
                  </div>
               </div>

               {/* 3B: Cache Hit (Disk) */}
               <div className="flex items-center gap-4 w-full justify-center lg:justify-start">
                  <div className="flex flex-col items-center min-w-[65px]">
                     <span className="text-[8px] font-mono text-emerald-400 uppercase mb-1.5 tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Cache Hit</span>
                     <div className="w-14 h-14 rounded-lg bg-zinc-950 border border-emerald-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.1)] relative">
                        <HardDrive className="w-6 h-6 text-emerald-400" />
                     </div>
                  </div>
                  <div className="text-left max-w-[150px]">
                    <span className="text-[10px] font-bold text-zinc-200 uppercase block tracking-wider">Local SSD Volume</span>
                    <p className="text-[9px] text-emerald-300/80 font-mono mt-1 leading-relaxed"><span className="text-emerald-400 font-bold">0ms Latency.</span> Immediate chunk dispatch.</p>
                  </div>
               </div>

            </div>
          </div>
        </div>
      </div>

      {/* 4. MAIN LAYOUT GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-32 z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: SUBJECT MODULES */}
          <main className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-cyan-500" />
                <h2 className="text-sm font-bold text-zinc-100 tracking-widest uppercase">
                  Production Nodes
                </h2>
              </div>
            </div>

            {loadingSubjects ? (
              <div className="flex flex-col justify-center items-center py-32 space-y-4 border border-zinc-800/50 rounded-2xl bg-zinc-900/20">
                <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                <p className="text-cyan-500 font-mono text-xs tracking-widest uppercase animate-pulse">Decrypting Modules...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {liveSubjects.map((sub, idx) => {
                  const isUnlocked = sub.status === "unlocked";
                  const isRestricted = RESTRICTED_NODE_IDS.includes(sub.id);
                  
                  const CardContent = (
                    <div className={cn(
                      "relative h-full p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden group",
                      isUnlocked
                        ? "bg-zinc-900/40 border-zinc-800/60 hover:border-cyan-500/50 hover:bg-cyan-950/10 shadow-lg cursor-pointer"
                        : "bg-zinc-950/50 border-zinc-900 opacity-70 grayscale cursor-not-allowed"
                    )}>
                      {isUnlocked && (
                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      )}

                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <span className="font-mono text-[10px] text-zinc-600 font-bold tracking-[0.2em] bg-zinc-950 px-2 py-1 rounded border border-zinc-800 flex items-center gap-2">
                            NODE-{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                            {/* Show a subtle shield if it's a restricted node */}
                            {isRestricted && isUnlocked && <ShieldAlert className="w-3 h-3 text-rose-500/70" />}
                          </span>
                          {isUnlocked ? (
                            <div className="p-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-emerald-400">
                              <Unlock className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-600">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <h3 className={cn(
                          "text-xl font-bold tracking-tight mb-2 transition-colors",
                          isUnlocked ? "text-zinc-100 group-hover:text-cyan-300" : "text-zinc-500"
                        )}>
                          {sub.name}
                        </h3>

                        {!isUnlocked && (
                          <p className="font-mono text-[10px] text-amber-500/80 flex items-center gap-2 mt-4 uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                            Allocation: {sub.startDate}
                          </p>
                        )}
                      </div>

                      <div className="mt-8 pt-5 border-t border-zinc-800/50 flex items-center justify-between">
                        {isUnlocked ? (
                          <>
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">
                              {isRestricted ? "Secure Access" : "Stream Media"}
                            </span>
                            <ChevronRight className="w-4 h-4 text-cyan-500 group-hover:translate-x-1 transition-transform" />
                          </>
                        ) : (
                          <span className="w-full text-left text-[10px] font-mono text-zinc-600 uppercase tracking-widest flex items-center gap-2">
                            <Terminal className="w-3 h-3" /> Encrypted Protocol
                          </span>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <motion.div key={sub.id} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: idx * 0.05 }} className="h-full">
                      {isUnlocked ? (
                        <div onClick={() => handleSecureNavigation(`/subject/${sub.id}`, sub.id)} className="block h-full outline-none">
                          {CardContent}
                        </div>
                      ) : (
                        <div className="h-full">
                          {CardContent}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: SYSTEM REGISTRY */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/60">
              <Radio className="w-5 h-5 text-purple-500" />
              <h2 className="text-sm font-bold text-zinc-100 tracking-widest uppercase">
                System Registry
              </h2>
            </div>

            <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-xl shadow-xl h-[400px] lg:h-[calc(100vh-16rem)] flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                {announcements.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-50">
                    <Terminal className="w-8 h-8 text-zinc-600" />
                    <p className="text-xs text-zinc-500 font-mono uppercase tracking-widest">Log Empty. System Nominal.</p>
                  </div>
                ) : (
                  announcements.map((item, i) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }} className="relative pl-5 border-l border-zinc-800 pb-6 last:pb-0 group">
                      <div className="absolute -left-[4px] top-1.5 w-2 h-2 rounded-full bg-zinc-900 border border-purple-500 group-hover:bg-purple-500 transition-colors" />
                      <p className="text-[10px] font-black tracking-widest uppercase text-purple-500 mb-1.5 flex items-center gap-2">
                        Log Entry // {new Date(item.timestamp * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-sm text-zinc-300 leading-relaxed font-medium">
                        {item.content}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* FLOATING CONTACT BUTTON */}
      <motion.button onClick={() => setIsContactOpen(true)} className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 p-4 bg-zinc-900 border border-cyan-500/50 hover:bg-cyan-950/50 text-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.2)] z-40 transition-colors group">
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {/* 5. CONTACT MODAL */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsContactOpen(false)} className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl z-10">
              <button onClick={() => setIsContactOpen(false)} className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-100 bg-zinc-950 p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
              <div className="flex items-center gap-3 mb-2">
                <Radio className="w-5 h-5 text-cyan-500" />
                <h3 className="text-xl font-black text-zinc-100 tracking-tight">Encrypted Uplink</h3>
              </div>
              <form onSubmit={handleSendMessage} className="space-y-5 mt-6">
                <input required placeholder="Enter Alias..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none" value={msgForm.name} onChange={(e) => setMsgForm({ ...msgForm, name: e.target.value })} />
                <input required type="email" placeholder="Enter Email..." className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none" value={msgForm.email} onChange={(e) => setMsgForm({ ...msgForm, email: e.target.value })} />
                <textarea required placeholder="Type message..." className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-cyan-500 outline-none resize-none" value={msgForm.message} onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })} />
                <button disabled={sending} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black tracking-widest uppercase text-xs py-4 rounded-lg flex justify-center items-center gap-3">{sending ? "Transmitting..." : "Initiate Transfer"}</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. SECURITY OVERRIDE MODAL */}
      <AnimatePresence>
        {isAuthOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-zinc-950/95 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-zinc-950 border border-rose-500/30 rounded-lg p-8 shadow-[0_0_50px_rgba(225,29,72,0.1)] z-10 overflow-hidden">
              
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500/50" />
              
              <button onClick={() => setIsAuthOpen(false)} className="absolute top-4 right-4 text-zinc-600 hover:text-zinc-300 transition-colors"><X className="w-4 h-4" /></button>
              
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4 border border-rose-500/20 text-rose-500">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-black text-zinc-100 tracking-widest uppercase">Restricted Access</h3>
                <p className="text-[10px] text-zinc-500 font-mono mt-2">Privacy Lock Engaged. Clearance Required.</p>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter Override Key"
                    className={cn(
                      "w-full bg-zinc-900 border rounded text-center py-3 text-sm font-mono text-zinc-100 outline-none transition-all focus:ring-1",
                      authError ? "border-rose-500 focus:border-rose-500 focus:ring-rose-500/50" : "border-zinc-800 focus:border-cyan-500 focus:ring-cyan-500/50"
                    )}
                    value={passwordInput}
                    onChange={(e) => {
                      setPasswordInput(e.target.value);
                      setAuthError(false);
                    }}
                  />
                  {authError && <p className="text-[10px] text-rose-500 font-mono text-center animate-pulse mt-2">ERR: INVALID CREDENTIALS</p>}
                </div>
                
                <button type="submit" className="w-full bg-zinc-100 hover:bg-white text-zinc-950 font-black tracking-widest uppercase text-[10px] py-3 rounded transition-colors">
                  Authenticate
                </button>
              </form>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}