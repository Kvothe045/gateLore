"use client";

import { useState, useEffect } from "react";
import { SmartDisplay } from "@/components/SmartDisplay";
import { 
  Skull, HeartPulse, Stethoscope, Trash2, Activity, ShieldAlert, 
  Thermometer, Database, CheckCircle2, XCircle, ExternalLink, Check, 
  ChevronLeft, FolderOpen, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type Mistake = {
  question_id: string;
  subject: string;
  topic: string;
  question_html?: string;
  question_type?: "MCQ" | "MSQ" | "NAT" | string;
  options?: { label: string; html: string }[];
  solution_url?: string;
  user_selected_keys: string[];
  correct_keys: string[];
  failure_count: number;
  last_failed_at: string;
};

export default function TheHospital() {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // --- Drill-Down State ---
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("All");

  // --- Initial Data Fetch ---
  useEffect(() => {
    const loadHospitalData = async () => {
      try {
        const [qRes, sRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/hospital/mistakes`),
          fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/hospital/stats`)
        ]);
        
        if (qRes.ok && sRes.ok) {
          const qData = await qRes.json();
          const sData = await sRes.json();
          
          const extractedMistakes = Array.isArray(qData) ? qData : (Array.isArray(qData?.data) ? qData.data : []);
          setMistakes(extractedMistakes);
          setStats(sData || { stats: [], total_subjects_in_hospital: 0 });
        } else {
          setMistakes([]); 
        }
      } catch (error) {
        console.error("Hospital connection lost:", error);
        setMistakes([]); 
      } finally {
        setLoading(false);
      }
    };
    loadHospitalData();
  }, []);

  // --- Discharge Action ---
  const handleDischarge = async (id: string) => {
    setMistakes(prev => prev.filter(m => m.question_id !== id));
    try {
      await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/hospital/discharge/${id}`, {
        method: 'DELETE'
      });
    } catch (error) {
      console.error("Discharge failed:", error);
    }
  };

  // --- Filtering Logic ---
  const safeMistakes = Array.isArray(mistakes) ? mistakes : [];
  
  const currentWardMistakes = activeSubject 
    ? safeMistakes.filter(m => m.subject === activeSubject)
    : [];

  const uniqueTopics = Array.from(new Set(currentWardMistakes.map(m => m.topic))).sort();

  const displayedMistakes = activeTopic === "All"
    ? currentWardMistakes
    : currentWardMistakes.filter(m => m.topic === activeTopic);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <HeartPulse className="w-12 h-12 text-rose-500 animate-pulse drop-shadow-[0_0_15px_rgba(244,63,94,0.5)]" />
        <p className="text-rose-500 font-mono tracking-[0.2em] text-sm uppercase animate-pulse">Extracting Patient Records...</p>
      </div>
    );
  }

  const isHospitalEmpty = safeMistakes.length === 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* GLOBAL HUD HEADER */}
      <header className="border-b border-zinc-800/60 pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full mb-2">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-[0.2em]">Emergency Ward Active</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-100 flex items-center gap-4">
            <Stethoscope className="w-9 h-9 text-rose-500" />
            The Hospital
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Revisit every concept that caused a system failure. Clear the ward to reach AIR-1.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl text-right min-w-[140px] shadow-xl">
            <p className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Total Patients</p>
            <p className="text-3xl font-black text-rose-500 font-mono">{safeMistakes.length}</p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/80 p-5 rounded-2xl text-right min-w-[140px] shadow-xl">
            <p className="text-[10px] font-black text-zinc-500 uppercase mb-1 tracking-widest">Critical Wards</p>
            <p className="text-3xl font-black text-amber-500 font-mono">{stats?.total_subjects_in_hospital || 0}</p>
          </div>
        </div>
      </header>

      {/* --- VIEW 1: THE DIRECTORY (Grid of Subjects) --- */}
      {!activeSubject ? (
        <div className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/60">
            <FolderOpen className="w-5 h-5 text-cyan-500" />
            <h2 className="text-sm font-bold text-zinc-100 tracking-widest uppercase">Ward Directory</h2>
          </div>

          {isHospitalEmpty ? (
            <div className="p-20 text-center border-2 border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20">
              <ShieldAlert className="w-16 h-16 text-emerald-500/40 mx-auto mb-6" />
              <h2 className="text-2xl font-black text-zinc-300 tracking-tight uppercase">HOSPITAL CLEAR</h2>
              <p className="text-sm text-zinc-500 mt-2 font-medium">No critical weaknesses detected across the entire database.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.isArray(stats?.stats) && stats.stats.map((s: any) => {
                const liveCount = safeMistakes.filter(m => m.subject === s.subject).length;
                if (liveCount === 0) return null;

                return (
                  <button
                    key={s.subject}
                    onClick={() => { setActiveSubject(s.subject); setActiveTopic("All"); }}
                    className="flex flex-col text-left p-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:bg-rose-950/10 hover:border-rose-500/30 transition-all duration-300 shadow-lg group relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-rose-500/40 group-hover:text-rose-400 transition-colors">
                        <AlertTriangle className="w-5 h-5 text-zinc-600 group-hover:text-rose-500" />
                      </div>
                      <span className="text-2xl font-black font-mono text-rose-500">{liveCount}</span>
                    </div>
                    
                    <h3 className="text-lg font-bold text-zinc-100 tracking-tight mb-2 group-hover:text-rose-100 transition-colors">
                      {s.subject}
                    </h3>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-auto pt-4">
                      Enter Ward <ChevronLeft className="w-3 h-3 inline rotate-180" />
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        
        /* --- VIEW 2: THE ACTIVE WARD --- */
        <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
            <div>
              <button 
                onClick={() => setActiveSubject(null)}
                className="text-zinc-500 hover:text-cyan-400 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-3 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Return to Directory
              </button>
              <h2 className="text-2xl font-black text-zinc-100 flex items-center gap-3">
                {activeSubject} Ward
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8 bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/50">
            <button
              onClick={() => setActiveTopic("All")}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                activeTopic === "All" ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
              )}
            >
              All Topics
            </button>
            {uniqueTopics.map((topic: string) => {
              const count = currentWardMistakes.filter(m => m.topic === topic).length;
              return (
                <button
                  key={topic}
                  onClick={() => setActiveTopic(topic)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2",
                    activeTopic === topic ? "bg-rose-600 text-white border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)]" : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  {topic}
                  <span className={cn(
                    "px-1.5 py-0.5 rounded font-mono",
                    activeTopic === topic ? "bg-rose-950/30 text-rose-100" : "bg-zinc-900 text-zinc-400"
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-12">
            {displayedMistakes.length === 0 ? (
              <div className="p-20 text-center border-2 border-zinc-800 border-dashed rounded-3xl bg-zinc-900/20">
                <ShieldAlert className="w-16 h-16 text-emerald-500/40 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-zinc-300 tracking-tight uppercase">WARD CLEAR</h2>
                <p className="text-sm text-zinc-500 mt-2 font-medium">All patients in this section have been discharged.</p>
              </div>
            ) : (
              displayedMistakes.map((m) => {
                const isBlank = !m.user_selected_keys || m.user_selected_keys.length === 0;

                return (
                  <div key={m.question_id} className="group bg-zinc-900/40 border border-zinc-800/80 rounded-2xl overflow-hidden hover:border-rose-500/50 transition-all duration-300 shadow-xl">
                    <div className="p-6 bg-zinc-950/60 border-b border-zinc-800/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-xl bg-rose-950/50 border border-rose-500/30 flex items-center justify-center shadow-inner">
                          <Thermometer className={cn("w-6 h-6 text-rose-500", m.failure_count > 2 && "animate-pulse")} />
                        </div>
                        <div>
                          <h3 className="text-sm font-black text-zinc-100 tracking-widest uppercase flex items-center gap-3">
                            Patient ID: {m.question_id}
                            {m.question_type && (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black tracking-[0.2em] uppercase bg-zinc-900 border border-zinc-800 text-zinc-400">
                                {m.question_type}
                              </span>
                            )}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5">
                            <span className="text-[10px] font-mono text-zinc-400 font-bold uppercase bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">{m.topic}</span>
                            <span className="text-[10px] font-mono text-rose-400 font-bold uppercase bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded flex items-center gap-1.5">
                              <Activity className="w-3 h-3" /> Failed {m.failure_count} Times
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-5">
                        <div className="text-right hidden sm:block">
                          <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Last Admitted</p>
                          <p className="text-[11px] font-mono text-zinc-400">
                            {new Date(m.last_failed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 md:p-8 bg-zinc-950/40">
                      {m.question_html ? (
                        <SmartDisplay html={m.question_html} className="text-base mb-8" />
                      ) : (
                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50 flex items-center gap-3 text-zinc-500 text-sm font-mono shadow-inner mb-8">
                          <Database className="w-5 h-5" /> Raw HTML missing from patient record. Reference ID: {m.question_id}
                        </div>
                      )}

                      {m.question_type === "NAT" ? (
                        <div className="grid md:grid-cols-2 gap-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 mb-6">
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your Incorrect Input</p>
                            <div className="p-4 rounded-lg border font-mono text-lg font-bold shadow-inner bg-rose-500/10 border-rose-500/30 text-rose-400">
                              {isBlank ? "BLANK" : m.user_selected_keys.join(", ")}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Official Range / Key</p>
                            <div className="p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/30 font-mono text-lg font-bold text-emerald-400 shadow-inner">
                              {m.correct_keys && m.correct_keys.length > 0 ? m.correct_keys.join(" OR ") : "UNKNOWN"}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3 mb-6">
                          {m.options && m.options.length > 0 ? (
                            m.options.map((opt: any) => {
                              const isUserSelected = m.user_selected_keys?.includes(opt.label);
                              const isCorrectKey = m.correct_keys?.includes(opt.label);
                              const isWrongSelection = isUserSelected && !isCorrectKey;

                              return (
                                <div 
                                  key={opt.label}
                                  className={cn(
                                    "flex items-start p-5 rounded-xl border-2 text-left transition-all group",
                                    isCorrectKey ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/50" :
                                    isWrongSelection ? "bg-rose-950/10 border-rose-500/40 opacity-70" :
                                    "bg-zinc-900/30 border-zinc-800/80 opacity-50"
                                  )}
                                >
                                  <div className={cn(
                                    "flex-shrink-0 w-8 h-8 mt-0.5 flex items-center justify-center rounded border-2 font-black text-sm shadow-sm",
                                    isCorrectKey ? "bg-emerald-500 border-emerald-400 text-emerald-950" :
                                    isWrongSelection ? "bg-rose-500 border-rose-400 text-rose-950" :
                                    "bg-zinc-900 border-zinc-700 text-zinc-500"
                                  )}>
                                    {isCorrectKey ? <Check className="w-5 h-5" /> : isWrongSelection ? <XCircle className="w-5 h-5" /> : opt.label}
                                  </div>
                                  <div className="ml-5">
                                    <SmartDisplay html={opt.html} className="text-[15px] [&>p]:m-0" />
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50 text-zinc-500 text-sm font-mono text-center mb-6">
                              Option payload missing from database entry.
                            </div>
                          )}
                        </div>
                      )}
                      
                      {m.solution_url && (
                        <div className="flex justify-end border-t border-zinc-800/60 pt-4">
                          <a 
                            href={m.solution_url} 
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 px-5 py-2.5 rounded-lg transition-all"
                          >
                            View Official Solution <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="p-5 bg-zinc-950 border-t border-zinc-800/60 flex justify-end">
                      <button 
                        onClick={() => handleDischarge(m.question_id)}
                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Discharge Patient
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}