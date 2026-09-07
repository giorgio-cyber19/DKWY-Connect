import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId } from "@/lib/db";
import type { Holiday } from "@/lib/types";

const VALID_TYPES: Holiday["type"][] = ["school_vacation", "national_holiday"];

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const type = body?.type;
  const startDate = typeof body?.startDate === "string" ? body.startDate : "";
  const endDate = typeof body?.endDate === "string" ? body.endDate : startDate;
  const schoolYear = typeof body?.schoolYear === "string" ? body.schoolYear.trim() : "";
  const provisional = body?.provisional === true;

  if (!name || !VALID_TYPES.includes(type) || !startDate || !endDate || !schoolYear) {
    return NextResponse.json(
      { error: "bad_request", message: "Name, type, start date, end date, and school year are required." },
      { status: 400 }
    );
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "bad_request", message: "The end date can't be before the start date." }, { status: 400 });
  }

  const holiday: Holiday = { id: newId("hol"), name, type, startDate, endDate, provisional, schoolYear };
  await putEntity("holidays", holiday);
  return NextResponse.json(holiday);
}
