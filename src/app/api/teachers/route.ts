import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { hashPassword, generateTempPassword, toPublicUser } from "@/lib/password";
import { getCollection, getEntity, putEntity, newId, appendFeed } from "@/lib/db";
import { pickColor } from "@/lib/colors";
import { normalizeUsername, isValidUsernameFormat, isUsernameTaken, isEmailTaken } from "@/lib/username";
import type { User, SchoolClass, AuditLogEntry } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can create teacher accounts." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = body?.name;
  const email = body?.email;
  const classId = typeof body?.classId === "string" ? body.classId : null;
  const title = body?.title;

  if (typeof name !== "string" || !name.trim() || typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "bad_request", message: "Name and email are required." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUsers = await getCollection<User>("users");

  if (isEmailTaken(existingUsers, normalizedEmail)) {
    return NextResponse.json({ error: "email_taken", message: "That email is already in use by another account." }, { status: 409 });
  }

  const username = normalizeUsername(body?.username);
  if (username) {
    if (!isValidUsernameFormat(username)) {
      return NextResponse.json(
        { error: "bad_request", message: "Usernames must be 3-24 characters: letters, numbers, dots, underscores, or hyphens." },
        { status: 400 }
      );
    }
    if (isUsernameTaken(existingUsers, username)) {
      return NextResponse.json({ error: "username_taken", message: "That username is already in use." }, { status: 409 });
    }
  }

  const tempPassword = generateTempPassword();
  const user: User = {
    id: newId("u"),
    name: name.trim(),
    email: normalizedEmail,
    ...(username ? { username } : {}),
    passwordHash: hashPassword(tempPassword),
    role: "teacher",
    avatarColor: pickColor(existingUsers.length + 1),
    classId: classId ?? undefined,
    title: typeof title === "string" && title ? title : "Teacher",
    joined: new Date().toISOString().slice(0, 10),
    status: "active",
    mustChangePassword: true,
  };
  await putEntity("users", user);

  if (classId) {
    const schoolClass = await getEntity<SchoolClass>("classes", classId);
    if (schoolClass) {
      await putEntity("classes", { ...schoolClass, teacherIds: Array.from(new Set([...schoolClass.teacherIds, user.id])) });
    }
  }

  await appendFeed<AuditLogEntry>(
    "auditLog",
    { id: newId("al"), actor: claims.name, action: "Created teacher account", target: user.name, date: new Date().toISOString() },
    200
  );

  return NextResponse.json({ user: toPublicUser(user), tempPassword });
}
