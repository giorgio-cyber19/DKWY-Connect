import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { listFolderFiles, DriveNotConnectedError, type DriveCategory } from "@/lib/google-drive";

const VALID_CATEGORIES: DriveCategory[] = ["media", "documents", "lessons", "children", "encouragements"];

export async function GET(request: NextRequest, ctx: RouteContext<"/api/drive/folder/[category]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { category } = await ctx.params;
  if (!VALID_CATEGORIES.includes(category as DriveCategory)) {
    return NextResponse.json({ error: "bad_request", message: "Unknown category." }, { status: 400 });
  }

  const childId = request.nextUrl.searchParams.get("childId") ?? undefined;

  try {
    const files = await listFolderFiles(category as DriveCategory, childId);
    return NextResponse.json({ files });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    console.error("Drive folder listing failed:", err);
    return NextResponse.json({ error: "list_failed" }, { status: 502 });
  }
}
