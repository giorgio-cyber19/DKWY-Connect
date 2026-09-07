import "server-only";
import { getEntity, putEntity, deleteEntity, newId } from "./db";
import { eventTypeColors } from "./calendar-colors";
import type { RosterEntry, CalendarEvent } from "./types";

const ROSTER_EVENT_TYPE = "Sunday School & Youth Roster" as const;

function rosterEventTitle(entry: Pick<RosterEntry, "theme" | "serviceType">): string {
  return entry.theme.trim() || entry.serviceType.trim() || "Sunday School & Youth Roster";
}

function rosterEventDescription(entry: RosterEntry): string | undefined {
  const parts = [
    entry.serviceType.trim() && `Service: ${entry.serviceType.trim()}`,
    entry.preacher.trim() && `Preacher: ${entry.preacher.trim()}`,
    entry.liturgy.trim() && `Liturgy: ${entry.liturgy.trim()}`,
    entry.musicalAccompaniment.trim() && `Music: ${entry.musicalAccompaniment.trim()}`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : undefined;
}

/** Create path: mints a brand-new CalendarEvent for a brand-new RosterEntry. */
export async function createLinkedCalendarEvent(entry: RosterEntry): Promise<CalendarEvent> {
  const event: CalendarEvent = {
    id: newId("ev"),
    title: rosterEventTitle(entry),
    date: entry.date,
    type: ROSTER_EVENT_TYPE,
    description: rosterEventDescription(entry),
    color: eventTypeColors[ROSTER_EVENT_TYPE],
    rosterId: entry.id,
  };
  await putEntity("calendarEvents", event);
  return event;
}

/**
 * Edit path: updates the SAME linked event in place so a normal edit never
 * creates a second calendar event. Self-heals only if the link is broken
 * (the event was somehow deleted out-of-band) by minting a fresh one.
 */
export async function syncLinkedCalendarEvent(entry: RosterEntry): Promise<CalendarEvent> {
  const existing = entry.calendarEventId ? await getEntity<CalendarEvent>("calendarEvents", entry.calendarEventId) : null;

  if (existing) {
    const updated: CalendarEvent = {
      ...existing,
      title: rosterEventTitle(entry),
      date: entry.date,
      type: ROSTER_EVENT_TYPE,
      description: rosterEventDescription(entry),
      rosterId: entry.id,
    };
    await putEntity("calendarEvents", updated);
    return updated;
  }

  return createLinkedCalendarEvent(entry);
}

/** Delete path. */
export async function deleteLinkedCalendarEvent(calendarEventId: string | undefined): Promise<void> {
  if (calendarEventId) await deleteEntity("calendarEvents", calendarEventId);
}
