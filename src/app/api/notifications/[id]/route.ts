import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { markFeedItemsRead } from "@/lib/db";

export async function PATCH(request: Request, ctx: RouteContext<"/api/notifications/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  await markFeedItemsRead(claims.userId, [id]);
  return NextResponse.json({ ok: true });
}
