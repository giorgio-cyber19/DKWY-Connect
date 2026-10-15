import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken, type SessionClaims } from "@/lib/session";
import { getEntity, putEntity, deleteEntity, newId, appendFeed } from "@/lib/db";
import { eventTypeColors } from "@/lib/calendar-colors";
import type { CalendarEvent, AuditLogEntry } from "@/lib/types";

const ROSTER_EVENT_TYPE: CalendarEvent["type"] = "Sunday School & Youth Roster";

/** Administrators can change any event; everyone else only events they created themselves. */
function canManage(claims: SessionClaims, event: CalendarEvent): boolean {
  return claims.role === "admin" || (!!event.createdBy && event.createdBy === claims.userId);
}

function rejectionFor(claims: SessionClaims, event: CalendarEvent, verb: "edit" | "delete"): NextResponse | null {
  if (event.rosterId) {
    return NextResponse.json(
      { error: "managed_elsewhere", message: `This event comes from the Roster. ${verb === "edit" ? "Edit" : "Delete"} it on the Roster page instead.` },
      { status: 409 }
    );
  }
  if (!canManage(claims, event)) {
    return NextResponse.json(
      { error: "forbidden", message: `Only an administrator or the person who created this event can ${verb} it.` },
      { status: 403 }
    );
  }
  return null;
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/events/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const event = await getEntity<CalendarEvent>("calendarEvents", id);
  if (!event) return NextResponse.json({ error: "not_found", message: "That event no longer exists." }, { status: 404 });

  const rejection = rejectionFor(claims, event, "edit");
  if (rejection) return rejection;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_request", message: "Nothing to update." }, { status: 400 });

  const title = typeof body.title === "string" ? body.title.trim() : event.title;
  const date = typeof body.date === "string" && body.date ? body.date : event.date;
  if (!title) return NextResponse.json({ error: "bad_request", message: "A title is required." }, { status: 400 });

  let type = event.type;
  if (typeof body.type === "string") {
    if (body.type === ROSTER_EVENT_TYPE || !(body.type in eventTypeColors)) {
      return NextResponse.json({ error: "bad_request", message: "That isn't a valid event type." }, { status: 400 });
    }
    type = body.type as CalendarEvent["type"];
  }

  const updated: CalendarEvent = { ...event, title, date, type, color: type === event.type ? event.color : eventTypeColors[type] };
  // Optional fields: a string sets them, an empty string / null clears them, absent leaves them alone.
  for (const key of ["endDate", "time", "location", "description"] as const) {
    if (!(key in body)) continue;
    const value = body[key];
    if (typeof value === "string" && value.trim()) updated[key] = value.trim();
    else delete updated[key];
  }

  await putEntity("calendarEvents", updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/events/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const event = await getEntity<CalendarEvent>("calendarEvents", id);
  if (!event) return NextResponse.json({ error: "not_found", message: "That event no longer exists." }, { status: 404 });

  const rejection = rejectionFor(claims, event, "delete");
  if (rejection) return rejection;

  await deleteEntity("calendarEvents", id);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Deleted calendar event", target: event.title, date: new Date().toISOString() },
    200
  );
  return NextResponse.json({ ok: true });
}
