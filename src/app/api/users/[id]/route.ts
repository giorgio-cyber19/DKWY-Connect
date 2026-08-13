import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { hashPassword, generateTempPassword, toPublicUser } from "@/lib/password";
import { getCollection, getEntity, putEntity, newId, appendFeed } from "@/lib/db";
import { normalizeUsername, isValidUsernameFormat, isUsernameTaken } from "@/lib/username";
import type { User, AuditLogEntry } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/users/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can manage accounts." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const target = await getEntity<User>("users", id);
  if (!target) return NextResponse.json({ error: "not_found", message: "That account no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "toggle-status") {
    const updated: User = { ...target, status: target.status === "active" ? "disabled" : "active" };
    await putEntity("users", updated);
    await appendFeed<AuditLogEntry>(
      "auditLog",
      {
        id: newId("al"),
        actor: claims.name,
        action: updated.status === "active" ? "Re-enabled account" : "Disabled account",
        target: updated.name,
        date: new Date().toISOString(),
      },
      200
    );
    return NextResponse.json({ user: toPublicUser(updated) });
  }

  if (action === "reset-password") {
    const tempPassword = generateTempPassword();
    const updated: User = { ...target, passwordHash: hashPassword(tempPassword), mustChangePassword: true };
    await putEntity("users", updated);
    await appendFeed<AuditLogEntry>(
      "auditLog",
      { id: newId("al"), actor: claims.name, action: "Reset password", target: updated.name, date: new Date().toISOString() },
      200
    );
    return NextResponse.json({ user: toPublicUser(updated), tempPassword });
  }

  if (action === "set-username") {
    const username = normalizeUsername(body?.username);
    let updated: User;
    if (username === null) {
      updated = { ...target };
      delete updated.username;
    } else {
      if (!isValidUsernameFormat(username)) {
        return NextResponse.json(
          { error: "bad_request", message: "Usernames must be 3-24 characters: letters, numbers, dots, underscores, or hyphens." },
          { status: 400 }
        );
      }
      const allUsers = await getCollection<User>("users");
      if (isUsernameTaken(allUsers, username, target.id)) {
        return NextResponse.json({ error: "username_taken", message: "That username is already in use." }, { status: 409 });
      }
      updated = { ...target, username };
    }
    await putEntity("users", updated);
    return NextResponse.json({ user: toPublicUser(updated) });
  }

  return NextResponse.json({ error: "bad_request", message: "Unknown action." }, { status: 400 });
}
