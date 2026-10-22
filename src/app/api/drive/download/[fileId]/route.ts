import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { downloadFileFromDrive, DriveNotConnectedError } from "@/lib/google-drive";

export const maxDuration = 60;

export async function GET(request: NextRequest, ctx: RouteContext<"/api/drive/download/[fileId]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in to DWKY Connect to download this file." }, { status: 401 });

  const { fileId } = await ctx.params;
  try {
    const file = await downloadFileFromDrive(fileId);
    const webStream = Readable.toWeb(file.stream as Readable) as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(file.name)}"`,
      },
    });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });

    const e = err as { code?: number | string; status?: number; message?: string; response?: { status?: number } };
    const status = Number(e.response?.status ?? e.status ?? e.code) || 0;
    const message = String(e.message ?? "");
    console.error("Drive download failed:", status || "", message);

    // The file was deleted or trashed in Drive (or this account can no longer see it).
    if (status === 404) return NextResponse.json({ error: "file_not_found", message: "This file no longer exists in Google Drive." }, { status: 404 });
    // Google rejected our credentials — the stored connection was revoked or expired.
    if (message.includes("invalid_grant") || status === 401) {
      return NextResponse.json({ error: "drive_auth", message: "The connection to Google Drive has expired. An administrator needs to reconnect it." }, { status: 503 });
    }
    return NextResponse.json({ error: "download_failed", message: "Google Drive couldn't provide this file." }, { status: 502 });
  }
}
