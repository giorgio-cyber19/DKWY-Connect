import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId, appendFeed } from "@/lib/db";
import type { PrayerEntry, Notification } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "bad_request", message: "Content is required." }, { status: 400 });
  }

  const entry: PrayerEntry = {
    ...body,
    id: newId("pr"),
    authorId: claims.userId,
    date: new Date().toISOString().slice(0, 10),
    prayedByUserIds: [],
  };
  await putEntity("prayerEntries", entry);

  if (entry.type === "Prayer Request") {
    await appendFeed<Notification>(
      "notifications",
      {
        id: newId("n"),
        title: "New prayer request",
        description: `${claims.name} shared a new prayer request.`,
        date: new Date().toISOString(),
        read: false,
        type: "prayer",
        href: "/prayer",
      },
      100
    );
  }

  return NextResponse.json(entry);
}
