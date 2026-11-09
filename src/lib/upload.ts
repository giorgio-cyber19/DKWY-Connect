"use client";

import { useAppStore } from "./store";
import { formatFileBytes } from "./format-bytes";
import { uploadTracker, type UploadKind } from "./upload-tracker";

export interface DriveUploadResult {
  fileId: string;
  name: string;
  viewUrl: string;
  size: string;
  mimeType: string;
}

export class DriveNotConfiguredError extends Error {}
export class NotSignedInError extends Error {}

function sessionToken(): string {
  const token = useAppStore.getState().sessionToken;
  if (!token) throw new NotSignedInError("You need to be signed in to upload files.");
  return token;
}

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${sessionToken()}` };
}

/**
 * PUTs one chunk with XMLHttpRequest — unlike fetch(), it reports how many bytes have left the browser,
 * which is what drives the progress bar.
 */
function putChunk(url: string, chunk: Blob, onProgress: (sent: number) => void): Promise<{ ok: boolean; status: number; data: Record<string, unknown> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Authorization", `Bearer ${sessionToken()}`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded);
    };
    xhr.onload = () => {
      let data: Record<string, unknown> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* an empty or non-JSON body is treated like fetch(...).json() failing: no details */
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, data });
    };
    xhr.onerror = () => reject(new Error("Upload to Google Drive failed. Check your connection and try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(chunk);
  });
}

// A multiple of 256KB (Google's chunk-size requirement) and comfortably under
// Vercel's hard 4.5MB serverless function request body limit.
const CHUNK_SIZE = 4 * 1024 * 1024;

/**
 * Chunked upload: our server starts a Drive resumable-upload session (a tiny
 * JSON request), then the browser sends the file to our own server in
 * CHUNK_SIZE pieces, each well under Vercel's body limit — our server relays
 * each piece to Google's session URL itself (a plain server-to-server fetch,
 * unaffected by the browser CORS restriction that blocks PUTting straight
 * from the browser to Google's upload domain). This removes the practical
 * file-size limit: total size is no longer bounded by any single request's
 * body, only by how many chunks get sent.
 */
async function chunkedUpload(file: File | Blob, uploadUrl: string, onProgress: (sent: number) => void): Promise<Record<string, unknown>> {
  let start = 0;
  let driveFile: Record<string, unknown> | null = null;

  while (start < file.size || file.size === 0) {
    const chunk = file.slice(start, start + CHUNK_SIZE);
    const params = new URLSearchParams({ sessionUrl: uploadUrl, start: String(start), total: String(file.size) });
    const chunkStart = start;
    const chunkRes = await putChunk(`/api/drive/upload-chunk?${params}`, chunk, (sent) => onProgress(chunkStart + sent));
    const chunkData = chunkRes.data;

    if (!chunkRes.ok) {
      if (chunkRes.status === 401) throw new NotSignedInError((chunkData.message as string) || "Please sign in again.");
      throw new Error((chunkData.message as string) || "Upload to Google Drive failed. Please try again.");
    }
    if (chunkData.done) {
      driveFile = chunkData.file as Record<string, unknown>;
      break;
    }
    start += chunk.size;
    onProgress(start);
  }

  if (!driveFile) throw new Error("Upload to Google Drive failed. Please try again.");
  return driveFile;
}

/** Runs `work` while showing it in the global upload progress panel. */
async function tracked<T>(name: string, total: number, kind: UploadKind, work: (report: (sent: number) => void) => Promise<T>): Promise<T> {
  const id = uploadTracker.start(name, total, kind);
  try {
    const result = await work((sent) => uploadTracker.progress(id, sent));
    uploadTracker.finish(id);
    return result;
  } catch (err) {
    uploadTracker.fail(id);
    throw err;
  }
}

export function uploadToDrive(
  file: File,
  category: "media" | "documents" | "lessons" | "children" | "encouragements",
  childId?: string,
  parentFolderId?: string
): Promise<DriveUploadResult> {
  return tracked(file.name, file.size, "upload", (report) => doUploadToDrive(file, category, childId, parentFolderId, report));
}

async function doUploadToDrive(
  file: File,
  category: "media" | "documents" | "lessons" | "children" | "encouragements",
  childId: string | undefined,
  parentFolderId: string | undefined,
  report: (sent: number) => void
): Promise<DriveUploadResult> {
  const sessionRes = await fetch("/api/drive/upload-session", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      category,
      childId,
      parentFolderId,
    }),
  });
  const sessionData = await sessionRes.json().catch(() => ({}));

  if (!sessionRes.ok) {
    if (sessionData.error === "not_configured") throw new DriveNotConfiguredError(sessionData.message);
    if (sessionRes.status === 401) throw new NotSignedInError(sessionData.message || "Please sign in again.");
    throw new Error(sessionData.message || "Upload failed. Please try again.");
  }

  const driveFile = await chunkedUpload(file, sessionData.uploadUrl, report);

  return {
    fileId: driveFile.id as string,
    name: (driveFile.name as string) ?? file.name,
    viewUrl: (driveFile.webViewLink as string) ?? `https://drive.google.com/file/d/${driveFile.id}/view`,
    size: driveFile.size ? formatFileBytes(Number(driveFile.size)) : formatFileBytes(file.size),
    mimeType: (driveFile.mimeType as string) ?? file.type,
  };
}

