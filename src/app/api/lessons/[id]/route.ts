import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity } from "@/lib/db";
import type { LessonPlan } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/lessons/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const lesson = await getEntity<LessonPlan>("lessons", id);
  if (!lesson) return NextResponse.json({ error: "not_found", message: "That lesson no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const updated: LessonPlan = { ...lesson, ...body, updatedAt: new Date().toISOString().slice(0, 10), versions: lesson.versions + 1 };
  await putEntity("lessons", updated);
  return NextResponse.json(updated);
}
