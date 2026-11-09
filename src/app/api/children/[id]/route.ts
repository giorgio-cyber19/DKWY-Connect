import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity, newId, appendFeed } from "@/lib/db";
import { isIsoDate } from "@/lib/attendance-stats";
import { calculateAge } from "@/lib/utils";
import type { Child, Guardian, SchoolClass, AuditLogEntry } from "@/lib/types";

const text = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");

/** Updates a child's details (not the portfolio content). Only the fields that are sent are changed. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/children/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const child = await getEntity<Child>("children", id);
  if (!child) return NextResponse.json({ error: "not_found", message: "That child no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad_request", message: "Nothing to update." }, { status: 400 });

  const updated: Child = { ...child };

  if ("name" in body) {
    const name = text(body.name, 120);
    if (!name) return NextResponse.json({ error: "bad_request", message: "A name is required." }, { status: 400 });
    updated.name = name;
  }
  if ("birthday" in body) {
    const birthday = typeof body.birthday === "string" ? body.birthday.trim() : "";
    if (birthday && !isIsoDate(birthday)) return NextResponse.json({ error: "bad_request", message: "That birthday is not a valid date." }, { status: 400 });
    updated.birthday = birthday;
    updated.age = birthday ? calculateAge(birthday) : 0;
  }
  if ("classId" in body && body.classId !== child.classId) {
    const schoolClass = typeof body.classId === "string" ? await getEntity<SchoolClass>("classes", body.classId) : null;
    if (!schoolClass) return NextResponse.json({ error: "not_found", message: "That class no longer exists." }, { status: 404 });
    updated.classId = schoolClass.id;
    updated.teacherId = schoolClass.teacherIds[0];
  }
  if ("guardians" in body) {
    if (!Array.isArray(body.guardians) || body.guardians.length > 10) return NextResponse.json({ error: "bad_request", message: "Invalid guardians." }, { status: 400 });
    updated.guardians = (body.guardians as Partial<Guardian>[])
      .map((g) => ({ name: text(g?.name, 120), relation: text(g?.relation, 60), phone: text(g?.phone, 60), email: text(g?.email, 160) }))
      .filter((g) => g.name);
  }
  if ("address" in body) updated.address = text(body.address, 300) || undefined;
  if ("allergies" in body) updated.allergies = text(body.allergies, 300) || undefined;

  await putEntity("children", updated);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Updated child details", target: updated.name, date: new Date().toISOString() },
    200
  );
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/children/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can delete a child's portfolio." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const child = await getEntity<Child>("children", id);
  if (!child) return NextResponse.json({ error: "not_found", message: "That child no longer exists." }, { status: 404 });

  await deleteEntity("children", id);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Deleted child portfolio", target: child.name, date: new Date().toISOString() },
    200
  );

  return NextResponse.json({ ok: true });
}
