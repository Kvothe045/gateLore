"use client";

import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Smart regex: Matches /dashboard/mock/[test_id] 
  // BUT explicitly excludes /dashboard/mock/history and /dashboard/mock/report
  const isLiveTest = pathname?.match(/^\/dashboard\/mock\/(?!history|report|setup)[^\/]+$/);

  return (
    <div className="flex min-h-screen bg-zinc-950 overflow-hidden">
      {!isLiveTest && <Sidebar />}
      
      {/* If it's a live test, remove all padding and margins so it stretches edge-to-edge */}
      <main className={!isLiveTest ? "flex-1 ml-64 p-8 overflow-y-auto" : "flex-1 w-full h-screen"}>
        {children}
      </main>
    </div>
  );
}