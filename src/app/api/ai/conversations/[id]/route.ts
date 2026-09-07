import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getConversation, deleteConversation, renameConversation } from "@/lib/ai-chat";

export async function GET(request: Request, ctx: RouteContext<"/api/ai/conversations/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "not_found", message: "That conversation no longer exists." }, { status: 404 });
  if (conversation.userId !== claims.userId) {
    return NextResponse.json({ error: "forbidden", message: "You don't have access to that conversation." }, { status: 403 });
  }

  return NextResponse.json(conversation);
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/ai/conversations/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "not_found", message: "That conversation no longer exists." }, { status: 404 });
  if (conversation.userId !== claims.userId) {
    return NextResponse.json({ error: "forbidden", message: "You don't have access to that conversation." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "bad_request", message: "Please enter a title." }, { status: 400 });

  const updated = await renameConversation(conversation, title);
  return NextResponse.json({ id: updated.id, title: updated.title, updatedAt: updated.updatedAt });
}

export async function DELETE(request: Request, ctx: RouteContext<"/api/ai/conversations/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const conversation = await getConversation(id);
  if (!conversation) return NextResponse.json({ error: "not_found", message: "That conversation no longer exists." }, { status: 404 });
  if (conversation.userId !== claims.userId) {
    return NextResponse.json({ error: "forbidden", message: "You don't have access to that conversation." }, { status: 403 });
  }

  await deleteConversation(id, claims.userId);
  return NextResponse.json({ ok: true });
}
