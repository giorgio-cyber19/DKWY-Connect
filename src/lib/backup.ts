import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { getRedisClient } from "./kv";
import { uploadBackupFile, listBackupFiles, downloadBackupFile, deleteBackupFile, type DriveBackupFile } from "./google-drive";

/**
 * Nightly full-database snapshots.
 *
 * A snapshot is every Redis key under the app prefix (strings / sets / lists — the only
 * types the app uses), serialised to JSON, gzip-compressed and encrypted with AES-256-GCM
 * before it is written to the private "Backups" folder in Google Drive.
 */

const PREFIX = "dwky-connect";
const SNAPSHOT_FORMAT = "dwky-backup";
const SNAPSHOT_VERSION = 1;
const MAGIC = Buffer.from("DWKYBK1\0", "ascii");

/** Keys that are transient or belong to the backup system itself — never snapshotted, never restored. */
const EXCLUDED_PREFIXES = [`${PREFIX}:ratelimit`, `${PREFIX}:ai-rate:`, `${PREFIX}:password-reset:`, `${PREFIX}:backup:`];

const STATUS_KEY = `${PREFIX}:backup:status`;

export const DAILY_RETENTION_DAYS = 30;
export const MONTHLY_RETENTION_MONTHS = 12;
export const PRERESTORE_KEEP = 5;

type EntryType = "string" | "set" | "list";

export interface SnapshotEntry {
  key: string;
  type: EntryType;
  value: unknown;
}

export interface Snapshot {
  format: typeof SNAPSHOT_FORMAT;
  version: number;
  createdAt: string;
  entries: SnapshotEntry[];
  /** Keys of an unsupported type — noted rather than silently dropped. */
  skipped: { key: string; type: string }[];
}

export interface BackupStatus {
  lastAttemptAt?: string;
  lastSuccessAt?: string;
  lastFileName?: string;
  lastSizeBytes?: number;
  lastKeyCount?: number;
  lastError?: string | null;
}

// ---------------------------------------------------------------- encryption

/** Prefers a dedicated BACKUP_ENCRYPTION_KEY so rotating AUTH_SECRET (e.g. after an incident) never strands old backups. */
export function encryptionKeySource(): "dedicated" | "auth-secret" {
  return process.env.BACKUP_ENCRYPTION_KEY ? "dedicated" : "auth-secret";
}

function backupKey(): Buffer {
  const secret = process.env.BACKUP_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) throw new Error("Neither BACKUP_ENCRYPTION_KEY nor AUTH_SECRET is set.");
  return scryptSync(secret, "dwky-connect::backup-v1", 32);
}

export function encryptSnapshot(snapshot: Snapshot): Buffer {
  const compressed = gzipSync(Buffer.from(JSON.stringify(snapshot), "utf8"));
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", backupKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return Buffer.concat([MAGIC, iv, cipher.getAuthTag(), ciphertext]);
}

export function decryptSnapshot(file: Buffer): Snapshot {
  if (file.length < MAGIC.length + 28 || !file.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("This isn't a DWKY Connect backup file.");
  }
  const iv = file.subarray(MAGIC.length, MAGIC.length + 12);
  const tag = file.subarray(MAGIC.length + 12, MAGIC.length + 28);
  const ciphertext = file.subarray(MAGIC.length + 28);
  let plain: Buffer;
  try {
    const decipher = createDecipheriv("aes-256-gcm", backupKey(), iv);
    decipher.setAuthTag(tag);
    plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error("This backup couldn't be decrypted — the encryption key has changed since it was made.");
  }
  const snapshot = JSON.parse(gunzipSync(plain).toString("utf8")) as Snapshot;
  if (snapshot.format !== SNAPSHOT_FORMAT || snapshot.version !== SNAPSHOT_VERSION || !Array.isArray(snapshot.entries)) {
    throw new Error("This backup was made by an unsupported version of DWKY Connect.");
  }
  return snapshot;
}

// ---------------------------------------------------------------- snapshotting

export function isBackedUpKey(key: string): boolean {
  return key.startsWith(`${PREFIX}:`) && !EXCLUDED_PREFIXES.some((p) => key.startsWith(p));
}

