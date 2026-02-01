"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { Bell, Mail, Trash2, Send, Plus } from "lucide-react";
import { InboxMessage } from "@/types/admin";

export default function CommunicationPanel() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInbox();
    loadAnnouncements();
    const interval = setInterval(() => { loadInbox(); loadAnnouncements(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInbox = async () => {
    try {
      const msgs = await adminApi.getInbox();
      if (Array.isArray(msgs)) setMessages(msgs);
    } catch (e) { console.error("Inbox Error"); }
  };

  const loadAnnouncements = async () => {
    try {
      const data = await adminApi.getBroadcasts();
      if (Array.isArray(data)) setAnnouncements(data);
    } catch (e) { console.error("Broadcast Error"); }
  };

  const handleAddBroadcast = async () => {
    if (!newAnnouncement) return;
    setLoading(true);
    await adminApi.addBroadcast(newAnnouncement);
    setNewAnnouncement("");
    loadAnnouncements();
    setLoading(false);
  };

  const handleDeleteBroadcast = async (id: string) => {
    if(!confirm("Remove this announcement?")) return;
    await adminApi.deleteBroadcast(id);
    loadAnnouncements();
  };

  const clearAllMessages = async () => {
    if (confirm("Delete ALL messages?")) {
      await adminApi.clearInbox();
      setMessages([]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      {/* LEFT: Broadcast List */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 relative flex flex-col h-[500px]">
        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" /> ANNOUNCEMENT CENTER
        </h3>
        
        {/* Input */}
        <div className="flex gap-2 mb-6">
            <input
              value={newAnnouncement}
              onChange={(e) => setNewAnnouncement(e.target.value)}
              className="flex-1 bg-black border border-white/20 rounded-lg px-4 py-2 text-sm text-white focus:border-magenta-500 outline-none"
              placeholder="New announcement..."
            />
            <button
              onClick={handleAddBroadcast}
              disabled={loading || !newAnnouncement}
              className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
            </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2">
           {announcements.length === 0 ? (
             <div className="text-center text-slate-600 mt-10 text-xs">No active announcements</div>
           ) : (
             announcements.map((item) => (
               <div key={item.id} className="bg-white/5 p-3 rounded border border-white/5 flex justify-between items-start group hover:border-white/20 transition-colors">
                 <div className="text-sm text-slate-200">{item.content}</div>
                 <button onClick={() => handleDeleteBroadcast(item.id)} className="text-slate-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                   <Trash2 className="w-4 h-4" />
                 </button>
               </div>
             ))
           )}
        </div>
      </div>

      {/* RIGHT: Inbox (Same as before) */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 flex flex-col h-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2">
            <Mail className="w-4 h-4" /> STUDENT MESSAGES
          </h3>
          {messages.length > 0 && (
            <button onClick={clearAllMessages} className="text-xs text-red-500 hover:text-red-400 flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> CLEAR ALL
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-600">
              <Mail className="w-8 h-8 mb-2 opacity-20" />
              <span className="text-xs font-mono">NO NEW MESSAGES</span>
            </div>
          ) : (
            messages.map((msg) => (
              <div key={msg.id} className="bg-white/5 p-3 rounded border border-white/5 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="font-bold text-magenta-400">{msg.name}</span>
                  <span className="text-[10px] text-slate-500">{new Date(msg.timestamp * 1000).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-300 mb-2">{msg.message}</p>
                <div className="text-[10px] font-mono text-slate-500 border-t border-white/10 pt-1">
                  Reply: {msg.email}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}