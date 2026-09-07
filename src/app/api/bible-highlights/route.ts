import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getHighlights, saveHighlights, removeHighlights } from "@/lib/bible-highlights";

const HEX_COLOR_REGEX = /^[0-9a-f]{6}$/i;

export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  return NextResponse.json({ highlights: await getHighlights(claims.userId) });
}

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { versionId, book, chapter, verses, passageIds, color, reference } = body ?? {};

  if (
    typeof versionId !== "number" ||
    typeof book !== "string" ||
    !book ||
    typeof chapter !== "string" ||
    !chapter ||
    !Array.isArray(verses) ||
    !Array.isArray(passageIds) ||
    verses.length === 0 ||
    verses.length !== passageIds.length ||
    !verses.every((v) => typeof v === "number") ||
    !passageIds.every((p) => typeof p === "string" && p) ||
    typeof color !== "string" ||
    !HEX_COLOR_REGEX.test(color) ||
    typeof reference !== "string" ||
    !reference
  ) {
    return NextResponse.json({ error: "bad_request", message: "That highlight couldn't be saved." }, { status: 400 });
  }

  const entries = passageIds.map((passageId: string, i: number) => ({
    versionId,
    passageId,
    book,
    chapter,
    verse: verses[i],
    color: color.toLowerCase(),
    reference,
  }));

  const highlights = await saveHighlights(claims.userId, entries);
  return NextResponse.json({ highlights });
}

export async function DELETE(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const { versionId, passageIds } = body ?? {};

  if (typeof versionId !== "number" || !Array.isArray(passageIds) || passageIds.length === 0 || !passageIds.every((p) => typeof p === "string" && p)) {
    return NextResponse.json({ error: "bad_request", message: "Nothing to remove." }, { status: 400 });
  }

  const highlights = await removeHighlights(
    claims.userId,
    passageIds.map((passageId: string) => ({ versionId, passageId }))
  );
  return NextResponse.json({ highlights });
}
