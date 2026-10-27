import { addDays, todayInAmsterdam } from "./attendance-stats";

/** Filtering and sorting for the Documents / Media libraries (Google-Drive-style). Pure, shared by both pages. */

export type LibrarySortKey = "name" | "modified" | "size";
export type ModifiedFilter = "any" | "today" | "7d" | "30d" | "thisYear" | "lastYear" | "custom";
export type SizeFilter = "any" | "lt1" | "1to10" | "10to100" | "gt100";

export interface LibraryViewState {
  sortKey: LibrarySortKey;
  sortDir: "asc" | "desc";
  /** "all", or one of the page's file kinds. */
  type: string;
  modified: ModifiedFilter;
  /** Custom range, YYYY-MM-DD (either end may be empty). */
  from: string;
  to: string;
  size: SizeFilter;
  /** "all", or a user id. */
  person: string;
}

export const DEFAULT_VIEW_STATE: LibraryViewState = {
  sortKey: "name",
  sortDir: "asc",
  type: "all",
  modified: "any",
  from: "",
  to: "",
  size: "any",
  person: "all",
};

/** What the filters and sort need to know about one file. */
export interface LibraryEntry {
  name: string;
  kind: string;
  sizeBytes: number;
  /** ISO date or datetime. */
  modified: string;
  ownerId: string;
}

const UNIT: Record<string, number> = { B: 1, KB: 1024, MB: 1024 ** 2, GB: 1024 ** 3, TB: 1024 ** 4 };

/** Turns the app's display sizes ("5 KB", "1.5 MB", "2,4 GB") back into bytes; unknown values count as 0. */
export function parseSizeToBytes(text: string | undefined): number {
  const m = /^\s*([\d.,]+)\s*(B|KB|MB|GB|TB)?\s*$/i.exec(text ?? "");
  if (!m) return 0;
  const n = parseFloat(m[1].replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * (UNIT[(m[2] ?? "B").toUpperCase()] ?? 1));
}

/** The calendar day (Amsterdam) a modification happened on — date-only values are taken as they are. */
export function modifiedDay(modified: string): string {
  if (!modified) return "";
  return modified.length <= 10 ? modified : todayInAmsterdam(new Date(modified));
}

export function matchesModified(modified: string, state: Pick<LibraryViewState, "modified" | "from" | "to">, today: string): boolean {
  if (state.modified === "any") return true;
  const day = modifiedDay(modified);
  if (!day) return false;
  switch (state.modified) {
    case "today":
      return day === today;
    case "7d":
      return day >= addDays(today, -6) && day <= today;
    case "30d":
      return day >= addDays(today, -29) && day <= today;
    case "thisYear":
      return day.slice(0, 4) === today.slice(0, 4);
    case "lastYear":
      return day.slice(0, 4) === String(Number(today.slice(0, 4)) - 1);
    case "custom":
      return (!state.from || day >= state.from) && (!state.to || day <= state.to);
  }
}

const MB = 1024 ** 2;

export function matchesSize(bytes: number, size: SizeFilter): boolean {
  switch (size) {
    case "any":
      return true;
    case "lt1":
      return bytes < MB;
    case "1to10":
      return bytes >= MB && bytes < 10 * MB;
    case "10to100":
      return bytes >= 10 * MB && bytes < 100 * MB;
    case "gt100":
      return bytes >= 100 * MB;
  }
}

export function hasActiveFilters(state: LibraryViewState): boolean {
  return state.type !== "all" || state.modified !== "any" || state.size !== "any" || state.person !== "all";
}

export function applyLibraryView<T>(items: T[], entryOf: (item: T) => LibraryEntry, state: LibraryViewState, today = todayInAmsterdam()): T[] {
  const withEntry = items.map((item) => ({ item, e: entryOf(item) }));
  const kept = withEntry.filter(
    ({ e }) =>
      (state.type === "all" || e.kind === state.type) &&
      (state.person === "all" || e.ownerId === state.person) &&
      matchesModified(e.modified, state, today) &&
      matchesSize(e.sizeBytes, state.size)
  );

  const byName = (a: LibraryEntry, b: LibraryEntry) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const dir = state.sortDir === "asc" ? 1 : -1;
  kept.sort((a, b) => {
    let primary = 0;
    if (state.sortKey === "name") primary = byName(a.e, b.e);
    else if (state.sortKey === "size") primary = a.e.sizeBytes - b.e.sizeBytes;
    else primary = a.e.modified.localeCompare(b.e.modified);
    if (primary !== 0) return primary * dir;
    return byName(a.e, b.e); // stable, predictable tie-break regardless of direction
  });
  return kept.map((x) => x.item);
}
