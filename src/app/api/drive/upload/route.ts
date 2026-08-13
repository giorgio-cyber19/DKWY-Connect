import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { isDriveConnected, uploadFileToDrive, DriveNotConnectedError, type DriveCategory } from "@/lib/google-drive";

export const maxDuration = 60;

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

  const formData = await request.formData();
  const file = formData.get("file");
  const category = formData.get("category");
  const childId = formData.get("childId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "bad_request", message: "No file was provided." }, { status: 400 });
  }
  if (typeof category !== "string" || !VALID_CATEGORIES.includes(category as DriveCategory)) {
    return NextResponse.json({ error: "bad_request", message: "Missing or invalid category." }, { status: 400 });
  }

  const MAX_BYTES = 4 * 1024 * 1024;
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "too_large", message: "Files over 4MB aren't supported by this upload path yet — try a smaller file." },
      { status: 413 }
    );
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFileToDrive(
      buffer,
      file.name,
      file.type || "application/octet-stream",
      category as DriveCategory,
      typeof childId === "string" && childId ? childId : undefined
    );
    return NextResponse.json(uploaded);
  } catch (err) {
    if (err instanceof DriveNotConnectedError) {
      return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    }
    console.error("Drive upload failed:", err);
    return NextResponse.json({ error: "upload_failed", message: "Upload to Google Drive failed. Check server logs." }, { status: 502 });
  }
}
