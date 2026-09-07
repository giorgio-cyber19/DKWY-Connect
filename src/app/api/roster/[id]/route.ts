import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity } from "@/lib/db";
import { syncLinkedCalendarEvent, deleteLinkedCalendarEvent } from "@/lib/roster-sync";
import type { RosterEntry } from "@/lib/types";

const EDITABLE_FIELDS = [
  "date",
  "sundaySchoolUserIds",
  "teenClubUserIds",
  "theme",
  "notes",
  "serviceType",
  "preacher",
  "liturgy",
  "musicalAccompaniment",
] as const;

export async function PATCH(request: Request, ctx: RouteContext<"/api/roster/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can edit roster entries." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const entry = await getEntity<RosterEntry>("rosterEntries", id);
  if (!entry) return NextResponse.json({ error: "not_found", message: "That roster entry no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const patch: Partial<RosterEntry> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) (patch as Record<string, unknown>)[field] = body[field];
  }

  const updated: RosterEntry = { ...entry, ...patch, updatedAt: new Date().toISOString() };
  const calendarEvent = await syncLinkedCalendarEvent(updated);
  updated.calendarEventId = calendarEvent.id;
  await putEntity("rosterEntries", updated);

  return NextResponse.json({ rosterEntry: updated, calendarEvent });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/roster/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can delete roster entries." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const entry = await getEntity<RosterEntry>("rosterEntries", id);
  if (!entry) return NextResponse.json({ error: "not_found", message: "That roster entry no longer exists." }, { status: 404 });

  await deleteLinkedCalendarEvent(entry.calendarEventId);
  await deleteEntity("rosterEntries", id);

  return NextResponse.json({ ok: true });
}
