import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getCollection, getEntity, putEntity, deleteEntity } from "@/lib/db";
import { renameFolderInDrive } from "@/lib/google-drive";
import type { LibraryFolder, DocumentItem, MediaItem } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/library-folders/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const folder = await getEntity<LibraryFolder>("libraryFolders", id);
  if (!folder) return NextResponse.json({ error: "not_found", message: "That folder no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "bad_request", message: "A folder name is required." }, { status: 400 });

  const existing = await getCollection<LibraryFolder>("libraryFolders");
  if (existing.some((f) => f.id !== id && f.library === folder.library && f.name.toLowerCase() === name.toLowerCase())) {
    return NextResponse.json({ error: "folder_exists", message: "A folder with that name already exists." }, { status: 409 });
  }

  if (folder.driveFolderId) {
    try {
      await renameFolderInDrive(folder.driveFolderId, name);
    } catch (err) {
      console.error("Failed to rename Drive folder:", err);
    }
  }

  const updated: LibraryFolder = { ...folder, name };
  await putEntity("libraryFolders", updated);
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/library-folders/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const folder = await getEntity<LibraryFolder>("libraryFolders", id);
  if (!folder) return NextResponse.json({ error: "not_found", message: "That folder no longer exists." }, { status: 404 });

  // Deliberately doesn't delete the folder's Drive subfolder or the files in it —
  // only our own grouping. Items move back to the library root; nothing is lost.
  if (folder.library === "documents") {
    const docs = await getCollection<DocumentItem>("documentItems");
    for (const doc of docs.filter((d) => d.folderId === id)) await putEntity("documentItems", { ...doc, folderId: null });
  } else {
    const items = await getCollection<MediaItem>("mediaItems");
    for (const item of items.filter((m) => m.folderId === id)) await putEntity("mediaItems", { ...item, folderId: null });
  }

  await deleteEntity("libraryFolders", id);
  return NextResponse.json({ ok: true });
}
