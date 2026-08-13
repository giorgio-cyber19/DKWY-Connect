import "server-only";
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

function getKey(context: string): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return scryptSync(secret, `dwky-connect::${context}`, 32);
}

/** Encrypts a string with AES-256-GCM. Output is base64(iv || authTag || ciphertext). */
export function encryptSecret(plaintext: string, context: string): string {
  const key = getKey(context);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

export function decryptSecret(encoded: string, context: string): string {
  const key = getKey(context);
  const raw = Buffer.from(encoded, "base64");
  const iv = raw.subarray(0, 12);
  const authTag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
