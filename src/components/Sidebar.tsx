"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Activity, FileCode2, Calendar, ShieldAlert, List, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Mission Control", href: "/dashboard", icon: LayoutDashboard },
  { name: "Mock Engine", href: "/dashboard/mock", icon: Target, exact: true }, // exact prevents matching /mock/history
  { name: "Combat Archives", href: "/dashboard/mock/history", icon: List },
  { name: "PYQ Databanks", href: "/dashboard/pyqs", icon: FileCode2 },
  { name: "The Hospital", href: "/dashboard/hospital", icon: ShieldAlert },
  { name: "Timeline Planner", href: "/dashboard/planner", icon: Calendar },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 w-64 bg-zinc-950/90 backdrop-blur-xl border-r border-zinc-800/60 p-5 flex flex-col z-50 shadow-[10px_0_30px_rgba(0,0,0,0.5)]">
      
      {/* Branding */}
      <div className="flex items-center gap-3 px-2 mb-10 mt-2">
        <div className="relative">
          <Activity className="w-6 h-6 text-cyan-500" />
          <div className="absolute inset-0 bg-cyan-500 blur-[10px] opacity-50" />
        </div>
        <span className="text-2xl font-black tracking-tighter text-zinc-100">
          CORTEX<span className="text-cyan-500">.AI</span>
        </span>
      </div>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          // Strict matching for /dashboard/mock so it doesn't light up when in /dashboard/mock/history
          const isActive = item.exact 
            ? pathname === item.href 
            : pathname === item.href || pathname?.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group font-bold text-xs tracking-wide uppercase",
                isActive 
                  ? "bg-cyan-950/30 text-cyan-400 border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)]" 
                  : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-900/50 border border-transparent"
              )}
            >
              <item.icon className={cn(
                "w-4 h-4 transition-transform duration-300", 
                isActive ? "text-cyan-400" : "text-zinc-600 group-hover:text-cyan-500/70",
                !isActive && "group-hover:scale-110"
              )} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / Terminal Status */}
      <div className="mt-auto space-y-4">
        <Link 
          href="/"
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-950/20 border border-transparent hover:border-rose-500/20 transition-all font-bold text-xs tracking-wide uppercase group"
        >
          <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Exit to Nexus
        </Link>

        <div className="p-4 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-zinc-500 tracking-widest">SYSTEM</span>
            <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-400 font-mono tracking-widest">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> ONLINE
            </span>
          </div>
          <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest border-t border-zinc-800/80 pt-2 mt-2">
            TARGET: AIR-1 [GATE '26]
          </p>
        </div>
      </div>

    </aside>
  );
}