import { randomBytes } from "node:crypto";
import { NextResponse, after } from "next/server";
import { getCollection } from "@/lib/db";
import { setPasswordResetToken } from "@/lib/kv";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, rateLimitedResponse } from "@/lib/rate-limit";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  // Bounds how many reset emails one IP can trigger — the response is already
  // identical whether or not the account exists, so this is about abuse/volume,
  // not enumeration.
  const ipCheck = await checkRateLimit("forgot-password-ip", getClientIp(request), 5, "1 h");
  if (!ipCheck.success) return rateLimitedResponse(ipCheck.retryAfterSeconds);

  const body = await request.json().catch(() => null);
  const identifier = typeof body?.identifier === "string" ? body.identifier.toLowerCase().trim() : "";

  if (!identifier) {
    return NextResponse.json({ error: "bad_request", message: "Enter your email or username." }, { status: 400 });
  }

  // Always respond the same way whether or not an account exists — the
  // request/email happens in `after()` so response timing can't leak that either.
  after(async () => {
    const users = await getCollection<User>("users");
    const user = users.find((u) => (u.email === identifier || u.username === identifier) && u.status === "active");
    if (!user) return;

    const token = randomBytes(32).toString("base64url");
    await setPasswordResetToken(token, user.id);
    await sendPasswordResetEmail(user, token);
  });

  return NextResponse.json({ ok: true });
}
