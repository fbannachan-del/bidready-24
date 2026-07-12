import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ 
    status: "ok", 
    service: "bidready24",
    timestamp: new Date().toISOString() 
  });
}