/** Second key segment: "children" for dwky-connect:children:child-1234. */
export function categoryOf(key: string): string {
  return key.split(":")[1] ?? "";
}

/** All current app keys with their types (SCAN … WITH TYPE: a handful of commands, not one per key). */
async function scanKeys(): Promise<{ key: string; type: string }[]> {
  const redis = getRedisClient();
  const found = new Map<string, string>();
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match: `${PREFIX}:*`, count: 1000, withType: true });
    for (const item of batch) if (isBackedUpKey(item.key)) found.set(item.key, item.type);
    cursor = String(next);
  } while (cursor !== "0");
  return [...found].map(([key, type]) => ({ key, type }));
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function collectSnapshot(): Promise<Snapshot> {
  const redis = getRedisClient();
  const keys = await scanKeys();
  const entries: SnapshotEntry[] = [];
  const skipped: { key: string; type: string }[] = [];

  const strings = keys.filter((k) => k.type === "string").map((k) => k.key);
  for (const group of chunk(strings, 200)) {
    const values = await redis.mget<unknown[]>(...group);
    group.forEach((key, i) => {
      if (values[i] !== null && values[i] !== undefined) entries.push({ key, type: "string", value: values[i] });
    });
  }

  for (const type of ["set", "list"] as const) {
    const group = keys.filter((k) => k.type === type).map((k) => k.key);
    for (const part of chunk(group, 200)) {
      const pipeline = redis.pipeline();
      for (const key of part) {
        if (type === "set") pipeline.smembers(key);
        else pipeline.lrange(key, 0, -1);
      }
      const results = (await pipeline.exec()) as unknown[][];
      part.forEach((key, i) => entries.push({ key, type, value: results[i] ?? [] }));
    }
  }

  for (const k of keys) if (!["string", "set", "list"].includes(k.type)) skipped.push(k);

  entries.sort((a, b) => a.key.localeCompare(b.key));
  return { format: SNAPSHOT_FORMAT, version: SNAPSHOT_VERSION, createdAt: new Date().toISOString(), entries, skipped };
}

// ---------------------------------------------------------------- naming & retention

export type BackupKind = "daily" | "prerestore";

