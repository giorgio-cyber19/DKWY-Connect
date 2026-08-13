import "server-only";
import { google, type Auth } from "googleapis";
import { Readable } from "node:stream";
import { encryptSecret, decryptSecret } from "./crypto";
import {
  getStoredRefreshToken,
  setStoredRefreshToken,
  clearStoredRefreshToken,
  getStoredRootFolderId,
  setStoredRootFolderId,
  isKvConfigured,
} from "./kv";

const REFRESH_TOKEN_CONTEXT = "google-drive-refresh-token";
const ROOT_FOLDER_NAME = "DWKY Connect Files";

const SUBFOLDERS = {
  media: "Photos",
  documents: "Documents",
  lessons: "Lesson Plans",
  children: "Children Portfolios",
  encouragements: "Encouragements",
} as const;

export type DriveCategory = keyof typeof SUBFOLDERS;

export class DriveNotConnectedError extends Error {
  constructor(message = "Google Drive isn't connected yet. An administrator needs to connect it from Settings.") {
    super(message);
  }
}

function getOAuth2Client(): Auth.OAuth2Client {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI must all be set.");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function isDriveEnvConfigured(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REDIRECT_URI && isKvConfigured());
}

export async function isDriveConnected(): Promise<boolean> {
  if (!isDriveEnvConfigured()) return false;
  const token = await getStoredRefreshToken();
  return !!token;
}

/**
 * DWKY Connect only ever needs to read/write files it creates itself, so it
 * requests the narrow `drive.file` scope rather than full Drive access. That
 * keeps it out of Google's "restricted scope" verification process (which is
 * built for public apps with many users, not a small church's internal
 * tool) — the tradeoff is the app can't be pointed at a folder that already
 * exists; it creates and owns its own root folder on first connect instead.
 */
export function getGoogleAuthUrl(state: string): string {
  const client = getOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/drive.file"],
    state,
  });
}

export async function connectWithAuthCode(code: string): Promise<void> {
  const client = getOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    throw new Error(
      "Google didn't return a refresh token. This usually happens on a second connection attempt — revoke DWKY Connect's access at https://myaccount.google.com/permissions and try connecting again."
    );
  }

  const encrypted = encryptSecret(tokens.refresh_token, REFRESH_TOKEN_CONTEXT);
  await setStoredRefreshToken(encrypted);

  // Create (or reuse) the root folder under whichever account just authorized —
  // reconnecting with a different Google account gets its own fresh folder,
  // since drive.file access doesn't carry over between accounts.
  client.setCredentials({ refresh_token: tokens.refresh_token });
  const drive = google.drive({ version: "v3", auth: client });
  const rootId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME, null);
  await setStoredRootFolderId(rootId);
}

export async function disconnectDrive(): Promise<void> {
  await clearStoredRefreshToken();
}

async function getAuthorizedClient(): Promise<Auth.OAuth2Client> {
  if (!isDriveEnvConfigured()) throw new DriveNotConnectedError("Google Drive isn't configured on the server yet.");
  const encrypted = await getStoredRefreshToken();
  if (!encrypted) throw new DriveNotConnectedError();

  const refreshToken = decryptSecret(encrypted, REFRESH_TOKEN_CONTEXT);
  const client = getOAuth2Client();
  client.setCredentials({ refresh_token: refreshToken });
  return client;
}

function getDrive(auth: Auth.OAuth2Client) {
  return google.drive({ version: "v3", auth });
}

async function rootFolderId(): Promise<string> {
  const id = await getStoredRootFolderId();
  if (!id) throw new DriveNotConnectedError("Google Drive's root folder hasn't been created yet — try reconnecting from Settings.");
  return id;
}

async function findOrCreateFolder(drive: ReturnType<typeof getDrive>, name: string, parentId: string | null): Promise<string> {
  const safeName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : "";
  const existing = await drive.files.list({
    q: `name = '${safeName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false${parentClause}`,
    fields: "files(id, name)",
    spaces: "drive",
  });
  const found = existing.data.files?.[0];
  if (found?.id) return found.id;

  const created = await drive.files.create({
    requestBody: { name, mimeType: "application/vnd.google-apps.folder", parents: parentId ? [parentId] : undefined },
    fields: "id",
  });
  if (!created.data.id) throw new Error("Failed to create Drive folder");
  return created.data.id;
}

