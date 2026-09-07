import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { listConversationSummaries } from "@/lib/ai-chat";

export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const conversations = await listConversationSummaries(claims.userId);
  return NextResponse.json({ conversations });
}
