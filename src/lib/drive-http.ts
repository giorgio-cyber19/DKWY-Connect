import "server-only";
import { NextResponse } from "next/server";
import { DriveNotConnectedError } from "./google-drive";

/** Maps a failed Google Drive rename to a precise API response (nothing has been changed when this is returned). */
export function driveRenameFailure(err: unknown): NextResponse {
  if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });

  const e = err as { code?: number | string; status?: number; message?: string; response?: { status?: number } };
  const status = Number(e.response?.status ?? e.status ?? e.code) || 0;
  const message = String(e.message ?? "");
  console.error("Drive rename failed:", status || "", message);

  if (status === 404) {
    return NextResponse.json({ error: "drive_file_missing", message: "This file no longer exists in Google Drive, so it can't be renamed." }, { status: 404 });
  }
  if (status === 401 || message.includes("invalid_grant")) {
    return NextResponse.json({ error: "drive_auth", message: "The connection to Google Drive has expired. An administrator needs to reconnect it." }, { status: 503 });
  }
  return NextResponse.json({ error: "rename_failed", message: "Google Drive couldn't rename the file. Nothing was changed." }, { status: 502 });
}
