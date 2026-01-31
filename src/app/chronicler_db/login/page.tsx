//src/app/chronicler_db/login/page.tsx
"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push("/chronicler_db");
    } else {
      alert("Access Denied: Invalid Credentials");
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center font-mono">
      <div className="w-full max-w-md p-8 border border-white/10 bg-zinc-900/50 rounded-xl backdrop-blur-md">
        <h1 className="text-2xl text-magenta-500 font-bold mb-2">CHRONICLER GATEWAY</h1>
        <p className="text-xs text-slate-500 mb-8">SECURE CONNECTION REQUIRED</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-black border border-white/20 p-3 text-white focus:border-magenta-500 outline-none rounded"
            placeholder="Enter Admin Key..."
            autoFocus
          />
          <button
            type="submit"
            className="w-full bg-magenta-700 hover:bg-magenta-600 text-white p-3 font-bold rounded transition-colors"
          >
            AUTHENTICATE
          </button>
        </form>
      </div>
    </div>
  );
}