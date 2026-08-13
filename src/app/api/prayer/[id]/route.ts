import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity } from "@/lib/db";
import type { PrayerEntry } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/prayer/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const entry = await getEntity<PrayerEntry>("prayerEntries", id);
  if (!entry) return NextResponse.json({ error: "not_found", message: "That entry no longer exists." }, { status: 404 });

  const prayed = entry.prayedByUserIds.includes(claims.userId);
  const updated: PrayerEntry = {
    ...entry,
    prayedByUserIds: prayed ? entry.prayedByUserIds.filter((u) => u !== claims.userId) : [...entry.prayedByUserIds, claims.userId],
  };
  await putEntity("prayerEntries", updated);
  return NextResponse.json(updated);
}
