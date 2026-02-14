"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { History, Calendar, Trophy, Target, ChevronRight, Activity, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type HistoryItem = {
  test_id: string;
  test_type: string;
  total_score: number;
  max_marks: number;
  accuracy: number;
  created_at: string;
};

export default function MockHistoryArchive() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getMockHistory()
      .then(data => {
        setHistory(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  if (loading) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
        <Activity className="w-10 h-10 text-cyan-500 animate-spin opacity-80" />
        <p className="text-cyan-500 font-mono tracking-[0.2em] text-sm animate-pulse">ACCESSING COMBAT ARCHIVES...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <header className="border-b border-zinc-800/60 pb-6 flex items-start justify-between">
        <div>
          <Link href="/dashboard/mock" className="text-zinc-500 hover:text-cyan-400 flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-4 transition-colors w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Configuration
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-zinc-100 flex items-center gap-3">
            <History className="w-8 h-8 text-cyan-500" />
            Combat Archives
          </h1>
          <p className="text-zinc-500 mt-2 text-sm font-medium tracking-wide">
            A complete ledger of all previous mock exams and targeted simulations.
          </p>
        </div>
        <div className="text-right bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl">
          <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase mb-1">Total Operations</p>
          <p className="text-2xl font-black text-cyan-400">{history.length}</p>
        </div>
      </header>

      {/* History List */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="p-12 text-center border-2 border-zinc-800 border-dashed rounded-xl bg-zinc-950/50">
            <Target className="w-12 h-12 text-zinc-700 mx-auto mb-4 opacity-50" />
            <h2 className="text-lg font-bold text-zinc-300">No Data Found</h2>
            <p className="text-sm text-zinc-500 mt-2 mb-6">You haven't initialized any combat simulations yet.</p>
            <Link 
              href="/dashboard/mock" 
              className="px-6 py-2.5 bg-cyan-600/10 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/20 rounded-md font-bold tracking-widest uppercase text-xs transition-colors inline-block"
            >
              Launch First Mock
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {history.map((test) => {
              const dateObj = new Date(test.created_at);
              const formattedDate = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              const formattedTime = dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const isGoodAccuracy = test.accuracy >= 70;

              return (
                <Link 
                  key={test.test_id} 
                  href={`/dashboard/mock/report/${test.test_id}`}
                  className="group block bg-zinc-900/30 border border-zinc-800/60 hover:border-cyan-500/40 hover:bg-zinc-900/60 rounded-xl p-5 transition-all duration-300 relative overflow-hidden"
                >
                  {/* Subtle hover gradient */}
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/0 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    
                    {/* Left: Date & Type */}
                    <div className="flex items-center gap-6">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-center min-w-[80px]">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Date</p>
                        <p className="text-sm font-black text-zinc-200">{formattedDate}</p>
                        <p className="text-xs font-mono text-zinc-500 mt-0.5">{formattedTime}</p>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-zinc-100 group-hover:text-cyan-50 transition-colors">
                            Operation {test.test_id.split("-")[0].toUpperCase()}
                          </h3>
                          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold tracking-widest uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
                            {test.test_type || "CUSTOM"}
                          </span>
                        </div>
                        <p className="text-xs font-mono text-zinc-500 flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5" /> Logged in NEXUS.OS
                        </p>
                      </div>
                    </div>

                    {/* Right: Stats & Arrow */}
                    <div className="flex items-center gap-8 md:pr-4">
                      
                      {/* Score */}
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-1.5">
                          <Trophy className="w-3 h-3" /> Score
                        </p>
                        <p className="font-mono text-lg font-bold text-cyan-400">
                          {test.total_score} <span className="text-sm text-zinc-600">/ {test.max_marks}</span>
                        </p>
                      </div>

                      {/* Accuracy */}
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center justify-end gap-1.5">
                          <Target className="w-3 h-3" /> Accuracy
                        </p>
                        <p className={cn(
                          "font-mono text-lg font-bold px-3 py-0.5 rounded border",
                          isGoodAccuracy 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                            : "bg-rose-500/10 border-rose-500/20 text-rose-400"
                        )}>
                          {test.accuracy}%
                        </p>
                      </div>

                      {/* Arrow indicator */}
                      <div className="hidden md:flex items-center justify-center w-8 h-8 rounded-full bg-zinc-950 border border-zinc-800 group-hover:border-cyan-500/50 group-hover:bg-cyan-950/30 transition-colors">
                        <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                      </div>
                      
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}