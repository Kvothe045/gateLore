"use client";

import { useEffect } from "react";
import { Sidebar } from "@/components/Sidebar";
import { usePathname } from "next/navigation";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Smart regex: Matches /dashboard/mock/[test_id] 
  const isLiveTest = pathname?.match(/^\/dashboard\/mock\/(?!history|report|setup)[^\/]+$/);

  useEffect(() => {
    // --- RENDER KEEP-ALIVE HEARTBEAT ---
    // Render free tier sleeps after 15 mins. This prevents data loss on long mocks.
    const keepAlive = async () => {
      // Avoid pinging if the user has minimized the browser or switched tabs
      if (document.visibilityState !== 'visible') return;

      try {
        // Pinging a lightweight metadata endpoint to keep Render's process 'hot'
        const res = await fetch(`${process.env.NEXT_PUBLIC_CORTEX_API_URL}/api/pyqs/metadata`, {
          cache: 'no-store'
        });
        
        if (res.ok) {
          console.debug("💓 Cortex Uplink Active: Backend Heartbeat Confirmed.");
        }
      } catch (e) {
        console.warn("💔 Nexus Uplink Lost: Backend is likely entering sleep mode.");
      }
    };

    // Initial ping to wake up server upon entering Dashboard
    keepAlive();

    // Ping every 60 seconds (Render sleeps at 15 mins, so 1 min is safe & polite)
    const interval = setInterval(keepAlive, 60000);

    return () => clearInterval(interval);
  }, []); // Runs once on mount of the layout

  return (
    <div className="flex min-h-screen bg-zinc-950 overflow-hidden">
      {/* Hide sidebar only during live mocks for maximum immersion */}
      {!isLiveTest && <Sidebar />}
      
      {/* If it's a live test, remove all padding and margins so it stretches edge-to-edge.
         The heartbeat remains active in the background regardless of this class toggle.
      */}
      <main className={!isLiveTest ? "flex-1 ml-64 p-8 overflow-y-auto" : "flex-1 w-full h-screen"}>
        {children}
      </main>
    </div>
  );
}