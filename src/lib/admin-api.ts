import { FolderStats, InboxMessage, StorageStats } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL;
const AUTH_TOKEN = process.env.NEXT_PUBLIC_AUTH_TOKEN;

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
  getSystemStats: () => fetchVM("/admin/system-stats"),
  
  // Now supports saving the whole config list
  updateSubjects: (subjects: any[]) => fetchVM("/admin/subjects", "POST", subjects),
  
  manageTopic: (topicId: number, action: "lock" | "unlock", folderName?: string) => 
    fetchVM(`/admin/manage?topic_id=${topicId}&action=${action}${folderName ? `&folder_name=${folderName}` : ''}`, "POST"),

  broadcast: (msg: string) => fetchVM("/admin/broadcast", "POST", { message: msg }),
  deleteBroadcast: () => fetchVM("/admin/broadcast", "DELETE"),
  
  getInbox: () => fetchVM("/admin/inbox"),
  clearInbox: () => fetchVM("/admin/inbox", "DELETE"),
};