import "server-only";
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";
import type { User } from "./types";

/**
 * One-way password hashing (scrypt, random salt per password). Distinct from
 * crypto.ts's AES-256-GCM helpers, which are for reversible secrets-at-rest
 * (the Drive refresh token) — a KDF and a cipher solve different problems.
 */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidateBuf = scryptSync(password, salt, 64);
  return hashBuf.length === candidateBuf.length && timingSafeEqual(hashBuf, candidateBuf);
}

export type PublicUser = Omit<User, "passwordHash">;

export function toPublicUser(user: User): PublicUser {
  const publicUser: Partial<User> = { ...user };
  delete publicUser.passwordHash;
  return publicUser as PublicUser;
}

export function generateTempPassword(): string {
  const words = ["Cedar", "Harbor", "Meadow", "Amber", "Willow", "Brook", "Summit", "Coral"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!`;
}
