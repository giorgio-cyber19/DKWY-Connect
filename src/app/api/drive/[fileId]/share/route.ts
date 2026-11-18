import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { ensureFileShareable, DriveNotConnectedError } from "@/lib/google-drive";

/** Ensures the file is link-shareable (view + edit), then hands back its Drive
 * preview URL — from there Google's own UI offers "Open with Google Sheets/Docs". */
export async function POST(request: Request, ctx: RouteContext<"/api/drive/[fileId]/share">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { fileId } = await ctx.params;
  const body = await request.json().catch(() => null);
  // "sheet" / "doc": open straight in Google Sheets / Docs (they edit uploaded Excel and Word files in place);
  // otherwise the file's Drive page.
  const kind = body?.kind;
  const url =
    kind === "sheet"
      ? `https://docs.google.com/spreadsheets/d/${fileId}/edit`
      : kind === "doc"
        ? `https://docs.google.com/document/d/${fileId}/edit`
        : `https://drive.google.com/file/d/${fileId}/view`;
  try {
    await ensureFileShareable(fileId, "writer");
    return NextResponse.json({ url });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    console.error("Failed to prepare Drive share link:", err);
    return NextResponse.json({ error: "share_failed", message: "Couldn't open this file in Google's editor." }, { status: 502 });
  }
}
