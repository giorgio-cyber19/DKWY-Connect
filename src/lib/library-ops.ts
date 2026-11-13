import "server-only";
import { NextResponse } from "next/server";
import { getCollection, getEntity, putEntity, deleteEntity, newId } from "./db";
import { isDriveConnected, categoryRootDriveFolder, moveDriveItem, copyFileInDrive, createCategorySubfolder, deleteFileFromDrive } from "./google-drive";
import { copyName, canMoveFolderInto, descendantIds, folderDepth, hasSiblingNamed, MAX_FOLDER_DEPTH, subtreeHeight } from "./library-folders";
import type { DocumentItem, LibraryFolder, MediaItem } from "./types";

/** Server-side moving and copying of library files and folders (shared by Documents and Media). */

export type Library = "documents" | "media";
type LibraryItem = DocumentItem | MediaItem;

const ITEM_ENTITY = { documents: "documentItems", media: "mediaItems" } as const;
const ITEM_PREFIX = { documents: "d", media: "med" } as const;

/** Copying a folder copies every file in it one by one inside a single request, so keep it bounded. */
export const MAX_FILES_PER_FOLDER_COPY = 80;

const fail = (status: number, error: string, message: string) => NextResponse.json({ error, message }, { status });

export async function loadFolders(library: Library): Promise<LibraryFolder[]> {
  return (await getCollection<LibraryFolder>("libraryFolders")).filter((f) => f.library === library);
}

/** The folder a thing is being moved/copied into: null = top level. A missing folder is a 404 response. */
export async function resolveTarget(folders: LibraryFolder[], folderId: unknown): Promise<{ folder: LibraryFolder | null } | { response: NextResponse }> {
  if (folderId === null || folderId === undefined || folderId === "") return { folder: null };
  if (typeof folderId !== "string") return { response: fail(400, "bad_request", "Choose a destination folder.") };
  const folder = folders.find((f) => f.id === folderId);
  if (!folder) return { response: fail(404, "not_found", "That folder no longer exists.") };
  return { folder };
}

/** The Drive folder a file/folder should live in for \`target\` (null = the library's top level); undefined if Drive isn't available. */
async function driveParent(library: Library, target: LibraryFolder | null): Promise<string | undefined> {
  if (!(await isDriveConnected())) return undefined;
  if (target?.driveFolderId) return target.driveFolderId;
  try {
    return await categoryRootDriveFolder(library);
  } catch (err) {
    console.error("Couldn't resolve the Drive folder for the library root:", err);
    return undefined;
  }
}

/** Keeps Google Drive's own folder structure in step with a move. The app's records are the source of truth, so a Drive hiccup doesn't block the move. */
export async function moveInDrive(library: Library, driveId: string | undefined, target: LibraryFolder | null): Promise<void> {
  if (!driveId) return;
  try {
    const parent = await driveParent(library, target);
    if (parent) await moveDriveItem(driveId, parent);
  } catch (err) {
    console.error("Failed to move the Drive item (the app's records were still updated):", err);
  }
}

/** Moves one file record into `target`. */
export async function moveItem(library: Library, item: LibraryItem, target: LibraryFolder | null): Promise<LibraryItem> {
  await moveInDrive(library, item.driveFileId, target);
  const moved = { ...item, folderId: target?.id ?? null };
  await putEntity(ITEM_ENTITY[library], moved);
  return moved;
}

/** Copies one file (record + an independent copy in Drive) into `target`. Nothing is created if the Drive copy fails. */
export async function copyItem(library: Library, item: LibraryItem, target: LibraryFolder | null, uploadedBy: string, name: string): Promise<LibraryItem> {
  let driveFileId = item.driveFileId;
  let driveViewUrl = item.driveViewUrl;
  let size = item.size;
  if (item.driveFileId) {
    const parent = await driveParent(library, target);
    if (!parent) throw new CopyFailure("not_configured", "Google Drive isn't connected, so this file can't be copied.", 503);
    try {
      const file = await copyFileInDrive(item.driveFileId, name, parent);
      driveFileId = file.fileId;
      driveViewUrl = file.viewUrl;
      if (file.size && file.size !== "—") size = file.size;
    } catch (err) {
      console.error("Drive copy failed:", err);
      throw new CopyFailure("copy_failed", "Google Drive couldn't copy the file. Nothing was changed.", 502);
    }
  }
  const now = new Date().toISOString();
  const copy = { ...item, id: newId(ITEM_PREFIX[library]), name, folderId: target?.id ?? null, driveFileId, driveViewUrl, size, uploadedBy, uploadedAt: now.slice(0, 10), modifiedAt: now } as LibraryItem;
  await putEntity(ITEM_ENTITY[library], copy);
  return copy;
}

export class CopyFailure extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
  }
}

export function failureResponse(err: unknown): NextResponse {
  if (err instanceof CopyFailure) return fail(err.status, err.code, err.message);
  console.error("Library operation failed:", err);
  return fail(500, "copy_failed", "Something went wrong. Please try again.");
}

