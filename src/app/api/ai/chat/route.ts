import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import {
  getConversation,
  createConversation,
  appendMessage,
  checkAiRateLimit,
  newConversationId,
  newMessageTimestamp,
  titleFromMessage,
  MAX_CONTEXT_MESSAGES,
  MAX_MESSAGE_LENGTH,
} from "@/lib/ai-chat";
import { generateAiReply, isAiConfigured, AiNotConfiguredError, AiProviderError } from "@/lib/ai-provider";
import type { AiChatMessage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : undefined;

  if (!message) {
    return NextResponse.json({ error: "bad_request", message: "Please enter a message." }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: "bad_request", message: `Messages are limited to ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.` },
      { status: 400 }
    );
  }

  const allowed = await checkAiRateLimit(claims.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "rate_limited", message: "You've reached the current AI usage limit. Please try again later." },
      { status: 429 }
    );
  }

  if (!isAiConfigured()) {
    return NextResponse.json(
      { error: "ai_not_configured", message: "DWKY AI isn't set up yet. An administrator needs to add an API key." },
      { status: 503 }
    );
  }

  let conversation = conversationId ? await getConversation(conversationId) : null;
  if (conversationId && !conversation) {
    return NextResponse.json({ error: "not_found", message: "That conversation no longer exists." }, { status: 404 });
  }
  if (conversation && conversation.userId !== claims.userId) {
    return NextResponse.json({ error: "forbidden", message: "You don't have access to that conversation." }, { status: 403 });
  }
  if (!conversation) {
    conversation = await createConversation(claims.userId, newConversationId(), titleFromMessage(message));
  }

  const userMessage: AiChatMessage = { role: "user", content: message, timestamp: newMessageTimestamp() };
  conversation = await appendMessage(conversation, userMessage);

  try {
    const context = conversation.messages.slice(-MAX_CONTEXT_MESSAGES);
    const replyText = await generateAiReply(context);
    const assistantMessage: AiChatMessage = { role: "assistant", content: replyText, timestamp: newMessageTimestamp() };
    conversation = await appendMessage(conversation, assistantMessage);
    return NextResponse.json({
      conversationId: conversation.id,
      title: conversation.title,
      updatedAt: conversation.updatedAt,
      message: assistantMessage,
    });
  } catch (err) {
    if (err instanceof AiNotConfiguredError) {
      return NextResponse.json({ error: "ai_not_configured", message: err.message }, { status: 503 });
    }
    if (err instanceof AiProviderError) {
      console.error("AI provider error:", err.message);
      if (err.status === 429) {
        return NextResponse.json(
          { error: "ai_busy", message: "DWKY AI is temporarily unavailable. Please try again in a moment." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "ai_error", message: "DWKY AI is temporarily unavailable. Please try again in a moment." },
        { status: 502 }
      );
    }
    console.error("Unexpected AI chat error:", err);
    return NextResponse.json(
      { error: "ai_error", message: "DWKY AI is temporarily unavailable. Please try again in a moment." },
      { status: 500 }
    );
  }
}
