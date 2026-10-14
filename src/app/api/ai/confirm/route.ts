import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getConversation, saveMessages, newMessageTimestamp } from "@/lib/ai-chat";
import { createToolRuntime, getTool } from "@/lib/ai-tools";
import type { AiChatMessage } from "@/lib/types";

/**
 * Runs (or cancels) the destructive action DWKY AI parked for confirmation. The action
 * is read back from the stored conversation — never from the request — so the client
 * can only say yes or no, not choose what gets executed.
 */
export async function POST(request: Request) {
  const token = getBearerToken(request);
  const claims = verifySessionToken(token);
  if (!claims || !token) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const conversationId = typeof body?.conversationId === "string" ? body.conversationId : "";
  const actionId = typeof body?.actionId === "string" ? body.actionId : "";
  const decision = body?.decision;
  if (!conversationId || !actionId || (decision !== "confirm" && decision !== "cancel")) {
    return NextResponse.json({ error: "bad_request", message: "Invalid request." }, { status: 400 });
  }

  const conversation = await getConversation(conversationId);
  if (!conversation) return NextResponse.json({ error: "not_found", message: "That conversation no longer exists." }, { status: 404 });
  if (conversation.userId !== claims.userId) {
    return NextResponse.json({ error: "forbidden", message: "You don't have access to that conversation." }, { status: 403 });
  }

  const index = conversation.messages.findIndex((m) => m.pending?.id === actionId);
  const pending = index >= 0 ? conversation.messages[index].pending : undefined;
  if (!pending) {
    return NextResponse.json({ error: "conflict", message: "That action was already handled." }, { status: 409 });
  }

  // Clear the pending marker first so a double click can't run the action twice.
  const cleared: AiChatMessage[] = conversation.messages.map((m, i) => {
    if (i !== index) return m;
    return { ...m, pending: undefined };
  });
  await saveMessages(conversation, cleared);

  let resultMessage: AiChatMessage;
  if (decision === "cancel") {
    resultMessage = { role: "assistant", content: `Okay — I didn't do it: ${pending.summary}.`, timestamp: newMessageTimestamp() };
  } else {
    const tool = getTool(pending.tool);
    try {
      if (!tool) throw new Error("That action is no longer available.");
      const outcome = await tool.run(pending.args, createToolRuntime(token, claims));
      resultMessage = {
        role: "assistant",
        content: `Done — ${outcome.summary}.`,
        timestamp: newMessageTimestamp(),
        actions: [{ tool: pending.tool, summary: outcome.summary, ok: true }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "That action failed.";
      resultMessage = {
        role: "assistant",
        content: `I couldn't do that: ${message}`,
        timestamp: newMessageTimestamp(),
        actions: [{ tool: pending.tool, summary: `${pending.summary} failed: ${message}`, ok: false }],
      };
    }
  }

  const saved = await saveMessages(conversation, [...cleared, resultMessage]);
  return NextResponse.json({ conversationId: saved.id, updatedAt: saved.updatedAt, message: resultMessage, resolvedActionId: actionId });
}
