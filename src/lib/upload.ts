"use client";

import { useAppStore } from "./store";

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

export async function uploadToDrive(
  file: File,
  category: "media" | "documents" | "lessons" | "children" | "encouragements",
  childId?: string
): Promise<DriveUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("category", category);
  if (childId) formData.append("childId", childId);

  const res = await fetch("/api/drive/upload", { method: "POST", headers: authHeaders(), body: formData });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (data.error === "not_configured") throw new DriveNotConfiguredError(data.message);
    if (res.status === 401) throw new NotSignedInError(data.message || "Please sign in again.");
    throw new Error(data.message || "Upload failed. Please try again.");
  }

  return data as DriveUploadResult;
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
