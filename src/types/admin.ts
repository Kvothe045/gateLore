//src/types/admin.ts
export interface FolderStats {
  name: string;
  size: number;
}

export interface InboxMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: number;
}

export interface StorageStats {
  total: number; // in bytes (e.g. 30GB)
  used: number;
  free: number;
}