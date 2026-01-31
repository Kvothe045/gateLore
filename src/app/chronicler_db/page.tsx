//src/app/chronicler_db/page.tsx
import DashboardClient from "@/components/admin/DashboardClient";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-[#020202] text-slate-200 font-sans selection:bg-magenta-500/30">
      <DashboardClient />
    </div>
  );
}