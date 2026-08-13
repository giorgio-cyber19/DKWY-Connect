import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId, appendFeed } from "@/lib/db";
import type { CalendarEvent, Notification } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim() || typeof body.date !== "string") {
    return NextResponse.json({ error: "bad_request", message: "A title and date are required." }, { status: 400 });
  }

  const event: CalendarEvent = { ...body, id: newId("ev") };
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
