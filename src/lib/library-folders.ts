import type { LibraryFolder } from "./types";

/** Deepest allowed nesting (a root folder is depth 1) — keeps paths and Drive trees sane. */
export const MAX_FOLDER_DEPTH = 8;

type FolderLike = Pick<LibraryFolder, "id" | "name" | "parentId">;

export function childFolders<T extends FolderLike>(folders: T[], parentId: string | null): T[] {
  return folders.filter((f) => (f.parentId ?? null) === parentId);
}

/** Root → folder. Stops on a missing parent or a loop instead of spinning. */
export function folderPath<T extends FolderLike>(folders: T[], id: string | null): T[] {
  const path: T[] = [];
  const seen = new Set<string>();
  let current = id ? folders.find((f) => f.id === id) : undefined;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current = current.parentId ? folders.find((f) => f.id === current!.parentId) : undefined;
  }
  return path;
}

export function folderPathLabel(folders: FolderLike[], id: string | null): string {
  return folderPath(folders, id).map((f) => f.name).join(" / ");
}

/** Number of folders from the root down to (and including) `id`; 0 for the root itself. */
export function folderDepth(folders: FolderLike[], id: string | null): number {
  return folderPath(folders, id).length;
}

/** Every folder below `id`, at any depth (not including `id`). */
export function descendantIds(folders: FolderLike[], id: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>([id]);
  const queue = [id];
  while (queue.length) {
    const parent = queue.shift()!;
    for (const f of folders) {
      if (f.parentId === parent && !seen.has(f.id)) {
        seen.add(f.id);
        result.push(f.id);
        queue.push(f.id);
      }
    }
  }
  return result;
}

/** Folders may share a name across different parents, but not within the same one. */
export function hasSiblingNamed(folders: FolderLike[], parentId: string | null, name: string, exceptId?: string): boolean {
  const lower = name.toLowerCase();
  return folders.some((f) => f.id !== exceptId && (f.parentId ?? null) === parentId && f.name.toLowerCase() === lower);
}

/** Levels in the tree rooted at `id`, counting `id` itself (a folder without subfolders is 1). */
export function subtreeHeight(folders: FolderLike[], id: string): number {
  const seen = new Set<string>([id]);
  let level = [id];
  let height = 0;
  while (level.length) {
    height++;
    const next: string[] = [];
    for (const parent of level) {
      for (const f of folders) {
        if (f.parentId === parent && !seen.has(f.id)) {
          seen.add(f.id);
          next.push(f.id);
        }
      }
    }
    level = next;
  }
  return height;
}

/** Whether folder `id` may be moved into `targetId` (null = top level): not into itself or something below itself. */
export function canMoveFolderInto(folders: FolderLike[], id: string, targetId: string | null): boolean {
  if (targetId === null) return true;
  return targetId !== id && !descendantIds(folders, id).includes(targetId);
}

/** "Report.pdf" -> "Report - Copy.pdf" (then "Report - Copy 2.pdf", …) — the first name not in `taken` (case-insensitive). */
export function copyName(name: string, taken: Iterable<string>, isFolder = false): string {
  const used = new Set(Array.from(taken, (n) => n.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  const dot = isFolder ? -1 : name.lastIndexOf(".");
  const base = dot > 0 && dot < name.length - 1 ? name.slice(0, dot) : name;
  const ext = dot > 0 && dot < name.length - 1 ? name.slice(dot) : "";
  for (let n = 1; n < 1000; n++) {
    const candidate = `${base} - Copy${n === 1 ? "" : ` ${n}`}${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} - Copy ${Date.now()}${ext}`;
}
