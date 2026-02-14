const API_BASE = process.env.NEXT_PUBLIC_CORTEX_API_URL || "https://gate-cortex.onrender.com";

export const api = {
  getMockHistory: async () => {
    // Next.js 15 requires caching strategies. 'no-store' ensures fresh data on every load.
    const res = await fetch(`${API_BASE}/api/mock/history`, { cache: 'no-store' });
    if (!res.ok) return [];
    return res.json();
  },
  getHospitalStats: async () => {
    const res = await fetch(`${API_BASE}/api/hospital/stats`, { cache: 'no-store' });
    if (!res.ok) return { stats: [], total_subjects_in_hospital: 0 };
    return res.json();
  },
  getPlannerDashboard: async () => {
    const res = await fetch(`${API_BASE}/api/planner/dashboard`, { cache: 'no-store' });
    if (!res.ok) return { today: [], backlog: [], tasks: [] };
    return res.json();
  },
  getSpecificTestReport: async (test_id: string) => {
    const res = await fetch(`${API_BASE}/api/mock/history/${test_id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error("Report not found");
    return res.json();
  }
};