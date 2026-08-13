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
