"use client";

import { useState, useEffect } from "react";
import { Search, Filter, CheckCircle2, XCircle, ExternalLink, AlertTriangle, Layers, ChevronDown, Check, RefreshCw, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartDisplay } from "@/components/SmartDisplay";

// --- Types ---
type PYQ = {
  id: string;
  exam: string;
  year: number;
  question_number: number;
  question_html: string;
  question_type: "MCQ" | "MSQ" | "NAT";
  options: { label: string; html: string }[];
  subject: string;
  topic: string;
  answer_key: string[];
  solution_url: string;
  marks: number;
};

type Metadata = Record<string, { total: number; topics: Record<string, number> }>;

type FeedbackState = {
  status: "idle" | "correct" | "wrong";
  userKeys: string[];
  showSolution: boolean;
};

export default function PYQArchive() {
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  
  // --- FILTERS ---
  const [draftSubject, setDraftSubject] = useState<string>("");
  const [draftTopic, setDraftTopic] = useState<string>("");
  const [draftType, setDraftType] = useState<string>("");
  
  // --- RANDOMIZED POOL STATE ---
  const [questionPool, setQuestionPool] = useState<PYQ[]>([]);
  const [displayCount, setDisplayCount] = useState<number>(15);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // --- INTERACTION STATE ---
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, FeedbackState>>({});

  // Fetch Metadata on Mount
  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_CORTEX_API_URL + "/api/pyqs/metadata")
      .then(res => res.json())
      .then(data => setMetadata(data.subjects))
      .catch(console.error);
  }, []);

  // --- THE RANDOMIZER ENGINE ---
  const handleExecuteSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setAnswers({});
    setFeedback({});
    setDisplayCount(15);
    setQuestionPool([]);

    try {
      const params = new URLSearchParams({ page: "1", limit: "200" });
      if (draftSubject) params.append("subject", draftSubject);
      if (draftTopic) params.append("topic", draftTopic);
      if (draftType) params.append("question_type", draftType);

      const res = await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/pyqs/?${params.toString()}`);
      
      if (res.ok) {
        const data = await res.json();
        
        // Fisher-Yates Shuffle
        const shuffled = [...data.data];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        
        setQuestionPool(shuffled);
      }
    } catch (error) {
      console.error("Failed to fetch PYQs:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- HANDLERS ---
  const handleOptionToggle = (qId: string, val: string, type: string) => {
    if (feedback[qId]?.status && feedback[qId].status !== "idle") return; 

    const currentAns = answers[qId] || [];
    if (type === "MCQ" || type === "NAT") {
      setAnswers({ ...answers, [qId]: [val] });
    } else if (type === "MSQ") {
      if (currentAns.includes(val)) {
        setAnswers({ ...answers, [qId]: currentAns.filter(v => v !== val) });
      } else {
        setAnswers({ ...answers, [qId]: [...currentAns, val] });
      }
    }
  };

  const handleCheckAnswer = async (q: PYQ) => {
    const userKeys = answers[q.id] || [];
    if (userKeys.length === 0) return;

    const correctKeys = q.answer_key.map(k => k.trim());
    let isCorrect = false;

    if (q.question_type === "NAT") {
      try {
        const userVal = parseFloat(userKeys[0]);
        if (correctKeys.length === 1) {
          isCorrect = userVal === parseFloat(correctKeys[0]);
        } else if (correctKeys.length >= 2) {
          const min = Math.min(parseFloat(correctKeys[0]), parseFloat(correctKeys[1]));
          const max = Math.max(parseFloat(correctKeys[0]), parseFloat(correctKeys[1]));
          isCorrect = userVal >= min && userVal <= max;
        }
      } catch {
        isCorrect = false;
      }
    } else {
      isCorrect = [...userKeys].sort().join(",") === [...correctKeys].sort().join(",");
    }

    setFeedback(prev => ({
      ...prev,
      [q.id]: { status: isCorrect ? "correct" : "wrong", userKeys, showSolution: true }
    }));

    if (!isCorrect) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/hospital/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question_id: q.id, user_selected_keys: userKeys, is_correct: false })
        });
      } catch (e) {
        console.error("Hospital logging failed", e);
      }
    }
  };

  const displayedQuestions = questionPool.slice(0, displayCount);

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      
      {/* HEADER & CONTROL PANEL */}
      <section className="space-y-6">
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center justify-center p-3 bg-cyan-500/10 rounded-2xl mb-2">
            <Layers className="w-8 h-8 text-cyan-500" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-100">Practice Databanks</h1>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto font-medium">
            Configure your parameters. Questions are extracted and scrambled from the database to ensure unpredictable combat scenarios.
          </p>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Target Subject</label>
              <div className="relative">
                <select 
                  value={draftSubject} 
                  onChange={(e) => { setDraftSubject(e.target.value); setDraftTopic(""); }}
                  className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-zinc-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none shadow-inner"
                >
                  <option value="">All Subjects</option>
                  {metadata && Object.keys(metadata).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Micro-Topic</label>
              <div className="relative">
                <select 
                  value={draftTopic} 
                  onChange={(e) => setDraftTopic(e.target.value)}
                  disabled={!draftSubject}
                  className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-zinc-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none shadow-inner disabled:opacity-50"
                >
                  <option value="">All Topics</option>
                  {draftSubject && metadata && Object.keys(metadata[draftSubject].topics).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest pl-1">Format</label>
              <div className="relative">
                <select 
                  value={draftType} 
                  onChange={(e) => setDraftType(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800/80 rounded-xl pl-4 pr-10 py-3 text-sm font-medium text-zinc-300 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all appearance-none shadow-inner"
                >
                  <option value="">All Formats</option>
                  <option value="MCQ">MCQ (Multiple Choice)</option>
                  <option value="MSQ">MSQ (Multiple Select)</option>
                  <option value="NAT">NAT (Numerical)</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-zinc-800/60">
            <button 
              onClick={handleExecuteSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-cyan-600 hover:bg-cyan-500 text-white py-4 rounded-xl font-black tracking-widest uppercase text-xs transition-all shadow-[0_0_20px_rgba(8,145,178,0.2)] hover:shadow-[0_0_30px_rgba(8,145,178,0.4)] disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shuffle className="w-4 h-4" />}
              {loading ? "Extracting & Scrambling..." : "Randomize & Execute Query"}
            </button>
          </div>
        </div>
      </section>

      {/* THE COMBAT FEED */}
      <main className="space-y-8">
        {!hasSearched ? null : displayedQuestions.length === 0 && !loading ? (
          <div className="p-16 text-center border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/20 shadow-inner">
            <Filter className="w-12 h-12 text-zinc-700 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-zinc-300">No Signatures Found</h2>
            <p className="text-sm text-zinc-500 mt-2">Try loosening your filters.</p>
          </div>
        ) : (
          <div className="space-y-12">
            
            <div className="flex items-center justify-between text-xs font-mono font-bold uppercase tracking-widest text-zinc-500 px-2 border-b border-zinc-800/50 pb-4">
              <span>Displaying {displayedQuestions.length} of {questionPool.length} Scrambled Entities</span>
              <span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> Live Verification</span>
            </div>

            {displayedQuestions.map((q, idx) => {
              const fb = feedback[q.id];
              const isLocked = fb && fb.status !== "idle";
              const userAns = answers[q.id] || [];

              return (
                <div key={q.id} className={cn(
                  "bg-zinc-950/60 border rounded-2xl overflow-hidden transition-all duration-500 shadow-xl",
                  fb?.status === "correct" ? "border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.05)]" : 
                  fb?.status === "wrong" ? "border-rose-500/40 shadow-[0_0_30px_rgba(244,63,94,0.05)]" : "border-zinc-800/60"
                )}>
                  
                  {/* Q Header */}
                  <div className="flex flex-wrap items-center justify-between gap-4 p-5 md:p-6 bg-zinc-900/30 border-b border-zinc-800/50">
                    <div className="flex items-center gap-4">
                      <div className="bg-zinc-200 text-zinc-900 font-black px-4 py-1.5 rounded-lg text-sm shadow-md">
                        Q.{idx + 1}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-wider text-zinc-300">{q.subject}</span>
                        <span className="text-xs font-mono text-cyan-500/80 mt-0.5">{q.topic} • {q.exam}</span>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-zinc-900 border border-zinc-700 text-zinc-400 rounded-md text-[10px] font-black tracking-[0.2em] uppercase shadow-inner">
                      {q.question_type}
                    </div>
                  </div>

                  {/* Q Body & Inputs */}
                  <div className="p-6 md:p-8">
                    <SmartDisplay html={q.question_html} className="text-[15px] md:text-base mb-8" />

                    <div className="space-y-4 max-w-3xl">
                      {q.question_type === "NAT" ? (
                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center gap-5 shadow-inner">
                          <span className="text-zinc-400 font-bold tracking-widest uppercase text-xs">Numerical Input:</span>
                          <input 
                            type="number" step="any" disabled={isLocked} placeholder="Enter exact value..."
                            className="bg-zinc-950 border-2 border-zinc-700 rounded-lg px-5 py-3 font-mono text-xl text-cyan-400 focus:border-cyan-500 focus:bg-zinc-950 outline-none w-full sm:w-48 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-inner"
                            value={userAns[0] || ""}
                            onChange={(e) => handleOptionToggle(q.id, e.target.value, "NAT")}
                          />
                          {isLocked && fb.showSolution && (
                            <div className="ml-auto flex flex-col text-right">
                               <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Official Range</span>
                               <span className="font-mono font-bold text-emerald-400">{q.answer_key.join(" to ")}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid gap-3">
                          {q.options.map((opt) => {
                            const isSelected = userAns.includes(opt.label);
                            const isCorrectOption = fb?.showSolution && q.answer_key.includes(opt.label);
                            const isWrongSelection = isLocked && isSelected && !q.answer_key.includes(opt.label);

                            return (
                              <button 
                                key={opt.label} disabled={isLocked}
                                onClick={() => handleOptionToggle(q.id, opt.label, q.question_type)}
                                className={cn(
                                  "flex items-start p-5 rounded-xl border-2 text-left transition-all duration-300 group",
                                  !isLocked && isSelected ? "bg-cyan-950/20 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.1)]" : 
                                  !isLocked ? "bg-zinc-900/30 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60" :
                                  isCorrectOption ? "bg-emerald-950/20 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/50" :
                                  isWrongSelection ? "bg-rose-950/10 border-rose-500/30" : "bg-zinc-950/30 border-zinc-800/30"
                                )}
                              >
                                <div className={cn(
                                  "flex-shrink-0 w-8 h-8 mt-0.5 flex items-center justify-center rounded-md border-2 font-black text-sm transition-colors shadow-sm",
                                  !isLocked && isSelected ? "bg-cyan-500 border-cyan-400 text-zinc-950" :
                                  isCorrectOption ? "bg-emerald-500 border-emerald-400 text-emerald-950" :
                                  isWrongSelection ? "bg-rose-500 border-rose-400 text-rose-950" : "bg-zinc-900 border-zinc-700 text-zinc-400 group-hover:border-zinc-500"
                                )}>
                                  {isCorrectOption ? <Check className="w-5 h-5" /> : isWrongSelection ? <XCircle className="w-5 h-5" /> : opt.label}
                                </div>
                                <div className={cn("ml-5", isLocked && !isCorrectOption && !isWrongSelection && "opacity-40")}>
                                  <SmartDisplay html={opt.html} className="text-[15px] [&>p]:m-0" />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="p-5 md:p-6 bg-zinc-900/50 border-t border-zinc-800/50 flex flex-wrap items-center justify-between gap-4">
                    {!isLocked ? (
                      <div className="w-full flex justify-end">
                        <button 
                          onClick={() => handleCheckAnswer(q)}
                          disabled={userAns.length === 0}
                          className="bg-zinc-200 hover:bg-white text-zinc-900 disabled:bg-zinc-900 disabled:text-zinc-600 disabled:border disabled:border-zinc-800 px-8 py-3 rounded-lg font-black tracking-widest uppercase text-xs transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:shadow-none disabled:transform-none disabled:opacity-50"
                        >
                          Verify Solution
                        </button>
                      </div>
                    ) : (
                      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          {fb.status === "correct" ? (
                            <div className="flex items-center gap-2.5 text-emerald-400 bg-emerald-500/10 px-5 py-2.5 rounded-lg border border-emerald-500/30 shadow-inner">
                              <CheckCircle2 className="w-5 h-5" />
                              <span className="font-bold tracking-widest uppercase text-xs">Target Destroyed</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5 text-rose-400 bg-rose-500/10 px-5 py-2.5 rounded-lg border border-rose-500/30 shadow-inner">
                              <XCircle className="w-5 h-5" />
                              <span className="font-bold tracking-widest uppercase text-xs">Mission Failed</span>
                            </div>
                          )}
                          
                          {fb.status === "wrong" && (
                            <span className="flex items-center gap-2 text-[10px] font-bold tracking-widest uppercase text-amber-500/80 bg-zinc-950 border border-zinc-800/80 px-3 py-2 rounded-lg shadow-inner">
                              <AlertTriangle className="w-3.5 h-3.5" /> Hospital
                            </span>
                          )}
                        </div>

                        {q.solution_url && (
                          <a 
                            href={q.solution_url} 
                            target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-cyan-400 hover:text-cyan-300 bg-cyan-950/20 hover:bg-cyan-950/40 border border-cyan-500/20 px-5 py-2.5 rounded-lg transition-all shadow-inner hover:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                          >
                            View Discussion <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Load More Button */}
            {displayCount < questionPool.length && (
              <div className="pt-6 pb-12 flex justify-center">
                <button 
                  onClick={() => setDisplayCount(p => p + 15)}
                  className="bg-zinc-900 border-2 border-zinc-800 hover:border-cyan-500/40 hover:bg-zinc-900/80 text-zinc-400 hover:text-cyan-400 px-10 py-4 rounded-xl font-bold tracking-widest uppercase text-xs transition-all shadow-lg hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] hover:-translate-y-0.5"
                >
                  Load Next Sequence
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}