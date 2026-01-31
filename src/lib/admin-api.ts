//src/lib/admin-api.ts
import { FolderStats, InboxMessage, StorageStats } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_TOKEN;

// Helper to handle the fetch logic
async function fetchVM(endpoint: string, method: string = "GET", body?: any) {
  try {
    const res = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers: { 
        "x-api-key": AUTH_TOKEN!,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`VM Error: ${res.status}`);
    return res.json();
  } catch (error) {
    console.error("API Call Failed:", error);
    throw error;
  }
}

export const adminApi = {
  // Core Functions
  getFolders: () => fetchVM("/admin/folders"),
  getSystemStats: () => fetchVM("/admin/system-stats"),
  manageTopic: (topicId: number, action: "lock" | "unlock", folderName?: string) => 
    fetchVM(`/admin/manage?topic_id=${topicId}&action=${action}${folderName ? `&folder_name=${folderName}` : ''}`, "POST"),

  // New Features
  getStorageStats: async (): Promise<StorageStats> => {
    // Mocking Azure stats if endpoint isn't ready, or fetch real df -h data
    // You can add a '/admin/storage' endpoint to main.py later
    const folders: FolderStats[] = await fetchVM("/admin/folders");
    const used = folders.reduce((acc, f) => acc + f.size, 0);
    return { total: 32000000000, used, free: 32000000000 - used }; // 30GB Disk
  },

  broadcast: (msg: string) => fetchVM("/admin/broadcast", "POST", { message: msg }),
  
  getInbox: () => fetchVM("/admin/inbox"),
  
  clearInbox: () => fetchVM("/admin/inbox", "DELETE"),
};