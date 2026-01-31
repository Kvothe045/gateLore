"use client";
import { useState, useEffect } from "react";
import { FolderOpen, Trash2, FileVideo, FileText, X } from "lucide-react";

export default function FileManager({ folderName, onClose }: { folderName: string, onClose: () => void }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFiles();
  }, [folderName]);

  const loadFiles = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/inspect/${folderName}`, {
        headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
      });
      if (res.ok) setFiles(await res.json());
    } catch (e) {
      console.error("Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (filename: string) => {
    if (!confirm(`Permanently delete ${filename}?`)) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/delete/${folderName}/${filename}`, {
        method: "DELETE",
        headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! }
      });
      // Remove from UI instantly for snappy feel
      setFiles(files.filter(f => f.name !== filename));
    } catch (e) {
      alert("Delete failed");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur z-[100] flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-white/10 w-full max-w-2xl rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <header className="p-4 border-b border-white/10 flex justify-between items-center bg-zinc-900">
          <h2 className="font-mono text-magenta-500 flex items-center gap-2 font-bold">
            <FolderOpen className="w-5 h-5" /> /{folderName}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </header>

        {/* File List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {loading ? (
            <div className="text-center text-slate-500 py-10 font-mono text-xs">SCANNING STORAGE...</div>
          ) : files.length === 0 ? (
            <div className="text-center text-slate-500 py-10 font-mono text-xs">
              FOLDER EMPTY
              <br/><span className="opacity-50">No cached files found.</span>
            </div>
          ) : (
            files.map((f) => (
              <div key={f.name} className="flex justify-between items-center p-3 bg-white/5 rounded hover:bg-white/10 group border border-transparent hover:border-white/10">
                <div className="flex items-center gap-3 overflow-hidden">
                  {f.name.endsWith('.json') ? <FileText className="w-4 h-4 text-yellow-500 shrink-0"/> : <FileVideo className="w-4 h-4 text-blue-500 shrink-0"/>}
                  <span className="text-sm text-slate-300 truncate">{f.name}</span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-xs font-mono text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</span>
                  <button 
                    onClick={() => deleteFile(f.name)}
                    className="p-2 text-slate-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete File"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}