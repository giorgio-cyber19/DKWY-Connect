import "server-only";
import { randomUUID } from "node:crypto";
import { getRedisClient, isKvConfigured } from "./kv";

const PREFIX = "dwky-connect";

export function newId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

function entityKey(entity: string, id: string): string {
  return `${PREFIX}:${entity}:${id}`;
}

function idsKey(entity: string): string {
  return `${PREFIX}:${entity}:ids`;
}

export async function getCollection<T>(entity: string): Promise<T[]> {
  if (!isKvConfigured()) return [];
  const redis = getRedisClient();
  const ids = await redis.smembers(idsKey(entity));
  if (ids.length === 0) return [];
  const values = await redis.mget<T[]>(...ids.map((id) => entityKey(entity, id)));
  return values.filter((v): v is T => v != null);
}

export async function getEntity<T>(entity: string, id: string): Promise<T | null> {
  if (!isKvConfigured()) return null;
  const redis = getRedisClient();
  const value = await redis.get<T>(entityKey(entity, id));
  return value ?? null;
}

/** Writes the entity and indexes its id in one atomic round trip. */
export async function putEntity<T extends { id: string }>(entity: string, value: T): Promise<T> {
  const redis = getRedisClient();
  await redis.multi().set(entityKey(entity, value.id), value).sadd(idsKey(entity), value.id).exec();
  return value;
}

export async function deleteEntity(entity: string, id: string): Promise<void> {
  const redis = getRedisClient();
  await redis.multi().del(entityKey(entity, id)).srem(idsKey(entity), id).exec();
}

/** Append-only feed (audit log, notifications) — capped Redis list, newest first. */
export async function appendFeed<T>(feedKey: string, value: T, cap: number): Promise<void> {
  const redis = getRedisClient();
  const key = `${PREFIX}:${feedKey}`;
  await redis.multi().lpush(key, value).ltrim(key, 0, cap - 1).exec();
}

export async function getFeed<T>(feedKey: string): Promise<T[]> {
  if (!isKvConfigured()) return [];
  const redis = getRedisClient();
  return redis.lrange<T>(`${PREFIX}:${feedKey}`, 0, -1);
}

/** Per-user set of read notification ids. */
export async function markFeedItemsRead(userId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const redis = getRedisClient();
  await redis.sadd(`${PREFIX}:notifications:${userId}:read`, ids[0], ...ids.slice(1));
}

export async function getReadNotificationIds(userId: string): Promise<Set<string>> {
  if (!isKvConfigured()) return new Set();
  const redis = getRedisClient();
  const ids = await redis.smembers(`${PREFIX}:notifications:${userId}:read`);
  return new Set(ids);
}
