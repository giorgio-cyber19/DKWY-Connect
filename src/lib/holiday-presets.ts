import type { Holiday } from "./types";

/**
 * Official school-year calendars that an administrator can add to the app in one click
 * (Calendar → Holidays → Import). Names are kept exactly as the ministry published them.
 */

export interface HolidayPreset {
  name: string;
  type: Holiday["type"];
  startDate: string;
  endDate: string;
  /** True while the date is unconfirmed (marked ** in the source). */
  provisional: boolean;
}

export interface SchoolYearPreset {
  schoolYear: string;
  source: string;
  items: HolidayPreset[];
}

const vacation = (name: string, startDate: string, endDate: string): HolidayPreset => ({ name, type: "school_vacation", startDate, endDate, provisional: false });
const national = (name: string, date: string, provisional = false): HolidayPreset => ({ name, type: "national_holiday", startDate: date, endDate: date, provisional });

export const SCHOOL_YEAR_PRESETS: SchoolYearPreset[] = [
  {
    schoolYear: "2026-2027",
    source: "Ministerie van Onderwijs, Wetenschap en Cultuur — Vakanties en vrije dagen, schooljaar 2026–2027",
    items: [
      vacation("Kerstvakantie", "2026-12-21", "2027-01-03"),
      vacation("Paasvakantie", "2027-03-22", "2027-04-11"),
      vacation("Pinkstervakantie", "2027-05-15", "2027-05-23"),
      vacation("Najaarsvakantie", "2027-08-19", "2027-09-30"),

      national("Dag der Marrons", "2026-10-10"),
      national("Divali", "2026-11-08"),
      national("Onafhankelijkheidsdag (Srefidensi)", "2026-11-25"),
      national("Eerste Kerstdag", "2026-12-25"),
      national("Tweede Kerstdag", "2026-12-26"),
      national("Nieuwjaar", "2027-01-01"),
      national("Chinees Nieuwjaar", "2027-02-06"),
      national("Ied-Ul-Fitre", "2027-03-10", true),
      national("Holi Phagwa", "2027-03-22"),
      national("Goede Vrijdag", "2027-03-26"),
      national("Eerste paasdag", "2027-03-28"),
      national("Tweede paasdag", "2027-03-29"),
      national("Dag van de Arbeid", "2027-05-01"),
      national("Ied-Ul-Adha", "2027-05-17", true),
      national("Dag der Vrijheden (Manspasi dey)", "2027-07-01"),
      national("Dag der Inheemsen", "2027-08-09"),
    ],
  },
];

function sameHoliday(a: Pick<Holiday, "name" | "startDate">, b: Pick<Holiday, "name" | "startDate">): boolean {
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase() && a.startDate === b.startDate;
}

/** The preset entries that aren't in the app yet — so importing twice (or after adding some by hand) never duplicates. */
export function missingPresetItems(existing: Pick<Holiday, "name" | "startDate">[], preset: SchoolYearPreset): HolidayPreset[] {
  return preset.items.filter((item) => !existing.some((h) => sameHoliday(h, item)));
}

/**
 * The school year the Holidays tab should treat as "current": the one containing today or the next one starting,
 * otherwise the most recent. Falls back to `fallback` when there are no holidays at all.
 */
export function currentSchoolYear(holidays: Pick<Holiday, "endDate" | "schoolYear">[], today: string, fallback: string): string {
  if (holidays.length === 0) return fallback;
  const sorted = [...holidays].sort((a, b) => a.endDate.localeCompare(b.endDate));
  return (sorted.find((h) => h.endDate >= today) ?? sorted[sorted.length - 1]).schoolYear;
}
