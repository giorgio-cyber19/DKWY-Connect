import { NextResponse } from "next/server";
import { getEntity, putEntity } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/kv";
import { hashPassword } from "@/lib/password";
import type { User } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";
  const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";

  if (!token) {
    return NextResponse.json({ error: "invalid_reset_token", message: "This reset link is invalid or has expired." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "bad_request", message: "New password must be at least 8 characters." }, { status: 400 });
  }

  const userId = await consumePasswordResetToken(token);
  if (!userId) {
    return NextResponse.json({ error: "invalid_reset_token", message: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const user = await getEntity<User>("users", userId);
  if (!user) {
    return NextResponse.json({ error: "invalid_reset_token", message: "This reset link is invalid or has expired." }, { status: 400 });
  }

  const updated: User = { ...user, passwordHash: hashPassword(newPassword), mustChangePassword: false };
  await putEntity("users", updated);

  return NextResponse.json({ ok: true });
}
