"use client";
import { useState, useEffect } from "react";
import { adminApi } from "@/lib/admin-api";
import { Bell, Mail, Trash2, Send, X } from "lucide-react";
import { InboxMessage } from "@/types/admin";

export default function CommunicationPanel() {
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [currentBroadcast, setCurrentBroadcast] = useState(""); // Track active one
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInbox();
    const interval = setInterval(loadInbox, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadInbox = async () => {
    try {
      const msgs = await adminApi.getInbox();
      if (Array.isArray(msgs)) setMessages(msgs);
      
      // Also fetch current broadcast to show deletion state
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/broadcast`);
      const data = await res.json();
      setCurrentBroadcast(data.message);
    } catch (e) { console.error("Inbox Error"); }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg) return;
    setLoading(true);
    await adminApi.broadcast(broadcastMsg);
    setCurrentBroadcast(broadcastMsg);
    setBroadcastMsg("");
    setLoading(false);
  };

  const handleDeleteBroadcast = async () => {
    if(!confirm("Remove current announcement?")) return;
    await adminApi.deleteBroadcast();
    setCurrentBroadcast("");
  };

  const clearAllMessages = async () => {
    if (confirm("Delete ALL messages?")) {
      await adminApi.clearInbox();
      setMessages([]);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
      {/* LEFT: Broadcast */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 relative">
        <h3 className="text-sm font-bold text-slate-400 flex items-center gap-2 mb-4">
          <Bell className="w-4 h-4" /> LIVE ANNOUNCEMENT
        </h3>
        
        {/* Active Announcement Preview */}
        {currentBroadcast && (
           <div className="mb-4 p-3 bg-green-900/10 border border-green-500/20 rounded flex justify-between items-center">
             <div>
               <p className="text-[10px] text-green-500 font-bold mb-1">CURRENTLY LIVE:</p>
               <p className="text-xs text-green-100">{currentBroadcast}</p>
             </div>
             <button onClick={handleDeleteBroadcast} className="p-2 hover:bg-red-500/20 text-red-500 rounded transition-colors">
               <Trash2 className="w-4 h-4" />
             </button>
           </div>
        )}

        <textarea
          value={broadcastMsg}
          onChange={(e) => setBroadcastMsg(e.target.value)}
          className="w-full bg-black border border-white/20 rounded p-3 text-sm text-white focus:border-magenta-500 outline-none h-24 resize-none"
          placeholder="Type notification message here..."
        />
        <button
          onClick={handleBroadcast}
          disabled={loading || !broadcastMsg}
          className="mt-4 w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded flex justify-center items-center gap-2 transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {loading ? "SENDING..." : "BROADCAST TO SITE"}
        </button>
      </div>

      {/* RIGHT: Inbox */}
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 flex flex-col h-80">
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