/** Saves new bytes over an existing Drive file (same fileId, same name/location) —
 * used to save edits (e.g. a spreadsheet) back to the file they were opened from. */
export function updateFileInDrive(fileId: string, blob: Blob, mimeType: string, name = "Spreadsheet"): Promise<DriveUploadResult> {
  return tracked(name, blob.size, "save", (report) => doUpdateFileInDrive(fileId, blob, mimeType, report));
}

async function doUpdateFileInDrive(fileId: string, blob: Blob, mimeType: string, report: (sent: number) => void): Promise<DriveUploadResult> {
  const sessionRes = await fetch("/api/drive/update-session", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, mimeType, size: blob.size }),
  });
  const sessionData = await sessionRes.json().catch(() => ({}));

  if (!sessionRes.ok) {
    if (sessionData.error === "not_configured") throw new DriveNotConfiguredError(sessionData.message);
    if (sessionRes.status === 401) throw new NotSignedInError(sessionData.message || "Please sign in again.");
    throw new Error(sessionData.message || "Save failed. Please try again.");
  }

  const driveFile = await chunkedUpload(blob, sessionData.uploadUrl, report);

  return {
    fileId: (driveFile.id as string) ?? fileId,
    name: driveFile.name as string,
    viewUrl: (driveFile.webViewLink as string) ?? `https://drive.google.com/file/d/${fileId}/view`,
    size: driveFile.size ? formatFileBytes(Number(driveFile.size)) : formatFileBytes(blob.size),
    mimeType: (driveFile.mimeType as string) ?? mimeType,
  };
}

export async function deleteFromDrive(fileId: string): Promise<void> {
  const res = await fetch(`/api/drive/${fileId}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.message || "Delete failed.");
  }
}

export async function renameInDrive(fileId: string, name: string): Promise<DriveUploadResult> {
  const res = await fetch(`/api/drive/${fileId}`, {
    method: "PATCH",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Rename failed.");
  return data as DriveUploadResult;
}

/** Builds an authenticated download/view URL — the token travels as a query
 * param since this is meant for plain <a href> links, not fetch() calls. */
export function driveDownloadUrl(fileId: string): string {
  const token = useAppStore.getState().sessionToken;
  const params = token ? `?token=${encodeURIComponent(token)}` : "";
  return `/api/drive/download/${fileId}${params}`;
}

/** Makes the file link-shareable (anyone with the link can view + edit) and returns
 * its Drive preview URL, from which Google's own UI offers "Open with Google Sheets/Docs". */
export async function openInGoogleEditor(fileId: string): Promise<string> {
  const res = await fetch(`/api/drive/${fileId}/share`, { method: "POST", headers: authHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === "not_configured") throw new DriveNotConfiguredError(data.message);
    if (res.status === 401) throw new NotSignedInError(data.message || "Please sign in again.");
    throw new Error(data.message || "Couldn't open this file in Google's editor.");
  }
  return data.url as string;
}
