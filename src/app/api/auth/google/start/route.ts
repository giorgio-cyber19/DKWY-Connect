import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken, mintOAuthState } from "@/lib/session";
import { getGoogleAuthUrl } from "@/lib/google-drive";

export async function GET(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims || claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only an administrator can connect Google Drive." }, { status: 403 });
  }

  try {
    const state = mintOAuthState();
    const url = getGoogleAuthUrl(state);
    return NextResponse.redirect(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Google OAuth isn't configured on the server.";
    return NextResponse.json({ error: "not_configured", message }, { status: 503 });
  }
}
