import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, deleteEntity } from "@/lib/db";
import { deleteFileFromDrive } from "@/lib/google-drive";
import type { DocumentItem } from "@/lib/types";

export async function DELETE(request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const doc = await getEntity<DocumentItem>("documentItems", id);
  if (!doc) return NextResponse.json({ error: "not_found", message: "That document no longer exists." }, { status: 404 });

  if (doc.driveFileId) {
    try {
      await deleteFileFromDrive(doc.driveFileId);
    } catch (err) {
      console.error("Failed to delete Drive file:", err);
    }
  }

  await deleteEntity("documentItems", id);
  return NextResponse.json({ ok: true });
}
