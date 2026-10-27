"use client";

/** Helpers for drag-and-drop uploads: files, and whole folders dropped from the desktop. */

export interface DroppedFolder {
  name: string;
  files: File[];
}

export interface DroppedContent {
  /** Files dropped directly. */
  files: File[];
  /** Folders dropped, each flattened to every file inside it (libraries are flat). */
  folders: DroppedFolder[];
}

/** True only for drags that carry files from the computer (not text, links or in-page drags). */
export function hasDraggedFiles(dt: DataTransfer | null): boolean {
  return !!dt && Array.from(dt.types ?? []).includes("Files");
}

function fileFromEntry(entry: FileSystemFileEntry): Promise<File | null> {
  return new Promise((resolve) => entry.file((f) => resolve(f), () => resolve(null)));
}

async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const all: FileSystemEntry[] = [];
  // readEntries returns results in batches; keep asking until it comes back empty.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => reader.readEntries(resolve, () => resolve([])));
    if (batch.length === 0) break;
    all.push(...batch);
  }
  return all;
}

async function collectFiles(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await fileFromEntry(entry as FileSystemFileEntry);
    if (file) out.push(file);
  } else if (entry.isDirectory) {
    for (const child of await readAllEntries((entry as FileSystemDirectoryEntry).createReader())) await collectFiles(child, out);
  }
}

/**
 * Reads what was dropped. Must be called straight away inside the drop handler: browsers invalidate the
 * DataTransfer once the handler yields, so everything is captured synchronously before the first `await`.
 */
export async function readDroppedContent(dt: DataTransfer): Promise<DroppedContent> {
  const plainFiles = Array.from(dt.files);
  const entries = Array.from(dt.items ?? [])
    .filter((item) => item.kind === "file")
    .map((item) => item.webkitGetAsEntry?.() ?? null);

  // Browsers without the directory API: just the files.
  if (entries.length === 0 || entries.every((e) => e === null)) return { files: plainFiles, folders: [] };

  const result: DroppedContent = { files: [], folders: [] };
  for (const entry of entries) {
    if (!entry) continue;
    if (entry.isDirectory) {
      const files: File[] = [];
      await collectFiles(entry, files);
      result.folders.push({ name: entry.name, files });
    } else {
      const file = await fileFromEntry(entry as FileSystemFileEntry);
      if (file) result.files.push(file);
    }
  }
  return result;
}
