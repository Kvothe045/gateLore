"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, Calculator, ChevronRight, Send, AlertTriangle, Loader2, Maximize } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartDisplay } from "@/components/SmartDisplay";

// --- Types ---
type Question = {
  id: string;
  question_number: number;
  question_html: string;
  question_type: "MCQ" | "MSQ" | "NAT";
  options: { label: string; html: string }[];
  subject: string;
  topic: string;
  marks: number; 
};

type QuestionState = "not_visited" | "not_answered" | "answered" | "marked" | "answered_marked";

export default function MockCombatArena({ params }: { params: Promise<{ test_id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Unwrap Next.js 15 params securely
  const resolvedParams = use(params);
  const test_id = resolvedParams.test_id;

  // --- State ---
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [qStatus, setQStatus] = useState<Record<string, QuestionState>>({});
  const [timeLeft, setTimeLeft] = useState(180 * 60);

  // --- Immersive Fullscreen Logic ---
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
        }
      } catch (e) {
        console.warn("Fullscreen blocked by browser. User might need to click manually.");
      }
    };
    
    enterFullscreen();

    return () => {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  const manualFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen().catch(console.error);
    }
  };

  // --- Initialization: Fetching Custom Test ---
  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      
      // CRITICAL FIX: Hard purge all state before fetching to prevent ghost data bleeding
      setQuestions([]);
      setAnswers({});
      setQStatus({});
      setCurrentIndex(0);

      try {
        const timeLimit = parseInt(searchParams.get("time") || "180");
        setTimeLeft(timeLimit * 60);

        const payload = {
          mode: searchParams.get("mode") || "FULL",
          count: parseInt(searchParams.get("count") || "65"),
          subjects: searchParams.get("subjects") ? searchParams.get("subjects")?.split(",") : [],
          topics: searchParams.get("topics") ? searchParams.get("topics")?.split(",") : [],
          types: searchParams.get("types") ? searchParams.get("types")?.split(",") : ["MCQ", "MSQ", "NAT"],
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/mock/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          setQuestions(data.questions);
          
          const initialStatus: Record<string, QuestionState> = {};
          data.questions.forEach((q: Question, idx: number) => {
            initialStatus[q.id] = idx === 0 ? "not_answered" : "not_visited";
          });
          setQStatus(initialStatus);
        }
      } catch (error) {
        console.error("Failed to generate test:", error);
      } finally {
        setLoading(false);
      }
    };

    if (test_id) {
      fetchQuestions();
    }
  }, [searchParams, test_id]);

  // --- Timer Logic ---
  useEffect(() => {
    if (loading || timeLeft <= 0 || submitting) return;
    const timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
    if (timeLeft === 0) {
      submitTest(); // Auto-submit on zero
    }
    return () => clearInterval(timer);
  }, [loading, timeLeft, submitting]);

  const currentQ = questions[currentIndex];

  // --- Input Handlers ---
  const handleOptionToggle = (val: string) => {
    if (!currentQ) return;
    const currentAns = answers[currentQ.id] || [];
    
    if (currentQ.question_type === "MCQ") {
      setAnswers({ ...answers, [currentQ.id]: [val] }); // Replace for MCQ
    } else if (currentQ.question_type === "MSQ") {
      if (currentAns.includes(val)) {
        setAnswers({ ...answers, [currentQ.id]: currentAns.filter(v => v !== val) }); // Toggle for MSQ
      } else {
        setAnswers({ ...answers, [currentQ.id]: [...currentAns, val] }); // Append for MSQ
      }
    } else {
      // NAT Input
      setAnswers({ ...answers, [currentQ.id]: [val] });
    }
  };

  // --- Navigation Handlers ---
  const changeQuestion = (newIndex: number) => {
    setQStatus(prev => ({
      ...prev,
      [currentQ.id]: prev[currentQ.id] === "not_visited" ? "not_answered" : prev[currentQ.id],
      [questions[newIndex].id]: prev[questions[newIndex].id] === "not_visited" ? "not_answered" : prev[questions[newIndex].id]
    }));
    setCurrentIndex(newIndex);
  };

  const handleSaveAndNext = () => {
    const hasAnswer = (answers[currentQ.id] || []).length > 0;
    setQStatus(prev => ({ ...prev, [currentQ.id]: hasAnswer ? "answered" : "not_answered" }));
    if (currentIndex < questions.length - 1) changeQuestion(currentIndex + 1);
  };

  const handleMarkAndNext = () => {
    const hasAnswer = (answers[currentQ.id] || []).length > 0;
    setQStatus(prev => ({ ...prev, [currentQ.id]: hasAnswer ? "answered_marked" : "marked" }));
    if (currentIndex < questions.length - 1) changeQuestion(currentIndex + 1);
  };

  const handleClearResponse = () => {
    const newAnswers = { ...answers };
    delete newAnswers[currentQ.id];
    setAnswers(newAnswers);
  };

  // --- Submission Logic ---
  const submitTest = async () => {
    setSubmitting(true);
    
    // CRITICAL FIX: Map ONLY over the exact `questions` array currently loaded.
    // This safely captures blank/skipped answers without sending ghost data.
    const submissionPayload = {
      test_type: searchParams.get("mode") === "CUSTOM" ? "Custom Mock" : "Full Mock",
      answers: questions.map((q) => ({
        question_id: q.id,
        selected_keys: answers[q.id] || [] // Empty array if untouched
      }))
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/mock/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submissionPayload)
      });
      
      if (res.ok) {
        const result = await res.json();
        // Guard check: Ensure we actually got a valid ID back from the backend
        if (result && result.test_id && result.test_id !== "undefined") {
           router.push(`/dashboard/mock/report/${result.test_id}`);
        } else {
           alert("Test submitted, but database failed to generate a report ID. Check your archives later.");
           router.push("/dashboard/mock/history");
        }
      } else {
        alert("Server rejected the submission. Network might be unstable.");
        setSubmitting(false);
      }
    } catch (error) {
      console.error("Submission failed:", error);
      alert("Critical Error: Failed to reach the server.");
      setSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- Loading / Empty State Renderers ---
  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center space-y-4 bg-zinc-950">
        <Loader2 className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-cyan-500 font-mono tracking-[0.2em] animate-pulse">BOOTING COMBAT INTERFACE...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center space-y-4 bg-zinc-950">
        <AlertTriangle className="w-12 h-12 text-rose-500" />
        <h2 className="text-xl font-bold text-zinc-200">Question Load Failed</h2>
        <p className="text-zinc-500 max-w-md text-center text-sm">No questions matched your exact parameters. Expand your micro-topics and try again.</p>
        <button onClick={() => router.back()} className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded mt-4 transition-colors font-bold uppercase text-xs tracking-widest">
          Reset Parameters
        </button>
      </div>
    );
  }

  // --- Main Render ---
  return (
    <div className="flex flex-col h-screen w-full bg-zinc-950 text-zinc-200 font-sans overflow-hidden">
      
      {/* TOP HUD HEADER */}
      <header className="flex items-center justify-between px-6 py-4 bg-zinc-900 border-b border-zinc-800">
        <div>
          <h1 className="text-xl font-black text-zinc-100 tracking-tight">CORTEX<span className="text-cyan-500">.CBT</span></h1>
          <p className="text-[10px] text-cyan-500 font-mono mt-1 tracking-widest uppercase">
            {currentQ.subject} | Marks: +{currentQ.marks}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={manualFullscreen}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-md text-sm font-medium transition-colors text-zinc-400 shadow-inner"
            title="Toggle Fullscreen"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button className="flex items-center gap-2 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded-md text-sm font-medium transition-colors shadow-inner">
            <Calculator className="w-4 h-4 text-emerald-400" /> Calculator
          </button>
          
          <div className="flex items-center gap-3 bg-zinc-950 px-5 py-2.5 rounded-md border border-zinc-800 shadow-inner">
            <Clock className={cn("w-5 h-5", timeLeft < 300 ? "text-rose-500 animate-bounce" : "text-cyan-500")} />
            <span className={cn("font-mono text-2xl font-bold", timeLeft < 300 ? "text-rose-500" : "text-zinc-100")}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        
        {/* LEFT PANE: Main Display */}
        <div className="flex-1 flex flex-col border-r border-zinc-800 bg-zinc-950/50">
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8 max-w-5xl mx-auto w-full">
            <div className="flex justify-between items-center pb-4 border-b border-zinc-800/80">
              <span className="text-lg font-bold text-zinc-100">Question {currentIndex + 1}</span>
              <span className="px-3 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs uppercase tracking-widest font-bold text-zinc-300">
                {currentQ.question_type}
              </span>
            </div>
            
            <SmartDisplay html={currentQ.question_html} className="text-lg leading-relaxed" />

            {/* Answer Region */}
            <div className="space-y-4 pt-4">
              {currentQ.question_type === "NAT" ? (
                <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex flex-col gap-4 shadow-inner">
                  <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Numerical Input:</span>
                  <input 
                    type="number" step="any"
                    className="bg-zinc-950 border-2 border-zinc-700 rounded-lg px-4 py-3 font-mono text-xl text-cyan-400 focus:border-cyan-500 w-full sm:w-64 shadow-inner outline-none transition-colors"
                    value={answers[currentQ.id]?.[0] || ""}
                    onChange={(e) => handleOptionToggle(e.target.value)}
                  />
                </div>
              ) : (
                <div className="grid gap-3">
                  {currentQ.options.map((opt) => {
                    const isSelected = (answers[currentQ.id] || []).includes(opt.label);
                    return (
                      <div 
                        key={opt.label}
                        onClick={() => handleOptionToggle(opt.label)}
                        className={cn(
                          "flex items-start p-5 rounded-xl border-2 cursor-pointer transition-all duration-200 group",
                          isSelected 
                            ? "bg-cyan-950/30 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                            : "bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/80"
                        )}
                      >
                        <div className={cn(
                          "flex-shrink-0 w-8 h-8 mt-0.5 flex items-center justify-center rounded border-2 font-black text-sm transition-colors",
                          isSelected 
                            ? "bg-cyan-500 border-cyan-500 text-zinc-950" 
                            : "bg-zinc-950 border-zinc-700 text-zinc-500 group-hover:border-zinc-500"
                        )}>
                          {opt.label}
                        </div>
                        <div className="ml-5">
                          <SmartDisplay html={opt.html} className="[&>p]:m-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Hub Footer */}
          <div className="flex items-center justify-between p-5 bg-zinc-900 border-t border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] z-10">
            <div className="flex gap-4">
              <button onClick={handleMarkAndNext} className="px-6 py-3 bg-zinc-950 border border-zinc-700 hover:border-purple-500 hover:text-purple-400 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-inner">
                Mark & Next
              </button>
              <button onClick={handleClearResponse} className="px-6 py-3 bg-zinc-950 border border-zinc-800 hover:border-rose-500 hover:text-rose-400 rounded-lg text-xs font-bold uppercase tracking-widest transition-colors shadow-inner">
                Clear Selection
              </button>
            </div>
            
            <button onClick={handleSaveAndNext} className="px-10 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(8,145,178,0.3)] hover:shadow-[0_0_25px_rgba(8,145,178,0.5)]">
              Save & Next
            </button>
          </div>
        </div>

        {/* RIGHT PANE: Sidebar Palette */}
        <div className="w-80 bg-zinc-900 flex flex-col z-20 border-l border-zinc-800 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]">
          <div className="p-5 border-b border-zinc-800 bg-zinc-950/50">
            <p className="text-base font-black text-zinc-100 uppercase tracking-widest">KIRA</p>
            <p className="text-[10px] text-cyan-500 font-mono tracking-tighter">GATE CSE SPECIALIST</p>
          </div>

          <div className="p-5 grid grid-cols-2 gap-y-3 gap-x-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
             <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-zinc-200 shadow-sm" /> Visited</div>
             <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]" /> Missing</div>
             <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Saved</div>
             <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.4)]" /> Marked</div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            <div className="grid grid-cols-5 gap-2.5">
              {questions.map((q, idx) => {
                const status = qStatus[q.id] || "not_visited";
                let bgClass = "bg-zinc-200 text-zinc-900 border border-zinc-300";
                
                if (status === "not_answered") bgClass = "bg-rose-500 text-white border-rose-600";
                if (status === "answered") bgClass = "bg-emerald-500 text-white border-emerald-600";
                if (status === "marked") bgClass = "bg-purple-500 text-white border-purple-600";
                if (status === "answered_marked") bgClass = "bg-purple-500 text-white border-2 border-emerald-400 relative";

                return (
                  <button
                    key={q.id}
                    onClick={() => changeQuestion(idx)}
                    className={cn(
                      "aspect-square flex items-center justify-center rounded-md text-xs font-black transition-all hover:-translate-y-0.5",
                      bgClass,
                      currentIndex === idx ? "ring-2 ring-cyan-500 ring-offset-2 ring-offset-zinc-900 scale-110 z-10 shadow-lg" : "shadow-sm"
                    )}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 bg-zinc-950 border-t border-zinc-800">
            <button 
              onClick={submitTest} 
              disabled={submitting}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg font-black tracking-widest uppercase text-xs flex items-center justify-center gap-3 transition-all shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] disabled:shadow-none"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submitting ? "UPLOADING..." : "TERMINATE & SUBMIT"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}