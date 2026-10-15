import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId, appendFeed } from "@/lib/db";
import { eventTypeColors } from "@/lib/calendar-colors";
import type { CalendarEvent, Notification } from "@/lib/types";

const ROSTER_EVENT_TYPE: CalendarEvent["type"] = "Sunday School & Youth Roster";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim() || typeof body.date !== "string") {
    return NextResponse.json({ error: "bad_request", message: "A title and date are required." }, { status: 400 });
  }
  if (body.type === ROSTER_EVENT_TYPE) {
    return NextResponse.json({ error: "bad_request", message: "Roster events are created from the Roster page." }, { status: 400 });
  }

  // Whitelisted fields only — a client can't set rosterId/createdBy/id itself.
  const type: CalendarEvent["type"] = body.type in eventTypeColors ? body.type : "Sunday Lesson";
  const event: CalendarEvent = {
    id: newId("ev"),
    title: body.title.trim(),
    date: body.date,
    type,
    color: typeof body.color === "string" && body.color ? body.color : eventTypeColors[type],
    createdBy: claims.userId,
    ...(typeof body.endDate === "string" && body.endDate ? { endDate: body.endDate } : {}),
    ...(typeof body.time === "string" && body.time ? { time: body.time } : {}),
    ...(typeof body.location === "string" && body.location ? { location: body.location } : {}),
    ...(typeof body.description === "string" && body.description ? { description: body.description } : {}),
  };
  await putEntity("calendarEvents", event);
  await appendFeed<Notification>(
    "notifications",
    {
      id: newId("n"),
      title: "New event added",
      description: `${event.title} was added to the calendar.`,
      date: new Date().toISOString(),
      read: false,
      type: "event",
      href: "/calendar",
    },
    100
  );
  return NextResponse.json(event);
}
