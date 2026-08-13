import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";
import type { Role } from "./types";

export interface SessionClaims {
  userId: string;
  role: Role;
  name: string;
}

interface SignedPayload extends SessionClaims {
  exp: number;
}

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payloadB64: string): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

export function mintSessionToken(claims: SessionClaims): string {
  const payload: SignedPayload = { ...claims, exp: Date.now() + TOKEN_TTL_MS };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Verifies a session token minted by mintSessionToken. Tokens are only ever
 * minted by /api/auth/login and /api/auth/setup after a real server-side
 * credential check (see password.ts), so a valid token here is genuine
 * server-verified identity, not just a client claim.
 */
export function verifySessionToken(token: string | null | undefined): SessionClaims | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  let expectedSignature: string;
  try {
    expectedSignature = sign(payloadB64);
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as SignedPayload;
    if (typeof payload.exp !== "number" || payload.exp < Date.now()) return null;
    return { userId: payload.userId, role: payload.role, name: payload.name };
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const url = new URL(request.url);
  return url.searchParams.get("token");
}

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/** Short-lived signed state value for the Google OAuth redirect, so the callback can confirm the flow wasn't forged. */
export function mintOAuthState(): string {
  const payload = { exp: Date.now() + STATE_TTL_MS, nonce: randomBytes(16).toString("hex") };
  const payloadB64 = base64url(JSON.stringify(payload));
  return `${payloadB64}.${sign(payloadB64)}`;
}

export function verifyOAuthState(state: string | null | undefined): boolean {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 2) return false;
  const [payloadB64, signature] = parts;
  let expectedSignature: string;
  try {
    expectedSignature = sign(payloadB64);
  } catch {
    return false;
  }
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) return false;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as { exp: number };
    return typeof payload.exp === "number" && payload.exp >= Date.now();
  } catch {
    return false;
  }
}
