import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, deleteEntity } from "@/lib/db";
import { deleteFileFromDrive, renameFileInDrive } from "@/lib/google-drive";
import { validateRename } from "@/lib/file-name";
import { driveRenameFailure } from "@/lib/drive-http";
import type { DocumentItem } from "@/lib/types";

/**
 * { name }  -> rename: the file is renamed in Google Drive first, and only if that succeeds is the app's record updated,
 *              so the two can't drift apart.
 * { size }  -> called after a successful save-back-to-Drive (e.g. editing a spreadsheet) to refresh the size
 *              shown in the file list — the file's identity/location don't change.
 */
export async function PATCH(request: Request, ctx: RouteContext<"/api/documents/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const doc = await getEntity<DocumentItem>("documentItems", id);
  if (!doc) return NextResponse.json({ error: "not_found", message: "That document no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);

  if (typeof body?.name === "string") {
    const check = validateRename(body.name, doc.name);
    if (!check.ok) return NextResponse.json({ error: check.code, message: check.message }, { status: 400 });

    let finalName = check.name;
    if (check.name !== doc.name) {
      if (doc.driveFileId) {
        try {
          const file = await renameFileInDrive(doc.driveFileId, check.name);
          finalName = file.name || check.name;
        } catch (err) {
          return driveRenameFailure(err);
        }
      }
      await putEntity("documentItems", { ...doc, name: finalName });
    }
    return NextResponse.json({ ...doc, name: finalName });
  }

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
