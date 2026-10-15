import type { AttendanceRecord, AttendanceStatus } from "./types";

/** Shared (client + server) attendance rules and calculations. */

export const ATTENDANCE_STATUSES: AttendanceStatus[] = ["present", "absent", "excused"];
/** Teachers can record or correct a register up to this many days back; administrators can go further. */
export const MAX_BACKFILL_DAYS = 30;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date (YYYY-MM-DD) on the church's clock, regardless of the viewer's or server's timezone. */
export function todayInAmsterdam(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Amsterdam" }).format(now);
}

export function addDays(iso: string, delta: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function attendanceRecordId(classId: string, date: string): string {
  return `att-${classId}-${date}`;
}

/** Ids end in the YYYY-MM-DD date, which lets us filter by date without loading the records. */
export function dateFromAttendanceId(id: string): string {
  return id.slice(-10);
}

export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_RE.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  // Round-trip so impossible dates (2026-02-30) don't slip through — JS silently rolls them over.
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export interface ParsedAttendanceInput {
  classId: string;
  date: string;
  marks: Record<string, AttendanceStatus>;
  visitors: number;
  note?: string;
}

/** Validates a save request body; `childIds` are the children currently in the class — anything else is ignored. */
export function parseAttendanceInput(
  body: unknown,
  opts: { today: string; isAdmin: boolean; childIds: Set<string> }
): { ok: true; value: ParsedAttendanceInput } | { ok: false; message: string } {
  const b = (body ?? {}) as Record<string, unknown>;
  if (typeof b.classId !== "string" || !b.classId) return { ok: false, message: "Choose a class." };
  if (!isIsoDate(b.date)) return { ok: false, message: "Choose a valid date." };
  if (b.date > opts.today) return { ok: false, message: "Attendance can't be recorded for a future date." };
  if (!opts.isAdmin && b.date < addDays(opts.today, -MAX_BACKFILL_DAYS)) {
    return { ok: false, message: `Only an administrator can change attendance older than ${MAX_BACKFILL_DAYS} days.` };
  }

  const marks: Record<string, AttendanceStatus> = {};
  if (b.marks && typeof b.marks === "object") {
    for (const [childId, status] of Object.entries(b.marks as Record<string, unknown>)) {
      if (!opts.childIds.has(childId)) continue;
      if (!ATTENDANCE_STATUSES.includes(status as AttendanceStatus)) {
        return { ok: false, message: "Each child must be marked present, absent or excused." };
      }
      marks[childId] = status as AttendanceStatus;
    }
  }
  if (opts.childIds.size > 0 && Object.keys(marks).length === 0) {
    return { ok: false, message: "Mark at least one child." };
  }

  const rawVisitors = typeof b.visitors === "number" ? b.visitors : 0;
  const visitors = Math.min(99, Math.max(0, Math.floor(Number.isFinite(rawVisitors) ? rawVisitors : 0)));
  const note = typeof b.note === "string" && b.note.trim() ? b.note.trim().slice(0, 500) : undefined;

  return { ok: true, value: { classId: b.classId, date: b.date, marks, visitors, note } };
}

export interface ChildAttendanceSummary {
  /** Sessions in which this child was on the register. */
  total: number;
  present: number;
  absent: number;
  excused: number;
  /** present ÷ total as a whole percentage, or null when nothing has been recorded. */
  rate: number | null;
  /** Consecutive most-recent sessions the child was not present (absent or excused). */
  missedInARow: number;
  /** Newest first. */
  sessions: { date: string; status: AttendanceStatus; classId: string }[];
}

/**
 * Only sessions where the child actually has a mark count, so weeks with no register
 * (school holidays) and weeks before the child was enrolled never affect the rate.
 */
export function summarizeChild(records: AttendanceRecord[], childId: string): ChildAttendanceSummary {
  const sessions = records
    .filter((r) => r.marks[childId])
    .map((r) => ({ date: r.date, status: r.marks[childId], classId: r.classId }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const present = sessions.filter((s) => s.status === "present").length;
  const absent = sessions.filter((s) => s.status === "absent").length;
  const excused = sessions.filter((s) => s.status === "excused").length;

  let missedInARow = 0;
  for (const s of sessions) {
    if (s.status === "present") break;
    missedInARow += 1;
  }

  return {
    total: sessions.length,
    present,
    absent,
    excused,
    rate: sessions.length > 0 ? Math.round((present / sessions.length) * 100) : null,
    missedInARow,
    sessions,
  };
}
