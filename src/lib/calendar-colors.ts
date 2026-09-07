import type { CalendarEvent } from "./types";

/**
 * Single source of truth for event-type → color, shared between the client
 * calendar grid and the server-side roster→calendar sync helper so they
 * never drift out of sync.
 */
export const eventTypeColors: Record<CalendarEvent["type"], string> = {
  "Sunday Lesson": "var(--color-gold)",
  "Teacher Meeting": "var(--color-blue)",
  "Children Event": "var(--color-blue-deep)",
  "Holiday Program": "var(--color-sage-deep)",
  VBS: "var(--color-gold-deep)",
  Birthday: "var(--color-sage)",
  "Parent Meeting": "var(--color-gold-deep)",
  "Sunday School & Youth Roster": "var(--color-coral-deep)",
};
