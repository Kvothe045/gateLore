"use client";
import { useState, useEffect } from "react";
import { SUBJECTS } from "@/constants/subjects";
import { adminApi } from "@/lib/admin-api";
import { Folder, Lock, Unlock, RefreshCw, Save, Trash2, Power, Edit2, X, Search } from "lucide-react";
import { signOut } from "next-auth/react";
import StorageMonitor from "./StorageMonitor";
import CommunicationPanel from "./CommunicationPanel";
import FileManager from "./FileManager"; // Import the new component
import { StorageStats } from "@/types/admin";

export default function DashboardClient() {
  const [subjects, setSubjects] = useState(SUBJECTS);
  const [folders, setFolders] = useState<any[]>([]);
  const [storage, setStorage] = useState<StorageStats>({ total: 1, used: 0, free: 0 });
  const [loading, setLoading] = useState(false);
  
  // Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<any>(null);

  // File Manager State
  const [inspectingFolder, setInspectingFolder] = useState<string | null>(null);

  useEffect(() => { refreshSystem(); }, []);

  const refreshSystem = async () => {
    setLoading(true);
    try {
      const data = await adminApi.getSystemStats();
      setFolders(data.folders);
      setStorage(data.storage);
    } catch (e) {
      console.error("Backend unreachable");
    } finally {
      setLoading(false);
    }
  };

  const toggleStatus = async (index: number) => {
    const sub = subjects[index];
    const newStatus = sub.status === "locked" ? "unlocked" : "locked";
    const updated = [...subjects];
    updated[index].status = newStatus;
    setSubjects(updated);

    try {
      await adminApi.manageTopic(
        sub.id, 
        newStatus === "locked" ? "lock" : "unlock",
        newStatus === "locked" ? sub.name.replace(/\s+/g, '_') : undefined
      );
      if (newStatus === "locked") refreshSystem();
    } catch (e) {
      alert("Command Failed: Backend Unreachable");
    }
  };

  const startEdit = (sub: any) => { setEditingId(sub.id); setEditForm({ ...sub }); };
  
  const saveEdit = () => {
    const updated = subjects.map(s => s.id === editingId ? editForm : s);
    setSubjects(updated);
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 pb-20 relative">
      {/* File Manager Modal */}
      {inspectingFolder && (
        <FileManager 
          folderName={inspectingFolder} 
          onClose={() => setInspectingFolder(null)} 
        />
      )}

      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-magenta-600">
            CHRONICLER DB
          </h1>
          <p className="text-xs font-mono text-slate-500 mt-1">AZURE VM CONTROL PLANE</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={refreshSystem} className="p-2 bg-slate-800 rounded hover:bg-slate-700">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => signOut()} className="p-2 bg-red-900/20 text-red-500 rounded hover:bg-red-900/40">
            <Power className="w-5 h-5" />
          </button>
        </div>
      </header>

      <StorageMonitor stats={storage} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* LEFT: Subject Config */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold font-mono text-slate-400 flex items-center gap-2">
            <Save className="w-5 h-5" /> SUBJECT CONFIGURATION
          </h2>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/5 font-mono text-xs text-slate-500 uppercase">
                <tr>
                  <th className="p-4">Status</th>
                  <th className="p-4">ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Date</th>
                  <th className="p-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {subjects.map((sub, idx) => {
                  const isEditing = editingId === sub.id;
                  return (
                    <tr key={sub.id} className="hover:bg-white/5 transition-colors">
                      <td className="p-4">
                        <button
                          onClick={() => toggleStatus(idx)}
                          className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold w-fit transition-all ${
                            sub.status === 'unlocked' 
                            ? 'bg-green-500/10 text-green-400 border border-green-500/50 hover:bg-green-500/20' 
                            : 'bg-red-500/10 text-red-400 border border-red-500/50 hover:bg-red-500/20'
                          }`}
                        >
                          {sub.status === 'unlocked' ? <Unlock className="w-3 h-3"/> : <Lock className="w-3 h-3"/>}
                          {sub.status.toUpperCase()}
                        </button>
                      </td>
                      <td className="p-4 font-mono text-blue-400">
                        {isEditing ? (
                          <input type="number" value={editForm.id} onChange={e => setEditForm({...editForm, id: parseInt(e.target.value)})} className="bg-black border border-white/20 rounded px-2 py-1 w-20 outline-none focus:border-magenta-500" />
                        ) : sub.id}
                      </td>
                      <td className="p-4 font-medium">
                        {isEditing ? (
                          <input type="text" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="bg-black border border-white/20 rounded px-2 py-1 w-full outline-none focus:border-magenta-500" />
                        ) : sub.name}
                      </td>
                      <td className="p-4 text-slate-400">
                        {isEditing ? (
                          <input type="text" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} className="bg-black border border-white/20 rounded px-2 py-1 w-24 outline-none focus:border-magenta-500" />
                        ) : sub.startDate}
                      </td>
                      <td className="p-4 text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <button onClick={saveEdit} className="p-2 bg-green-600 rounded text-white"><Save className="w-4 h-4" /></button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-zinc-700 rounded text-white"><X className="w-4 h-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(sub)} className="p-2 hover:bg-white/10 rounded text-slate-400 hover:text-white"><Edit2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: Active Cache */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold font-mono text-slate-400 flex items-center gap-2">
            <Folder className="w-5 h-5" /> ACTIVE CACHE
          </h2>
          <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4 min-h-[400px]">
            {folders.length === 0 ? (
               <div className="text-center text-slate-600 mt-20 font-mono text-sm">NO ACTIVE CACHE<br/><span className="text-xs opacity-50">Storage Clean</span></div>
            ) : (
              <div className="space-y-3">
                {folders.map((f, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white/5 rounded border border-white/5 hover:border-magenta-500/30">
                    <div>
                      <p className="text-sm font-medium text-slate-200">{f.name}</p>
                      <p className="text-xs font-mono text-slate-500">{(f.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setInspectingFolder(f.name)}
                        className="text-blue-400 hover:bg-blue-500/10 p-2 rounded transition-colors"
                        title="Inspect Files"
                      >
                        <Search className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => adminApi.manageTopic(0, 'lock', f.name).then(refreshSystem)}
                        className="text-red-500 hover:bg-red-500/10 p-2 rounded transition-colors"
                        title="Force Purge"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <CommunicationPanel />
    </div>
  );
}