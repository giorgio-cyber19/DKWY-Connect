import type { AttendanceRecord, AttendanceStatus, Child } from "./types";

/** The class register across many Sundays, shaped for a table (screen or PDF). Pure — no React, no Date-of-today. */

export interface ReportRow {
  child: Child;
  /** One entry per record, in the same order as `Report.records`; null = the child wasn't on that register. */
  marks: (AttendanceStatus | null)[];
  present: number;
  /** How many registers this child was on. */
  counted: number;
  /** Whole percent present, or null when the child is on no register. */
  percent: number | null;
}

export interface ReportColumnTotals {
  present: number;
  absent: number;
  excused: number;
  visitors: number;
}

export interface Report {
  /** Oldest first. */
  records: AttendanceRecord[];
  rows: ReportRow[];
  totals: ReportColumnTotals[];
}

export function sortRecords(records: AttendanceRecord[]): AttendanceRecord[] {
  return [...records].sort((a, b) => a.date.localeCompare(b.date));
}

export function buildReport(records: AttendanceRecord[], pupils: Child[]): Report {
  const sorted = sortRecords(records);

  const rows = [...pupils]
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }))
    .map<ReportRow>((child) => {
      const marks = sorted.map((r) => r.marks[child.id] ?? null);
      const counted = marks.filter((m) => m !== null).length;
      const present = marks.filter((m) => m === "present").length;
      return { child, marks, present, counted, percent: counted > 0 ? Math.round((present / counted) * 100) : null };
    });

  const totals = sorted.map<ReportColumnTotals>((r) => {
    const statuses = Object.values(r.marks);
    return {
      present: statuses.filter((s) => s === "present").length,
      absent: statuses.filter((s) => s === "absent").length,
      excused: statuses.filter((s) => s === "excused").length,
      visitors: r.visitors,
    };
  });

  return { records: sorted, rows, totals };
}

/** A filesystem-safe slice of a class name for download names. */
export function fileSafe(name: string): string {
  return name.normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-") || "klas";
}

export function pdfFileName(className: string, dates: string[]): string {
  const sorted = [...dates].sort();
  const span = sorted.length === 1 ? sorted[0] : `${sorted[0]}_${sorted[sorted.length - 1]}`;
  return `Presentie-${fileSafe(className)}-${span}.pdf`;
}
