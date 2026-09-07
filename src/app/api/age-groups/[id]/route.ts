import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity, getCollection, newId, appendFeed } from "@/lib/db";
import type { AgeGroup, SchoolClass, LessonPlan, AuditLogEntry } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/age-groups/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can edit age groups." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ageGroup = await getEntity<AgeGroup>("ageGroups", id);
  if (!ageGroup) return NextResponse.json({ error: "not_found", message: "That age group no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : ageGroup.name;
  const range = typeof body?.range === "string" ? body.range.trim() : ageGroup.range;
  if (!name || !range) {
    return NextResponse.json({ error: "bad_request", message: "Name and age range are required." }, { status: 400 });
  }

  const updated: AgeGroup = { ...ageGroup, name, range };
  await putEntity("ageGroups", updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/age-groups/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can delete age groups." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const ageGroup = await getEntity<AgeGroup>("ageGroups", id);
  if (!ageGroup) return NextResponse.json({ error: "not_found", message: "That age group no longer exists." }, { status: 404 });

  const [classes, lessons] = await Promise.all([getCollection<SchoolClass>("classes"), getCollection<LessonPlan>("lessons")]);
  const classCount = classes.filter((c) => c.ageGroupId === id).length;
  const lessonCount = lessons.filter((l) => l.ageGroupId === id).length;
  if (classCount > 0 || lessonCount > 0) {
    return NextResponse.json(
      {
        error: "in_use",
        message: `This age group is used by ${classCount} class(es) and ${lessonCount} lesson plan(s). Reassign or remove those first.`,
      },
      { status: 409 }
    );
  }

  await deleteEntity("ageGroups", id);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Deleted age group", target: ageGroup.name, date: new Date().toISOString() },
    200
  );
  return NextResponse.json({ ok: true });
}
