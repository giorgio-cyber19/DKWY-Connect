import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { hashPassword, verifyPassword, toPublicUser } from "@/lib/password";
import { getCollection, getEntity, putEntity } from "@/lib/db";
import { normalizeUsername, isValidUsernameFormat, isUsernameTaken } from "@/lib/username";
import { isValidHexColor } from "@/lib/accent-color";
import type { User } from "@/lib/types";

/** A profile photo is a small image sent as a data URL (the app shrinks it to a ~192px square first). */
const PHOTO_PATTERN = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
const MAX_PHOTO_LENGTH = 60_000;

export async function PATCH(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const target = await getEntity<User>("users", claims.userId);
  if (!target) return NextResponse.json({ error: "not_found", message: "Your account no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "change-password") {
    const currentPassword = body?.currentPassword;
    const newPassword = body?.newPassword;
    if (typeof currentPassword !== "string" || !currentPassword) {
      return NextResponse.json({ error: "bad_request", message: "Your current password is required." }, { status: 400 });
    }
    if (typeof newPassword !== "string" || newPassword.length < 8) {
      return NextResponse.json({ error: "bad_request", message: "New password must be at least 8 characters." }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, target.passwordHash)) {
      return NextResponse.json({ error: "invalid_credentials", message: "Your current password is incorrect." }, { status: 401 });
    }
    const updated: User = { ...target, passwordHash: hashPassword(newPassword), mustChangePassword: false };
    await putEntity("users", updated);
    return NextResponse.json({ user: toPublicUser(updated) });
  }

  if (action === "update-profile") {
    const updated: User = { ...target };
    if (typeof body?.name === "string" && body.name.trim()) updated.name = body.name.trim();
    if (typeof body?.bio === "string") updated.bio = body.bio.trim() || undefined;

    if ("username" in (body ?? {})) {
      const username = normalizeUsername(body?.username);
      if (username === null) {
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
        updated.username = username;
      }
    }

    if ("photo" in (body ?? {})) {
      const photo = body?.photo;
      if (photo === null) {
        delete updated.photo;
      } else if (typeof photo === "string" && photo.length <= MAX_PHOTO_LENGTH && PHOTO_PATTERN.test(photo)) {
        updated.photo = photo;
      } else {
        return NextResponse.json({ error: "invalid_photo", message: "That photo can't be used. Choose a JPG, PNG or WebP image." }, { status: 400 });
      }
    }

    if ("accentColor" in (body ?? {})) {
      const accentColor = body?.accentColor;
      if (accentColor === null) {
        delete updated.accentColor;
      } else if (typeof accentColor === "string" && isValidHexColor(accentColor)) {
        updated.accentColor = accentColor.toLowerCase();
      } else {
        return NextResponse.json({ error: "bad_request", message: "That isn't a valid color." }, { status: 400 });
      }
    }

    await putEntity("users", updated);
    return NextResponse.json({ user: toPublicUser(updated) });
  }

  return NextResponse.json({ error: "bad_request", message: "Unknown action." }, { status: 400 });
}
