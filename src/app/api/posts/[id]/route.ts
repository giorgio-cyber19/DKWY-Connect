import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, newId, appendFeed } from "@/lib/db";
import type { Post, Comment, Notification } from "@/lib/types";

export async function PATCH(request: Request, ctx: RouteContext<"/api/posts/[id]">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const post = await getEntity<Post>("posts", id);
  if (!post) return NextResponse.json({ error: "not_found", message: "That post no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const action = body?.action;

  if (action === "react") {
    const emoji = body?.emoji;
    if (typeof emoji !== "string" || !emoji) return NextResponse.json({ error: "bad_request", message: "An emoji is required." }, { status: 400 });
    const existing = post.reactions.find((r) => r.emoji === emoji);
    let reactions: Post["reactions"];
    if (!existing) {
      reactions = [...post.reactions, { emoji, userIds: [claims.userId] }];
    } else {
      const has = existing.userIds.includes(claims.userId);
      reactions = post.reactions
        .map((r) => (r.emoji === emoji ? { ...r, userIds: has ? r.userIds.filter((u) => u !== claims.userId) : [...r.userIds, claims.userId] } : r))
        .filter((r) => r.userIds.length > 0);
    }
    const updated = { ...post, reactions };
    await putEntity("posts", updated);
    return NextResponse.json(updated);
  }

  if (action === "comment") {
    const text = body?.text;
    if (typeof text !== "string" || !text.trim()) return NextResponse.json({ error: "bad_request", message: "Comment text is required." }, { status: 400 });
    const comment: Comment = { id: newId("c"), authorId: claims.userId, text: text.trim(), date: new Date().toISOString() };
    const updated = { ...post, comments: [...post.comments, comment] };
    await putEntity("posts", updated);
    if (post.authorId !== claims.userId) {
      await appendFeed<Notification>(
        "notifications",
        {
          id: newId("n"),
          title: "New comment on your update",
          description: `${claims.name} commented on your post.`,
          date: new Date().toISOString(),
          read: false,
          type: "comment",
          href: "/updates",
        },
        100
      );
    }
    return NextResponse.json(updated);
  }

  if (action === "vote") {
    const optionIndex = body?.optionIndex;
    if (typeof optionIndex !== "number" || !post.poll) return NextResponse.json({ error: "bad_request", message: "Invalid vote." }, { status: 400 });
    if (post.poll.votesByUser[claims.userId] !== undefined) return NextResponse.json(post);
    const options = post.poll.options.map((o, i) => (i === optionIndex ? { ...o, votes: o.votes + 1 } : o));
    const updated = { ...post, poll: { ...post.poll, options, votesByUser: { ...post.poll.votesByUser, [claims.userId]: optionIndex } } };
    await putEntity("posts", updated);
    return NextResponse.json(updated);
  }

  if (action === "pin") {
    if (claims.role !== "admin") return NextResponse.json({ error: "forbidden", message: "Only administrators can pin posts." }, { status: 403 });
    const updated = { ...post, pinned: !post.pinned };
    await putEntity("posts", updated);
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "bad_request", message: "Unknown action." }, { status: 400 });
}
