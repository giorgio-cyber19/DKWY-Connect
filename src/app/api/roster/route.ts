import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId, appendFeed } from "@/lib/db";
import { createLinkedCalendarEvent } from "@/lib/roster-sync";
import type { RosterEntry, Notification } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can create roster entries." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body.date !== "string" || !body.date.trim()) {
    return NextResponse.json({ error: "bad_request", message: "A date is required." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const entry: RosterEntry = {
    id: newId("roster"),
    date: body.date,
    sundaySchoolUserIds: Array.isArray(body.sundaySchoolUserIds) ? body.sundaySchoolUserIds : [],
    teenClubUserIds: Array.isArray(body.teenClubUserIds) ? body.teenClubUserIds : [],
    theme: typeof body.theme === "string" ? body.theme : "",
    notes: typeof body.notes === "string" ? body.notes : "",
    serviceType: typeof body.serviceType === "string" ? body.serviceType : "",
    preacher: typeof body.preacher === "string" ? body.preacher : "",
    liturgy: typeof body.liturgy === "string" ? body.liturgy : "",
    musicalAccompaniment: typeof body.musicalAccompaniment === "string" ? body.musicalAccompaniment : "",
    calendarEventId: "",
    createdAt: now,
    updatedAt: now,
    createdBy: claims.userId,
  };

  const calendarEvent = await createLinkedCalendarEvent(entry);
  entry.calendarEventId = calendarEvent.id;
  await putEntity("rosterEntries", entry);

  await appendFeed<Notification>(
    "notifications",
    {
      id: newId("n"),
      title: "New roster entry added",
      description: `${entry.date} — ${entry.theme || entry.serviceType || "Sunday School & Youth Roster"}`,
      date: now,
      read: false,
      type: "event",
      href: `/roster/${entry.id}`,
    },
    100
  );

  return NextResponse.json({ rosterEntry: entry, calendarEvent });
}