/** Names of the files currently inside a folder (for picking a free " - Copy" name). */
export async function fileNamesIn(library: Library, folderId: string | null): Promise<string[]> {
  const items = await getCollection<LibraryItem>(ITEM_ENTITY[library]);
  return items.filter((i) => (i.folderId ?? null) === folderId).map((i) => i.name);
}

export async function getItem(library: Library, id: string): Promise<LibraryItem | null> {
  return getEntity<LibraryItem>(ITEM_ENTITY[library], id);
}

/** Moves a folder (with everything in it) under `target`. Returns an error response if the move isn't allowed. */
export async function moveFolder(library: Library, folder: LibraryFolder, folders: LibraryFolder[], target: LibraryFolder | null): Promise<LibraryFolder | NextResponse> {
  if (!canMoveFolderInto(folders, folder.id, target?.id ?? null)) {
    return fail(400, "invalid_move", "A folder can't be moved into itself or one of its own subfolders.");
  }
  if (target && folderDepth(folders, target.id) + subtreeHeight(folders, folder.id) > MAX_FOLDER_DEPTH) {
    return fail(400, "folder_too_deep", "Folders can't be nested any deeper.");
  }
  if (hasSiblingNamed(folders, target?.id ?? null, folder.name, folder.id)) {
    return fail(409, "folder_exists", "A folder with that name already exists there.");
  }
  await moveInDrive(library, folder.driveFolderId, target);
  const moved: LibraryFolder = { ...folder, parentId: target?.id ?? null };
  await putEntity("libraryFolders", moved);
  return moved;
}

export interface FolderCopyResult {
  folders: LibraryFolder[];
  items: LibraryItem[];
}

/** Copies a folder, its subfolders and all their files under `target`. */
export async function copyFolder(library: Library, folder: LibraryFolder, folders: LibraryFolder[], target: LibraryFolder | null, userId: string): Promise<FolderCopyResult | NextResponse> {
  if (!canMoveFolderInto(folders, folder.id, target?.id ?? null)) {
    return fail(400, "invalid_move", "A folder can't be copied into itself or one of its own subfolders.");
  }
  if (target && folderDepth(folders, target.id) + subtreeHeight(folders, folder.id) > MAX_FOLDER_DEPTH) {
    return fail(400, "folder_too_deep", "Folders can't be nested any deeper.");
  }

  const subtreeIds = [folder.id, ...descendantIds(folders, folder.id)];
  const inSubtree = new Set(subtreeIds);
  const allItems = await getCollection<LibraryItem>(ITEM_ENTITY[library]);
  const filesToCopy = allItems.filter((i) => i.folderId && inSubtree.has(i.folderId));
  if (filesToCopy.length > MAX_FILES_PER_FOLDER_COPY) {
    return fail(400, "too_many_files", `This folder holds more than ${MAX_FILES_PER_FOLDER_COPY} files, which is too many to copy at once. Copy its subfolders separately.`);
  }

  const siblings = folders.filter((f) => (f.parentId ?? null) === (target?.id ?? null)).map((f) => f.name);
  const rootName = copyName(folder.name, siblings, true);
  const driveOn = await isDriveConnected();
  const createdFolders: LibraryFolder[] = [];
  const idMap = new Map<string, LibraryFolder>();

  // Folders first, parents before children.
  const queue: { source: LibraryFolder; parent: LibraryFolder | null; name: string }[] = [{ source: folder, parent: target, name: rootName }];
  try {
    while (queue.length) {
      const { source, parent, name } = queue.shift()!;
      let driveFolderId: string | undefined;
      if (driveOn) {
        try {
          driveFolderId = await createCategorySubfolder(library, name, parent?.driveFolderId);
        } catch (err) {
          console.error("Failed to create the Drive subfolder for a copy:", err);
        }
      }
      const created: LibraryFolder = { id: newId("fld"), name, library, parentId: parent?.id ?? null, driveFolderId, createdBy: userId, createdAt: new Date().toISOString() };
      await putEntity("libraryFolders", created);
      createdFolders.push(created);
      idMap.set(source.id, created);
      for (const child of folders.filter((f) => f.parentId === source.id)) queue.push({ source: child, parent: created, name: child.name });
    }

    // Then the files, a few at a time.
    const createdItems: LibraryItem[] = [];
    let next = 0;
    async function worker() {
      while (next < filesToCopy.length) {
        const item = filesToCopy[next++];
        const destination = idMap.get(item.folderId!)!;
        createdItems.push(await copyItem(library, item, destination, userId, item.name));
      }
    }
    try {
      await Promise.all([worker(), worker(), worker(), worker()]);
    } catch (err) {
      // Leave no half-finished copy behind: undo the files that were already copied, then the folders.
      for (const done of createdItems) {
        if (done.driveFileId) await deleteFileFromDrive(done.driveFileId).catch(() => undefined); // the Drive copy made for this record
        await deleteEntity(ITEM_ENTITY[library], done.id);
      }
      throw err;
    }
    return { folders: createdFolders, items: createdItems };
  } catch (err) {
    for (const created of createdFolders) await deleteEntity("libraryFolders", created.id);
    return failureResponse(err);
  }
}
