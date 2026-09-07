import type { Holiday } from "./types";

export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Both bounds are "YYYY-MM-DD" strings, which sort lexicographically in calendar order. */
function isIsoDateInRange(iso: string, startIso: string, endIso: string): boolean {
  return iso >= startIso && iso <= endIso;
}

export function holidaysOnDate(holidays: Holiday[], dateIso: string): Holiday[] {
  return holidays.filter((h) => isIsoDateInRange(dateIso, h.startDate, h.endDate));
}

export function holidaysOnDay(holidays: Holiday[], day: Date): Holiday[] {
  return holidaysOnDate(holidays, toIsoDate(day));
}

export function isSchoolVacationDay(holidays: Holiday[], day: Date): boolean {
  return holidaysOnDay(holidays, day).some((h) => h.type === "school_vacation");
}

/** True on the first visible day of a vacation range that falls within [rangeStart, rangeEnd] — used to place the name label once per range instead of on every day. */
export function isVacationLabelDay(holiday: Holiday, day: Date, rangeStart: Date): boolean {
  const dayIso = toIsoDate(day);
  const rangeStartIso = toIsoDate(rangeStart);
  return dayIso === holiday.startDate || dayIso === rangeStartIso;
}
