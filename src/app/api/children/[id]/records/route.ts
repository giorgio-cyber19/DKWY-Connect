import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { getEntity, putEntity, newId } from "@/lib/db";
import type { Child, ArtworkItem, PhotoAlbum, VideoItem, ChildDocument, SpiritualMilestone, TeacherObservation } from "@/lib/types";

type RecordKind = "artwork" | "album" | "video" | "document" | "milestone" | "observation";

export async function POST(request: Request, ctx: RouteContext<"/api/children/[id]/records">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const child = await getEntity<Child>("children", id);
  if (!child) return NextResponse.json({ error: "not_found", message: "That child record no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const kind = body?.kind as RecordKind | undefined;

  let updated: Child;
  switch (kind) {
    case "artwork": {
      const item: ArtworkItem = { ...body.item, id: newId("art") };
      updated = { ...child, artwork: [item, ...child.artwork] };
      break;
    }
    case "album": {
      const item: PhotoAlbum = { ...body.item, id: newId("alb") };
      updated = { ...child, albums: [item, ...child.albums] };
      break;
    }
    case "video": {
      const item: VideoItem = { ...body.item, id: newId("vid") };
      updated = { ...child, videos: [item, ...child.videos] };
      break;
    }
    case "document": {
      const item: ChildDocument = { ...body.item, id: newId("doc") };
      updated = { ...child, documents: [item, ...child.documents] };
      break;
    }
    case "milestone": {
      const item: SpiritualMilestone = { ...body.item, id: newId("ms") };
      updated = { ...child, milestones: [item, ...child.milestones] };
      break;
    }
    case "observation": {
      const note = body?.note;
      if (typeof note !== "string" || !note.trim()) {
        return NextResponse.json({ error: "bad_request", message: "A note is required." }, { status: 400 });
      }
      const item: TeacherObservation = {
        id: newId("obs"),
        date: new Date().toISOString().slice(0, 10),
        authorId: claims.userId,
        note: note.trim(),
        tag: typeof body?.tag === "string" ? body.tag : undefined,
      };
      updated = { ...child, observations: [item, ...child.observations] };
      break;
    }
    default:
      return NextResponse.json({ error: "bad_request", message: "Unknown record kind." }, { status: 400 });
  }

  await putEntity("children", updated);
  return NextResponse.json(updated);
}
