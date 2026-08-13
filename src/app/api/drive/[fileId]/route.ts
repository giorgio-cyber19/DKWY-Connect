import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { deleteFileFromDrive, renameFileInDrive, DriveNotConnectedError } from "@/lib/google-drive";

export async function DELETE(request: NextRequest, ctx: RouteContext<"/api/drive/[fileId]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { fileId } = await ctx.params;
  try {
    await deleteFileFromDrive(fileId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    console.error("Drive delete failed:", err);
    return NextResponse.json({ error: "delete_failed" }, { status: 502 });
  }
}

export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/drive/[fileId]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = body?.name;
  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "bad_request", message: "A new name is required." }, { status: 400 });
  }

  const { fileId } = await ctx.params;
  try {
    const file = await renameFileInDrive(fileId, name.trim());
    return NextResponse.json(file);
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    console.error("Drive rename failed:", err);
    return NextResponse.json({ error: "rename_failed" }, { status: 502 });
  }
}
