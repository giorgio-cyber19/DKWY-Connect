import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId } from "@/lib/db";
import type { AgeGroup } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can create age groups." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const range = body?.range;
  if (typeof name !== "string" || !name.trim() || typeof range !== "string" || !range.trim()) {
    return NextResponse.json({ error: "bad_request", message: "Name and age range are required." }, { status: 400 });
  }

  const ageGroup: AgeGroup = { id: newId("ag"), name: name.trim(), range: range.trim() };
  await putEntity("ageGroups", ageGroup);
  return NextResponse.json(ageGroup);
}
