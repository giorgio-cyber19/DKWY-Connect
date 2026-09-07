import "server-only";
import { getRedisClient, isKvConfigured } from "./kv";
import type { SavedVerseHighlight } from "./types";

const PREFIX = "dwky-connect";

/** Generous but bounded — a teacher building up years of study notes shouldn't hit this, but an unbounded list isn't worth the risk either. */
const MAX_HIGHLIGHTS = 500;

function key(userId: string): string {
  return `${PREFIX}:bibleHighlights:${userId}`;
}

export async function getHighlights(userId: string): Promise<SavedVerseHighlight[]> {
  if (!isKvConfigured()) return [];
  const list = await getRedisClient().get<SavedVerseHighlight[]>(key(userId));
  return list ?? [];
}

/** Upserts one highlight per (versionId, passageId) — highlighting an already-saved verse in a new color replaces the old entry rather than duplicating it. */
export async function saveHighlights(
  userId: string,
  entries: Omit<SavedVerseHighlight, "createdAt">[]
): Promise<SavedVerseHighlight[]> {
  const existing = await getHighlights(userId);
  const now = new Date().toISOString();
  const incomingKeys = new Set(entries.map((e) => `${e.versionId}:${e.passageId}`));
  const kept = existing.filter((h) => !incomingKeys.has(`${h.versionId}:${h.passageId}`));
  const added = entries.map((e) => ({ ...e, createdAt: now }));
  const updated = [...kept, ...added].slice(-MAX_HIGHLIGHTS);
  await getRedisClient().set(key(userId), updated);
  return updated;
}

export async function removeHighlights(
  userId: string,
  toRemove: { versionId: number; passageId: string }[]
): Promise<SavedVerseHighlight[]> {
  const existing = await getHighlights(userId);
  const removeKeys = new Set(toRemove.map((r) => `${r.versionId}:${r.passageId}`));
  const updated = existing.filter((h) => !removeKeys.has(`${h.versionId}:${h.passageId}`));
  await getRedisClient().set(key(userId), updated);
  return updated;
}
