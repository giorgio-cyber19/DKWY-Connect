/** Shared (client + server) helpers for moving a calendar event to another day. */

export const EVENT_STATUSES = ["moved", "postponed", "cancelled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Whole days from `from` to `to` (both YYYY-MM-DD); negative when `to` is earlier. */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcDay(to) - utcDay(from)) / DAY_MS);
}

/** `iso` moved by `days` (YYYY-MM-DD in, YYYY-MM-DD out). */
export function shiftDate(iso: string, days: number): string {
  return new Date(utcDay(iso) + days * DAY_MS).toISOString().slice(0, 10);
}
