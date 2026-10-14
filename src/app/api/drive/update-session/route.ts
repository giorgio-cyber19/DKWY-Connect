import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { isDriveConnected, createResumableUpdateSession, DriveNotConnectedError } from "@/lib/google-drive";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to DWKY Connect before saving files." }, { status: 401 });
  }

  if (!(await isDriveConnected())) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Drive isn't connected yet. An administrator needs to connect it from Settings." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const fileId = typeof body?.fileId === "string" ? body.fileId : "";
  const mimeType = typeof body?.mimeType === "string" && body.mimeType ? body.mimeType : "application/octet-stream";
  const size = typeof body?.size === "number" ? body.size : 0;

  if (!fileId) {
    return NextResponse.json({ error: "bad_request", message: "Missing file id." }, { status: 400 });
  }

  try {
    const uploadUrl = await createResumableUpdateSession(fileId, mimeType, size);
    return NextResponse.json({ uploadUrl });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    }
    console.error("Failed to start Drive update session:", err);
    return NextResponse.json({ error: "upload_failed", message: "Couldn't save changes to Google Drive. Check server logs." }, { status: 502 });
  }
}
