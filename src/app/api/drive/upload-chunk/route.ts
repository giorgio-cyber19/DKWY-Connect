import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";

export const maxDuration = 60;

const SESSION_URL_PREFIX = "https://www.googleapis.com/upload/drive/v3/files";

export async function PUT(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const url = new URL(request.url);
  const sessionUrl = url.searchParams.get("sessionUrl") ?? "";
  const start = Number(url.searchParams.get("start"));
  const total = Number(url.searchParams.get("total"));

  if (!sessionUrl.startsWith(SESSION_URL_PREFIX) || !Number.isFinite(start) || !Number.isFinite(total)) {
    return NextResponse.json({ error: "bad_request", message: "Invalid upload session." }, { status: 400 });
  }

  const chunk = Buffer.from(await request.arrayBuffer());
  const end = start + chunk.length - 1;

  const driveRes = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      "Content-Length": String(chunk.length),
      "Content-Range": `bytes ${start}-${end}/${total}`,
    },
    body: chunk,
  });

  if (driveRes.status === 308) {
    return NextResponse.json({ done: false });
  }
  if (driveRes.ok) {
    const file = await driveRes.json();
    return NextResponse.json({ done: true, file });
  }

  const text = await driveRes.text().catch(() => "");
  console.error(`Drive chunk upload failed (${driveRes.status}):`, text);
  return NextResponse.json({ error: "upload_failed", message: "Upload to Google Drive failed. Please try again." }, { status: 502 });
}
