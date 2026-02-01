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
  Megaphone,
  Terminal,
  ChevronRight,
  Loader2,
} from "lucide-react";

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
  // State is now strictly typed
  const [liveSubjects, setLiveSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [msgForm, setMsgForm] = useState<MsgForm>({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  // 🔄 Sync subjects with backend
  useEffect(() => {
    const fetchLiveData = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/admin/system-stats`,
          {
            headers: {
              "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN!,
            },
          }
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
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-magenta-500/30 overflow-x-hidden">
      {/* 1. HERO SECTION */}
      <header className="relative pt-24 pb-12 lg:pt-32 lg:pb-20 px-4 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] lg:w-[600px] h-[200px] lg:h-[300px] bg-magenta-900/20 blur-[80px] lg:blur-[120px] -z-10 rounded-full pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-5xl lg:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-magenta-500 to-purple-600 mb-6 drop-shadow-2xl">
            GATE LORES
          </h1>
          <p className="max-w-2xl mx-auto text-slate-400 text-base lg:text-xl leading-relaxed font-light">
            The <span className="text-white font-semibold">Study Den</span> for top notch preparation.
            <br className="hidden md:block" />
            <span className="text-xs lg:text-sm font-mono text-slate-600 mt-4 block tracking-widest uppercase">
              // For the students by the students. Please keep it private, and among trustworthy fellas...
            </span>
          </p>
        </motion.div>
      </header>

      {/* 2. MAIN LAYOUT GRID */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pb-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* LEFT COLUMN: SUBJECTS */}
          <main className="lg:col-span-8 order-2 lg:order-1">
            <div className="flex items-center gap-3 mb-6">
              <Terminal className="w-5 h-5 text-blue-500" />
              <h2 className="text-sm font-bold text-slate-300 tracking-widest uppercase">
                Active Modules
              </h2>
              <div className="h-[1px] flex-1 bg-gradient-to-r from-blue-500/50 to-transparent"></div>
            </div>

            {loadingSubjects ? (
              <div className="flex justify-center items-center py-20 text-blue-500">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {liveSubjects.map((sub, idx) => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.1 }}
                    className="relative group"
                  >
                    <div
                      className={`
                      relative h-full p-6 rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden
                      ${
                        sub.status === "unlocked"
                          ? "bg-zinc-900/40 border-white/10 hover:border-magenta-500/50 hover:bg-zinc-900/60 shadow-lg"
                          : "bg-black border-zinc-900 opacity-60 grayscale"
                      }
                    `}
                    >
                      {sub.status === "unlocked" && (
                        <div className="absolute inset-0 bg-gradient-to-br from-magenta-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                      )}

                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <span className="font-mono text-[10px] text-slate-500 tracking-[0.2em]">
                            0{idx + 1}
                          </span>
                          {sub.status === "unlocked" ? (
                            <div className="p-1.5 bg-green-500/10 rounded text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                              <Unlock className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-zinc-800 rounded text-slate-500">
                              <Lock className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <h3 className="text-xl font-bold text-slate-100 mb-2 group-hover:text-magenta-400 transition-colors">
                          {sub.name}
                        </h3>

                        {sub.status === "locked" && (
                          <p className="font-mono text-xs text-yellow-600 flex items-center gap-2">
                            <span className="w-1 h-1 bg-yellow-600 rounded-full animate-pulse"></span>
                            Unlocks {sub.startDate}
                          </p>
                        )}
                      </div>

                      <div className="mt-8 pt-6 border-t border-white/5">
                        {sub.status === "unlocked" ? (
                          <Link
                            href={`/subject/${sub.id}`}
                            className="flex items-center justify-between w-full text-xs font-bold text-white group-hover:text-magenta-300 transition-colors"
                          >
                            <span>ACCESS MODULES</span>
                            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        ) : (
                          <span className="w-full text-center text-[10px] font-mono text-slate-700 uppercase tracking-widest cursor-not-allowed flex justify-center">
                            Encrypted
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </main>

          {/* RIGHT COLUMN: ANNOUNCEMENTS */}
          <aside className="lg:col-span-4 order-1 lg:order-2">
            <div className="lg:sticky lg:top-8">
              <div className="bg-zinc-900/30 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/5">
                  <div className="relative">
                    <Megaphone className="w-5 h-5 text-magenta-500" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                  </div>
                  <h3 className="text-sm font-bold text-white tracking-widest uppercase">
                    Intelligence
                  </h3>
                </div>

                <div className="space-y-4 max-h-[300px] lg:max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                  {announcements.length === 0 ? (
                    <div className="text-xs text-slate-600 italic py-4 text-center">
                      System Nominal. No new reports.
                    </div>
                  ) : (
                    announcements.map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="relative pl-4 border-l-2 border-white/10 pb-2 last:pb-0"
                      >
                        <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full bg-zinc-800 border border-zinc-600"></div>
                        <p className="text-[10px] font-mono text-slate-500 mb-1">
                          {new Date(item.timestamp * 1000).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
                        </p>
                        <p className="text-sm text-slate-300 leading-relaxed font-light">
                          {item.content}
                        </p>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 3. FLOATING CONTACT BUTTON */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsContactOpen(true)}
        className="fixed bottom-6 right-6 lg:bottom-10 lg:right-10 p-4 bg-gradient-to-r from-blue-600 to-magenta-600 text-white rounded-full shadow-[0_0_30px_rgba(219,39,119,0.4)] z-40 group"
      >
        <MessageSquare className="w-6 h-6 fill-current group-hover:animate-bounce" />
      </motion.button>

      {/* CONTACT MODAL */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsContactOpen(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              <button
                onClick={() => setIsContactOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-white mb-2">
                Encrypted Uplink
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                Send a direct message to the Architect.
              </p>

              <form onSubmit={handleSendMessage} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">
                    Identity
                  </label>
                  <input
                    required
                    placeholder="Your Name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:bg-black outline-none transition-all"
                    value={msgForm.name}
                    onChange={(e) =>
                      setMsgForm({ ...msgForm, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">
                    Contact Frequency
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="Your Email"
                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:bg-black outline-none transition-all"
                    value={msgForm.email}
                    onChange={(e) =>
                      setMsgForm({ ...msgForm, email: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">
                    Transmission Data
                  </label>
                  <textarea
                    required
                    placeholder="Message content..."
                    className="w-full h-32 bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-blue-500 focus:bg-black outline-none resize-none transition-all"
                    value={msgForm.message}
                    onChange={(e) =>
                      setMsgForm({ ...msgForm, message: e.target.value })
                    }
                  />
                </div>
                <button
                  disabled={sending}
                  className="w-full bg-white text-black font-bold py-3 rounded-lg flex justify-center items-center gap-2 hover:bg-slate-200 transition-colors disabled:opacity-50 mt-4"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Transmitting..." : "Send Transmission"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}