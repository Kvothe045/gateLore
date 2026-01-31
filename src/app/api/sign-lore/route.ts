import { NextRequest, NextResponse } from "next/server";
import AES from "crypto-js/aes";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, topic_id, topic_name, filename } = body; // Added filename

    // Create the payload
    const data = JSON.stringify({ 
      id, 
      topic_id, 
      topic_name, 
      filename, // Encrypt the filename too
      timestamp: Date.now() 
    });
    
    // Encrypt it
    const token = AES.encrypt(data, process.env.LORE_SECRET_KEY!).toString();
    
    return NextResponse.json({ token });
  } catch (e) {
    return new NextResponse("Signing Failed", { status: 500 });
  }
}