import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity, getCollection, newId, appendFeed } from "@/lib/db";
import type { SchoolClass, Child, User, AuditLogEntry } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/classes/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can edit classes." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const schoolClass = await getEntity<SchoolClass>("classes", id);
  if (!schoolClass) return NextResponse.json({ error: "not_found", message: "That class no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : schoolClass.name;
  const ageGroupId = typeof body?.ageGroupId === "string" ? body.ageGroupId : schoolClass.ageGroupId;
  const room = typeof body?.room === "string" ? body.room.trim() : schoolClass.room;
  if (!name || !ageGroupId) {
    return NextResponse.json({ error: "bad_request", message: "Name and age group are required." }, { status: 400 });
  }

  const updated: SchoolClass = { ...schoolClass, name, ageGroupId, room };
  await putEntity("classes", updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/classes/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can delete classes." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const schoolClass = await getEntity<SchoolClass>("classes", id);
  if (!schoolClass) return NextResponse.json({ error: "not_found", message: "That class no longer exists." }, { status: 404 });

  const children = await getCollection<Child>("children");
  const childCount = children.filter((c) => c.classId === id).length;
  if (childCount > 0) {
    return NextResponse.json(
      {
        error: "in_use",
        message: `This class still has ${childCount} ${childCount === 1 ? "child" : "children"} enrolled. Move or remove them first.`,
      },
      { status: 409 }
    );
  }

  const users = await getCollection<User>("users");
  const assignedTeachers = users.filter((u) => u.classId === id);
  for (const teacher of assignedTeachers) {
    const { classId: _drop, ...rest } = teacher;
    await putEntity("users", rest as User);
  }

  await deleteEntity("classes", id);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Deleted class", target: schoolClass.name, date: new Date().toISOString() },
    200
  );
  return NextResponse.json({ ok: true });
}
