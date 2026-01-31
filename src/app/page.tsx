// src/app/page.tsx
import HomeClient from "@/components/HomeClient";

// This tells Vercel: "Always run this on the server, never static cache it."
export const dynamic = "force-dynamic";

export default function Home() {
  return <HomeClient />;
}