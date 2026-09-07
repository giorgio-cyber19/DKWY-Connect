import { NextResponse } from "next/server";
import { verifyPassword, toPublicUser } from "@/lib/password";
import { mintSessionToken } from "@/lib/session";
import { getCollection } from "@/lib/db";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  // Two limits, checked independently: one bounds how fast a single IP can
  // try passwords at all, the other bounds how many attempts any one account
  // can absorb even if they're spread across many IPs (distributed brute force).
  const ipCheck = await checkRateLimit("login-ip", getClientIp(request), 20, "1 m");
  if (!ipCheck.success) return rateLimitedResponse(ipCheck.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const identifier = body?.identifier;
  const password = body?.password;

  if (typeof identifier !== "string" || !identifier.trim() || typeof password !== "string" || !password) {
    return NextResponse.json({ error: "bad_request", message: "Email/username and password are required." }, { status: 400 });
  }

  const normalized = identifier.toLowerCase().trim();

  const accountCheck = await checkRateLimit("login-account", normalized, 8, "5 m");
  if (!accountCheck.success) return rateLimitedResponse(accountCheck.retryAfterSeconds);

  const users = await getCollection<User>("users");
  const user = users.find((u) => u.email === normalized || u.username === normalized);

  if (!user || user.status !== "active" || !verifyPassword(password, user.passwordHash)) {
    return NextResponse.json({ error: "invalid_credentials", message: "That email/username and password don't match an account." }, { status: 401 });
  }

  const token = mintSessionToken({ userId: user.id, role: user.role, name: user.name });
  return NextResponse.json({ token, user: toPublicUser(user) });
}
