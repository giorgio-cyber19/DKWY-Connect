import { NextResponse } from "next/server";
import { verifyOAuthState } from "@/lib/session";
import { connectWithAuthCode } from "@/lib/google-drive";

function redirectTo(request: Request, params: Record<string, string>) {
  const url = new URL("/admin/connect-google-drive", request.url);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  if (oauthError) {
    return redirectTo(request, { error: oauthError === "access_denied" ? "Access was denied in Google's consent screen." : oauthError });
  }
  if (!verifyOAuthState(state)) {
    return redirectTo(request, { error: "This connection link expired or is invalid. Please try connecting again." });
  }
  if (!code) {
    return redirectTo(request, { error: "Google didn't send back an authorization code." });
  }

  try {
    await connectWithAuthCode(code);
    return redirectTo(request, { connected: "1" });
  } catch (err) {
    return redirectTo(request, { error: err instanceof Error ? err.message : "Failed to connect Google Drive." });
  }
}
