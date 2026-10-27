import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity } from "@/lib/db";
import { deleteFileFromDrive, renameFileInDrive } from "@/lib/google-drive";
import { validateRename } from "@/lib/file-name";
import { driveRenameFailure } from "@/lib/drive-http";
import type { MediaItem } from "@/lib/types";

/** Rename: renamed in Google Drive first, and only if that succeeds is the app's record updated. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const item = await getEntity<MediaItem>("mediaItems", id);
  if (!item) return NextResponse.json({ error: "not_found", message: "That file no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (typeof body?.name !== "string") return NextResponse.json({ error: "bad_request", message: "A new name is required." }, { status: 400 });

  const check = validateRename(body.name, item.name);
  if (!check.ok) return NextResponse.json({ error: check.code, message: check.message }, { status: 400 });

  let finalName = check.name;
  if (check.name !== item.name) {
    if (item.driveFileId) {
      try {
        const file = await renameFileInDrive(item.driveFileId, check.name);
        finalName = file.name || check.name;
      } catch (err) {
        return driveRenameFailure(err);
      }
    }
    await putEntity("mediaItems", { ...item, name: finalName });
  }
  return NextResponse.json({ ...item, name: finalName });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/media/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const item = await getEntity<MediaItem>("mediaItems", id);
  if (!item) return NextResponse.json({ error: "not_found", message: "That file no longer exists." }, { status: 404 });

  if (item.driveFileId) {
    try {
      await deleteFileFromDrive(item.driveFileId);
    } catch (err) {
      console.error("Failed to delete Drive file:", err);
    }
  }

  await deleteEntity("mediaItems", id);
  return NextResponse.json({ ok: true });
}
