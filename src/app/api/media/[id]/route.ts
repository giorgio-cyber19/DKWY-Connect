import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, deleteEntity } from "@/lib/db";
import { deleteFileFromDrive } from "@/lib/google-drive";
import type { MediaItem } from "@/lib/types";

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
