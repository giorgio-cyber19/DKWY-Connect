import { NextResponse } from "next/server";
import { hashPassword, toPublicUser } from "@/lib/password";
import { mintSessionToken } from "@/lib/session";
import { getCollection, putEntity, newId, appendFeed } from "@/lib/db";
import { pickColor } from "@/lib/colors";
import type { User, AuditLogEntry } from "@/lib/types";

/** One-time first-admin creation — only succeeds while the workspace has zero users. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = body?.name;
  const email = body?.email;
  const password = body?.password;

  if (
    typeof name !== "string" || !name.trim() ||
    typeof email !== "string" || !email.trim() ||
    typeof password !== "string" || password.length < 8
  ) {
    return NextResponse.json({ error: "bad_request", message: "Name, email, and a password of at least 8 characters are required." }, { status: 400 });
  }

  const existing = await getCollection<User>("users");
  if (existing.length > 0) {
    return NextResponse.json({ error: "already_set_up", message: "This workspace already has an administrator." }, { status: 409 });
  }

  const user: User = {
    id: newId("u"),
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash: hashPassword(password),
    role: "admin",
    avatarColor: pickColor(0),
    title: "Administrator",
    joined: new Date().toISOString().slice(0, 10),
    status: "active",
  };

  await putEntity("users", user);
  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: user.name, action: "Created workspace and first admin account", target: user.name, date: new Date().toISOString() },
    200
  );

  const token = mintSessionToken({ userId: user.id, role: user.role, name: user.name });
  return NextResponse.json({ token, user: toPublicUser(user) });
}
