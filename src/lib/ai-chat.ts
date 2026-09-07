import "server-only";
import { getRedisClient, isKvConfigured } from "./kv";
import type { AiConversation, AiConversationSummary, AiChatMessage } from "./types";

const PREFIX = "dwky-connect";

/** Bounds how much a single stored conversation can grow — keeps Redis record size small indefinitely. */
const MAX_STORED_MESSAGES = 60;
/** How many recent messages are actually sent to the AI model per request — the main lever on token cost. */
export const MAX_CONTEXT_MESSAGES = 16;
export const MAX_MESSAGE_LENGTH = 6000;

function conversationKey(id: string): string {
  return `${PREFIX}:aiConversation:${id}`;
}

function userIndexKey(userId: string): string {
  return `${PREFIX}:aiConversations:user:${userId}`;
}

export function newConversationId(): string {
  return `aic-${crypto.randomUUID().slice(0, 8)}`;
}

export function newMessageTimestamp(): string {
  return new Date().toISOString();
}

/** Short, human-scannable title from the opening message — never re-derived later. */
export function titleFromMessage(message: string): string {
  const trimmed = message.trim().replace(/\s+/g, " ");
  return trimmed.length <= 60 ? trimmed : `${trimmed.slice(0, 57)}…`;
}

export async function getConversation(id: string): Promise<AiConversation | null> {
  if (!isKvConfigured()) return null;
  const value = await getRedisClient().get<AiConversation>(conversationKey(id));
  return value ?? null;
}

/** Creates and persists a brand-new conversation, indexed under its owner. */
export async function createConversation(userId: string, id: string, title: string): Promise<AiConversation> {
  const now = newMessageTimestamp();
  const conversation: AiConversation = { id, userId, title, createdAt: now, updatedAt: now, messages: [] };
  const redis = getRedisClient();
  await redis.multi().set(conversationKey(id), conversation).sadd(userIndexKey(userId), id).exec();
  return conversation;
}

/** Appends a message, trims the stored history to MAX_STORED_MESSAGES, and saves — one round trip. */
export async function appendMessage(conversation: AiConversation, message: AiChatMessage): Promise<AiConversation> {
  const messages = [...conversation.messages, message].slice(-MAX_STORED_MESSAGES);
  const updated: AiConversation = { ...conversation, messages, updatedAt: newMessageTimestamp() };
  await getRedisClient().set(conversationKey(updated.id), updated);
  return updated;
}

/** Cheap listing for the sidebar — fetches full records (conversations are small) but strips messages before returning, so the response payload itself stays lightweight. */
export async function listConversationSummaries(userId: string): Promise<AiConversationSummary[]> {
  if (!isKvConfigured()) return [];
  const redis = getRedisClient();
  const ids = await redis.smembers(userIndexKey(userId));
  if (ids.length === 0) return [];
  const records = await redis.mget<AiConversation[]>(...ids.map(conversationKey));
  return records
    .filter((c): c is AiConversation => c != null)
    .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

const MAX_TITLE_LENGTH = 100;

export async function deleteConversation(id: string, userId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.multi().del(conversationKey(id)).srem(userIndexKey(userId), id).exec();
}

export async function renameConversation(conversation: AiConversation, title: string): Promise<AiConversation> {
  const trimmed = title.trim().slice(0, MAX_TITLE_LENGTH);
  const updated: AiConversation = { ...conversation, title: trimmed || conversation.title, updatedAt: newMessageTimestamp() };
  await getRedisClient().set(conversationKey(updated.id), updated);
  return updated;
}

const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 8;

/** Simple fixed-window counter — no extra dependency, minimal Redis commands. Returns true when the request is allowed. */
export async function checkAiRateLimit(userId: string): Promise<boolean> {
  if (!isKvConfigured()) return true;
  const redis = getRedisClient();
  const key = `${PREFIX}:ai-rate:${userId}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, RATE_LIMIT_WINDOW_SECONDS);
  return count <= RATE_LIMIT_MAX_REQUESTS;
}
