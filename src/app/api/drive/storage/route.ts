import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getDriveStorageInfo, DriveNotConnectedError } from "@/lib/google-drive";

export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can view storage details." }, { status: 403 });
  }

  try {
    const info = await getDriveStorageInfo();
    return NextResponse.json(info);
  } catch (err) {
    if (err instanceof DriveNotConnectedError) return NextResponse.json({ error: "not_configured", message: err.message }, { status: 503 });
    console.error("Drive storage lookup failed:", err);
    return NextResponse.json({ error: "storage_unavailable", message: "Couldn't retrieve storage details from Google Drive." }, { status: 502 });
  }
}