async function resolveCategoryFolder(drive: ReturnType<typeof getDrive>, category: DriveCategory, childId?: string): Promise<string> {
  const root = await rootFolderId();
  const categoryFolderId = await findOrCreateFolder(drive, SUBFOLDERS[category], root);
  if (category === "children" && childId) {
    return findOrCreateFolder(drive, childId, categoryFolderId);
  }
  return categoryFolderId;
}

export interface DriveFile {
  fileId: string;
  name: string;
  viewUrl: string;
  size: string;
  mimeType: string;
  modifiedTime?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function uploadFileToDrive(
  buffer: Buffer,
  filename: string,
  mimeType: string,
  category: DriveCategory,
  childId?: string
): Promise<DriveFile> {
  const auth = await getAuthorizedClient();
  const drive = getDrive(auth);
  const parentId = await resolveCategoryFolder(drive, category, childId);

  const res = await drive.files.create({
    requestBody: { name: filename, parents: [parentId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id, name, webViewLink, size, mimeType, modifiedTime",
  });

  const file = res.data;
  if (!file.id) throw new Error("Upload succeeded but Drive returned no file id");

  return {
    fileId: file.id,
    name: file.name ?? filename,
    viewUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
    size: file.size ? formatBytes(Number(file.size)) : formatBytes(buffer.length),
    mimeType: file.mimeType ?? mimeType,
    modifiedTime: file.modifiedTime ?? undefined,
  };
}

export async function deleteFileFromDrive(fileId: string): Promise<void> {
  const auth = await getAuthorizedClient();
  await getDrive(auth).files.delete({ fileId });
}

export async function renameFileInDrive(fileId: string, newName: string): Promise<DriveFile> {
  const auth = await getAuthorizedClient();
  const res = await getDrive(auth).files.update({
    fileId,
    requestBody: { name: newName },
    fields: "id, name, webViewLink, size, mimeType, modifiedTime",
  });
  const file = res.data;
  return {
    fileId: file.id!,
    name: file.name ?? newName,
    viewUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
    size: file.size ? formatBytes(Number(file.size)) : "—",
    mimeType: file.mimeType ?? "application/octet-stream",
    modifiedTime: file.modifiedTime ?? undefined,
  };
}

export async function listFolderFiles(category: DriveCategory, childId?: string): Promise<DriveFile[]> {
  const auth = await getAuthorizedClient();
  const drive = getDrive(auth);
  const parentId = await resolveCategoryFolder(drive, category, childId);

  const res = await drive.files.list({
    q: `'${parentId}' in parents and trashed = false`,
    fields: "files(id, name, webViewLink, size, mimeType, modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: 100,
  });

  return (res.data.files ?? []).map((file) => ({
    fileId: file.id!,
    name: file.name ?? "Untitled",
    viewUrl: file.webViewLink ?? `https://drive.google.com/file/d/${file.id}/view`,
    size: file.size ? formatBytes(Number(file.size)) : "—",
    mimeType: file.mimeType ?? "application/octet-stream",
    modifiedTime: file.modifiedTime ?? undefined,
  }));
}

export interface DriveDownload {
  stream: NodeJS.ReadableStream;
  name: string;
  mimeType: string;
}

export async function downloadFileFromDrive(fileId: string): Promise<DriveDownload> {
  const auth = await getAuthorizedClient();
  const drive = getDrive(auth);

  const meta = await drive.files.get({ fileId, fields: "name, mimeType" });
  const res = await drive.files.get({ fileId, alt: "media" }, { responseType: "stream" });

  return {
    stream: res.data as unknown as NodeJS.ReadableStream,
    name: meta.data.name ?? "download",
    mimeType: meta.data.mimeType ?? "application/octet-stream",
  };
}

export interface DriveStorageInfo {
  /** Total bytes available, or null if the account has unlimited storage (Google Workspace). */
  limitBytes: number | null;
  usageBytes: number;
  usageInDriveBytes: number;
}

export async function getDriveStorageInfo(): Promise<DriveStorageInfo> {
  const auth = await getAuthorizedClient();
  const drive = getDrive(auth);
  const res = await drive.about.get({ fields: "storageQuota" });
  const quota = res.data.storageQuota ?? {};
  return {
    limitBytes: quota.limit ? Number(quota.limit) : null,
    usageBytes: quota.usage ? Number(quota.usage) : 0,
    usageInDriveBytes: quota.usageInDrive ? Number(quota.usageInDrive) : 0,
  };
}
