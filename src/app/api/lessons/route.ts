import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId, appendFeed } from "@/lib/db";
import type { LessonPlan, AuditLogEntry, Notification } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.title !== "string" || !body.title.trim()) {
    return NextResponse.json({ error: "bad_request", message: "A lesson title is required." }, { status: 400 });
  }

  const lesson: LessonPlan = {
    ...body,
    id: newId("lesson"),
    authorId: claims.userId,
    updatedAt: new Date().toISOString().slice(0, 10),
    versions: 1,
  };
  await putEntity("lessons", lesson);

  if (lesson.status === "published") {
    await appendFeed<AuditLogEntry>(
      "auditLog",
      { id: newId("al"), actor: claims.name, action: "Published lesson plan", target: lesson.title, date: new Date().toISOString() },
      200
    );
    await appendFeed<Notification>(
      "notifications",
      {
        id: newId("n"),
        title: "New lesson plan published",
        description: `"${lesson.title}" was published by ${claims.name}.`,
        date: new Date().toISOString(),
        read: false,
        type: "lesson",
        href: `/lessons/${lesson.id}`,
      },
      100
    );
  }

  return NextResponse.json(lesson);
}