/** Europe/Amsterdam wall-clock parts, so file names match the admins' own clock. */
function localParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}${get("minute")}` };
}

export function backupFileName(kind: BackupKind, now = new Date()): string {
  const { date, time } = localParts(now);
  return `${kind === "prerestore" ? "dwky-prerestore" : "dwky-backup"}-${date}-${time}.dwkybak`;
}

export function parseBackupName(name: string): { kind: BackupKind; date: string; month: string } | null {
  const match = /^dwky-(backup|prerestore)-(\d{4}-\d{2}-\d{2})-\d{4}\.dwkybak$/.exec(name);
  if (!match) return null;
  return { kind: match[1] === "prerestore" ? "prerestore" : "daily", date: match[2], month: match[2].slice(0, 7) };
}

/**
 * Retention: every backup from the last 30 days, plus the earliest backup of each of the last
 * 12 calendar months, plus the newest backup no matter what. Pre-restore safety snapshots are
 * kept separately (newest 5). Files that aren't ours are never touched.
 */
export function selectBackupsToDelete<T extends { name: string }>(files: T[], now = new Date()): T[] {
  const today = localParts(now).date;
  const cutoff = new Date(`${today}T00:00:00Z`);
  cutoff.setUTCDate(cutoff.getUTCDate() - (DAILY_RETENTION_DAYS - 1));
  const cutoffDate = cutoff.toISOString().slice(0, 10);

  const monthCutoff = new Date(`${today.slice(0, 7)}-01T00:00:00Z`);
  monthCutoff.setUTCMonth(monthCutoff.getUTCMonth() - (MONTHLY_RETENTION_MONTHS - 1));
  const oldestMonth = monthCutoff.toISOString().slice(0, 7);

  const parsed = files.map((file) => ({ file, info: parseBackupName(file.name) })).filter((x) => x.info !== null) as {
    file: T;
    info: NonNullable<ReturnType<typeof parseBackupName>>;
  }[];

  const regular = parsed.filter((x) => x.info.kind === "daily").sort((a, b) => a.file.name.localeCompare(b.file.name));
  const keep = new Set<T>();

  for (const x of regular) if (x.info.date >= cutoffDate) keep.add(x.file);

  const seenMonths = new Set<string>();
  for (const x of regular) {
    if (x.info.month < oldestMonth || seenMonths.has(x.info.month)) continue;
    seenMonths.add(x.info.month);
    keep.add(x.file); // regular is sorted ascending, so this is the month's earliest backup
  }
  if (regular.length > 0) keep.add(regular[regular.length - 1].file);

  const prerestore = parsed.filter((x) => x.info.kind === "prerestore").sort((a, b) => b.file.name.localeCompare(a.file.name));
  prerestore.slice(0, PRERESTORE_KEEP).forEach((x) => keep.add(x.file));

  return parsed.filter((x) => !keep.has(x.file)).map((x) => x.file);
}

// ---------------------------------------------------------------- status

export async function getBackupStatus(): Promise<BackupStatus> {
  return (await getRedisClient().get<BackupStatus>(STATUS_KEY)) ?? {};
}

async function patchBackupStatus(patch: Partial<BackupStatus>): Promise<void> {
  const current = await getBackupStatus();
  await getRedisClient().set(STATUS_KEY, { ...current, ...patch });
}

// ---------------------------------------------------------------- running a backup

export interface BackupResult {
  fileName: string;
  sizeBytes: number;
  keyCount: number;
  deleted: number;
}

/** Snapshot → encrypt → upload → (only then) prune. A failed run never deletes older backups. */
export async function runBackup(kind: BackupKind = "daily"): Promise<BackupResult> {
  const attemptedAt = new Date().toISOString();
  try {
    const snapshot = await collectSnapshot();
    const fileName = backupFileName(kind);
    const encrypted = encryptSnapshot(snapshot);
    const uploaded = await uploadBackupFile(fileName, encrypted);

    let deleted = 0;
    try {
      const all = await listBackupFiles();
      for (const stale of selectBackupsToDelete(all)) {
        await deleteBackupFile(stale.id);
        deleted += 1;
      }
    } catch (err) {
      // The new backup is safely stored; failing to tidy old ones must not mark the run as failed.
      console.error("Backup pruning failed:", err);
    }

    if (kind === "daily") {
      await patchBackupStatus({
        lastAttemptAt: attemptedAt,
        lastSuccessAt: new Date().toISOString(),
        lastFileName: fileName,
        lastSizeBytes: uploaded.size,
        lastKeyCount: snapshot.entries.length,
        lastError: null,
      });
    }
    return { fileName, sizeBytes: uploaded.size, keyCount: snapshot.entries.length, deleted };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown backup error";
    console.error("Backup failed:", err);
    if (kind === "daily") await patchBackupStatus({ lastAttemptAt: attemptedAt, lastError: message });
    throw err;
  }
}

export async function listBackups(): Promise<(DriveBackupFile & { kind: BackupKind })[]> {
  const files = await listBackupFiles();
  return files
    .map((f) => ({ f, info: parseBackupName(f.name) }))
    .filter((x) => x.info !== null)
    .map((x) => ({ ...x.f, kind: x.info!.kind }))
    .sort((a, b) => b.name.localeCompare(a.name));
}

export async function loadBackup(fileId: string): Promise<Snapshot> {
  return decryptSnapshot(await downloadBackupFile(fileId));
}

// ---------------------------------------------------------------- restoring

export type RestoreScope = { type: "all" } | { type: "category"; category: string } | { type: "record"; key: string };

export interface RestorePlan {
  /** Snapshot keys that will be written. */
  write: number;
  /** Of those, how many replace something that exists now. */
  overwrite: number;
  /** Current keys in scope that the snapshot doesn't have — removed on a category/all restore. */
  remove: number;
}

function inScope(key: string, scope: RestoreScope): boolean {
  if (scope.type === "all") return true;
  if (scope.type === "category") return categoryOf(key) === scope.category;
  return key === scope.key;
}

/** `dwky-connect:children:child-1` → the id-index set `dwky-connect:children:ids`, if this key is an entity record. */
function idIndexFor(snapshot: Snapshot, key: string): { setKey: string; id: string } | null {
  const [, category, id] = key.split(":");
  if (!category || !id || id === "ids") return null;
  const setKey = `${PREFIX}:${category}:ids`;
  return snapshot.entries.some((e) => e.key === setKey && e.type === "set") ? { setKey, id } : null;
}

export async function planRestore(snapshot: Snapshot, scope: RestoreScope): Promise<RestorePlan> {
  const entries = snapshot.entries.filter((e) => inScope(e.key, scope));
  if (scope.type === "record" && entries.length === 0) throw new Error("That record isn't in this backup.");
  const current = await scanKeys();
  const currentKeys = new Set(current.map((k) => k.key));
  const snapshotKeys = new Set(entries.map((e) => e.key));
  const remove = scope.type === "record" ? 0 : current.filter((k) => inScope(k.key, scope) && !snapshotKeys.has(k.key)).length;
  return { write: entries.length, overwrite: entries.filter((e) => currentKeys.has(e.key)).length, remove };
}

/**
 * Writes the scoped part of the snapshot back. Snapshot keys are written first (overwriting),
 * and only afterwards are leftover keys in scope removed — there is never an empty window.
 */
export async function applyRestore(snapshot: Snapshot, scope: RestoreScope): Promise<RestorePlan> {
  const plan = await planRestore(snapshot, scope);
  const redis = getRedisClient();
  const entries = snapshot.entries.filter((e) => inScope(e.key, scope));

  for (const group of chunk(entries, 100)) {
    const pipeline = redis.pipeline();
    for (const entry of group) {
      if (entry.type === "string") {
        pipeline.set(entry.key, entry.value as string);
      } else if (entry.type === "set") {
        pipeline.del(entry.key);
        const members = entry.value as string[];
        if (members.length > 0) pipeline.sadd(entry.key, members[0], ...members.slice(1));
      } else {
        pipeline.del(entry.key);
        const items = entry.value as unknown[];
        if (items.length > 0) pipeline.rpush(entry.key, ...items);
      }
    }
    await pipeline.exec();
  }

  if (scope.type === "record") {
    const index = idIndexFor(snapshot, scope.key);
    if (index) await redis.sadd(index.setKey, index.id);
    return plan;
  }

  const snapshotKeys = new Set(entries.map((e) => e.key));
  const stale = (await scanKeys()).filter((k) => inScope(k.key, scope) && !snapshotKeys.has(k.key)).map((k) => k.key);
  for (const group of chunk(stale, 100)) await redis.del(...group);
  return plan;
}

// ---------------------------------------------------------------- browsing a snapshot (for the restore UI)

export function snapshotCategories(snapshot: Snapshot): { category: string; keys: number }[] {
  const counts = new Map<string, number>();
  for (const e of snapshot.entries) counts.set(categoryOf(e.key), (counts.get(categoryOf(e.key)) ?? 0) + 1);
  return [...counts].map(([category, keys]) => ({ category, keys })).sort((a, b) => a.category.localeCompare(b.category));
}

/** Human label for a stored record, for the "restore one record" picker. */
function labelFor(value: unknown, fallback: string): string {
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    for (const field of ["name", "title", "content", "label"] as const) {
      const text = v[field];
      if (typeof text === "string" && text.trim()) return text.trim().slice(0, 80);
    }
    if (typeof v.date === "string") return `${fallback} (${v.date})`;
  }
  return fallback;
}

export function snapshotRecords(snapshot: Snapshot, category: string): { key: string; label: string }[] {
  return snapshot.entries
    .filter((e) => e.type === "string" && categoryOf(e.key) === category && typeof e.value === "object" && e.value !== null)
    .map((e) => ({ key: e.key, label: labelFor(e.value, e.key.split(":").slice(2).join(":")) }))
    .sort((a, b) => a.label.localeCompare(b.label))
    .slice(0, 500);
}

export function snapshotHasUser(snapshot: Snapshot, userId: string): boolean {
  return snapshot.entries.some((e) => e.key === `${PREFIX}:users:${userId}`);
}
