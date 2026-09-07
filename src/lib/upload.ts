"use client";

import { useAppStore } from "./store";
import { formatFileBytes } from "./format-bytes";

export interface DriveUploadResult {
  fileId: string;
  name: string;
  viewUrl: string;
  size: string;
  mimeType: string;
}

export class DriveNotConfiguredError extends Error {}
export class NotSignedInError extends Error {}

function authHeaders(): HeadersInit {
  const token = useAppStore.getState().sessionToken;
  if (!token) throw new NotSignedInError("You need to be signed in to upload files.");
  return { Authorization: `Bearer ${token}` };
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
export async function uploadToDrive(
  file: File,
  category: "media" | "documents" | "lessons" | "children" | "encouragements",
  childId?: string
): Promise<DriveUploadResult> {
  const sessionRes = await fetch("/api/drive/upload-session", {
    method: "POST",
    headers: { ...authHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mimeType: file.type || "application/octet-stream", size: file.size, category, childId }),
  });
  const sessionData = await sessionRes.json().catch(() => ({}));

  if (!sessionRes.ok) {
    if (sessionData.error === "not_configured") throw new DriveNotConfiguredError(sessionData.message);
    if (sessionRes.status === 401) throw new NotSignedInError(sessionData.message || "Please sign in again.");
    throw new Error(sessionData.message || "Upload failed. Please try again.");
  }

  const uploadUrl: string = sessionData.uploadUrl;
  let start = 0;
  let driveFile: Record<string, unknown> | null = null;

  while (start < file.size || file.size === 0) {
    const chunk = file.slice(start, start + CHUNK_SIZE);
    const params = new URLSearchParams({ sessionUrl: uploadUrl, start: String(start), total: String(file.size) });
    const chunkRes = await fetch(`/api/drive/upload-chunk?${params}`, {
      method: "PUT",
      headers: authHeaders(),
      body: chunk,
    });
    const chunkData = await chunkRes.json().catch(() => ({}));

    if (!chunkRes.ok) {
      if (chunkRes.status === 401) throw new NotSignedInError(chunkData.message || "Please sign in again.");
      throw new Error(chunkData.message || "Upload to Google Drive failed. Please try again.");
    }
    if (chunkData.done) {
      driveFile = chunkData.file;
      break;
    }
    start += chunk.size;
  }

  if (!driveFile) throw new Error("Upload to Google Drive failed. Please try again.");

  return {
    fileId: driveFile.id as string,
    name: (driveFile.name as string) ?? file.name,
    viewUrl: (driveFile.webViewLink as string) ?? `https://drive.google.com/file/d/${driveFile.id}/view`,
    size: driveFile.size ? formatFileBytes(Number(driveFile.size)) : formatFileBytes(file.size),
    mimeType: (driveFile.mimeType as string) ?? file.type,
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
