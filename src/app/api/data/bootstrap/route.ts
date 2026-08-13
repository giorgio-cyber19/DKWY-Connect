import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getRedisClient, isKvConfigured } from "@/lib/kv";
import { toPublicUser, type PublicUser } from "@/lib/password";
import type {
  User,
  AgeGroup,
  SchoolClass,
  Child,
  LessonPlan,
  Post,
  MediaItem,
  DocumentItem,
  CalendarEvent,
  PrayerEntry,
  Notification,
  AuditLogEntry,
} from "@/lib/types";

const ENTITIES = ["users", "ageGroups", "classes", "children", "lessons", "posts", "mediaItems", "documentItems", "calendarEvents", "prayerEntries"] as const;

const PREFIX = "dwky-connect";

export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to DWKY Connect first." }, { status: 401 });
  }

  if (!isKvConfigured()) {
    return NextResponse.json({ error: "not_configured", message: "The database isn't configured on the server yet." }, { status: 503 });
  }

  const redis = getRedisClient();

  // Round trip 1: every collection's id-set + the two feed lists + this user's read-notification set, all pipelined.
  const idsPipeline = redis.pipeline();
  for (const entity of ENTITIES) idsPipeline.smembers(`${PREFIX}:${entity}:ids`);
  idsPipeline.lrange(`${PREFIX}:auditLog`, 0, -1);
  idsPipeline.lrange(`${PREFIX}:notifications`, 0, -1);
  idsPipeline.smembers(`${PREFIX}:notifications:${claims.userId}:read`);
  const idsResults = (await idsPipeline.exec()) as unknown[];

  const idsByEntity = new Map<(typeof ENTITIES)[number], string[]>();
  ENTITIES.forEach((entity, i) => idsByEntity.set(entity, (idsResults[i] as string[]) ?? []));
  const auditLog = (idsResults[ENTITIES.length] as AuditLogEntry[]) ?? [];
  const notificationFeed = (idsResults[ENTITIES.length + 1] as Notification[]) ?? [];
  const readIds = new Set((idsResults[ENTITIES.length + 2] as string[]) ?? []);

  // Round trip 2: MGET every collection's records using the ids just fetched.
  const nonEmpty = ENTITIES.filter((entity) => (idsByEntity.get(entity) ?? []).length > 0);
  const records: Record<string, unknown[]> = {};
  if (nonEmpty.length > 0) {
    const valuesPipeline = redis.pipeline();
    for (const entity of nonEmpty) {
      const ids = idsByEntity.get(entity)!;
      valuesPipeline.mget(...ids.map((id) => `${PREFIX}:${entity}:${id}`));
    }
    const valuesResults = (await valuesPipeline.exec()) as unknown[][];
    nonEmpty.forEach((entity, i) => {
      records[entity] = (valuesResults[i] ?? []).filter((v) => v != null);
    });
  }
  for (const entity of ENTITIES) if (!(entity in records)) records[entity] = [];

  const users = records.users as User[];
  const currentUserRaw = users.find((u) => u.id === claims.userId);
  if (!currentUserRaw || currentUserRaw.status !== "active") {
    return NextResponse.json({ error: "unauthorized", message: "Your account is no longer active. Contact your administrator." }, { status: 401 });
  }

  const children = records.children as Child[];
  const classes = (records.classes as SchoolClass[]).map((c) => ({
    ...c,
    childCount: children.filter((child) => child.classId === c.id).length,
  }));

  const notifications: Notification[] = notificationFeed.map((n) => ({ ...n, read: readIds.has(n.id) }));

  return NextResponse.json({
    currentUser: toPublicUser(currentUserRaw),
    users: users.map(toPublicUser) as PublicUser[],
    ageGroups: records.ageGroups as AgeGroup[],
    classes,
    children,
    lessonPlans: records.lessons as LessonPlan[],
    posts: records.posts as Post[],
    mediaItems: records.mediaItems as MediaItem[],
    documentItems: records.documentItems as DocumentItem[],
    calendarEvents: records.calendarEvents as CalendarEvent[],
    prayerEntries: records.prayerEntries as PrayerEntry[],
    notifications,
    auditLog,
  });
}
