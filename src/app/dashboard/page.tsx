import { api } from "@/lib/api";
import { BrainCircuit, Crosshair, Skull, Trophy, ArrowRight, Activity, Thermometer, ChevronRight, Target } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Types matching your Python backend outputs
type HistoryItem = { test_id: string; total_score: number; max_marks: number; accuracy: number; created_at: string };
type HospitalStat = { subject: string; total_mistakes: number };

export default async function Dashboard() {
  // Fetch everything in parallel (Next.js server-side)
  const [history, hospitalData, planner] = await Promise.all([
    api.getMockHistory(),
    api.getHospitalStats(),
    api.getPlannerDashboard(),
  ]);

  const recentTests: HistoryItem[] = history.slice(0, 5);
  const weakSubjects: HospitalStat[] = hospitalData.stats?.slice(0, 4) || [];
  const activeTasks = planner.today?.length || 0;

  // Compute aggregate stats
  const totalMocks = history.length;
  const avgAccuracy = totalMocks > 0 
    ? (history.reduce((acc: number, val: HistoryItem) => acc + val.accuracy, 0) / totalMocks).toFixed(1) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-10 relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 pb-6 border-b border-zinc-800/60">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-4">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Main Engine Online</span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-zinc-100">Mission Control</h1>
          <p className="text-zinc-400 mt-2 text-sm font-medium">Global analytics and operational overview.</p>
        </div>
        
        {/* Notice: Changed href to /dashboard/mock to match our new unified setup hub */}
        <Link 
          href="/dashboard/mock" 
          className="group bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3.5 rounded-xl font-black tracking-widest uppercase text-xs transition-all flex items-center gap-3 shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:shadow-[0_0_30px_rgba(8,145,178,0.5)] hover:-translate-y-0.5"
        >
          <Crosshair className="w-4 h-4" />
          Initialize Mock Test
          <ArrowRight className="w-4 h-4 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-0 transition-all duration-300" />
        </Link>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Combat Simulations" value={totalMocks.toString()} icon={Trophy} />
        <StatCard title="System Accuracy" value={`${avgAccuracy}%`} icon={Crosshair} color={Number(avgAccuracy) > 70 ? "text-emerald-400" : "text-rose-400"} />
        <StatCard title="Hospital Patients" value={hospitalData.total_subjects_in_hospital?.toString() || "0"} icon={Thermometer} alert={hospitalData.total_subjects_in_hospital > 5} />
        <StatCard title="Tasks Pending" value={activeTasks.toString()} icon={BrainCircuit} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Recent Mocks List */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black tracking-widest text-zinc-500 uppercase flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-500" /> Recent Operations
            </h2>
            <Link href="/dashboard/mock/history" className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest hover:text-cyan-400 transition-colors">
              View All Archives
            </Link>
          </div>
          
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl overflow-hidden backdrop-blur-md shadow-xl">
            {recentTests.length === 0 ? (
              <div className="p-16 text-center">
                <Target className="w-10 h-10 text-zinc-700 mx-auto mb-3 opacity-50" />
                <p className="text-xs font-mono tracking-widest text-zinc-500 uppercase">No Data Found</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {recentTests.map((test, idx) => {
                  const isGood = test.accuracy >= 70;
                  return (
                    <Link 
                      key={test.test_id} 
                      href={`/dashboard/mock/report/${test.test_id}`}
                      className={cn(
                        "flex items-center justify-between p-5 transition-colors group",
                        idx !== recentTests.length - 1 && "border-b border-zinc-800/50",
                        "hover:bg-zinc-800/40"
                      )}
                    >
                      <div className="flex items-center gap-5">
                        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-center min-w-[60px] shadow-inner">
                          <p className="text-[10px] font-bold text-zinc-500 uppercase">Date</p>
                          <p className="text-xs font-black text-zinc-200">
                            {new Date(test.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                            Operation {test.test_id.split("-")[0].toUpperCase()}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs font-mono">
                            <span className="text-zinc-500">Score: <span className="text-cyan-400">{test.total_score}</span>/{test.max_marks}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className={cn(
                          "px-3 py-1 rounded border text-xs font-bold font-mono",
                          isGood ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}>
                          {test.accuracy}%
                        </div>
                        <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-cyan-500 transition-colors hidden sm:block" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Hospital Mini-View */}
        <div className="space-y-5">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black tracking-widest text-zinc-500 uppercase flex items-center gap-2">
              <Skull className="w-4 h-4 text-rose-500" /> Critical Vulnerabilities
            </h2>
            <Link href="/dashboard/hospital" className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-400 transition-colors">
              Enter Ward
            </Link>
          </div>
          
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 backdrop-blur-md shadow-xl">
            {weakSubjects.length === 0 ? (
              <div className="text-center py-10">
                <Thermometer className="w-10 h-10 text-zinc-700 mx-auto mb-3 opacity-50" />
                <p className="text-[10px] font-mono tracking-widest text-zinc-500 uppercase">Ward is Empty</p>
              </div>
            ) : (
              <div className="space-y-4">
                {weakSubjects.map((stat, idx) => (
                  <div key={idx} className="flex justify-between items-center group p-3 rounded-xl hover:bg-zinc-800/50 transition-colors border border-transparent hover:border-zinc-700">
                    <span className="text-xs font-bold text-zinc-300 truncate pr-4 group-hover:text-zinc-100 transition-colors">
                      {stat.subject}
                    </span>
                    <span className="text-[10px] font-black font-mono bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2.5 py-1 rounded-md shadow-inner flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                      {stat.total_mistakes}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// Reusable Stat Card Component (Upgraded to NEXUS.OS theme)
function StatCard({ title, value, icon: Icon, alert = false, color = "text-zinc-100" }: { title: string; value: string; icon: any; alert?: boolean; color?: string }) {
  return (
    <div className={cn(
      "bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-500/30 hover:bg-zinc-900/60 transition-all duration-300 shadow-lg",
      alert && "border-rose-500/30 hover:border-rose-500/50 bg-rose-950/5"
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className={cn(
          "p-2 rounded-lg border shadow-inner transition-colors duration-300",
          alert ? "bg-rose-500/10 border-rose-500/20 text-rose-500 group-hover:bg-rose-500/20" : "bg-zinc-950 border-zinc-800 text-cyan-500 group-hover:border-cyan-500/30"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        {alert && <span className="absolute top-6 right-6 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.8)]" />}
      </div>
      <div>
        <p className={cn("text-3xl font-black font-mono tracking-tighter mb-1", color)}>{value}</p>
        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{title}</p>
      </div>
      
      {/* Dynamic Hover Gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-tr opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none",
        alert ? "from-rose-500/0 to-rose-500/5" : "from-cyan-500/0 to-cyan-500/5"
      )} />
    </div>
  );
}