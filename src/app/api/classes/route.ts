import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getCollection, putEntity, newId, appendFeed } from "@/lib/db";
import { pickColor } from "@/lib/colors";
import type { SchoolClass, AuditLogEntry } from "@/lib/types";
import { cleanRoom } from "@/lib/utils";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can create classes." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const ageGroupId = body?.ageGroupId;
  const room = typeof body?.room === "string" ? cleanRoom(body.room) : ""; // optional
  if (typeof name !== "string" || !name.trim() || typeof ageGroupId !== "string" || !ageGroupId) {
    return NextResponse.json({ error: "bad_request", message: "Name and age group are required." }, { status: 400 });
  }

  const existingClasses = await getCollection<SchoolClass>("classes");
  const schoolClass: SchoolClass = {
    id: newId("cls"),
    name: name.trim(),
    ageGroupId,
    teacherIds: [],
    room,
    color: pickColor(existingClasses.length),
    childCount: 0,
  };
  await putEntity("classes", schoolClass);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Created class", target: schoolClass.name, date: new Date().toISOString() },
    200
  );
  return NextResponse.json(schoolClass);
}
