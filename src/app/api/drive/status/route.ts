import { NextResponse } from "next/server";
import { isDriveConnected } from "@/lib/google-drive";

export async function GET() {
  const connected = await isDriveConnected();
  return NextResponse.json({ connected });
}
