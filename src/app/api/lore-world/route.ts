import { NextRequest, NextResponse } from "next/server";
import AES from "crypto-js/aes";
import encUtf8 from "crypto-js/enc-utf8";

export const dynamic = 'force-dynamic';

let downloadCounts: { [date: string]: number } = {};
const LIMIT = 20;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");

  if (!token) return new NextResponse("Access Denied", { status: 403 });

  try {
    const bytes = AES.decrypt(token.replace(/ /g, '+'), process.env.LORE_SECRET_KEY!);
    const decryptedString = bytes.toString(encUtf8);
    
    if (!decryptedString) throw new Error("Decryption failed");
    
    // Extract the filename from the secure token
    const { id, topic_id, topic_name, filename, timestamp } = JSON.parse(decryptedString);

    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return new NextResponse("Link Expired.", { status: 410 });
    }

    const today = new Date().toISOString().split("T")[0];
    if ((downloadCounts[today] || 0) >= LIMIT) {
      return new NextResponse("Daily Limit Reached.", { status: 429 });
    }
    downloadCounts[today] = (downloadCounts[today] || 0) + 1;

    const azureUrl = `${process.env.NEXT_PUBLIC_API_URL}/stream/${id}?topic_id=${topic_id}&topic_name=${topic_name}`;
    const upstreamRes = await fetch(azureUrl, {
      headers: { "x-api-key": process.env.NEXT_PUBLIC_AUTH_TOKEN! },
    });

    if (!upstreamRes.ok) throw new Error("Azure Error");

    const headers = new Headers(upstreamRes.headers);
    
    // FIX: Use the actual filename and encode it properly for browsers
    headers.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);

    return new NextResponse(upstreamRes.body, { status: 200, headers });

  } catch (error) {
    return new NextResponse("Invalid Token", { status: 403 });
  }
}