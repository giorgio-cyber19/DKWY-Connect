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
    console.error("Drive download failed:", err);
    return NextResponse.json({ error: "download_failed" }, { status: 502 });
  }
}
