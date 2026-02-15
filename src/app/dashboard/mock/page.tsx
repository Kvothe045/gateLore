"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Settings, Target, Clock, Hash, Layers, Play, ChevronDown, Activity, CheckCircle2, FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

// Types mapping to your /api/pyqs/metadata response
type TopicMap = Record<string, number>;
type SubjectData = { total: number; topics: TopicMap };
type Metadata = Record<string, SubjectData>;

export default function MockConfigurationHub() {
  const router = useRouter();
  const [metadata, setMetadata] = useState<Metadata | null>(null);
  const [loading, setLoading] = useState(true);

  // Exam Configuration State
  const [mode, setMode] = useState<"FULL" | "CUSTOM">("FULL");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["MCQ", "MSQ", "NAT"]);
  const [questionCount, setQuestionCount] = useState<number>(65);
  const [timeLimit, setTimeLimit] = useState<number>(180);

  // UI State
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  useEffect(() => {
    fetch(process.env.NEXT_PUBLIC_CORTEX_API_URL + "/api/pyqs/metadata")
      .then(res => res.json())
      .then(data => {
        setMetadata(data.subjects);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const toggleSubject = (subj: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subj) ? prev.filter(s => s !== subj) : [...prev, subj]
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => 
      prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleLaunch = () => {
    const params = new URLSearchParams();
    params.append("mode", mode);

    if (mode === "FULL") {
      // For FULL mode, we force strict GATE constraints and ignore custom filters
      params.append("count", "65");
      params.append("time", "180");
    } else {
      // For CUSTOM mode, append numerical constraints
      params.append("count", questionCount.toString());
      params.append("time", timeLimit.toString());
      
      // Only append array parameters if they actually have content to prevent '[""]' backend bugs
      if (selectedTypes.length > 0) {
        params.append("types", selectedTypes.join(","));
      }

      // Smart Parent-Subject resolution
      const subjectsToPass = new Set([...selectedSubjects]);
      if (metadata) {
        selectedTopics.forEach(topic => {
          Object.entries(metadata).forEach(([subj, data]) => {
            if (topic in data.topics) subjectsToPass.add(subj);
          });
        });
      }

      if (subjectsToPass.size > 0) {
        params.append("subjects", Array.from(subjectsToPass).join(","));
      }
      
      if (selectedTopics.length > 0) {
        params.append("topics", selectedTopics.join(","));
      }
    }
    
    const sessionId = "session_" + Math.random().toString(36).substring(7);
    router.push(`/dashboard/mock/${sessionId}?${params.toString()}`);
  };

  // Launch Validation Constraints
  const isLaunchDisabled = mode === "CUSTOM" && (
    (selectedSubjects.length === 0 && selectedTopics.length === 0) || 
    selectedTypes.length === 0
  );

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-6">
        <div className="relative flex items-center justify-center">
          <Activity className="w-10 h-10 text-cyan-500 animate-ping absolute opacity-20" />
          <Activity className="w-10 h-10 text-cyan-500 relative z-10" />
        </div>
        <p className="text-cyan-500 font-mono text-sm tracking-[0.3em] animate-pulse">SYNCING DATABANKS...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      
      {/* Header */}
      <header className="border-b border-zinc-800/60 pb-8">
        <h1 className="text-4xl font-black tracking-tight text-zinc-100 flex items-center gap-4">
          <Settings className="w-9 h-9 text-cyan-500" />
          Configuration Engine
        </h1>
        <p className="text-zinc-400 mt-2 text-sm font-medium tracking-wide">Isolate weaknesses and set combat parameters for your next simulation.</p>
      </header>

      {/* MODE SELECTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <button
          onClick={() => { setMode("FULL"); setQuestionCount(65); setTimeLimit(180); }}
          className={cn(
            "p-6 rounded-xl border text-left transition-all duration-300 group relative overflow-hidden",
            mode === "FULL" 
              ? "bg-cyan-950/20 border-cyan-500/50 ring-1 ring-cyan-500/50 shadow-[0_0_30px_rgba(6,182,212,0.15)]" 
              : "bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700"
          )}
        >
          {mode === "FULL" && <div className="absolute top-0 right-0 p-4"><CheckCircle2 className="w-5 h-5 text-cyan-500" /></div>}
          <Target className={cn("w-7 h-7 mb-4", mode === "FULL" ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-400 transition-colors")} />
          <h3 className="text-xl font-bold text-zinc-100">Official GATE Simulation</h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono leading-relaxed">65 Qs • 180 Mins • Strict Pattern<br/>AIR Prediction Active</p>
        </button>

        <button
          onClick={() => { setMode("CUSTOM"); setQuestionCount(20); setTimeLimit(45); }}
          className={cn(
            "p-6 rounded-xl border text-left transition-all duration-300 group relative overflow-hidden",
            mode === "CUSTOM" 
              ? "bg-purple-950/20 border-purple-500/50 ring-1 ring-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.15)]" 
              : "bg-zinc-900/30 border-zinc-800 hover:bg-zinc-900/80 hover:border-zinc-700"
          )}
        >
          {mode === "CUSTOM" && <div className="absolute top-0 right-0 p-4"><CheckCircle2 className="w-5 h-5 text-purple-500" /></div>}
          <FlaskConical className={cn("w-7 h-7 mb-4", mode === "CUSTOM" ? "text-purple-400" : "text-zinc-500 group-hover:text-zinc-400 transition-colors")} />
          <h3 className="text-xl font-bold text-zinc-100">Targeted Hybrid Practice</h3>
          <p className="text-xs text-zinc-500 mt-2 font-mono leading-relaxed">Custom Qs • Custom Time<br/>Isolate Specific Micro-Topics</p>
        </button>
      </section>

      {/* CUSTOM TARGETING UI */}
      {mode === "CUSTOM" && metadata && (
        <div className="grid lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
          
          {/* LEFT: The Knowledge Tree (Subjects & Topics) */}
          <section className="lg:col-span-8 space-y-4">
            <div className="flex justify-between items-end mb-2 px-1">
              <div>
                <h3 className="text-sm font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-500" /> Database Selection
                </h3>
                {selectedTopics.length > 0 && (
                  <p className="text-[10px] text-purple-400 font-mono mt-1 uppercase">Deep Targeting Active: Only selected topics will appear.</p>
                )}
              </div>
              <div className="text-right">
                <span className="text-xs font-mono text-zinc-500 bg-zinc-900/50 px-3 py-1.5 rounded-md border border-zinc-800">
                  <span className="text-cyan-400">{selectedSubjects.length}</span> Subj | <span className="text-purple-400">{selectedTopics.length}</span> Topics
                </span>
              </div>
            </div>

            <div className="space-y-3">
              {Object.entries(metadata).map(([subj, data]) => {
                const isExpanded = expandedSubject === subj;
                const isSubjectSelected = selectedSubjects.includes(subj);
                
                return (
                  <div 
                    key={subj} 
                    className={cn(
                      "border rounded-xl overflow-hidden transition-all duration-300",
                      isSubjectSelected 
                        ? "border-cyan-500/40 bg-cyan-950/10 shadow-[0_0_15px_rgba(6,182,212,0.05)]" 
                        : "border-zinc-800/60 bg-zinc-900/30 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex items-stretch">
                      {/* Main Subject Box */}
                      <div
                        onClick={() => toggleSubject(subj)}
                        className="flex-1 p-4 flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "w-5 h-5 rounded flex items-center justify-center transition-colors border",
                            isSubjectSelected ? "bg-cyan-500 border-cyan-400" : "bg-zinc-950 border-zinc-700 group-hover:border-zinc-500"
                          )}>
                            {isSubjectSelected && <CheckCircle2 className="w-3.5 h-3.5 text-zinc-950" />}
                          </div>
                          <span className={cn(
                            "font-medium tracking-wide transition-colors", 
                            isSubjectSelected ? "text-cyan-50" : "text-zinc-300 group-hover:text-zinc-100"
                          )}>
                            {subj}
                          </span>
                        </div>
                        <span className={cn(
                          "text-xs font-mono px-2.5 py-1 rounded-md border transition-colors", 
                          isSubjectSelected ? "bg-cyan-900/40 border-cyan-500/30 text-cyan-300" : "bg-zinc-950/50 border-zinc-800 text-zinc-500"
                        )}>
                          {data.total} Qs
                        </span>
                      </div>

                      {/* Expand Chevron Box */}
                      <div className="w-px bg-zinc-800/60" />
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedSubject(isExpanded ? null : subj); }}
                        className={cn(
                          "px-5 flex items-center justify-center transition-colors",
                          isExpanded ? "bg-zinc-800/40" : "hover:bg-zinc-800/30"
                        )}
                      >
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180 text-cyan-400" : "text-zinc-500")} />
                      </button>
                    </div>

                    {/* Expandable Topics Grid */}
                    <div className={cn(
                        "grid overflow-hidden transition-all duration-300 ease-in-out",
                        isExpanded ? "grid-rows-[1fr] opacity-100 border-t border-zinc-800/60" : "grid-rows-[0fr] opacity-0"
                    )}>
                      <div className="min-h-0 bg-zinc-950/40">
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {Object.entries(data.topics).map(([topic, count]) => {
                              const isTopicSelected = selectedTopics.includes(topic);
                              return (
                                <button
                                  key={topic}
                                  onClick={() => toggleTopic(topic)}
                                  className={cn(
                                    "flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-200 group relative overflow-hidden",
                                    isTopicSelected
                                      ? "bg-purple-900/20 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                                      : "bg-zinc-900/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-800/80"
                                  )}
                                >
                                  {isTopicSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500" />}
                                  <span className={cn(
                                    "text-xs font-medium pl-1 transition-colors", 
                                    isTopicSelected ? "text-purple-100" : "text-zinc-400 group-hover:text-zinc-200"
                                  )}>
                                    {topic}
                                  </span>
                                  <span className={cn(
                                    "text-[10px] font-mono px-2 py-0.5 rounded border transition-colors", 
                                    isTopicSelected ? "bg-purple-500/10 border-purple-500/20 text-purple-300" : "bg-zinc-950 border-zinc-800 text-zinc-600"
                                  )}>
                                    {count}
                                  </span>
                                </button>
                              );
                           })}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </section>

          {/* RIGHT: Fixed Parameters Column */}
          <div className="lg:col-span-4 relative">
            <div className="sticky top-8 space-y-6">
              
              {/* Question Formats */}
              <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6">
                <h3 className="text-sm font-bold tracking-widest text-zinc-300 uppercase mb-5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500" /> Formats
                </h3>
                <div className="flex flex-col gap-3">
                  {["MCQ", "MSQ", "NAT"].map(type => (
                    <button
                      key={type}
                      onClick={() => toggleType(type)}
                      className={cn(
                        "w-full py-3.5 rounded-lg text-sm font-mono border transition-all flex items-center justify-between px-5",
                        selectedTypes.includes(type)
                          ? "bg-cyan-950/30 text-cyan-300 border-cyan-500/40 shadow-inner"
                          : "bg-zinc-950/50 text-zinc-500 border-zinc-800 hover:border-zinc-700 hover:text-zinc-300"
                      )}
                    >
                      <span>{type}</span>
                      <div className={cn(
                        "w-3 h-3 rounded-full border transition-colors",
                        selectedTypes.includes(type) ? "bg-cyan-500 border-cyan-400" : "bg-transparent border-zinc-700"
                      )}/>
                    </button>
                  ))}
                </div>
              </section>

              {/* Numerical Constraints */}
              <section className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-6 space-y-6">
                <h3 className="text-sm font-bold tracking-widest text-zinc-300 uppercase flex items-center gap-2">
                  <Settings className="w-4 h-4 text-cyan-500" /> Limits
                </h3>
                
                <div className="space-y-3 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/80">
                  <label className="text-xs font-bold text-zinc-400 flex items-center justify-between uppercase tracking-wider">
                    <span className="flex items-center gap-2"><Hash className="w-3.5 h-3.5 text-cyan-600" /> Q-Count</span>
                    <span className="text-cyan-400">{questionCount}</span>
                  </label>
                  <input 
                    type="range" min="5" max="150" step="5"
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div className="space-y-3 bg-zinc-950/50 p-4 rounded-lg border border-zinc-800/80">
                  <label className="text-xs font-bold text-zinc-400 flex items-center justify-between uppercase tracking-wider">
                    <span className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-cyan-600" /> Time (Mins)</span>
                    <span className="text-cyan-400">{timeLimit}</span>
                  </label>
                  <input 
                    type="range" min="10" max="240" step="5"
                    value={timeLimit}
                    onChange={(e) => setTimeLimit(Number(e.target.value))}
                    className="w-full accent-cyan-500"
                  />
                </div>
              </section>

            </div>
          </div>
        </div>
      )}

      {/* FIXED LAUNCH BAR */}
      <div className="fixed bottom-0 left-0 md:left-64 right-0 p-5 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80 flex justify-end z-40">
        <button 
          onClick={handleLaunch}
          disabled={isLaunchDisabled}
          className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-10 py-3.5 rounded-lg font-black tracking-widest uppercase text-sm flex items-center gap-3 transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] hover:-translate-y-0.5"
        >
          Initialize Combat Arena <Play className="w-4 h-4 fill-current" />
        </button>
      </div>

    </div>
  );
}