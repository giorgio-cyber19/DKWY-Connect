import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity } from "@/lib/db";
import { deleteFileFromDrive } from "@/lib/google-drive";
import type { DocumentItem } from "@/lib/types";

/** Called after a successful save-back-to-Drive (e.g. editing a spreadsheet) to
 * refresh the size shown in the file list — the file's identity/location don't change. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const doc = await getEntity<DocumentItem>("documentItems", id);
  if (!doc) return NextResponse.json({ error: "not_found", message: "That document no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const size = typeof body?.size === "string" ? body.size : doc.size;

  const updated: DocumentItem = { ...doc, size };
  await putEntity("documentItems", updated);
  return NextResponse.json(updated);
}

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
