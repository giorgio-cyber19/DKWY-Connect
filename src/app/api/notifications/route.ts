import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getFeed, markFeedItemsRead } from "@/lib/db";
import type { Notification } from "@/lib/types";

export async function PATCH(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const notifications = await getFeed<Notification>("notifications");
  await markFeedItemsRead(claims.userId, notifications.map((n) => n.id));
  return NextResponse.json({ ok: true });
}
