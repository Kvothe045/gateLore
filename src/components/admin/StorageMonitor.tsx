//src/components/admin/StorageMonitor.tsx
import { StorageStats } from "@/types/admin";
import { HardDrive } from "lucide-react";

export default function StorageMonitor({ stats }: { stats: StorageStats }) {
  const usedGB = (stats.used / 1024 / 1024 / 1024).toFixed(2);
  const totalGB = (stats.total / 1024 / 1024 / 1024).toFixed(0);
  const percent = Math.min((stats.used / stats.total) * 100, 100);

  return (
    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 mb-8">
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded text-blue-400">
            <HardDrive className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-200">AZURE VM STORAGE</h3>
            <p className="text-xs font-mono text-slate-500">/dev/root (SSD)</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-mono font-bold text-white">{usedGB}</span>
          <span className="text-sm text-slate-500"> / {totalGB} GB</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${
            percent > 80 ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-magenta-500'
          }`}
          style={{ width: `${percent}%` }}
        />
      </div>
      
      <div className="flex justify-between mt-2 text-[10px] font-mono uppercase text-slate-500">
        <span>0%</span>
        <span>{percent.toFixed(1)}% Usage</span>
        <span>100%</span>
      </div>
    </div>
  );
}