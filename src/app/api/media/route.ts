import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { putEntity, newId } from "@/lib/db";
import type { MediaItem } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "bad_request", message: "A file name is required." }, { status: 400 });
  }

  const media: MediaItem = { ...body, id: newId("med"), uploadedAt: new Date().toISOString().slice(0, 10) };
  await putEntity("mediaItems", media);
  return NextResponse.json(media);
}
