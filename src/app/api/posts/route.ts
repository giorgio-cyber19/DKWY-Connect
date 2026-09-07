import { NextResponse, after } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { deleteEntity, putEntity, newId, getCollection, getEntity, appendFeed } from "@/lib/db";
import { sendPostNotificationEmails } from "@/lib/email";
import type { Post, User, Notification } from "@/lib/types";

export async function POST(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return NextResponse.json({ error: "bad_request", message: "Post content is required." }, { status: 400 });
  }

  const post: Post = {
    ...body,
    id: newId("post"),
    authorId: claims.userId,
    date: new Date().toISOString(),
    pinned: false,
    reactions: [],
    comments: [],
    ...(body.type === "Prayer" ? { prayedByUserIds: [] } : {}),
  };
  await putEntity("posts", post);

  if (post.type === "Prayer") {
    await appendFeed<Notification>(
      "notifications",
      {
        id: newId("n"),
        title: "New prayer request",
        description: `${claims.name} shared a new prayer request.`,
        date: new Date().toISOString(),
        read: false,
        type: "prayer",
        href: "/updates",
      },
      100
    );
  }

  after(async () => {
    const author = await getEntity<User>("users", claims.userId);
    if (!author) return;
    const users = await getCollection<User>("users");
    const recipients = users.filter((u) => u.status === "active");
    await sendPostNotificationEmails(post, author, recipients);
  });

  return NextResponse.json(post);
}

export async function DELETE(request: Request) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });
  if (claims.role !== "admin") {
    return NextResponse.json({ error: "forbidden", message: "Only administrators can remove posts." }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "bad_request", message: "A post id is required." }, { status: 400 });

  await deleteEntity("posts", id);
  return NextResponse.json({ ok: true });
}
