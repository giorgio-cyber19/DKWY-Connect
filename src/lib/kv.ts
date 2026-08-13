import "server-only";
import { Redis } from "@upstash/redis";

const REFRESH_TOKEN_KEY = "dwky-connect:google-drive:refresh-token";
const ROOT_FOLDER_KEY = "dwky-connect:google-drive:root-folder-id";

let client: Redis | null = null;

function getClient(): Redis {
  if (client) return client;
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error("No KV database is configured (missing KV_REST_API_URL/TOKEN or UPSTASH_REDIS_REST_URL/TOKEN).");
  }
  client = new Redis({ url, token });
  return client;
}

export function getRedisClient(): Redis {
  return getClient();
}

export function isKvConfigured(): boolean {
  return !!(process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL) && !!(process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN);
}

export async function getStoredRefreshToken(): Promise<string | null> {
  if (!isKvConfigured()) return null;
  const value = await getClient().get<string>(REFRESH_TOKEN_KEY);
  return value ?? null;
}

export async function setStoredRefreshToken(encryptedToken: string): Promise<void> {
  await getClient().set(REFRESH_TOKEN_KEY, encryptedToken);
}

export async function clearStoredRefreshToken(): Promise<void> {
  if (!isKvConfigured()) return;
  await getClient().del(REFRESH_TOKEN_KEY);
}

export async function getStoredRootFolderId(): Promise<string | null> {
  if (!isKvConfigured()) return null;
  const value = await getClient().get<string>(ROOT_FOLDER_KEY);
  return value ?? null;
}

export async function setStoredRootFolderId(id: string): Promise<void> {
  await getClient().set(ROOT_FOLDER_KEY, id);
}
