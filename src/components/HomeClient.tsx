"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
  LayoutDashboard
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

export default function HomeClient() {
  const [liveSubjects, setLiveSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  
  // Contact Modal State
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [msgForm, setMsgForm] = useState<MsgForm>({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  // 🔄 Sync subjects with backend
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/system-stats`,
          { headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! } }
        );
        const stats = await res.json();
        if (stats.subjects && Array.isArray(stats.subjects)) {
          setLiveSubjects(stats.subjects);
        }
      } catch (err) {
        console.error("Sync Error:", err);
      } finally {
        setLoadingSubjects(false);
      }
    };
    fetchLiveData();
  }, []);

  // 📢 Fetch announcements
  useEffect(() => {
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
      alert("Transmission successful.");
      setIsContactOpen(false);
      setMsgForm({ name: "", email: "", message: "" });
    } catch {
      alert("Transmission failed.");
    } finally {
      setSending(false);
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
            <Activity className="w-5 h-5 text-cyan-500" />
            <span className="text-lg font-black tracking-widest text-zinc-100">
              GATE LORES <span className="text-zinc-600 font-mono text-xs hidden sm:inline-block ml-2">// CORTEX.ENGINE</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-xs font-bold tracking-widest uppercase text-zinc-400 hover:text-cyan-400 transition-colors hidden sm:block"
            >
              Uplink
            </button>
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600/10 hover:bg-cyan-600/20 border border-cyan-500/30 text-cyan-400 rounded-md text-xs font-bold uppercase tracking-widest transition-all"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Mission Control
            </Link>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION */}
      <header className="relative pt-32 pb-16 lg:pt-40 lg:pb-24 px-6 text-center z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-900/50 border border-zinc-800 rounded-full mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">System Operational</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-zinc-100 mb-6 drop-shadow-2xl">
            The Ultimate <br className="hidden md:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-cyan-500 to-purple-500">Study Den.</span>
          </h1>
          
          <p className="text-zinc-400 text-sm md:text-base leading-relaxed max-w-2xl mx-auto">
            Elite-tier preparation protocols for GATE CSE. Strictly designed for those targeting AIR-1. 
            <span className="block mt-2 font-mono text-xs text-zinc-600 uppercase tracking-widest">
              // Classified Access. Keep operations stealth.
            </span>
          </p>
        </motion.div>
      </header>

      {/* 3. MAIN LAYOUT GRID */}
      <div className="max-w-7xl mx-auto px-6 pb-32 z-10 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* LEFT COLUMN: SUBJECT MODULES */}
          <main className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/60">
              <Database className="w-5 h-5 text-cyan-500" />
              <h2 className="text-sm font-bold text-zinc-100 tracking-widest uppercase">
                Active Databanks
              </h2>
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
                  
                  // Wrap the inner content. If unlocked, wrap in Link. If locked, wrap in div.
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
                          <span className="font-mono text-[10px] text-zinc-600 font-bold tracking-[0.2em] bg-zinc-950 px-2 py-1 rounded border border-zinc-800">
                            MOD-{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
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
                            Unlocks: {sub.startDate}
                          </p>
                        )}
                      </div>

                      <div className="mt-8 pt-5 border-t border-zinc-800/50 flex items-center justify-between">
                        {isUnlocked ? (
                          <>
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">Access Module</span>
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
                    <motion.div
                      key={sub.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: idx * 0.05 }}
                      className="h-full"
                    >
                      {isUnlocked ? (
                        <Link href={`/subject/${sub.id}`} className="block h-full outline-none">
                          {CardContent}
                        </Link>
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

          {/* RIGHT COLUMN: ANNOUNCEMENTS */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/60">
              <Radio className="w-5 h-5 text-purple-500" />
              <h2 className="text-sm font-bold text-zinc-100 tracking-widest uppercase">
                System Logs
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
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="relative pl-5 border-l border-zinc-800 pb-6 last:pb-0 group"
                    >
                      {/* Timeline Dot */}
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

      {/* 4. FLOATING CONTACT BUTTON */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsContactOpen(true)}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 p-4 bg-zinc-900 border border-cyan-500/50 hover:bg-cyan-950/50 text-cyan-400 rounded-full shadow-[0_0_20px_rgba(6,182,212,0.2)] z-40 transition-colors group"
      >
        <MessageSquare className="w-6 h-6" />
      </motion.button>

      {/* 5. CONTACT MODAL */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactOpen(false)}
              className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl z-10"
            >
              <button
                onClick={() => setIsContactOpen(false)}
                className="absolute top-5 right-5 text-zinc-500 hover:text-zinc-100 bg-zinc-950 p-1 rounded transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <Radio className="w-5 h-5 text-cyan-500" />
                <h3 className="text-xl font-black text-zinc-100 tracking-tight">
                  Encrypted Uplink
                </h3>
              </div>
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-8">
                Establish direct comms with the Architect.
              </p>

              <form onSubmit={handleSendMessage} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Identity Override
                  </label>
                  <input
                    required
                    placeholder="Enter Alias..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner"
                    value={msgForm.name}
                    onChange={(e) => setMsgForm({ ...msgForm, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Return Coordinates
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="Enter Email..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all shadow-inner"
                    value={msgForm.email}
                    onChange={(e) => setMsgForm({ ...msgForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                    Transmission Payload
                  </label>
                  <textarea
                    required
                    placeholder="Type message..."
                    className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none resize-none transition-all shadow-inner custom-scrollbar"
                    value={msgForm.message}
                    onChange={(e) => setMsgForm({ ...msgForm, message: e.target.value })}
                  />
                </div>
                <button
                  disabled={sending}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-black tracking-widest uppercase text-xs py-4 rounded-lg flex justify-center items-center gap-3 transition-all shadow-[0_0_15px_rgba(8,145,178,0.2)] hover:shadow-[0_0_25px_rgba(8,145,178,0.4)] mt-2"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {sending ? "Transmitting..." : "Initiate Transfer"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}