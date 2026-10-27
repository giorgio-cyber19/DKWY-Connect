/** Shared (client + server) rules for renaming library files. */

export const MAX_FILE_NAME_LENGTH = 180;

/** "Report.final.pdf" -> { base: "Report.final", ext: ".pdf" }. A leading dot (".hidden") or no dot means no extension. */
export function splitFileName(name: string): { base: string; ext: string } {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return { base: name, ext: "" };
  return { base: name.slice(0, dot), ext: name.slice(dot) };
}

export type RenameCheck =
  | { ok: true; name: string }
  | { ok: false; code: "invalid_file_name" | "extension_locked"; message: string };

/**
 * The extension is locked to the original (the file type is decided by it, and Google Drive uses it too):
 * the new name must end with the same extension; its casing is normalised to the original's.
 */
export function validateRename(requested: string, original: string): RenameCheck {
  const name = requested.replace(/\s+/g, " ").trim();
  const { ext: originalExt } = splitFileName(original);
  if (!name) return { ok: false, code: "invalid_file_name", message: "A file name is required." };

  let base = name;
  if (originalExt) {
    if (!name.toLowerCase().endsWith(originalExt.toLowerCase())) {
      return { ok: false, code: "extension_locked", message: `The file extension must stay ${originalExt}.` };
    }
    base = name.slice(0, name.length - originalExt.length).trim();
  }

  if (!base) return { ok: false, code: "invalid_file_name", message: "A file name is required." };
  if (/[\\/\u0000-\u001f]/.test(base)) return { ok: false, code: "invalid_file_name", message: "A file name can't contain slashes or control characters." };
  if (base.length + originalExt.length > MAX_FILE_NAME_LENGTH) {
    return { ok: false, code: "invalid_file_name", message: `A file name can be at most ${MAX_FILE_NAME_LENGTH} characters.` };
  }
  return { ok: true, name: base + originalExt };
}
