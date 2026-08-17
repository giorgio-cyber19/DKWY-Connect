import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Language } from "./i18n";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Transient client-side id for list items not yet persisted (e.g. lesson attachments before save) — the server assigns the real id. */
export function newClientId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
}

/** Scales bytes into KB/MB/GB/TB for display (e.g. Drive storage quota) — one decimal place. */
export function formatBytesLarge(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Parses a "YYYY-MM-DD" date-only string as a local calendar date, avoiding the UTC-midnight
 * off-by-one shift that `new Date("YYYY-MM-DD")` produces in timezones behind UTC. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

const localeMap: Record<Language, string> = { en: "en-US", nl: "nl-NL" };

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions, language: Language = "en") {
  return parseDate(iso).toLocaleDateString(localeMap[language], {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

const relativeTime: Record<Language, { justNow: string; minutes: (n: number) => string; hours: (n: number) => string; days: (n: number) => string; weeks: (n: number) => string }> = {
  en: {
    justNow: "just now",
    minutes: (n) => `${n}m ago`,
    hours: (n) => `${n}h ago`,
    days: (n) => `${n}d ago`,
    weeks: (n) => `${n}w ago`,
  },
  nl: {
    justNow: "zojuist",
    minutes: (n) => `${n}m geleden`,
    hours: (n) => `${n}u geleden`,
    days: (n) => `${n}d geleden`,
    weeks: (n) => `${n}w geleden`,
  },
};

export function timeAgo(iso: string, language: Language = "en") {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const t = relativeTime[language];
  if (mins < 1) return t.justNow;
  if (mins < 60) return t.minutes(mins);
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t.hours(hrs);
  const days = Math.floor(hrs / 24);
  if (days < 7) return t.days(days);
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return t.weeks(weeks);
  return formatDate(iso, undefined, language);
}
