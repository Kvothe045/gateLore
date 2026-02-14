"use client";

import { useState, useEffect } from "react";
import { 
  Calendar, CheckCircle2, Circle, Clock, Plus, BrainCircuit, 
  AlertTriangle, Loader2, ArrowRight, Activity, Trash2, CalendarDays
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- Types ---
type Task = {
  id: string;
  title: string;
  status: "pending" | "completed";
  scheduled_for: string; // ISO String
  duration_minutes: number;
  is_ai_generated: boolean;
};

type PlannerDashboard = {
  today: Task[];
  backlog: Task[];
  completed_today: Task[];
};

export default function TimelinePlanner() {
  const [data, setData] = useState<PlannerDashboard>({ today: [], backlog: [], completed_today: [] });
  const [loading, setLoading] = useState(true);

  // AI Generator State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // Manual Task State
  const [isAdding, setIsAdding] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", duration: 60 });

  // --- 1. Fetch Dashboard ---
  const fetchDashboard = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/planner/dashboard`);
      if (res.ok) {
        const json = await res.json();
        setData({
          today: json.today || [],
          backlog: json.backlog || [],
          completed_today: json.completed_today || []
        });
      }
    } catch (error) {
      console.error("Failed to fetch planner:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  // --- 2. Complete Task ---
  const handleComplete = async (taskId: string) => {
    // Optimistic UI Update
    const taskToMove = [...data.today, ...data.backlog].find(t => t.id === taskId);
    if (!taskToMove) return;

    setData(prev => ({
      today: prev.today.filter(t => t.id !== taskId),
      backlog: prev.backlog.filter(t => t.id !== taskId),
      completed_today: [{ ...taskToMove, status: "completed" }, ...prev.completed_today]
    }));

    try {
      await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/planner/${taskId}/complete`, { method: "PATCH" });
      // Silently re-sync to ensure exact backend state
      fetchDashboard();
    } catch (error) {
      console.error("Failed to complete task:", error);
      fetchDashboard(); // Revert on failure
    }
  };

  // --- 3. Generate AI Schedule ---
  const handleGenerateSchedule = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/planner/generate_schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      setAiPrompt("");
      await fetchDashboard();
    } catch (error) {
      console.error("AI Generation Failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- 4. Add Manual Task ---
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;
    setIsAdding(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/planner/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTask.title,
          duration_minutes: newTask.duration,
          scheduled_for: new Date().toISOString() // Schedules for today
        })
      });
      setNewTask({ title: "", duration: 60 });
      await fetchDashboard();
    } catch (error) {
      console.error("Manual add failed:", error);
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-10 h-10 text-cyan-500 animate-spin" />
        <p className="text-cyan-500 font-mono tracking-widest text-sm animate-pulse uppercase">Syncing Timeline...</p>
      </div>
    );
  }

  const completionRate = data.today.length + data.completed_today.length > 0
    ? Math.round((data.completed_today.length / (data.today.length + data.completed_today.length)) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 pb-32 animate-in fade-in duration-700">
      
      {/* HUD Header */}
      <header className="border-b border-zinc-800/60 pb-8 flex flex-col md:flex-row justify-between items-end gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-2">
            <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Chrono-Engine Online</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-100 flex items-center gap-4">
            <CalendarDays className="w-9 h-9 text-cyan-500" />
            Timeline Planner
          </h1>
          <p className="text-zinc-500 text-sm font-medium">Manage operational directives and AI-generated study routines.</p>
        </div>

        {/* Quick Stats */}
        <div className="flex gap-4">
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl text-right min-w-[120px] shadow-inner">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Backlog</p>
            <p className={cn("text-2xl font-black", data.backlog.length > 0 ? "text-rose-500" : "text-zinc-600")}>
              {data.backlog.length}
            </p>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl text-right min-w-[120px] shadow-inner">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Today's Progress</p>
            <p className="text-2xl font-black text-emerald-400">{completionRate}%</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: The Timeline & Backlog */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* BACKLOG (Red Zone) */}
          {data.backlog.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xs font-black tracking-widest text-rose-500 uppercase flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Critical Backlog
              </h2>
              <div className="space-y-3">
                {data.backlog.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleComplete} isBacklog />
                ))}
              </div>
            </section>
          )}

          {/* TODAY'S MISSIONS */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-black tracking-widest text-cyan-500 uppercase flex items-center gap-2">
                <Activity className="w-4 h-4" /> Today's Operations
              </h2>
              <span className="text-[10px] font-mono text-zinc-500">{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
            
            {data.today.length === 0 && data.completed_today.length === 0 ? (
              <div className="p-10 text-center border border-zinc-800 border-dashed rounded-2xl bg-zinc-900/20">
                <Calendar className="w-10 h-10 text-zinc-700 mx-auto mb-3 opacity-50" />
                <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">No active operations.</p>
                <p className="text-xs text-zinc-600 mt-1">Use the Cortex AI to generate a study routine.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.today.map(task => (
                  <TaskCard key={task.id} task={task} onComplete={handleComplete} />
                ))}
              </div>
            )}
          </section>

          {/* COMPLETED MISSIONS */}
          {data.completed_today.length > 0 && (
            <section className="space-y-4 pt-6 opacity-60">
              <h2 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase flex items-center gap-2">
                <CheckCircle2 className="w-3 h-3" /> Terminated Operations
              </h2>
              <div className="space-y-3">
                {data.completed_today.map(task => (
                  <div key={task.id} className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950/50 border border-zinc-800/50">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                    <span className="text-sm font-bold text-zinc-500 line-through">{task.title}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>

        {/* RIGHT COLUMN: Command Terminal (AI + Manual Add) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* AI Generator Terminal */}
          <div className="bg-zinc-900/40 border border-purple-500/20 rounded-2xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.05)] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <BrainCircuit className="w-24 h-24 text-purple-500" />
            </div>
            
            <h3 className="text-sm font-black tracking-widest text-purple-400 uppercase mb-2 flex items-center gap-2 relative z-10">
              <BrainCircuit className="w-5 h-5" /> Cortex AI Scheduler
            </h3>
            <p className="text-xs text-zinc-400 mb-6 relative z-10">
              Input your target topics or weaknesses. The AI will cross-reference your hospital data and generate a highly optimized study timeline.
            </p>

            <div className="space-y-3 relative z-10">
              <textarea 
                placeholder="e.g. 'I need to master AVL trees and Operating System Scheduling by tomorrow...'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                className="w-full bg-zinc-950 border border-purple-500/30 rounded-xl p-4 text-sm text-zinc-200 focus:border-purple-500 outline-none resize-none h-28 shadow-inner custom-scrollbar"
              />
              <button 
                onClick={handleGenerateSchedule}
                disabled={isGenerating || !aiPrompt.trim()}
                className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-black tracking-widest uppercase text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:shadow-none"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BrainCircuit className="w-4 h-4" />}
                {isGenerating ? "Compiling Routine..." : "Generate AI Timeline"}
              </button>
            </div>
          </div>

          {/* Manual Task Addition */}
          <div className="bg-zinc-900/30 border border-zinc-800/60 rounded-2xl p-6">
            <h3 className="text-xs font-black tracking-widest text-zinc-400 uppercase mb-5 flex items-center gap-2">
              <Plus className="w-4 h-4 text-cyan-500" /> Manual Override
            </h3>
            
            <form onSubmit={handleAddTask} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Directive Title</label>
                <input 
                  required
                  placeholder="e.g. Solve 50 Graph PYQs"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 focus:border-cyan-500 outline-none transition-all shadow-inner"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Estimated Duration (Mins)</label>
                <input 
                  type="number"
                  required min={5} step={5}
                  value={newTask.duration}
                  onChange={(e) => setNewTask({ ...newTask, duration: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-cyan-400 font-mono focus:border-cyan-500 outline-none transition-all shadow-inner"
                />
              </div>

              <button 
                disabled={isAdding}
                className="w-full bg-cyan-950/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-400 font-black tracking-widest uppercase text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all mt-2"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Add Directive
              </button>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Subcomponent: Task Card ---
function TaskCard({ task, onComplete, isBacklog = false }: { task: Task, onComplete: (id: string) => void, isBacklog?: boolean }) {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border transition-all duration-300 group",
      isBacklog 
        ? "bg-rose-950/10 border-rose-500/30 hover:bg-rose-950/20" 
        : "bg-zinc-900/40 border-zinc-800/80 hover:border-cyan-500/40 hover:bg-zinc-900/80"
    )}>
      <div className="flex flex-row items-start sm:items-center gap-4">
        <button 
          onClick={() => onComplete(task.id)}
          className={cn(
            "mt-1 sm:mt-0 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
            isBacklog ? "border-rose-500/50 hover:bg-rose-500/20 text-transparent hover:text-rose-400" : "border-zinc-600 hover:border-cyan-500 hover:bg-cyan-500/20 text-transparent hover:text-cyan-400"
          )}
        >
          <CheckCircle2 className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-sm font-bold text-zinc-100 tracking-wide">{task.title}</h3>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 uppercase">
              <Clock className="w-3 h-3" /> {task.duration_minutes} Mins
            </span>
            {task.is_ai_generated && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 text-[9px] font-black tracking-widest uppercase border border-purple-500/20">
                <BrainCircuit className="w-2.5 h-2.5" /> AI Target
              </span>
            )}
            {isBacklog && (
              <span className="text-[9px] font-black tracking-widest text-rose-500 uppercase px-1.5 py-0.5 border border-rose-500/30 rounded bg-rose-500/10">
                Overdue
              </span>
            )}
          </div>
        </div>
      </div>
      
      <button 
        onClick={() => onComplete(task.id)}
        className={cn(
          "hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg opacity-0 group-hover:opacity-100",
          isBacklog ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-emerald-600 hover:bg-emerald-500 text-white"
        )}
      >
        <CheckCircle2 className="w-3.5 h-3.5" /> Execute
      </button>
    </div>
  );
}