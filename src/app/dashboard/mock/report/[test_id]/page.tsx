// src/app/dashboard/mock/report/[test_id]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { api } from "@/lib/api";
import { 
  Trophy, Crosshair, Activity, ChevronLeft, CheckCircle2, 
  XCircle, ExternalLink, Check, Layers, Target, RotateCcw 
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SmartDisplay } from "@/components/SmartDisplay";

export default function PostExamReport({ params }: { params: Promise<{ test_id: string }> }) {
  
  const resolvedParams = use(params);
  const test_id = resolvedParams.test_id;

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- Drill-Down State ---
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [activeTopic, setActiveTopic] = useState<string>("ALL");

  useEffect(() => {
    if (!test_id) return;
    
    api.getSpecificTestReport(test_id)
      .then(data => {
        setReport(data);
        
        // STRICT FILTER: Only consider subjects that actually had questions in this test
        const validSubjects = data?.subject_analysis?.filter((s: any) => s.max_marks > 0) || [];
        
        // Auto-select the first valid subject to populate the view
        if (validSubjects.length > 0) {
          setActiveSubject(validSubjects[0].subject);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Report extraction failed:", error);
        setLoading(false); 
      });
  }, [test_id]);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-cyan-500 font-mono tracking-widest text-sm animate-pulse">DECRYPTING COMBAT DATA...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-4xl mx-auto mt-20 p-10 text-center border border-rose-500/30 bg-rose-950/20 rounded-2xl shadow-2xl">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-rose-400 mb-2">Report Data Corrupted or Not Found</h2>
        <p className="text-zinc-500 text-sm font-mono">The requested operation ID does not exist in the mainframe.</p>
        <Link href="/dashboard" className="inline-block mt-6 px-6 py-2 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-300 rounded font-bold uppercase text-xs tracking-widest transition-colors">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  // Derive active data for the drill-down view
  const activeSubjects = report.subject_analysis?.filter((s: any) => s.max_marks > 0) || [];
  const currentSubjectData = activeSubjects.find((s: any) => s.subject === activeSubject);
  const filteredQuestions = report.detailed_responses?.filter((q: any) => 
    q.subject === activeSubject && (activeTopic === "ALL" || q.topic === activeTopic)
  ) || [];

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* HEADER */}
      <header className="border-b border-zinc-800/60 pb-6 flex flex-col md:flex-row items-start justify-between gap-6">
        <div>
          <Link href="/dashboard" className="text-zinc-500 hover:text-cyan-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Return to Mission Control
          </Link>
          <h1 className="text-4xl font-black tracking-tight text-zinc-100 flex items-center gap-3">
            After-Action Report
          </h1>
          <p className="text-zinc-500 mt-2 text-sm font-mono uppercase tracking-wider">
            Operation ID: <span className="text-zinc-300">{report.test_id?.split("-")[0]}</span> | 
            Date: {new Date(report.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          </p>
        </div>
        <div className="text-right bg-zinc-900/50 border border-zinc-800 p-5 rounded-xl shadow-xl min-w-[160px]">
          <p className="text-[10px] font-black tracking-[0.2em] text-zinc-500 uppercase mb-2">AIR Prediction</p>
          <p className="text-3xl font-black text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">{report.rank_prediction}</p>
        </div>
      </header>

      {/* GLOBAL KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Total Score" value={`${report.total_score} / ${report.max_marks}`} icon={Trophy} highlight />
        <StatCard title="System Accuracy" value={`${report.accuracy}%`} icon={Crosshair} color={report.accuracy > 70 ? "text-emerald-400" : report.accuracy > 40 ? "text-amber-400" : "text-rose-400"} />
        <StatCard title="Attempted" value={report.total_attempted?.toString()} icon={Activity} />
        <StatCard title="Confirmed Hits" value={report.total_correct?.toString()} icon={CheckCircle2} color="text-emerald-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        
        {/* LEFT COLUMN: Subject & Topic Navigation */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800/60">
            <Layers className="w-5 h-5 text-cyan-500" />
            <h2 className="text-sm font-bold text-zinc-100 tracking-widest uppercase">Subject Analysis</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {activeSubjects.map((subj: any) => {
              const isActive = activeSubject === subj.subject;
              return (
                <button
                  key={subj.subject}
                  onClick={() => { setActiveSubject(subj.subject); setActiveTopic("ALL"); }}
                  className={cn(
                    "p-4 rounded-xl border-2 text-left transition-all duration-300 flex flex-col gap-2",
                    isActive 
                      ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/30" 
                      : "bg-zinc-900/40 border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/80"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className={cn("text-sm font-bold", isActive ? "text-cyan-100" : "text-zinc-300")}>
                      {subj.subject}
                    </span>
                    <span className={cn(
                      "text-[10px] font-mono px-2 py-0.5 rounded",
                      subj.accuracy > 70 ? "bg-emerald-500/10 text-emerald-400" : 
                      subj.accuracy > 40 ? "bg-amber-500/10 text-amber-400" : 
                      "bg-rose-500/10 text-rose-400"
                    )}>
                      {subj.accuracy}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] font-mono text-zinc-500 uppercase">
                    <span>Score: {subj.score}/{subj.max_marks}</span>
                    <span>•</span>
                    <span>Q: {subj.attempted}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT COLUMN: Topic Stats & Filtered Questions */}
        <main className="lg:col-span-8 space-y-8">
          
          {currentSubjectData && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60 mb-6">
                <h2 className="text-xl font-black text-zinc-100 flex items-center gap-3">
                  {currentSubjectData.subject}
                </h2>
                <Link 
                  href={`/dashboard/mock?mode=CUSTOM&subjects=${encodeURIComponent(activeSubject || "")}&topics=${activeTopic === "ALL" ? "" : encodeURIComponent(activeTopic)}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/30 text-purple-400 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-inner"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Retry {activeTopic === "ALL" ? "Subject" : "Topic"}
                </Link>
              </div>

              {/* Topic Chips */}
              <div className="flex flex-wrap gap-2 mb-8">
                <button
                  onClick={() => setActiveTopic("ALL")}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all",
                    activeTopic === "ALL" ? "bg-cyan-600 text-white border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                  )}
                >
                  All Topics
                </button>
                {currentSubjectData.topics.filter((t: any) => t.attempted > 0 || t.wrong > 0 || t.correct > 0).map((t: any) => (
                  <button
                    key={t.topic}
                    onClick={() => setActiveTopic(t.topic)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest border transition-all flex items-center gap-2",
                      activeTopic === t.topic ? "bg-cyan-600 text-white border-cyan-500 shadow-[0_0_15px_rgba(8,145,178,0.3)]" : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                    )}
                  >
                    {t.topic}
                    <span className={cn(
                      "px-1.5 py-0.5 rounded text-[9px] font-mono",
                      activeTopic === t.topic ? "bg-cyan-950/30 text-cyan-100" : "bg-zinc-950 text-zinc-500"
                    )}>
                      {t.accuracy}%
                    </span>
                  </button>
                ))}
              </div>

              {/* Filtered Questions List */}
              <div className="space-y-8">
                {filteredQuestions.length === 0 ? (
                  <div className="p-16 text-center border-2 border-zinc-800 border-dashed rounded-2xl bg-zinc-900/20">
                    <Target className="w-10 h-10 text-zinc-700 mx-auto mb-4 opacity-50" />
                    <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">No questions attempted for this filter.</p>
                  </div>
                ) : (
                  filteredQuestions.map((resp: any, idx: number) => {
                    // Safe Data Extraction
                    const userKeys = Array.isArray(resp.user_keys) ? resp.user_keys : [];
                    const correctKeys = Array.isArray(resp.correct_keys) ? resp.correct_keys : [];
                    
                    // SYNC UPGRADE: Use the backend's explicit flag instead of checking array length
                    const isBlank = !resp.is_attempted;

                    return (
                      <div key={resp.question_id} className={cn(
                        "rounded-2xl overflow-hidden border-2 transition-all duration-300 shadow-xl",
                        resp.is_correct ? "border-emerald-500/20 bg-emerald-950/5" : 
                        isBlank ? "border-amber-500/20 bg-amber-950/5" :
                        "border-rose-500/20 bg-rose-950/5"
                      )}>
                        
                        {/* Q Header */}
                        <div className={cn(
                          "p-5 border-b flex flex-wrap justify-between items-center gap-4",
                          resp.is_correct ? "bg-emerald-500/10 border-emerald-500/20" : 
                          isBlank ? "bg-amber-500/10 border-amber-500/20" :
                          "bg-rose-500/10 border-rose-500/20"
                        )}>
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-lg flex items-center justify-center border shadow-inner",
                              resp.is_correct ? "bg-emerald-500 border-emerald-400 text-zinc-950" : 
                              isBlank ? "bg-amber-500 border-amber-400 text-amber-950" :
                              "bg-rose-500 border-rose-400 text-white"
                            )}>
                              {resp.is_correct ? <CheckCircle2 className="w-6 h-6" /> : isBlank ? <Activity className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <div>
                              <h4 className="font-black text-zinc-100 text-sm flex items-center gap-2">
                                Question {idx + 1}
                                {isBlank && <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-950/50 border border-amber-500/30 text-amber-500">Unanswered</span>}
                              </h4>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">{resp.topic}</p>
                            </div>
                          </div>
                          <span className="px-3 py-1 rounded-md text-[10px] font-black tracking-[0.2em] uppercase bg-zinc-950 border border-zinc-800 text-zinc-400">
                            {resp.question_type}
                          </span>
                        </div>

                        {/* Q Body */}
                        <div className="p-6 md:p-8 bg-zinc-950/40">
                          <SmartDisplay html={resp.question_html} className="text-base mb-8" />

                          {/* Options / NAT Grid */}
                          {resp.question_type === "NAT" ? (
                            <div className="grid md:grid-cols-2 gap-6 bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 mb-6 shadow-inner">
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Your Input</p>
                                <div className={cn(
                                  "p-4 rounded-lg border font-mono text-lg font-bold shadow-inner",
                                  resp.is_correct ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : 
                                  isBlank ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
                                  "bg-rose-500/10 border-rose-500/30 text-rose-400"
                                )}>
                                  {isBlank ? "— BLANK —" : userKeys[0]}
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Official Range / Key</p>
                                <div className="p-4 rounded-lg border bg-emerald-500/10 border-emerald-500/30 font-mono text-lg font-bold text-emerald-400 shadow-inner">
                                  {correctKeys.join(" to ")}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3 mb-6">
                              {/* SYNC UPGRADE: Failsafe for missing option payloads */}
                              {resp.options && resp.options.length > 0 ? (
                                resp.options.map((opt: any) => {
                                  const isUserSelected = userKeys.includes(opt.label);
                                  const isCorrectKey = correctKeys.includes(opt.label);
                                  const isWrongSelection = isUserSelected && !isCorrectKey;

                                  return (
                                    <div 
                                      key={opt.label}
                                      className={cn(
                                        "flex items-start p-5 rounded-xl border-2 text-left transition-all",
                                        isCorrectKey ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)] ring-1 ring-emerald-500/50" :
                                        isWrongSelection ? "bg-rose-950/10 border-rose-500/40" :
                                        "bg-zinc-900/30 border-zinc-800/80"
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
                                      <div className={cn(
                                        "ml-5", 
                                        !isCorrectKey && !isWrongSelection && "opacity-70"
                                      )}>
                                        <SmartDisplay html={opt.html} className="text-[15px] [&>p]:m-0" />
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/50 text-zinc-500 text-sm font-mono text-center shadow-inner">
                                  Option payload missing from database entry.
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Footer */}
                          {resp.solution_url && (
                            <div className="flex justify-end border-t border-zinc-800/60 pt-6">
                              <a 
                                href={resp.solution_url} 
                                target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-[11px] font-black tracking-widest uppercase text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 px-5 py-2.5 rounded-lg transition-all shadow-inner hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                              >
                                View Official Solution <ExternalLink className="w-4 h-4" />
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, highlight = false, color = "text-zinc-100" }: { title: string; value: string; icon: any; highlight?: boolean; color?: string }) {
  return (
    <div className={cn(
      "rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between shadow-lg", 
      highlight ? "bg-cyan-950/20 border-cyan-500/40" : "bg-zinc-900/40 border-zinc-800/60"
    )}>
      <Icon className={cn("w-6 h-6 mb-6", highlight ? "text-cyan-400" : "text-zinc-500")} />
      <div>
        <p className={cn("text-2xl font-black font-mono tracking-tight", color)}>{value}</p>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mt-2">{title}</p>
      </div>
    </div>
  );
}