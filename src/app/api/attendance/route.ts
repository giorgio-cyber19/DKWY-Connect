import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, getCollection, putEntity, getEntityIds, getEntitiesByIds, newId, appendFeed } from "@/lib/db";
import {
  addDays,
  attendanceRecordId,
  dateFromAttendanceId,
  isIsoDate,
  parseAttendanceInput,
  todayInAmsterdam,
} from "@/lib/attendance-stats";
import type { AttendanceRecord, AuditLogEntry, Child, SchoolClass, User } from "@/lib/types";

const ENTITY = "attendance";
const MAX_RANGE_DAYS = 366;

/**
 * GET ?classId=&date=            -> { record }   one register (or null)
 * GET ?classId=&from=&to=        -> { records }  a class over a date range (default: last 90 days)
 * GET ?childId=[&weeks=26]       -> { records }  every register the child appears in, recent weeks
 */
export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const url = new URL(request.url);
  const classId = url.searchParams.get("classId");
  const date = url.searchParams.get("date");
  const childId = url.searchParams.get("childId");
  const today = todayInAmsterdam();

  if (classId && date) {
    if (!isIsoDate(date)) return NextResponse.json({ error: "bad_request", message: "Invalid date." }, { status: 400 });
    const record = await getEntity<AttendanceRecord>(ENTITY, attendanceRecordId(classId, date));
    return NextResponse.json({ record: record ?? null });
  }

  if (childId) {
    const weeks = Math.min(52, Math.max(1, Number(url.searchParams.get("weeks")) || 26));
    const from = addDays(today, -7 * weeks);
    const ids = (await getEntityIds(ENTITY)).filter((id) => dateFromAttendanceId(id) >= from);
    const records = (await getEntitiesByIds<AttendanceRecord>(ENTITY, ids)).filter((r) => r.marks[childId]);
    return NextResponse.json({ records });
  }

  if (classId) {
    const to = url.searchParams.get("to") ?? today;
    const from = url.searchParams.get("from") ?? addDays(to, -90);
    if (!isIsoDate(from) || !isIsoDate(to) || to < from) {
      return NextResponse.json({ error: "bad_request", message: "Invalid date range." }, { status: 400 });
    }
    const effectiveFrom = from < addDays(to, -MAX_RANGE_DAYS) ? addDays(to, -MAX_RANGE_DAYS) : from;
    const prefix = `att-${classId}-`;
    const ids = (await getEntityIds(ENTITY)).filter((id) => {
      if (!id.startsWith(prefix) || id.length !== prefix.length + 10) return false;
      const d = dateFromAttendanceId(id);
      return d >= effectiveFrom && d <= to;
    });
    return NextResponse.json({ records: await getEntitiesByIds<AttendanceRecord>(ENTITY, ids) });
  }

  return NextResponse.json({ error: "bad_request", message: "Specify a class and date, a class and range, or a child." }, { status: 400 });
}

/** Saves (creates or replaces) one class's register for one date. */
export async function PUT(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const classId = typeof body?.classId === "string" ? body.classId : "";
  const schoolClass = classId ? await getEntity<SchoolClass>("classes", classId) : null;
  if (!schoolClass) return NextResponse.json({ error: "not_found", message: "That class no longer exists." }, { status: 404 });

  const isAdmin = claims.role === "admin";
  if (!isAdmin) {
    const me = await getEntity<User>("users", claims.userId);
    const teachesClass = me?.classId === classId || schoolClass.teacherIds.includes(claims.userId);
    if (!teachesClass) {
      return NextResponse.json(
        { error: "forbidden", message: "Only this class's teachers and administrators can record its attendance." },
        { status: 403 }
      );
    }
  }

  const children = (await getCollection<Child>("children")).filter((c) => c.classId === classId);
  const parsed = parseAttendanceInput(body, { today: todayInAmsterdam(), isAdmin, childIds: new Set(children.map((c) => c.id)) });
  if (!parsed.ok) return NextResponse.json({ error: "bad_request", message: parsed.message }, { status: 400 });
  const { date, marks, visitors, note } = parsed.value;

  const id = attendanceRecordId(classId, date);
  const existing = await getEntity<AttendanceRecord>(ENTITY, id);
  const now = new Date().toISOString();

  const record: AttendanceRecord = {
    id,
    classId,
    date,
    marks,
    visitors,
    ...(note ? { note } : {}),
    takenBy: existing?.takenBy ?? claims.userId,
    takenAt: existing?.takenAt ?? now,
    ...(existing ? { updatedBy: claims.userId, updatedAt: now } : {}),
  };
  await putEntity(ENTITY, record);

  await appendFeed<AuditLogEntry>(
    "auditLog",
    {
      id: newId("al"),
      actor: claims.name,
      action: existing ? "Updated attendance" : "Recorded attendance",
      target: `${schoolClass.name} · ${date}`,
      date: now,
    },
    200
  );

  return NextResponse.json({ record });
}
