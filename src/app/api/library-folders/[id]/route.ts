import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getCollection, getEntity, putEntity, deleteEntity } from "@/lib/db";
import { renameFolderInDrive } from "@/lib/google-drive";
import { descendantIds, hasSiblingNamed } from "@/lib/library-folders";
import { loadFolders, moveFolder, resolveTarget } from "@/lib/library-ops";
import type { LibraryFolder, DocumentItem, MediaItem } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/library-folders/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const folder = await getEntity<LibraryFolder>("libraryFolders", id);
  if (!folder) return NextResponse.json({ error: "not_found", message: "That folder no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);

  // { parentId } -> move the folder (and everything in it) into another folder; null = top level.
  if (body && "parentId" in body && !("name" in body)) {
    const folders = await loadFolders(folder.library);
    const target = await resolveTarget(folders, body.parentId);
    if ("response" in target) return target.response;
    const moved = await moveFolder(folder.library, folder, folders, target.folder);
    return moved instanceof NextResponse ? moved : NextResponse.json(moved);
  }

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "bad_request", message: "A folder name is required." }, { status: 400 });

  const existing = await getCollection<LibraryFolder>("libraryFolders");
  if (hasSiblingNamed(existing.filter((f) => f.library === folder.library), folder.parentId ?? null, name, id)) {
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

  // Deliberately doesn't delete the Drive subfolders or the files in them — only our own
  // grouping. The folder's subfolders go with it; every file inside moves back to the library
  // root, so nothing is lost.
  const all = await getCollection<LibraryFolder>("libraryFolders");
  const subfolderIds = descendantIds(all.filter((f) => f.library === folder.library), id);
  const removedIds = new Set([id, ...subfolderIds]);
  if (folder.library === "documents") {
    const docs = await getCollection<DocumentItem>("documentItems");
    for (const doc of docs.filter((d) => d.folderId && removedIds.has(d.folderId))) await putEntity("documentItems", { ...doc, folderId: null });
  } else {
    const items = await getCollection<MediaItem>("mediaItems");
    for (const item of items.filter((m) => m.folderId && removedIds.has(m.folderId))) await putEntity("mediaItems", { ...item, folderId: null });
  }

  for (const subId of subfolderIds) await deleteEntity("libraryFolders", subId);
  await deleteEntity("libraryFolders", id);
  return NextResponse.json({ ok: true });
}
