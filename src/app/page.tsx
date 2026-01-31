// src/app/page.tsx

"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import Link from "next/link";
import { SUBJECTS } from "@/constants/subjects";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Lock, Unlock, MessageSquare, X, Send, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [broadcast, setBroadcast] = useState("");
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [msgForm, setMsgForm] = useState({ name: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  // Fetch Announcement on Load
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/broadcast`)
      .then(res => res.json())
      .then(data => setBroadcast(data.message))
      .catch(() => {});
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msgForm)
      });
      alert("Message received. We'll hear your thoughts.");
      setIsContactOpen(false);
      setMsgForm({ name: "", email: "", message: "" });
    } catch (error) {
      alert("Transmission failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-magenta-500/30">
      
      {/* 1. Header & Hero */}
      <header className="relative pt-20 pb-16 px-6 text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-magenta-900/20 blur-[120px] -z-10 rounded-full pointer-events-none" />
        
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-blue-400 via-magenta-500 to-purple-600 mb-6">
          GATE LORES
        </h1>
        <p className="max-w-2xl mx-auto text-slate-400 text-lg md:text-xl leading-relaxed mb-8">
          The <span className="text-white font-semibold">Study Den</span> for elite preparation.
          <br />
          <span className="text-sm font-mono text-slate-600 mt-2 block">
            Rolling releases to optimize costs. All modules guaranteed by <span className="text-magenta-500">Oct 31</span>.
          </span>
        </p>

        {/* Live Ticker */}
        {broadcast && (
          <div className="inline-flex items-center gap-3 bg-zinc-900/80 border border-zinc-800 px-6 py-2 rounded-full backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-sm font-mono text-red-200 tracking-wide uppercase">{broadcast}</span>
          </div>
        )}
      </header>

      {/* 2. Subject Grid */}
      <main className="max-w-7xl mx-auto px-6 pb-32">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SUBJECTS.map((sub, idx) => (
            <div key={sub.id} className="relative group">
              {/* Card */}
              <div className={`
                h-full p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between
                ${sub.status === 'unlocked' 
                  ? 'bg-zinc-900/30 border-magenta-500/30 hover:bg-zinc-900/50 hover:border-magenta-500 shadow-[0_0_30px_-10px_rgba(219,39,119,0.15)]' 
                  : 'bg-zinc-950 border-zinc-900 opacity-60 grayscale hover:opacity-100 hover:grayscale-0'}
              `}>
                
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <span className="font-mono text-xs text-slate-500 tracking-widest">CHAPTER {idx + 1}</span>
                    {sub.status === 'unlocked' 
                      ? <div className="p-2 bg-green-500/10 rounded-full text-green-500"><Unlock className="w-4 h-4"/></div>
                      : <div className="p-2 bg-zinc-800 rounded-full text-slate-500"><Lock className="w-4 h-4"/></div>
                    }
                  </div>
                  
                  <h2 className="text-2xl font-bold mb-2 group-hover:text-magenta-400 transition-colors">{sub.name}</h2>
                  
                  {sub.status === 'locked' && (
                    <p className="font-mono text-sm text-slate-500 mt-4 flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-600 rounded-full"></span>
                      Unlocks {sub.startDate}
                    </p>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                   {sub.status === 'unlocked' ? (
                     <Link href={`/subject/${sub.id}`} className="w-full text-center bg-white/5 hover:bg-white/10 text-white py-3 rounded-xl font-bold transition-all text-sm tracking-wide">
                       ENTER DEN →
                     </Link>
                   ) : (
                     <span className="w-full text-center text-xs font-mono text-slate-600 uppercase tracking-widest cursor-not-allowed">
                       Focus on Current Tasks
                     </span>
                   )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* 3. Floating Contact Button */}
      <button 
        onClick={() => setIsContactOpen(true)}
        className="fixed bottom-8 right-8 p-4 bg-magenta-600 hover:bg-magenta-500 text-white rounded-full shadow-[0_0_40px_rgba(219,39,119,0.4)] transition-all hover:scale-110 z-40"
      >
        <MessageSquare className="w-6 h-6" />
      </button>

      {/* Contact Modal */}
      <AnimatePresence>
        {isContactOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsContactOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-8 shadow-2xl"
            >
              <button onClick={() => setIsContactOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="text-xl font-bold text-white mb-2">Message the Owner</h3>
              <p className="text-sm text-slate-500 mb-6">Feedback, requests, or just a hello. We read everything.</p>
              
              <form onSubmit={handleSendMessage} className="space-y-4">
                <input 
                  required
                  placeholder="Your Name"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-magenta-500 outline-none"
                  value={msgForm.name}
                  onChange={e => setMsgForm({...msgForm, name: e.target.value})}
                />
                <input 
                  required
                  type="email"
                  placeholder="Your Email"
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-magenta-500 outline-none"
                  value={msgForm.email}
                  onChange={e => setMsgForm({...msgForm, email: e.target.value})}
                />
                <textarea 
                  required
                  placeholder="Your Message..."
                  className="w-full h-32 bg-black/50 border border-white/10 rounded-lg p-3 text-sm text-white focus:border-magenta-500 outline-none resize-none"
                  value={msgForm.message}
                  onChange={e => setMsgForm({...msgForm, message: e.target.value})}
                />
                <button 
                  disabled={sending}
                  className="w-full bg-magenta-600 hover:bg-magenta-500 text-white font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {sending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}