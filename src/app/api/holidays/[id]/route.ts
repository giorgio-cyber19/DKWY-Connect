import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity } from "@/lib/db";
import type { Holiday } from "@/lib/types";

const VALID_TYPES: Holiday["type"][] = ["school_vacation", "national_holiday"];

export async function PATCH(request: Request, ctx: RouteContext<"/api/holidays/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const holiday = await getEntity<Holiday>("holidays", id);
  if (!holiday) return NextResponse.json({ error: "not_found", message: "That holiday no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : holiday.name;
  const type = VALID_TYPES.includes(body?.type) ? body.type : holiday.type;
  const startDate = typeof body?.startDate === "string" ? body.startDate : holiday.startDate;
  const endDate = typeof body?.endDate === "string" ? body.endDate : holiday.endDate;
  const schoolYear = typeof body?.schoolYear === "string" ? body.schoolYear.trim() : holiday.schoolYear;
  const provisional = typeof body?.provisional === "boolean" ? body.provisional : holiday.provisional;

  if (!name || !startDate || !endDate || !schoolYear) {
    return NextResponse.json({ error: "bad_request", message: "Name, dates, and school year are required." }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "bad_request", message: "The end date can't be before the start date." }, { status: 400 });
  }

  const updated: Holiday = { ...holiday, name, type, startDate, endDate, schoolYear, provisional };
  await putEntity("holidays", updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/holidays/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  await deleteEntity("holidays", id);
  return NextResponse.json({ ok: true });
}
