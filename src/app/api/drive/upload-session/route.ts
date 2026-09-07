import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { isDriveConnected, createResumableUploadSession, DriveNotConnectedError, type DriveCategory } from "@/lib/google-drive";

const VALID_CATEGORIES: DriveCategory[] = ["media", "documents", "lessons", "children", "encouragements"];

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) {
    return NextResponse.json({ error: "unauthorized", message: "Sign in to DWKY Connect before uploading files." }, { status: 401 });
  }

  if (!(await isDriveConnected())) {
    return NextResponse.json(
      { error: "not_configured", message: "Google Drive isn't connected yet. An administrator needs to connect it from Settings." },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => null);
  const filename = typeof body?.filename === "string" ? body.filename : "";
  const mimeType = typeof body?.mimeType === "string" && body.mimeType ? body.mimeType : "application/octet-stream";
  const size = typeof body?.size === "number" ? body.size : 0;
  const category = body?.category;
  const childId = typeof body?.childId === "string" && body.childId ? body.childId : undefined;

  if (!filename || !VALID_CATEGORIES.includes(category as DriveCategory)) {
    return NextResponse.json({ error: "bad_request", message: "Missing or invalid file name or category." }, { status: 400 });
  }

  try {
    const uploadUrl = await createResumableUploadSession(filename, mimeType, size, category as DriveCategory, childId);
    return NextResponse.json({ uploadUrl });
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    }
    console.error("Failed to start Drive upload session:", err);
    return NextResponse.json({ error: "upload_failed", message: "Couldn't start the upload to Google Drive. Check server logs." }, { status: 502 });
  }
}
