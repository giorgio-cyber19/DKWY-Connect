import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getCollection, putEntity, newId, appendFeed } from "@/lib/db";
import { pickColor } from "@/lib/colors";
import type { Child, Guardian, AuditLogEntry, Notification } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const classId = body?.classId;
  const teacherId = body?.teacherId;
  if (typeof name !== "string" || !name.trim() || typeof classId !== "string" || !classId || typeof teacherId !== "string" || !teacherId) {
    return NextResponse.json({ error: "bad_request", message: "Name, class, and teacher are required." }, { status: 400 });
  }

  const existingChildren = await getCollection<Child>("children");
  const child: Child = {
    id: newId("child"),
    name: name.trim(),
    photoColor: pickColor(existingChildren.length),
    age: typeof body.age === "number" ? body.age : 0,
    birthday: typeof body.birthday === "string" ? body.birthday : "",
    classId,
    teacherId,
    enrollmentDate: new Date().toISOString().slice(0, 10),
    guardians: Array.isArray(body.guardians) ? (body.guardians as Guardian[]) : [],
    address: typeof body.address === "string" ? body.address : undefined,
    allergies: typeof body.allergies === "string" ? body.allergies : undefined,
    artwork: [],
    albums: [],
    videos: [],
    documents: [],
    milestones: [],
    observations: [],
    attendanceRate: 100,
  };
  await putEntity("children", child);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Added child portfolio", target: child.name, date: new Date().toISOString() },
    200
  );
  await appendFeed<Notification>(
    "notifications",
    {
      id: newId("n"),
      title: "New child portfolio",
      description: `${child.name} was added to the ministry.`,
      date: new Date().toISOString(),
      read: false,
      type: "portfolio",
      href: `/children/${child.id}`,
    },
    100
  );

  return NextResponse.json(child);
}
