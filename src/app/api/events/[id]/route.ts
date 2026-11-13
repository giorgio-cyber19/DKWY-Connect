import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken, type SessionClaims } from "@/lib/session";
import { getEntity, putEntity, deleteEntity, newId, appendFeed } from "@/lib/db";
import { eventTypeColors } from "@/lib/calendar-colors";
import { isIsoDate } from "@/lib/attendance-stats";
import { EVENT_STATUSES, daysBetween, shiftDate } from "@/lib/event-status";
import type { CalendarEvent, AuditLogEntry, Notification } from "@/lib/types";

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

  // { status: "moved", date } | { status: "postponed" } | { status: "cancelled" } | { status: null } (restore).
  // The event stays on the calendar, labelled with what happened to it; people are notified.
  if ("status" in body) {
    const status = body.status;
    if (status !== null && !(EVENT_STATUSES as readonly unknown[]).includes(status)) {
      return NextResponse.json({ error: "bad_request", message: "That isn't a valid status." }, { status: 400 });
    }
    const updated: CalendarEvent = { ...event };
    let notice: { title: string; description: string } | null = null;

    if (status === null) {
      // Restoring a moved event puts it back on the day it came from.
      if (event.status === "moved" && event.originalDate) {
        const delta = daysBetween(event.date, event.originalDate);
        updated.date = event.originalDate;
        if (updated.endDate) updated.endDate = shiftDate(updated.endDate, delta);
      }
      delete updated.status;
      delete updated.originalDate;
    } else if (status === "moved") {
      const newDate = body.date;
      if (typeof newDate !== "string" || !isIsoDate(newDate)) {
        return NextResponse.json({ error: "bad_request", message: "Choose the date to move the event to." }, { status: 400 });
      }
      if (newDate === event.date) {
        return NextResponse.json({ error: "bad_request", message: "That is the date the event is already on." }, { status: 400 });
      }
      const delta = daysBetween(event.date, newDate);
      updated.originalDate = event.date;
      updated.date = newDate;
      if (updated.endDate) updated.endDate = shiftDate(updated.endDate, delta);
      updated.status = "moved";
      notice = { title: "Event moved", description: `${event.title} was moved from ${event.date} to ${newDate}.` };
    } else {
      updated.status = status as CalendarEvent["status"];
      delete updated.originalDate;
      notice =
        status === "cancelled"
          ? { title: "Event cancelled", description: `${event.title} on ${event.date} has been cancelled.` }
          : { title: "Event postponed", description: `${event.title} on ${event.date} has been postponed.` };
    }

    await putEntity("calendarEvents", updated);
    if (notice) {
      await appendFeed<Notification>(
        "notifications",
        { id: newId("n"), title: notice.title, description: notice.description, date: new Date().toISOString(), read: false, type: "event", href: `/calendar?event=${event.id}` },
        100
      );
    }
    return NextResponse.json(updated);
  }

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
