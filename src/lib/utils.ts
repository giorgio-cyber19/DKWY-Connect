import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

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

export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions) {
  return parseDate(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

export function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return formatDate(iso);
}
