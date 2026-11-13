import "server-only";
import type { User } from "./types";

const USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/;

/** Trims + lowercases; returns null if the result is empty (meaning "clear the field"). */
export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  return trimmed || null;
}

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

/** A username can't collide with anyone else's username OR email. */
export function isUsernameTaken(users: User[], candidate: string, excludeUserId?: string): boolean {
  return users.some((u) => u.id !== excludeUserId && (u.username === candidate || u.email === candidate));
}

export function isEmailTaken(users: User[], email: string, excludeUserId?: string): boolean {
  return users.some((u) => u.id !== excludeUserId && u.email === email);
}

/**
 * The default username for a new account: first letter of the first name + the surname, lowercase, without
 * accents or spaces ("Grace van Dijk" -> "gvandijk"). A number is appended if someone already has it.
 * Returns null when the name is too short to make a valid username.
 */
export function suggestUsername(fullName: string, users: User[]): string | null {
  const clean = (v: string) =>
    v
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  const base = parts.length === 1 ? clean(parts[0]) : clean(parts[0]).slice(0, 1) + clean(parts.slice(1).join(""));
  if (base.length < 3) return null;

  for (let n = 1; n < 100; n++) {
    const suffix = n === 1 ? "" : String(n);
    const candidate = base.slice(0, 24 - suffix.length) + suffix;
    if (isValidUsernameFormat(candidate) && !isUsernameTaken(users, candidate)) return candidate;
  }
  return null;
}
