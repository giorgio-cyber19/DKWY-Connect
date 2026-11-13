import { NextResponse } from "next/server";
import { getBearerToken, verifySessionToken } from "@/lib/session";
import { copyName } from "@/lib/library-folders";
import { copyItem, failureResponse, fileNamesIn, getItem, loadFolders, resolveTarget } from "@/lib/library-ops";

export const maxDuration = 60;

/** { folderId } -> an independent copy of the file (its own file in Google Drive) inside that folder (null = top level). */
export async function POST(request: Request, ctx: RouteContext<"/api/media/[id]/copy">) {
  const claims = verifySessionToken(getBearerToken(request));
  if (!claims) return NextResponse.json({ error: "unauthorized", message: "Sign in first." }, { status: 401 });

  const { id } = await ctx.params;
  const item = await getItem("media", id);
  if (!item) return NextResponse.json({ error: "not_found", message: "That file no longer exists." }, { status: 404 });

  const body = await request.json().catch(() => null);
  const target = await resolveTarget(await loadFolders("media"), body?.folderId);
  if ("response" in target) return target.response;

  try {
    const name = copyName(item.name, await fileNamesIn("media", target.folder?.id ?? null));
    return NextResponse.json(await copyItem("media", item, target.folder, claims.userId, name));
  } catch (err) {
    return failureResponse(err);
  }
}
